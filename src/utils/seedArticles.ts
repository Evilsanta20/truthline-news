import { supabase } from "@/integrations/supabase/client";

// Real news aggregation function - replaces fake article generation
export const fetchRealNews = async (category: string = 'general', count: number = 20) => {
  try {
    const { data, error } = await supabase.functions.invoke('enhanced-news-aggregator', {
      body: { 
        category, 
        limit: count,
        refresh: true,
        forceRefresh: true
      }
    });

    if (error) {
      console.error('Error fetching real news:', error);
      throw error;
    }

    console.log(`Fetched ${data?.articles?.length || 0} real articles from ${category} category`);
    return {
      success: true,
      articles_count: data?.articles?.length || 0,
      articles: data?.articles || []
    };
  } catch (error) {
    console.error('Error in fetchRealNews:', error);
    throw error;
  }
};

// Multi-source news aggregation
export const aggregateFromMultipleSources = async (sources: string[] = ['newsapi', 'guardian'], category: string = 'general', limit: number = 50) => {
  try {
    const { data, error } = await supabase.functions.invoke('multi-source-news-aggregator', {
      body: { 
        sources,
        category,
        limit,
        forceRefresh: true
      }
    });

    if (error) {
      console.error('Error aggregating from multiple sources:', error);
      throw error;
    }

    console.log(`Aggregated ${data?.processed || 0} articles from multiple sources`);
    return {
      success: true,
      total_fetched: data?.total_fetched || 0,
      processed: data?.processed || 0,
      stored: data?.stored || 0
    };
  } catch (error) {
    console.error('Error in aggregateFromMultipleSources:', error);
    throw error;
  }
};

// Legacy function - kept for backward compatibility but now uses real news
export const generateDynamicArticles = async (count: number = 20) => {
  console.warn('generateDynamicArticles is deprecated. Use fetchRealNews instead.');
  return fetchRealNews('general', count);
};