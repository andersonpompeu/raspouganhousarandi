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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          badge_color: string
          created_at: string
          description: string
          icon: string
          id: string
          name: string
          requirement_type: string
          requirement_value: number
        }
        Insert: {
          badge_color?: string
          created_at?: string
          description: string
          icon: string
          id?: string
          name: string
          requirement_type: string
          requirement_value?: number
        }
        Update: {
          badge_color?: string
          created_at?: string
          description?: string
          icon?: string
          id?: string
          name?: string
          requirement_type?: string
          requirement_value?: number
        }
        Relationships: []
      }
      companies: {
        Row: {
          commission_percentage: number
          contact_email: string | null
          contact_phone: string
          created_at: string
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          commission_percentage?: number
          contact_email?: string | null
          contact_phone: string
          created_at?: string
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          commission_percentage?: number
          contact_email?: string | null
          contact_phone?: string
          created_at?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      customer_achievements: {
        Row: {
          achievement_id: string
          customer_phone: string
          id: string
          unlocked_at: string
        }
        Insert: {
          achievement_id: string
          customer_phone: string
          id?: string
          unlocked_at?: string
        }
        Update: {
          achievement_id?: string
          customer_phone?: string
          id?: string
          unlocked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_loyalty: {
        Row: {
          auth_code: string | null
          auth_code_expires_at: string | null
          created_at: string
          customer_name: string
          customer_phone: string
          id: string
          last_login_at: string | null
          last_redemption_at: string | null
          points: number
          tier: string
          total_prizes_won: number
          updated_at: string
        }
        Insert: {
          auth_code?: string | null
          auth_code_expires_at?: string | null
          created_at?: string
          customer_name: string
          customer_phone: string
          id?: string
          last_login_at?: string | null
          last_redemption_at?: string | null
          points?: number
          tier?: string
          total_prizes_won?: number
          updated_at?: string
        }
        Update: {
          auth_code?: string | null
          auth_code_expires_at?: string | null
          created_at?: string
          customer_name?: string
          customer_phone?: string
          id?: string
          last_login_at?: string | null
          last_redemption_at?: string | null
          points?: number
          tier?: string
          total_prizes_won?: number
          updated_at?: string
        }
        Relationships: []
      }
      digital_receipts: {
        Row: {
          generated_at: string
          id: string
          qr_code_data: string
          receipt_url: string
          registration_id: string
        }
        Insert: {
          generated_at?: string
          id?: string
          qr_code_data: string
          receipt_url: string
          registration_id: string
        }
        Update: {
          generated_at?: string
          id?: string
          qr_code_data?: string
          receipt_url?: string
          registration_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_receipts_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          scratch_card_id: string | null
          transaction_type: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          scratch_card_id?: string | null
          transaction_type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          scratch_card_id?: string | null
          transaction_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_scratch_card_id_fkey"
            columns: ["scratch_card_id"]
            isOneToOne: false
            referencedRelation: "scratch_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_queue: {
        Row: {
          attempts: number | null
          created_at: string | null
          customer_name: string
          customer_phone: string
          error_message: string | null
          id: string
          last_attempt_at: string | null
          notification_type: string
          prize_name: string | null
          registration_id: string | null
          scheduled_for: string
          serial_code: string | null
          status: string
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          customer_name: string
          customer_phone: string
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          notification_type: string
          prize_name?: string | null
          registration_id?: string | null
          scheduled_for: string
          serial_code?: string | null
          status?: string
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          customer_name?: string
          customer_phone?: string
          error_message?: string | null
          id?: string
          last_attempt_at?: string | null
          notification_type?: string
          prize_name?: string | null
          registration_id?: string | null
          scheduled_for?: string
          serial_code?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_queue_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      prizes: {
        Row: {
          cost_to_company: number
          created_at: string
          description: string | null
          distributed_quantity: number
          id: string
          name: string
          platform_commission_percentage: number | null
          prize_value: number
          total_quantity: number
          updated_at: string
        }
        Insert: {
          cost_to_company?: number
          created_at?: string
          description?: string | null
          distributed_quantity?: number
          id?: string
          name: string
          platform_commission_percentage?: number | null
          prize_value?: number
          total_quantity?: number
          updated_at?: string
        }
        Update: {
          cost_to_company?: number
          created_at?: string
          description?: string | null
          distributed_quantity?: number
          id?: string
          name?: string
          platform_commission_percentage?: number | null
          prize_value?: number
          total_quantity?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      redemptions: {
        Row: {
          attendant_name: string
          id: string
          notes: string | null
          redeemed_at: string
          scratch_card_id: string
        }
        Insert: {
          attendant_name: string
          id?: string
          notes?: string | null
          redeemed_at?: string
          scratch_card_id: string
        }
        Update: {
          attendant_name?: string
          id?: string
          notes?: string | null
          redeemed_at?: string
          scratch_card_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "redemptions_scratch_card_id_fkey"
            columns: ["scratch_card_id"]
            isOneToOne: false
            referencedRelation: "scratch_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      registrations: {
        Row: {
          customer_email: string
          customer_name: string
          customer_phone: string
          id: string
          registered_at: string
          reminded_at: string | null
          scratch_card_id: string
        }
        Insert: {
          customer_email: string
          customer_name: string
          customer_phone: string
          id?: string
          registered_at?: string
          reminded_at?: string | null
          scratch_card_id: string
        }
        Update: {
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          id?: string
          registered_at?: string
          reminded_at?: string | null
          scratch_card_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "registrations_scratch_card_id_fkey"
            columns: ["scratch_card_id"]
            isOneToOne: false
            referencedRelation: "scratch_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      scratch_cards: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          prize_id: string | null
          production_cost: number
          qr_code_url: string | null
          sale_price: number
          serial_code: string
          status: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          prize_id?: string | null
          production_cost?: number
          qr_code_url?: string | null
          sale_price?: number
          serial_code: string
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          prize_id?: string | null
          production_cost?: number
          qr_code_url?: string | null
          sale_price?: number
          serial_code?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scratch_cards_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scratch_cards_prize_id_fkey"
            columns: ["prize_id"]
            isOneToOne: false
            referencedRelation: "prizes"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_logs: {
        Row: {
          attempts: number | null
          created_at: string | null
          customer_name: string | null
          customer_phone: string
          error_message: string | null
          id: string
          prize_name: string | null
          response_body: Json | null
          response_status: number | null
          serial_code: string | null
          status: string
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone: string
          error_message?: string | null
          id?: string
          prize_name?: string | null
          response_body?: Json | null
          response_status?: number | null
          serial_code?: string | null
          status: string
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          customer_name?: string | null
          customer_phone?: string
          error_message?: string | null
          id?: string
          prize_name?: string | null
          response_body?: Json | null
          response_status?: number | null
          serial_code?: string | null
          status?: string
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          bot_response: string | null
          created_at: string
          customer_phone: string
          id: string
          message_text: string
          message_type: string
          processed: boolean
        }
        Insert: {
          bot_response?: string | null
          created_at?: string
          customer_phone: string
          id?: string
          message_text: string
          message_type: string
          processed?: boolean
        }
        Update: {
          bot_response?: string | null
          created_at?: string
          customer_phone?: string
          id?: string
          message_text?: string
          message_type?: string
          processed?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_company: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "company_partner"
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
      app_role: ["admin", "company_partner"],
    },
  },
} as const
