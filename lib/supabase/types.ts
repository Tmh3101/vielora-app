/**
 * Migration Note: Types moved from src/integrations/supabase/types.ts
 * No changes needed - types are framework-agnostic
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  __InternalSupabase: {
    PostgrestVersion: "14.1";
  };
  public: {
    Tables: {
      banned_users: {
        Row: {
          user_id: string;
          reason: string | null;
          banned_at: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          reason?: string | null;
          banned_at?: string;
          created_at?: string;
        };
        Update: {
          user_id?: string;
          reason?: string | null;
          banned_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      bots: {
        Row: {
          allowed_domains: string[];
          avatar_url: string | null;
          crawl_settings: Json | null;
          created_at: string;
          domain: string;
          id: string;
          is_public: boolean;
          is_stopped: boolean;
          is_banned: boolean | null;
          last_crawl_at: string | null;
          name: string;
          rate_limit_per_day: number | null;
          rate_limit_per_ip: number | null;
          slug: string | null;
          status: Database["public"]["Enums"]["bot_status"];
          updated_at: string;
          user_id: string;
          verification_token: string | null;
          verified_at: string | null;
          widget_settings: Json | null;
        };
        Insert: {
          allowed_domains?: string[];
          avatar_url?: string | null;
          crawl_settings?: Json | null;
          created_at?: string;
          domain: string;
          id?: string;
          is_public?: boolean;
          is_stopped?: boolean;
          is_banned?: boolean | null;
          last_crawl_at?: string | null;
          name: string;
          rate_limit_per_day?: number | null;
          rate_limit_per_ip?: number | null;
          slug?: string | null;
          status?: Database["public"]["Enums"]["bot_status"];
          updated_at?: string;
          user_id: string;
          verification_token?: string | null;
          verified_at?: string | null;
          widget_settings?: Json | null;
        };
        Update: {
          allowed_domains?: string[];
          avatar_url?: string | null;
          crawl_settings?: Json | null;
          created_at?: string;
          domain?: string;
          id?: string;
          is_public?: boolean;
          is_stopped?: boolean;
          is_banned?: boolean | null;
          last_crawl_at?: string | null;
          name?: string;
          rate_limit_per_day?: number | null;
          rate_limit_per_ip?: number | null;
          slug?: string | null;
          status?: Database["public"]["Enums"]["bot_status"];
          updated_at?: string;
          user_id?: string;
          verification_token?: string | null;
          verified_at?: string | null;
          widget_settings?: Json | null;
        };
        Relationships: [];
      };
      conversations: {
        Row: {
          bot_id: string;
          ended_at: string | null;
          id: string;
          started_at: string;
          visitor_id: string;
        };
        Insert: {
          bot_id: string;
          ended_at?: string | null;
          id?: string;
          started_at?: string;
          visitor_id: string;
        };
        Update: {
          bot_id?: string;
          ended_at?: string | null;
          id?: string;
          started_at?: string;
          visitor_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_bot_id_fkey";
            columns: ["bot_id"];
            isOneToOne: false;
            referencedRelation: "bots";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          slug: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          slug: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          slug?: string;
        };
        Relationships: [];
      };
      credit_packages: {
        Row: {
          id: string;
          name: string;
          credits_amount: number;
          price: Json;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          credits_amount: number;
          price: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          credits_amount?: number;
          price?: Json;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      credit_transactions: {
        Row: {
          amount: number;
          created_at: string;
          description: string | null;
          id: string;
          payment_id: string | null;
          transaction_type: Database["public"]["Enums"]["transaction_type"];
          user_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          description?: string | null;
          id?: string;
          payment_id?: string | null;
          transaction_type: Database["public"]["Enums"]["transaction_type"];
          user_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          description?: string | null;
          id?: string;
          payment_id?: string | null;
          transaction_type?: Database["public"]["Enums"]["transaction_type"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "credit_transactions_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          },
        ];
      };
      jobs: {
        Row: {
          id: string;
          bot_id: string | null;
          name: string;
          status: Database["public"]["Enums"]["job_status"];
          progress: number;
          data: Json;
          error_message: string | null;
          created_at: string;
          started_at: string | null;
          finished_at: string | null;
        };
        Insert: {
          id: string;
          bot_id?: string | null;
          name: string;
          status?: Database["public"]["Enums"]["job_status"];
          progress?: number;
          data?: Json;
          error_message?: string | null;
          created_at?: string;
          started_at?: string | null;
          finished_at?: string | null;
        };
        Update: {
          id?: string;
          bot_id?: string | null;
          name?: string;
          status?: Database["public"]["Enums"]["job_status"];
          progress?: number;
          data?: Json;
          error_message?: string | null;
          created_at?: string;
          started_at?: string | null;
          finished_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "jobs_bot_id_fkey";
            columns: ["bot_id"];
            isOneToOne: false;
            referencedRelation: "bots";
            referencedColumns: ["id"];
          },
        ];
      };
      documents: {
        Row: {
          bot_id: string;
          content: string;
          created_at: string;
          embedding: string | null;
          id: string;
          metadata: Json | null;
          updated_at: string;
        };
        Insert: {
          bot_id: string;
          content: string;
          created_at?: string;
          embedding?: string | null;
          id?: string;
          metadata?: Json | null;
          updated_at?: string;
        };
        Update: {
          bot_id?: string;
          content?: string;
          created_at?: string;
          embedding?: string | null;
          id?: string;
          metadata?: Json | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "documents_bot_id_fkey";
            columns: ["bot_id"];
            isOneToOne: false;
            referencedRelation: "bots";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          completion_tokens: number;
          content: string;
          conversation_id: string;
          created_at: string;
          id: string;
          no_answer: boolean | null;
          prompt_tokens: number;
          role: string;
        };
        Insert: {
          completion_tokens?: number;
          content: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          no_answer?: boolean | null;
          prompt_tokens?: number;
          role: string;
        };
        Update: {
          completion_tokens?: number;
          content?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          no_answer?: boolean | null;
          prompt_tokens?: number;
          role?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      pages: {
        Row: {
          bot_id: string;
          content: string | null;
          content_hash: string | null;
          crawled_at: string;
          depth: number | null;
          error_message: string | null;
          error_type: Database["public"]["Enums"]["page_error_type"] | null;
          http_status_code: number | null;
          id: string;
          raw_content: string | null;
          source_type: string;
          status: Database["public"]["Enums"]["page_status"];
          title: string | null;
          url: string;
        };
        Insert: {
          bot_id: string;
          content?: string | null;
          content_hash?: string | null;
          crawled_at?: string;
          depth?: number | null;
          error_message?: string | null;
          error_type?: Database["public"]["Enums"]["page_error_type"] | null;
          http_status_code?: number | null;
          id?: string;
          raw_content?: string | null;
          source_type?: string;
          status?: Database["public"]["Enums"]["page_status"];
          title?: string | null;
          url: string;
        };
        Update: {
          bot_id?: string;
          content?: string | null;
          content_hash?: string | null;
          crawled_at?: string;
          depth?: number | null;
          error_message?: string | null;
          error_type?: Database["public"]["Enums"]["page_error_type"] | null;
          http_status_code?: number | null;
          id?: string;
          raw_content?: string | null;
          source_type?: string;
          status?: Database["public"]["Enums"]["page_status"];
          title?: string | null;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pages_bot_id_fkey";
            columns: ["bot_id"];
            isOneToOne: false;
            referencedRelation: "bots";
            referencedColumns: ["id"];
          },
        ];
      };
      post_categories: {
        Row: {
          category_id: string;
          post_id: string;
        };
        Insert: {
          category_id: string;
          post_id: string;
        };
        Update: {
          category_id?: string;
          post_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "post_categories_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "post_categories_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      posts: {
        Row: {
          content: string;
          created_at: string;
          id: string;
          published_at: string | null;
          slug: string;
          status: string;
          summary: string;
          thumbnail_url: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          content: string;
          created_at?: string;
          id?: string;
          published_at?: string | null;
          slug: string;
          status?: string;
          summary: string;
          thumbnail_url?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          content?: string;
          created_at?: string;
          id?: string;
          published_at?: string | null;
          slug?: string;
          status?: string;
          summary?: string;
          thumbnail_url?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          amount: number;
          created_at: string;
          currency: string | null;
          id: string;
          metadata: Json | null;
          payment_type: Database["public"]["Enums"]["payment_type"];
          plan_id: string | null;
          provider: string;
          provider_transaction_id: string | null;
          status: Database["public"]["Enums"]["payment_status"] | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          currency?: string | null;
          id?: string;
          metadata?: Json | null;
          payment_type: Database["public"]["Enums"]["payment_type"];
          plan_id?: string | null;
          provider: string;
          provider_transaction_id?: string | null;
          status?: Database["public"]["Enums"]["payment_status"] | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          currency?: string | null;
          id?: string;
          metadata?: Json | null;
          payment_type?: Database["public"]["Enums"]["payment_type"];
          plan_id?: string | null;
          provider?: string;
          provider_transaction_id?: string | null;
          status?: Database["public"]["Enums"]["payment_status"] | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
        ];
      };
      plans: {
        Row: {
          bots_limit: number;
          code: Database["public"]["Enums"]["pricing_plan"];
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean;
          monthly_credits: number;
          name: string;
          pricing: Json;
          updated_at: string;
        };
        Insert: {
          bots_limit?: number;
          code: Database["public"]["Enums"]["pricing_plan"];
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          monthly_credits?: number;
          name: string;
          pricing?: Json | null;
          updated_at?: string;
        };
        Update: {
          bots_limit?: number;
          code?: Database["public"]["Enums"]["pricing_plan"];
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          monthly_credits?: number;
          name?: string;
          pricing?: Json | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      shopify_sessions: {
        Row: {
          accessToken: string | null;
          accountOwner: boolean | null;
          collaborator: boolean | null;
          email: string | null;
          emailVerified: boolean | null;
          expires: number | null;
          firstName: string | null;
          id: string;
          isOnline: boolean;
          lastName: string | null;
          locale: string | null;
          refreshToken: string | null;
          refreshTokenExpires: number | null;
          scope: string | null;
          shop: string;
          state: string;
          userId: number | null;
        };
        Insert: {
          accessToken?: string | null;
          accountOwner?: boolean | null;
          collaborator?: boolean | null;
          email?: string | null;
          emailVerified?: boolean | null;
          expires?: number | null;
          firstName?: string | null;
          id: string;
          isOnline: boolean;
          lastName?: string | null;
          locale?: string | null;
          refreshToken?: string | null;
          refreshTokenExpires?: number | null;
          scope?: string | null;
          shop: string;
          state: string;
          userId?: number | null;
        };
        Update: {
          accessToken?: string | null;
          accountOwner?: boolean | null;
          collaborator?: boolean | null;
          email?: string | null;
          emailVerified?: boolean | null;
          expires?: number | null;
          firstName?: string | null;
          id?: string;
          isOnline?: boolean;
          lastName?: string | null;
          locale?: string | null;
          refreshToken?: string | null;
          refreshTokenExpires?: number | null;
          scope?: string | null;
          shop?: string;
          state?: string;
          userId?: number | null;
        };
        Relationships: [];
      };
      shopify_sessions_migrations: {
        Row: {
          migration_name: string;
        };
        Insert: {
          migration_name: string;
        };
        Update: {
          migration_name?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          billing_cycle: Database["public"]["Enums"]["billing_cycle"] | null;
          cancel_at_period_end: boolean | null;
          created_at: string;
          current_period_end: string;
          current_period_start: string;
          id: string;
          needs_bot_selection: boolean;
          next_credit_reset_at: string;
          plan_id: string;
          status: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"] | null;
          cancel_at_period_end?: boolean | null;
          created_at?: string;
          current_period_end?: string;
          current_period_start?: string;
          id?: string;
          needs_bot_selection?: boolean;
          next_credit_reset_at?: string;
          plan_id: string;
          status?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"] | null;
          cancel_at_period_end?: boolean | null;
          created_at?: string;
          current_period_end?: string;
          current_period_start?: string;
          id?: string;
          needs_bot_selection?: boolean;
          next_credit_reset_at?: string;
          plan_id?: string;
          status?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey";
            columns: ["plan_id"];
            isOneToOne: false;
            referencedRelation: "plans";
            referencedColumns: ["id"];
          },
        ];
      };
      usage_logs: {
        Row: {
          action: string;
          bot_id: string | null;
          client_ip: string | null;
          count: number | null;
          created_at: string;
          id: string;
          visitor_id: string | null;
        };
        Insert: {
          action: string;
          bot_id?: string | null;
          client_ip?: string | null;
          count?: number | null;
          created_at?: string;
          id?: string;
          visitor_id?: string | null;
        };
        Update: {
          action?: string;
          bot_id?: string | null;
          client_ip?: string | null;
          count?: number | null;
          created_at?: string;
          id?: string;
          visitor_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "usage_logs_bot_id_fkey";
            columns: ["bot_id"];
            isOneToOne: false;
            referencedRelation: "bots";
            referencedColumns: ["id"];
          },
        ];
      };
      wallets: {
        Row: {
          is_payg_enabled: boolean | null;
          payg_credits: number;
          subscription_credits: number;
          total_credits: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          is_payg_enabled?: boolean | null;
          payg_credits?: number;
          subscription_credits?: number;
          total_credits?: never;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          is_payg_enabled?: boolean | null;
          payg_credits?: number;
          subscription_credits?: number;
          total_credits?: never;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      support_tickets: {
        Row: {
          admin_response: string | null;
          created_at: string;
          id: string;
          message: string;
          resolved_at: string | null;
          status: string;
          subject: string;
          user_id: string | null;
        };
        Insert: {
          admin_response?: string | null;
          created_at?: string;
          id?: string;
          message: string;
          resolved_at?: string | null;
          status?: string;
          subject: string;
          user_id?: string | null;
        };
        Update: {
          admin_response?: string | null;
          created_at?: string;
          id?: string;
          message?: string;
          resolved_at?: string | null;
          status?: string;
          subject?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      generate_verification_token: { Args: never; Returns: string };
      get_bot_analytics_v2: {
        Args: {
          p_bot_id: string;
          p_start_date: string;
          p_end_date: string;
        };
        Returns: Json;
      };
      handle_new_user_billing: { Args: never; Returns: unknown };
      hybrid_search: {
        Args: {
          query_text: string;
          query_embedding: string;
          match_count?: number;
          full_text_weight?: number;
          semantic_weight?: number;
          p_bot_id?: string;
        };
        Returns: Array<{
          content: string;
          metadata: Json;
        }>;
      };
      update_updated_at_column: { Args: never; Returns: unknown };
    };
    Enums: {
      billing_cycle: "monthly" | "yearly" | "none";
      job_status: "pending" | "active" | "completed" | "failed";
      bot_status: "pending" | "discovering" | "discovered" | "indexing" | "ready" | "failed";
      page_status: "pending" | "processing" | "pending_index" | "ignored" | "completed" | "failed";
      page_error_type:
        | "network_error"
        | "timeout_error"
        | "http_error"
        | "rate_limited"
        | "blocked"
        | "parse_error"
        | "render_error"
        | "empty_content"
        | "url_error"
        | "not_found"
        | "unknown_error";
      payment_status: "pending" | "completed" | "failed" | "refunded";
      payment_type: "subscription" | "payg" | "subscription_upgrade" | "subscription_renew";
      pricing_plan: "free" | "standard" | "pro" | "enterprise";
      transaction_type:
        | "subscription_renewal"
        | "index_pages"
        | "index_pages_refund"
        | "chat_message"
        | "chat_message_refund"
        | "add_knowledge"
        | "add_knowledge_refund"
        | "update_knowledge"
        | "update_knowledge_refund"
        | "plan_downgrade"
        | "monthly_reset"
        | "payg_purchase";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      billing_cycle: ["monthly", "yearly", "none"],
      bot_status: ["pending", "discovering", "discovered", "indexing", "ready", "failed"],
      page_status: ["pending", "processing", "pending_index", "ignored", "completed", "failed"],
      payment_status: ["pending", "completed", "failed", "refunded"],
      payment_type: ["subscription", "payg", "subscription_upgrade", "subscription_renew"],
      pricing_plan: ["free", "standard", "pro", "enterprise"],
      transaction_type: [
        "subscription_renewal",
        "index_pages",
        "index_pages_refund",
        "chat_message",
        "chat_message_refund",
        "add_knowledge",
        "add_knowledge_refund",
        "update_knowledge",
        "update_knowledge_refund",
        "plan_downgrade",
        "monthly_reset",
        "payg_purchase",
      ],
    },
  },
} as const;
