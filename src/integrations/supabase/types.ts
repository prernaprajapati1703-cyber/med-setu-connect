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
      emergency_alerts: {
        Row: {
          created_at: string
          id: string
          language: string
          lat: number | null
          lng: number | null
          message: string | null
          status: Database["public"]["Enums"]["alert_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          language?: string
          lat?: number | null
          lng?: number | null
          message?: string | null
          status?: Database["public"]["Enums"]["alert_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          language?: string
          lat?: number | null
          lng?: number | null
          message?: string | null
          status?: Database["public"]["Enums"]["alert_status"]
          user_id?: string
        }
        Relationships: []
      }
      emergency_contacts: {
        Row: {
          created_at: string
          id: string
          name: string
          phone: string
          relation: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          phone: string
          relation?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          phone?: string
          relation?: string | null
          user_id?: string
        }
        Relationships: []
      }
      hospitals: {
        Row: {
          address: string | null
          created_at: string
          emergency_24h: boolean | null
          id: string
          lat: number | null
          lng: number | null
          metadata: Json | null
          name: string
          phone: string | null
          place_id: string | null
          rating: number | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          emergency_24h?: boolean | null
          id?: string
          lat?: number | null
          lng?: number | null
          metadata?: Json | null
          name: string
          phone?: string | null
          place_id?: string | null
          rating?: number | null
        }
        Update: {
          address?: string | null
          created_at?: string
          emergency_24h?: boolean | null
          id?: string
          lat?: number | null
          lng?: number | null
          metadata?: Json | null
          name?: string
          phone?: string | null
          place_id?: string | null
          rating?: number | null
        }
        Relationships: []
      }
      medicine_logs: {
        Row: {
          id: string
          medicine_id: string
          status: string
          taken_at: string
          user_id: string
        }
        Insert: {
          id?: string
          medicine_id: string
          status?: string
          taken_at?: string
          user_id: string
        }
        Update: {
          id?: string
          medicine_id?: string
          status?: string
          taken_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medicine_logs_medicine_id_fkey"
            columns: ["medicine_id"]
            isOneToOne: false
            referencedRelation: "medicines"
            referencedColumns: ["id"]
          },
        ]
      }
      medicines: {
        Row: {
          active: boolean
          created_at: string
          days: number[]
          dosage: string | null
          id: string
          name: string
          notes: string | null
          times: string[]
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          days?: number[]
          dosage?: string | null
          id?: string
          name: string
          notes?: string | null
          times?: string[]
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          days?: number[]
          dosage?: string | null
          id?: string
          name?: string
          notes?: string | null
          times?: string[]
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          aadhaar_last4: string | null
          abha_id: string | null
          age: number | null
          created_at: string
          display_name: string | null
          gender: string | null
          id: string
          phone: string | null
          preferred_language: string
          region: string | null
          updated_at: string
        }
        Insert: {
          aadhaar_last4?: string | null
          abha_id?: string | null
          age?: number | null
          created_at?: string
          display_name?: string | null
          gender?: string | null
          id: string
          phone?: string | null
          preferred_language?: string
          region?: string | null
          updated_at?: string
        }
        Update: {
          aadhaar_last4?: string | null
          abha_id?: string | null
          age?: number | null
          created_at?: string
          display_name?: string | null
          gender?: string | null
          id?: string
          phone?: string | null
          preferred_language?: string
          region?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          ai_response: Json | null
          ai_summary: string | null
          created_at: string
          file_path: string | null
          id: string
          language: string
          mime: string | null
          original_name: string | null
          user_id: string
        }
        Insert: {
          ai_response?: Json | null
          ai_summary?: string | null
          created_at?: string
          file_path?: string | null
          id?: string
          language?: string
          mime?: string | null
          original_name?: string | null
          user_id: string
        }
        Update: {
          ai_response?: Json | null
          ai_summary?: string | null
          created_at?: string
          file_path?: string | null
          id?: string
          language?: string
          mime?: string | null
          original_name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      symptoms: {
        Row: {
          ai_response: Json | null
          condition: string | null
          created_at: string
          id: string
          input_text: string
          language: string
          precautions: Json | null
          region: string | null
          severity: Database["public"]["Enums"]["severity_level"] | null
          specialist: string | null
          user_id: string
        }
        Insert: {
          ai_response?: Json | null
          condition?: string | null
          created_at?: string
          id?: string
          input_text: string
          language?: string
          precautions?: Json | null
          region?: string | null
          severity?: Database["public"]["Enums"]["severity_level"] | null
          specialist?: string | null
          user_id: string
        }
        Update: {
          ai_response?: Json | null
          condition?: string | null
          created_at?: string
          id?: string
          input_text?: string
          language?: string
          precautions?: Json | null
          region?: string | null
          severity?: Database["public"]["Enums"]["severity_level"] | null
          specialist?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ui_translations: {
        Row: {
          created_at: string
          id: string
          key: string
          language: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          language: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          language?: string
          value?: string
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
          role?: Database["public"]["Enums"]["app_role"]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      alert_status: "active" | "resolved" | "cancelled"
      app_role: "user" | "admin"
      severity_level: "low" | "medium" | "high"
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
      alert_status: ["active", "resolved", "cancelled"],
      app_role: ["user", "admin"],
      severity_level: ["low", "medium", "high"],
    },
  },
} as const
