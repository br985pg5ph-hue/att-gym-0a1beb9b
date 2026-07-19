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
      announcements: {
        Row: {
          author_id: string | null
          body: string
          created_at: string
          id: string
          tag: string
          title: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          id?: string
          tag?: string
          title: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          id?: string
          tag?: string
          title?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          class_id: string
          created_at: string
          id: string
          member_id: string
          status: Database["public"]["Enums"]["booking_status"]
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          member_id: string
          status?: Database["public"]["Enums"]["booking_status"]
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          member_id?: string
          status?: Database["public"]["Enums"]["booking_status"]
        }
        Relationships: [
          {
            foreignKeyName: "bookings_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          capacity: number
          coach_id: string | null
          created_at: string
          duration_min: number
          id: string
          starts_at: string
          title: string | null
          type: Database["public"]["Enums"]["class_type"]
        }
        Insert: {
          capacity?: number
          coach_id?: string | null
          created_at?: string
          duration_min?: number
          id?: string
          starts_at: string
          title?: string | null
          type: Database["public"]["Enums"]["class_type"]
        }
        Update: {
          capacity?: number
          coach_id?: string | null
          created_at?: string
          duration_min?: number
          id?: string
          starts_at?: string
          title?: string | null
          type?: Database["public"]["Enums"]["class_type"]
        }
        Relationships: [
          {
            foreignKeyName: "classes_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      coaches: {
        Row: {
          bio: string
          created_at: string
          id: string
          name: string
          photo_url: string | null
          sort_order: number
          specialty: string
        }
        Insert: {
          bio?: string
          created_at?: string
          id?: string
          name: string
          photo_url?: string | null
          sort_order?: number
          specialty: string
        }
        Update: {
          bio?: string
          created_at?: string
          id?: string
          name?: string
          photo_url?: string | null
          sort_order?: number
          specialty?: string
        }
        Relationships: []
      }
      gym_info: {
        Row: {
          address: string
          hours: Json
          id: number
          instagram_url: string | null
          lat: number
          lng: number
          name: string
          phone: string
          whatsapp_number: string | null
        }
        Insert: {
          address: string
          hours?: Json
          id?: number
          instagram_url?: string | null
          lat: number
          lng: number
          name?: string
          phone: string
          whatsapp_number?: string | null
        }
        Update: {
          address?: string
          hours?: Json
          id?: number
          instagram_url?: string | null
          lat?: number
          lng?: number
          name?: string
          phone?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          classes_attended: number
          classes_remaining: number
          created_at: string
          disciplines: string[]
          experience_level: string | null
          goals: string[]
          id: string
          injuries: string | null
          interests: string[]
          membership_status: string
          name: string
          onboarded: boolean
          phone: string | null
          referral_code: string
          role: Database["public"]["Enums"]["app_role"]
          streak: number
          training_frequency: string | null
          wallet_balance: number
        }
        Insert: {
          avatar_url?: string | null
          classes_attended?: number
          classes_remaining?: number
          created_at?: string
          disciplines?: string[]
          experience_level?: string | null
          goals?: string[]
          id: string
          injuries?: string | null
          interests?: string[]
          membership_status?: string
          name?: string
          onboarded?: boolean
          phone?: string | null
          referral_code?: string
          role?: Database["public"]["Enums"]["app_role"]
          streak?: number
          training_frequency?: string | null
          wallet_balance?: number
        }
        Update: {
          avatar_url?: string | null
          classes_attended?: number
          classes_remaining?: number
          created_at?: string
          disciplines?: string[]
          experience_level?: string | null
          goals?: string[]
          id?: string
          injuries?: string | null
          interests?: string[]
          membership_status?: string
          name?: string
          onboarded?: boolean
          phone?: string | null
          referral_code?: string
          role?: Database["public"]["Enums"]["app_role"]
          streak?: number
          training_frequency?: string | null
          wallet_balance?: number
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          member_id: string
          type: Database["public"]["Enums"]["txn_type"]
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string
          id?: string
          member_id: string
          type: Database["public"]["Enums"]["txn_type"]
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          member_id?: string
          type?: Database["public"]["Enums"]["txn_type"]
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
      app_role: "member" | "staff"
      booking_status: "upcoming" | "completed" | "cancelled"
      class_type: "pt" | "women_only" | "mixed" | "kids"
      txn_type: "credit" | "debit"
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
      app_role: ["member", "staff"],
      booking_status: ["upcoming", "completed", "cancelled"],
      class_type: ["pt", "women_only", "mixed", "kids"],
      txn_type: ["credit", "debit"],
    },
  },
} as const
