export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type CanalType =
  | 'GRANDE_TRIBBU_ANNONCES'
  | 'AGORA_GENERALE'
  | 'TRIBBU_ANNONCES'
  | 'TRIBBU_AGORA'
  | 'TIPPI'
  | 'FEU_DE_CAMP';

export type TribbuRole = 'MANITOU' | 'CHEF' | 'PYGMEE';

export type MembershipStatus = 'INVITED' | 'ACTIVE' | 'REJECTED';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string;
          avatar_url: string | null;
          phone_number: string | null;
          sms_notifications_enabled: boolean;
          last_seen_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name: string;
          avatar_url?: string | null;
          phone_number?: string | null;
          sms_notifications_enabled?: boolean;
          last_seen_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string;
          avatar_url?: string | null;
          phone_number?: string | null;
          sms_notifications_enabled?: boolean;
          last_seen_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      grande_tribbu: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          logo_url: string | null;
          settings: Json;
          manitou_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          logo_url?: string | null;
          settings?: Json;
          manitou_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          logo_url?: string | null;
          settings?: Json;
          manitou_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tribbus: {
        Row: {
          id: string;
          grande_tribbu_id: string;
          name: string;
          description: string | null;
          color: string;
          icon: string;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          grande_tribbu_id: string;
          name: string;
          description?: string | null;
          color?: string;
          icon?: string;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          color?: string;
          icon?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tippis: {
        Row: {
          id: string;
          tribbu_id: string;
          name: string;
          description: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tribbu_id: string;
          name: string;
          description?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      tippi_membres: {
        Row: {
          id: string;
          tippi_id: string;
          user_id: string;
          added_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tippi_id: string;
          user_id: string;
          added_by?: string | null;
          created_at?: string;
        };
        Update: {
          tippi_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      feux_de_camp: {
        Row: {
          id: string;
          grande_tribbu_id: string;
          tribbu_id: string | null;
          name: string;
          topic: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          grande_tribbu_id: string;
          tribbu_id?: string | null;
          name: string;
          topic?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          topic?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      feu_de_camp_participants: {
        Row: {
          id: string;
          feu_de_camp_id: string;
          user_id: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          feu_de_camp_id: string;
          user_id: string;
          joined_at?: string;
        };
        Update: {
          feu_de_camp_id?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      canaux: {
        Row: {
          id: string;
          type: CanalType;
          name: string;
          description: string | null;
          grande_tribbu_id: string | null;
          tribbu_id: string | null;
          tippi_id: string | null;
          feu_de_camp_id: string | null;
          last_message_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: CanalType;
          name: string;
          description?: string | null;
          grande_tribbu_id?: string | null;
          tribbu_id?: string | null;
          tippi_id?: string | null;
          feu_de_camp_id?: string | null;
          last_message_at?: string;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          last_message_at?: string;
        };
        Relationships: [];
      };
      membres_roles: {
        Row: {
          id: string;
          user_id: string | null;
          invited_email: string | null;
          role: TribbuRole;
          grande_tribbu_id: string;
          tribbu_id: string | null;
          status: MembershipStatus;
          invitation_token: string | null;
          invited_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          invited_email?: string | null;
          role?: TribbuRole;
          grande_tribbu_id: string;
          tribbu_id?: string | null;
          status?: MembershipStatus;
          invitation_token?: string | null;
          invited_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string | null;
          role?: TribbuRole;
          tribbu_id?: string | null;
          status?: MembershipStatus;
          updated_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          canal_id: string;
          author_id: string;
          content: string;
          reply_to_message_id: string | null;
          quoted_excerpt: string | null;
          attachments: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          canal_id: string;
          author_id: string;
          content: string;
          reply_to_message_id?: string | null;
          quoted_excerpt?: string | null;
          attachments?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          content?: string;
          attachments?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      emargements: {
        Row: {
          id: string;
          message_id: string;
          user_id: string;
          confirmed_at: string;
        };
        Insert: {
          id?: string;
          message_id: string;
          user_id: string;
          confirmed_at?: string;
        };
        Update: {
          confirmed_at?: string;
        };
        Relationships: [];
      };
      canal_lectures: {
        Row: {
          id: string;
          canal_id: string;
          user_id: string;
          last_read_at: string;
        };
        Insert: {
          id?: string;
          canal_id: string;
          user_id: string;
          last_read_at?: string;
        };
        Update: {
          last_read_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      canal_type: CanalType;
      tribbu_role: TribbuRole;
      membership_status: MembershipStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
