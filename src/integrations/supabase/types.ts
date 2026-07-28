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
          gym_id: string
          id: string
          tag: string
          title: string
        }
        Insert: {
          author_id?: string | null
          body: string
          created_at?: string
          gym_id: string
          id?: string
          tag?: string
          title: string
        }
        Update: {
          author_id?: string | null
          body?: string
          created_at?: string
          gym_id?: string
          id?: string
          tag?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          child_id: string | null
          class_id: string
          created_at: string
          gym_id: string
          id: string
          member_id: string
          status: Database["public"]["Enums"]["booking_status"]
        }
        Insert: {
          child_id?: string | null
          class_id: string
          created_at?: string
          gym_id: string
          id?: string
          member_id: string
          status?: Database["public"]["Enums"]["booking_status"]
        }
        Update: {
          child_id?: string | null
          class_id?: string
          created_at?: string
          gym_id?: string
          id?: string
          member_id?: string
          status?: Database["public"]["Enums"]["booking_status"]
        }
        Relationships: [
          {
            foreignKeyName: "bookings_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      children: {
        Row: {
          avatar_url: string | null
          classes_attended: number
          created_at: string
          date_of_birth: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          experience_level: string | null
          gender: string | null
          group_subscription_started_at: string | null
          group_subscription_until: string | null
          group_track: string | null
          gym_id: string
          id: string
          injuries_notes: string | null
          name: string
          parent_id: string
          pt_sessions_remaining: number
          streak: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          classes_attended?: number
          created_at?: string
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          experience_level?: string | null
          gender?: string | null
          group_subscription_started_at?: string | null
          group_subscription_until?: string | null
          group_track?: string | null
          gym_id: string
          id?: string
          injuries_notes?: string | null
          name: string
          parent_id: string
          pt_sessions_remaining?: number
          streak?: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          classes_attended?: number
          created_at?: string
          date_of_birth?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          experience_level?: string | null
          gender?: string | null
          group_subscription_started_at?: string | null
          group_subscription_until?: string | null
          group_track?: string | null
          gym_id?: string
          id?: string
          injuries_notes?: string | null
          name?: string
          parent_id?: string
          pt_sessions_remaining?: number
          streak?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "children_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "children_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_type_defs: {
        Row: {
          active: boolean
          created_at: string
          credit_source: string
          gender_restriction: string
          gym_id: string
          is_builtin: boolean
          key: string
          kids_only: boolean
          label: string
          sort_order: number
          track_restricted: boolean
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          credit_source?: string
          gender_restriction?: string
          gym_id: string
          is_builtin?: boolean
          key: string
          kids_only?: boolean
          label: string
          sort_order?: number
          track_restricted?: boolean
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          credit_source?: string
          gender_restriction?: string
          gym_id?: string
          is_builtin?: boolean
          key?: string
          kids_only?: boolean
          label?: string
          sort_order?: number
          track_restricted?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_type_defs_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          cancelled_at: string | null
          capacity: number
          coach_id: string | null
          created_at: string
          duration_min: number
          gym_id: string
          id: string
          starts_at: string
          title: string | null
          type: string
        }
        Insert: {
          cancelled_at?: string | null
          capacity?: number
          coach_id?: string | null
          created_at?: string
          duration_min?: number
          gym_id: string
          id?: string
          starts_at: string
          title?: string | null
          type?: string
        }
        Update: {
          cancelled_at?: string | null
          capacity?: number
          coach_id?: string | null
          created_at?: string
          duration_min?: number
          gym_id?: string
          id?: string
          starts_at?: string
          title?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_gym_type_fkey"
            columns: ["gym_id", "type"]
            isOneToOne: false
            referencedRelation: "class_type_defs"
            referencedColumns: ["gym_id", "key"]
          },
        ]
      }
      coaches: {
        Row: {
          bio: string
          created_at: string
          gym_id: string
          id: string
          name: string
          photo_url: string | null
          sort_order: number
          specialty: string
        }
        Insert: {
          bio?: string
          created_at?: string
          gym_id: string
          id?: string
          name: string
          photo_url?: string | null
          sort_order?: number
          specialty: string
        }
        Update: {
          bio?: string
          created_at?: string
          gym_id?: string
          id?: string
          name?: string
          photo_url?: string | null
          sort_order?: number
          specialty?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaches_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
      gyms: {
        Row: {
          address: string
          created_at: string
          hours: Json
          id: string
          instagram_url: string | null
          lat: number
          lng: number
          logo_url: string | null
          maps_url: string | null
          name: string
          phone: string
          primary_color: string | null
          secondary_color: string | null
          slug: string
          status: string
          theme: Json
          whatsapp_number: string | null
        }
        Insert: {
          address?: string
          created_at?: string
          hours?: Json
          id?: string
          instagram_url?: string | null
          lat?: number
          lng?: number
          logo_url?: string | null
          maps_url?: string | null
          name: string
          phone?: string
          primary_color?: string | null
          secondary_color?: string | null
          slug: string
          status?: string
          theme?: Json
          whatsapp_number?: string | null
        }
        Update: {
          address?: string
          created_at?: string
          hours?: Json
          id?: string
          instagram_url?: string | null
          lat?: number
          lng?: number
          logo_url?: string | null
          maps_url?: string | null
          name?: string
          phone?: string
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string
          status?: string
          theme?: Json
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          classes_attended: number
          created_at: string
          date_of_birth: string | null
          disciplines: string[]
          experience_level: string | null
          gender: string | null
          goals: string[]
          group_subscription_started_at: string | null
          group_subscription_until: string | null
          group_track: string | null
          gym_id: string
          id: string
          injuries: string | null
          interests: string[]
          is_parent: boolean
          member_code: string
          membership_pause_days_used: number
          membership_paused_at: string | null
          membership_status: string
          name: string
          onboarded: boolean
          phone: string | null
          pt_sessions_remaining: number
          referral_code: string
          referral_reward_granted: boolean
          referred_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          streak: number
          tour_completed_at: string | null
          training_frequency: string | null
        }
        Insert: {
          avatar_url?: string | null
          classes_attended?: number
          created_at?: string
          date_of_birth?: string | null
          disciplines?: string[]
          experience_level?: string | null
          gender?: string | null
          goals?: string[]
          group_subscription_started_at?: string | null
          group_subscription_until?: string | null
          group_track?: string | null
          gym_id: string
          id: string
          injuries?: string | null
          interests?: string[]
          is_parent?: boolean
          member_code: string
          membership_pause_days_used?: number
          membership_paused_at?: string | null
          membership_status?: string
          name?: string
          onboarded?: boolean
          phone?: string | null
          pt_sessions_remaining?: number
          referral_code?: string
          referral_reward_granted?: boolean
          referred_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          streak?: number
          tour_completed_at?: string | null
          training_frequency?: string | null
        }
        Update: {
          avatar_url?: string | null
          classes_attended?: number
          created_at?: string
          date_of_birth?: string | null
          disciplines?: string[]
          experience_level?: string | null
          gender?: string | null
          goals?: string[]
          group_subscription_started_at?: string | null
          group_subscription_until?: string | null
          group_track?: string | null
          gym_id?: string
          id?: string
          injuries?: string | null
          interests?: string[]
          is_parent?: boolean
          member_code?: string
          membership_pause_days_used?: number
          membership_paused_at?: string | null
          membership_status?: string
          name?: string
          onboarded?: boolean
          phone?: string | null
          pt_sessions_remaining?: number
          referral_code?: string
          referral_reward_granted?: boolean
          referred_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          streak?: number
          tour_completed_at?: string | null
          training_frequency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          child_id: string | null
          classes: number
          created_at: string
          created_by: string | null
          days: number | null
          description: string | null
          gym_id: string
          id: string
          member_id: string
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          service: string
          source: string
          type: Database["public"]["Enums"]["txn_type"]
        }
        Insert: {
          child_id?: string | null
          classes: number
          created_at?: string
          created_by?: string | null
          days?: number | null
          description?: string | null
          gym_id: string
          id?: string
          member_id: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          service?: string
          source?: string
          type: Database["public"]["Enums"]["txn_type"]
        }
        Update: {
          child_id?: string | null
          classes?: number
          created_at?: string
          created_by?: string | null
          days?: number | null
          description?: string | null
          gym_id?: string
          id?: string
          member_id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          service?: string
          source?: string
          type?: Database["public"]["Enums"]["txn_type"]
        }
        Relationships: [
          {
            foreignKeyName: "transactions_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_gym_id_fkey"
            columns: ["gym_id"]
            isOneToOne: false
            referencedRelation: "gyms"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_gym_id: { Args: never; Returns: string }
      get_referral_stats: {
        Args: never
        Returns: {
          joined: number
          rewards: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_platform_admin: { Args: never; Returns: boolean }
      pause_membership: {
        Args: { target_user: string }
        Returns: {
          avatar_url: string | null
          classes_attended: number
          created_at: string
          date_of_birth: string | null
          disciplines: string[]
          experience_level: string | null
          gender: string | null
          goals: string[]
          group_subscription_started_at: string | null
          group_subscription_until: string | null
          group_track: string | null
          gym_id: string
          id: string
          injuries: string | null
          interests: string[]
          is_parent: boolean
          member_code: string
          membership_pause_days_used: number
          membership_paused_at: string | null
          membership_status: string
          name: string
          onboarded: boolean
          phone: string | null
          pt_sessions_remaining: number
          referral_code: string
          referral_reward_granted: boolean
          referred_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          streak: number
          tour_completed_at: string | null
          training_frequency: string | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resume_membership: {
        Args: { target_user: string }
        Returns: {
          avatar_url: string | null
          classes_attended: number
          created_at: string
          date_of_birth: string | null
          disciplines: string[]
          experience_level: string | null
          gender: string | null
          goals: string[]
          group_subscription_started_at: string | null
          group_subscription_until: string | null
          group_track: string | null
          gym_id: string
          id: string
          injuries: string | null
          interests: string[]
          is_parent: boolean
          member_code: string
          membership_pause_days_used: number
          membership_paused_at: string | null
          membership_status: string
          name: string
          onboarded: boolean
          phone: string | null
          pt_sessions_remaining: number
          referral_code: string
          referral_reward_granted: boolean
          referred_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          streak: number
          tour_completed_at: string | null
          training_frequency: string | null
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      same_gym: { Args: { _gym_id: string }; Returns: boolean }
      set_group_track: {
        Args: { target_child: string; target_user: string; track: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "member" | "staff" | "admin" | "owner"
      booking_status: "upcoming" | "completed" | "cancelled"
      payment_method: "cash" | "card"
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
      app_role: ["member", "staff", "admin", "owner"],
      booking_status: ["upcoming", "completed", "cancelled"],
      payment_method: ["cash", "card"],
      txn_type: ["credit", "debit"],
    },
  },
} as const
