import { supabase } from "@/integrations/supabase/client";

export const generateDynamicArticles = async (count: number = 20) => {
  try {
    const { data, error } = await supabase.functions.invoke('generate-dynamic-articles', {
      body: { count }
    });

    if (error) {
      console.error('Error generating articles:', error);
      throw error;
    }

    console.log(`Generated ${data.generated_count} new articles`);
    return data;
  } catch (error) {
    console.error('Failed to generate dynamic articles:', error);
    throw error;
  }
};