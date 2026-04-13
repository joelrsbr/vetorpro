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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      market_cache: {
        Row: {
          expires_at: string
          key: string
          source: string
          status: string
          unit: string
          updated_at: string
          value: Json
        }
        Insert: {
          expires_at?: string
          key: string
          source?: string
          status?: string
          unit?: string
          updated_at?: string
          value: Json
        }
        Update: {
          expires_at?: string
          key?: string
          source?: string
          status?: string
          unit?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      market_history: {
        Row: {
          id: string
          key: string
          recorded_at: string
          value: number
        }
        Insert: {
          id?: string
          key: string
          recorded_at?: string
          value: number
        }
        Update: {
          id?: string
          key?: string
          recorded_at?: string
          value?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company: string | null
          cpf_cnpj: string | null
          created_at: string
          creci: string | null
          email: string | null
          full_name: string | null
          id: string
          logo_url: string | null
          phone: string | null
          proposals_reset_at: string
          proposals_used: number
          simulations_reset_at: string
          simulations_used: number
          subscription_plan: Database["public"]["Enums"]["subscription_plan"]
          updated_at: string
          user_id: string
        }
        Insert: {
          company?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          creci?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          proposals_reset_at?: string
          proposals_used?: number
          simulations_reset_at?: string
          simulations_used?: number
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          creci?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          proposals_reset_at?: string
          proposals_used?: number
          simulations_reset_at?: string
          simulations_used?: number
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      proposals: {
        Row: {
          client_name: string
          created_at: string
          id: string
          interest_savings: number | null
          property_description: string
          proposal_text: string
          simulation_id: string | null
          status: string
          term_savings_months: number | null
          user_id: string
        }
        Insert: {
          client_name: string
          created_at?: string
          id?: string
          interest_savings?: number | null
          property_description: string
          proposal_text: string
          simulation_id?: string | null
          status?: string
          term_savings_months?: number | null
          user_id: string
        }
        Update: {
          client_name?: string
          created_at?: string
          id?: string
          interest_savings?: number | null
          property_description?: string
          proposal_text?: string
          simulation_id?: string | null
          status?: string
          term_savings_months?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "proposals_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "simulations"
            referencedColumns: ["id"]
          },
        ]
      }
      simulations: {
        Row: {
          amortization_type: Database["public"]["Enums"]["amortization_type"]
          client_name: string | null
          created_at: string
          down_payment: number
          extra_amortization: number | null
          extra_amortization_strategy:
            | Database["public"]["Enums"]["extra_amortization_strategy"]
            | null
          id: string
          interest_rate: number
          monthly_payment: number
          property_description: string | null
          property_value: number
          reinforcement_frequency:
            | Database["public"]["Enums"]["reinforcement_frequency"]
            | null
          reinforcement_value: number | null
          term_months: number
          total_interest: number
          total_paid: number
          user_id: string
        }
        Insert: {
          amortization_type: Database["public"]["Enums"]["amortization_type"]
          client_name?: string | null
          created_at?: string
          down_payment: number
          extra_amortization?: number | null
          extra_amortization_strategy?:
            | Database["public"]["Enums"]["extra_amortization_strategy"]
            | null
          id?: string
          interest_rate: number
          monthly_payment: number
          property_description?: string | null
          property_value: number
          reinforcement_frequency?:
            | Database["public"]["Enums"]["reinforcement_frequency"]
            | null
          reinforcement_value?: number | null
          term_months: number
          total_interest: number
          total_paid: number
          user_id: string
        }
        Update: {
          amortization_type?: Database["public"]["Enums"]["amortization_type"]
          client_name?: string | null
          created_at?: string
          down_payment?: number
          extra_amortization?: number | null
          extra_amortization_strategy?:
            | Database["public"]["Enums"]["extra_amortization_strategy"]
            | null
          id?: string
          interest_rate?: number
          monthly_payment?: number
          property_description?: string | null
          property_value?: number
          reinforcement_frequency?:
            | Database["public"]["Enums"]["reinforcement_frequency"]
            | null
          reinforcement_value?: number | null
          term_months?: number
          total_interest?: number
          total_paid?: number
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          plan: Database["public"]["Enums"]["subscription_plan_v2"]
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan_v2"]
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["subscription_plan_v2"]
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      check_and_reset_limits: {
        Args: { p_user_id: string }
        Returns: {
          can_generate_proposal: boolean
          can_simulate: boolean
          proposals_remaining: number
          simulations_remaining: number
        }[]
      }
      cleanup_old_records: { Args: never; Returns: undefined }
      get_dashboard_counts: {
        Args: { p_user_id: string }
        Returns: {
          current_plan: string
          plan_limit: number
          proposals_count: number
          simulations_count: number
        }[]
      }
      get_user_subscription: {
        Args: { p_user_id: string }
        Returns: {
          expires_at: string
          is_active: boolean
          plan: Database["public"]["Enums"]["subscription_plan_v2"]
          status: Database["public"]["Enums"]["subscription_status"]
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_proposal_count: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      increment_simulation_count: {
        Args: { p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      amortization_type: "sac" | "price"
      app_role: "corretor" | "admin"
      extra_amortization_strategy: "reduce_term" | "reduce_payment"
      reinforcement_frequency: "monthly" | "semiannual" | "annual"
      subscription_plan: "free" | "pro"
      subscription_plan_v2: "basic" | "pro" | "business"
      subscription_status: "active" | "inactive" | "canceled" | "past_due"
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
      amortization_type: ["sac", "price"],
      app_role: ["corretor", "admin"],
      extra_amortization_strategy: ["reduce_term", "reduce_payment"],
      reinforcement_frequency: ["monthly", "semiannual", "annual"],
      subscription_plan: ["free", "pro"],
      subscription_plan_v2: ["basic", "pro", "business"],
      subscription_status: ["active", "inactive", "canceled", "past_due"],
    },
  },
} as const
