import type { CanalType, MembershipStatus, TribbuRole } from './database.types';

export type { CanalType, MembershipStatus, TribbuRole };

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  phone_number: string | null;
  sms_notifications_enabled?: boolean;
  last_seen_at: string;
  created_at: string;
}

export interface GrandeTribbu {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  manitou_id: string;
  settings: {
    allow_pygmee_feux_de_camp: boolean;
    require_emargement_on_annonces: boolean;
    sms_gateway_enabled: boolean;
  };
  created_at: string;
}

export interface Tribbu {
  id: string;
  grande_tribbu_id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  created_by: string | null;
  created_at: string;
}

export interface Tippi {
  id: string;
  tribbu_id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  member_ids: string[];
  created_at: string;
}

export interface FeuDeCamp {
  id: string;
  grande_tribbu_id: string;
  tribbu_id: string | null;
  name: string;
  topic: string | null;
  created_by: string;
  participant_ids: string[];
  created_at: string;
}

export interface Canal {
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
}

export interface MembreRole {
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
  profile?: Profile;
  tribbu_name?: string;
}

export interface MessageAttachment {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'pdf';
  mimeType: 'image/png' | 'image/jpeg' | 'application/pdf';
  size: number;
}

export interface Emargement {
  id: string;
  message_id: string;
  user_id: string;
  confirmed_at: string;
  user?: Pick<Profile, 'id' | 'display_name' | 'avatar_url'>;
}

export interface ChatMessage {
  id: string;
  canal_id: string;
  author_id: string;
  author?: Profile;
  content: string;
  reply_to_message_id: string | null;
  reply_to_message?: {
    id: string;
    author_name: string;
    content: string;
  } | null;
  quoted_excerpt: string | null;
  attachments: MessageAttachment[];
  emargements: Emargement[];
  created_at: string;
  updated_at: string;
}

export interface OpenTab {
  canalId: string;
  title: string;
  type: CanalType;
  parentLabel?: string;
  accentColor?: string;
  pinned?: boolean;
}

export interface PresenceUser {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  role: TribbuRole;
  activeCanalId: string | null;
  isTypingInCanalId: string | null;
  onlineAt: string;
}

export interface CanalMutationSummary {
  canal: Canal;
  unreadCount: number;
  mutatedSinceLastSeen: boolean;
  lastMessagePreview?: string;
  lastMessageAuthor?: string;
  lastMessageAt: string;
  parentTribbuName?: string;
}

