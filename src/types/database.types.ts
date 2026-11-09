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

/**
 * Schéma des collections Cloud Firestore pour Tribbu
 */
export interface FirestoreCollections {
  profiles: {
    id: string;
    email: string;
    display_name: string;
    avatar_url: string | null;
    phone_number: string | null;
    sms_notifications_enabled: boolean;
    global_role?: TribbuRole;
    tribbu_ids?: string[];
    chef_tribbu_ids?: string[];
    last_seen_at: string;
    created_at: string;
    updated_at: string;
  };
  grande_tribbu: {
    id: string;
    name: string;
    description: string | null;
    logo_url: string | null;
    settings: Json;
    manitou_id: string;
    created_at: string;
    updated_at: string;
  };
  tribbus: {
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
  tippis: {
    id: string;
    tribbu_id: string;
    name: string;
    description: string | null;
    created_by: string | null;
    member_ids: string[];
    created_at: string;
    updated_at: string;
  };
  feux_de_camp: {
    id: string;
    grande_tribbu_id: string;
    tribbu_id: string | null;
    name: string;
    topic: string | null;
    created_by: string;
    participant_ids: string[];
    created_at: string;
    updated_at: string;
  };
  canaux: {
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
  membres_roles: {
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
  messages: {
    id: string;
    canal_id: string;
    author_id: string;
    content: string;
    reply_to_message_id: string | null;
    quoted_excerpt: string | null;
    mentioned_user_ids: string[];
    mentioned_names: string[];
    attachments: Json;
    created_at: string;
    updated_at: string;
  };
  emargements: {
    id: string;
    message_id: string;
    user_id: string;
    confirmed_at: string;
  };
  canal_lectures: {
    id: string;
    canal_id: string;
    user_id: string;
    last_read_at: string;
  };
}
