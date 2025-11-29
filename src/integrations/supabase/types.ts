export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      aggregation_logs: {
        Row: {
          created_at: string
          execution_time: string
          id: string
          log_level: string
          results: Json
          source_function: string
          success_rate: number | null
        }
        Insert: {
          created_at?: string
          execution_time?: string
          id?: string
          log_level?: string
          results?: Json
          source_function: string
          success_rate?: number | null
        }
        Update: {
          created_at?: string
          execution_time?: string
          id?: string
          log_level?: string
          results?: Json
          source_function?: string
          success_rate?: number | null
        }
        Relationships: []
      }
      article_archive: {
        Row: {
          archive_reason: string | null
          archived_at: string
          content: string | null
          id: string
          original_article_id: string | null
          source_name: string | null
          title: string
          url: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string
          content?: string | null
          id?: string
          original_article_id?: string | null
          source_name?: string | null
          title: string
          url: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string
          content?: string | null
          id?: string
          original_article_id?: string | null
          source_name?: string | null
          title?: string
          url?: string
        }
        Relationships: []
      }
      article_interactions: {
        Row: {
          article_id: string
          created_at: string
          id: string
          interaction_type: string
          interaction_value: number | null
          mood_context: Json | null
          user_id: string
        }
        Insert: {
          article_id: string
          created_at?: string
          id?: string
          interaction_type: string
          interaction_value?: number | null
          mood_context?: Json | null
          user_id?: string
        }
        Update: {
          article_id?: string
          created_at?: string
          id?: string
          interaction_type?: string
          interaction_value?: number | null
          mood_context?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      articles: {
        Row: {
          ai_processed_at: string | null
          ai_summary: string | null
          author: string | null
          bias_score: number | null
          cache_expires_at: string | null
          category_id: string | null
          content: string | null
          content_embedding: string | null
          content_hash: string | null
          content_quality_score: number | null
          created_at: string
          created_by: string | null
          credibility_score: number | null
          data_freshness_score: number | null
          description: string | null
          engagement_score: number | null
          estimated_read_time: number | null
          id: string
          is_editors_pick: boolean | null
          is_featured: boolean | null
          is_trending: boolean | null
          is_verified: boolean | null
          last_verified_at: string | null
          mood_depth_score: number | null
          mood_positivity_score: number | null
          polarization_score: number | null
          processing_notes: string | null
          published_at: string | null
          reading_time_minutes: number | null
          sentiment_score: number | null
          source_id: string | null
          source_last_modified: string | null
          source_name: string | null
          title: string
          topic_tags: string[] | null
          updated_at: string
          url: string
          url_to_image: string | null
          view_count: number | null
        }
        Insert: {
          ai_processed_at?: string | null
          ai_summary?: string | null
          author?: string | null
          bias_score?: number | null
          cache_expires_at?: string | null
          category_id?: string | null
          content?: string | null
          content_embedding?: string | null
          content_hash?: string | null
          content_quality_score?: number | null
          created_at?: string
          created_by?: string | null
          credibility_score?: number | null
          data_freshness_score?: number | null
          description?: string | null
          engagement_score?: number | null
          estimated_read_time?: number | null
          id?: string
          is_editors_pick?: boolean | null
          is_featured?: boolean | null
          is_trending?: boolean | null
          is_verified?: boolean | null
          last_verified_at?: string | null
          mood_depth_score?: number | null
          mood_positivity_score?: number | null
          polarization_score?: number | null
          processing_notes?: string | null
          published_at?: string | null
          reading_time_minutes?: number | null
          sentiment_score?: number | null
          source_id?: string | null
          source_last_modified?: string | null
          source_name?: string | null
          title: string
          topic_tags?: string[] | null
          updated_at?: string
          url: string
          url_to_image?: string | null
          view_count?: number | null
        }
        Update: {
          ai_processed_at?: string | null
          ai_summary?: string | null
          author?: string | null
          bias_score?: number | null
          cache_expires_at?: string | null
          category_id?: string | null
          content?: string | null
          content_embedding?: string | null
          content_hash?: string | null
          content_quality_score?: number | null
          created_at?: string
          created_by?: string | null
          credibility_score?: number | null
          data_freshness_score?: number | null
          description?: string | null
          engagement_score?: number | null
          estimated_read_time?: number | null
          id?: string
          is_editors_pick?: boolean | null
          is_featured?: boolean | null
          is_trending?: boolean | null
          is_verified?: boolean | null
          last_verified_at?: string | null
          mood_depth_score?: number | null
          mood_positivity_score?: number | null
          polarization_score?: number | null
          processing_notes?: string | null
          published_at?: string | null
          reading_time_minutes?: number | null
          sentiment_score?: number | null
          source_id?: string | null
          source_last_modified?: string | null
          source_name?: string | null
          title?: string
          topic_tags?: string[] | null
          updated_at?: string
          url?: string
          url_to_image?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_sources: {
        Row: {
          created_at: string
          id: string
          source_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          source_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          source_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blocked_sources_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_topics: {
        Row: {
          created_at: string
          id: string
          topic: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          topic: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          article_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          article_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          article_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmarks_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      content_quality_config: {
        Row: {
          bias_threshold: number | null
          config_name: string
          created_at: string
          id: string
          min_content_quality: number | null
          min_credibility: number | null
          min_factuality: number | null
          sensationalism_threshold: number | null
          toxicity_threshold: number | null
          updated_at: string
        }
        Insert: {
          bias_threshold?: number | null
          config_name: string
          created_at?: string
          id?: string
          min_content_quality?: number | null
          min_credibility?: number | null
          min_factuality?: number | null
          sensationalism_threshold?: number | null
          toxicity_threshold?: number | null
          updated_at?: string
        }
        Update: {
          bias_threshold?: number | null
          config_name?: string
          created_at?: string
          id?: string
          min_content_quality?: number | null
          min_credibility?: number | null
          min_factuality?: number | null
          sensationalism_threshold?: number | null
          toxicity_threshold?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      data_sync_status: {
        Row: {
          articles_added: number | null
          articles_processed: number | null
          articles_removed: number | null
          articles_updated: number | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          metadata: Json | null
          started_at: string
          status: string
          sync_type: string
        }
        Insert: {
          articles_added?: number | null
          articles_processed?: number | null
          articles_removed?: number | null
          articles_updated?: number | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          started_at?: string
          status?: string
          sync_type: string
        }
        Update: {
          articles_added?: number | null
          articles_processed?: number | null
          articles_removed?: number | null
          articles_updated?: number | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          started_at?: string
          status?: string
          sync_type?: string
        }
        Relationships: []
      }
      mood_recommendations: {
        Row: {
          article_id: string
          clicked: boolean | null
          created_at: string | null
          feedback_score: number | null
          id: string
          mood_match_reasons: string[] | null
          mood_profile: Json
          recommendation_score: number
          user_id: string
        }
        Insert: {
          article_id: string
          clicked?: boolean | null
          created_at?: string | null
          feedback_score?: number | null
          id?: string
          mood_match_reasons?: string[] | null
          mood_profile: Json
          recommendation_score: number
          user_id: string
        }
        Update: {
          article_id?: string
          clicked?: boolean | null
          created_at?: string | null
          feedback_score?: number | null
          id?: string
          mood_match_reasons?: string[] | null
          mood_profile?: Json
          recommendation_score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mood_recommendations_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      news_fetch_logs: {
        Row: {
          api_source: string
          api_status: string | null
          articles_fetched: number | null
          articles_stored: number | null
          category: string | null
          created_at: string
          error_message: string | null
          execution_time_ms: number | null
          fetch_timestamp: string
          id: string
        }
        Insert: {
          api_source: string
          api_status?: string | null
          articles_fetched?: number | null
          articles_stored?: number | null
          category?: string | null
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          fetch_timestamp?: string
          id?: string
        }
        Update: {
          api_source?: string
          api_status?: string | null
          articles_fetched?: number | null
          articles_stored?: number | null
          category?: string | null
          created_at?: string
          error_message?: string | null
          execution_time_ms?: number | null
          fetch_timestamp?: string
          id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      sources: {
        Row: {
          api_id: string | null
          category: string | null
          country: string | null
          created_at: string
          description: string | null
          id: string
          is_blocked: boolean | null
          language: string | null
          name: string
          url: string
        }
        Insert: {
          api_id?: string | null
          category?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_blocked?: boolean | null
          language?: string | null
          name: string
          url: string
        }
        Update: {
          api_id?: string | null
          category?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_blocked?: boolean | null
          language?: string | null
          name?: string
          url?: string
        }
        Relationships: []
      }
      user_feedback: {
        Row: {
          article_id: string
          bias_feedback: string | null
          created_at: string | null
          feedback_type: string
          id: string
          quality_feedback: string | null
          rating: number | null
          relevance_score: number | null
          user_id: string
        }
        Insert: {
          article_id: string
          bias_feedback?: string | null
          created_at?: string | null
          feedback_type: string
          id?: string
          quality_feedback?: string | null
          rating?: number | null
          relevance_score?: number | null
          user_id: string
        }
        Update: {
          article_id?: string
          bias_feedback?: string | null
          created_at?: string | null
          feedback_type?: string
          id?: string
          quality_feedback?: string | null
          rating?: number | null
          relevance_score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_feedback_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          blocked_sources: string[] | null
          blocked_topics: string[] | null
          created_at: string
          current_mood: Json | null
          id: string
          interaction_scores: Json | null
          mood_history: Json | null
          mood_last_updated: string | null
          mood_presets: Json | null
          preferred_sources: string[] | null
          preferred_topics: string[] | null
          reading_history: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          blocked_sources?: string[] | null
          blocked_topics?: string[] | null
          created_at?: string
          current_mood?: Json | null
          id?: string
          interaction_scores?: Json | null
          mood_history?: Json | null
          mood_last_updated?: string | null
          mood_presets?: Json | null
          preferred_sources?: string[] | null
          preferred_topics?: string[] | null
          reading_history?: Json | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          blocked_sources?: string[] | null
          blocked_topics?: string[] | null
          created_at?: string
          current_mood?: Json | null
          id?: string
          interaction_scores?: Json | null
          mood_history?: Json | null
          mood_last_updated?: string | null
          mood_presets?: Json | null
          preferred_sources?: string[] | null
          preferred_topics?: string[] | null
          reading_history?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_reading_patterns: {
        Row: {
          avg_session_duration: number | null
          bias_tolerance: number | null
          category_preferences: Json | null
          created_at: string | null
          engagement_score: number | null
          id: string
          preferred_sources: string[] | null
          reading_time_preference: number | null
          sentiment_preference: number | null
          topics_of_interest: string[] | null
          total_articles_read: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avg_session_duration?: number | null
          bias_tolerance?: number | null
          category_preferences?: Json | null
          created_at?: string | null
          engagement_score?: number | null
          id?: string
          preferred_sources?: string[] | null
          reading_time_preference?: number | null
          sentiment_preference?: number | null
          topics_of_interest?: string[] | null
          total_articles_read?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avg_session_duration?: number | null
          bias_tolerance?: number | null
          category_preferences?: Json | null
          created_at?: string | null
          engagement_score?: number | null
          id?: string
          preferred_sources?: string[] | null
          reading_time_preference?: number | null
          sentiment_preference?: number | null
          topics_of_interest?: string[] | null
          total_articles_read?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_recommendations: {
        Row: {
          algorithm_used: string | null
          article_id: string
          clicked_at: string | null
          created_at: string | null
          id: string
          recommendation_reason: string | null
          recommendation_score: number
          shown_at: string | null
          user_id: string
        }
        Insert: {
          algorithm_used?: string | null
          article_id: string
          clicked_at?: string | null
          created_at?: string | null
          id?: string
          recommendation_reason?: string | null
          recommendation_score: number
          shown_at?: string | null
          user_id: string
        }
        Update: {
          algorithm_used?: string | null
          article_id?: string
          clicked_at?: string | null
          created_at?: string | null
          id?: string
          recommendation_reason?: string | null
          recommendation_score?: number
          shown_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_recommendations_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      archive_and_cleanup_old_articles: { Args: never; Returns: number }
      calculate_content_hash: {
        Args: { content_text: string; title_text: string; url_text: string }
        Returns: string
      }
      cleanup_duplicate_articles: { Args: never; Returns: number }
      cleanup_old_articles: { Args: never; Returns: number }
      cleanup_old_logs: { Args: never; Returns: undefined }
      complete_sync_operation: {
        Args: {
          articles_added_param?: number
          articles_processed_param?: number
          articles_removed_param?: number
          articles_updated_param?: number
          error_message_param?: string
          status_param?: string
          sync_id_param: string
        }
        Returns: boolean
      }
      get_user_role: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      schedule_fresh_article_refresh: { Args: never; Returns: undefined }
      start_sync_operation: {
        Args: { metadata_param?: Json; sync_type_param: string }
        Returns: string
      }
      update_data_freshness: { Args: never; Returns: number }
      update_mood_scores: { Args: never; Returns: undefined }
      upsert_article: {
        Args: {
          p_author?: string
          p_bias_score?: number
          p_content?: string
          p_content_quality_score?: number
          p_credibility_score?: number
          p_description?: string
          p_engagement_score?: number
          p_published_at?: string
          p_sentiment_score?: number
          p_source_name?: string
          p_title: string
          p_topic_tags?: string[]
          p_url: string
          p_url_to_image?: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "editor" | "viewer"
      user_role: "viewer" | "editor" | "admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "editor", "viewer"],
      user_role: ["viewer", "editor", "admin"],
    },
  },
} as const
