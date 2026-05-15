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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          balance: number | null
          cleared_balance: number | null
          created_at: string | null
          currency: string | null
          id: string
          institution: string | null
          name: string
          type: string
          user_id: string
        }
        Insert: {
          balance?: number | null
          cleared_balance?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          institution?: string | null
          name: string
          type: string
          user_id: string
        }
        Update: {
          balance?: number | null
          cleared_balance?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          institution?: string | null
          name?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          category: string
          id: string
          is_rollover: boolean | null
          limit_amount: number
          user_id: string
        }
        Insert: {
          category: string
          id?: string
          is_rollover?: boolean | null
          limit_amount: number
          user_id: string
        }
        Update: {
          category?: string
          id?: string
          is_rollover?: boolean | null
          limit_amount?: number
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          type: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          type?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      liabilities: {
        Row: {
          id: string
          interest_rate: number | null
          min_payment: number | null
          name: string
          remaining_amount: number
          total_amount: number
          user_id: string
        }
        Insert: {
          id?: string
          interest_rate?: number | null
          min_payment?: number | null
          name: string
          remaining_amount: number
          total_amount: number
          user_id: string
        }
        Update: {
          id?: string
          interest_rate?: number | null
          min_payment?: number | null
          name?: string
          remaining_amount?: number
          total_amount?: number
          user_id?: string
        }
        Relationships: []
      }
      recurring_rules: {
        Row: {
          account_id: string | null
          amount: number
          category: string
          created_at: string | null
          day_of_month: number
          description: string
          id: string
          last_processed_month: string | null
          type: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category: string
          created_at?: string | null
          day_of_month: number
          description: string
          id?: string
          last_processed_month?: string | null
          type: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category?: string
          created_at?: string | null
          day_of_month?: number
          description?: string
          id?: string
          last_processed_month?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_rules_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_transactions: {
        Row: {
          amount: number
          category: string
          day_of_month: number
          description: string | null
          id: string
          is_active: boolean | null
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          day_of_month: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          day_of_month?: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      savings_goals: {
        Row: {
          current_amount: number | null
          deadline: string | null
          id: string
          name: string
          target_amount: number
          user_id: string
        }
        Insert: {
          current_amount?: number | null
          deadline?: string | null
          id?: string
          name: string
          target_amount: number
          user_id: string
        }
        Update: {
          current_amount?: number | null
          deadline?: string | null
          id?: string
          name?: string
          target_amount?: number
          user_id?: string
        }
        Relationships: []
      }
      transaction_rules: {
        Row: {
          alias_name: string | null
          auto_category: string | null
          auto_tags: string[] | null
          created_at: string | null
          description_pattern: string
          id: string
          is_active: boolean | null
          preferred_account_id: string | null
          user_id: string
        }
        Insert: {
          alias_name?: string | null
          auto_category?: string | null
          auto_tags?: string[] | null
          created_at?: string | null
          description_pattern: string
          id?: string
          is_active?: boolean | null
          preferred_account_id?: string | null
          user_id: string
        }
        Update: {
          alias_name?: string | null
          auto_category?: string | null
          auto_tags?: string[] | null
          created_at?: string | null
          description_pattern?: string
          id?: string
          is_active?: boolean | null
          preferred_account_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_rules_preferred_account_id_fkey"
            columns: ["preferred_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          category: string
          created_at: string | null
          date: string
          debt_id: string | null
          description: string
          goal_id: string | null
          group_id: string | null
          id: string
          is_reconciled: boolean | null
          is_verified: boolean | null
          notes: string | null
          receipt_url: string | null
          recurring_rule_id: string | null
          splits: Json | null
          tags: string[] | null
          to_account_id: string | null
          transaction_date: string
          type: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category: string
          created_at?: string | null
          date?: string
          debt_id?: string | null
          description: string
          goal_id?: string | null
          group_id?: string | null
          id?: string
          is_reconciled?: boolean | null
          is_verified?: boolean | null
          notes?: string | null
          receipt_url?: string | null
          recurring_rule_id?: string | null
          splits?: Json | null
          tags?: string[] | null
          to_account_id?: string | null
          transaction_date?: string
          type?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category?: string
          created_at?: string | null
          date?: string
          debt_id?: string | null
          description?: string
          goal_id?: string | null
          group_id?: string | null
          id?: string
          is_reconciled?: boolean | null
          is_verified?: boolean | null
          notes?: string | null
          receipt_url?: string | null
          recurring_rule_id?: string | null
          splits?: Json | null
          tags?: string[] | null
          to_account_id?: string | null
          transaction_date?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_debt_id_fkey"
            columns: ["debt_id"]
            isOneToOne: false
            referencedRelation: "liabilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "savings_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_recurring_rule_id_fkey"
            columns: ["recurring_rule_id"]
            isOneToOne: false
            referencedRelation: "recurring_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
