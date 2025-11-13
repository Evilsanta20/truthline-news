import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Utility: timeout a fetch
async function fetchWithTimeout(resource: string, options: RequestInit = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(resource, { ...options, signal: controller.signal });
    return resp;
  } finally {
    clearTimeout(id);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const start = Date.now();

  try {
    const { max_age_hours = 48, wipe_all = false } = await req.json().catch(() => ({ }));

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error("Supabase environment not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { "x-client-info": "purge-and-fetch-latest" } } });

    // 1) Purge old (or all) articles
    let removed = 0;
    if (wipe_all) {
      const { error: delErr, count } = await supabase
        .from("articles")
        .delete({ count: "exact" })
        .neq("id", "00000000-0000-0000-0000-000000000000"); // delete all rows safely
      if (delErr) throw delErr;
      removed = count ?? 0;
    } else {
      const cutoffISO = new Date(Date.now() - max_age_hours * 60 * 60 * 1000).toISOString();
      const { error: delErr, count } = await supabase
        .from("articles")
        .delete({ count: "exact" })
        .lt("published_at", cutoffISO);
      if (delErr) throw delErr;
      removed = count ?? 0;
    }

    // 2) Fetch fresh articles from reliable pipelines (no AI dependencies)
    const fetchStats: Record<string, number> = {};

    // Prefer enhanced-news-aggregator (already used in app, fast path)
    try {
      const { data, error } = await supabase.functions.invoke("enhanced-news-aggregator", {
        body: { category: "general", limit: 150, forceRefresh: true },
      });
      if (error) throw error;
      const processed = (data?.total_articles ?? data?.inserted ?? 0) as number;
      fetchStats["enhanced-news-aggregator"] = processed;
    } catch (e) {
      fetchStats["enhanced-news-aggregator"] = 0;
      console.warn("enhanced-news-aggregator failed:", (e as Error).message);
    }

    // Fallback: reliable-news-fetcher (RSS + immediate fresh)
    try {
      const { data, error } = await supabase.functions.invoke("reliable-news-fetcher", { body: {} });
      if (error) throw error;
      const processed = (data?.total_articles ?? data?.articles_inserted ?? 0) as number;
      fetchStats["reliable-news-fetcher"] = processed;
    } catch (e) {
      fetchStats["reliable-news-fetcher"] = 0;
      console.warn("reliable-news-fetcher failed:", (e as Error).message);
    }

    // Optional: multi-source-news-aggregator as extra fallback
    try {
      const { data, error } = await supabase.functions.invoke("multi-source-news-aggregator", {
        body: { categories: ["general", "technology", "business"], limit: 100, forceRefresh: true },
      });
      if (error) throw error;
      const processed = (data?.total_articles ?? data?.inserted ?? 0) as number;
      fetchStats["multi-source-news-aggregator"] = processed;
    } catch (e) {
      fetchStats["multi-source-news-aggregator"] = 0;
      console.warn("multi-source-news-aggregator failed:", (e as Error).message);
    }

    // 3) Deduplicate and update freshness
    const { data: cleanedCount, error: cleanupErr } = await supabase.rpc("cleanup_duplicate_articles");
    if (cleanupErr) console.warn("cleanup_duplicate_articles failed:", cleanupErr.message);

    const { data: freshnessCount, error: freshErr } = await supabase.rpc("update_data_freshness");
    if (freshErr) console.warn("update_data_freshness failed:", freshErr.message);

    const added = Object.values(fetchStats).reduce((a, b) => a + (b || 0), 0);

    const duration = Date.now() - start;
    return new Response(
      JSON.stringify({
        success: true,
        removed,
        articles_added: added,
        fetch_breakdown: fetchStats,
        duplicates_cleaned: cleanedCount ?? 0,
        freshness_updated: freshnessCount ?? 0,
        duration_ms: duration,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("purge-and-fetch-latest error:", e);
    return new Response(JSON.stringify({ success: false, error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
