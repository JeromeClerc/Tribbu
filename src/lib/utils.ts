import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type {
  Canal,
  CanalType,
  FeuDeCamp,
  MembreRole,
  Tippi,
  TribbuRole,
} from '@/types/tribbu.types';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatTimeFr(isoDate: string): string {
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(isoDate));
  } catch {
    return '';
  }
}

export function formatDateHeaderFr(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return "Aujourd'hui";

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Hier';

    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(d);
  } catch {
    return '';
  }
}

export function formatRelativeTimeFr(isoDate: string): string {
  try {
    const diffMs = Date.now() - new Date(isoDate).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "À l'instant";
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays} j`;
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
    }).format(new Date(isoDate));
  } catch {
    return '';
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} Ko`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} Mo`;
}

export function getInitials(name: string): string {
  if (!name) return 'TR';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function getRoleLabelFr(role: TribbuRole): string {
  switch (role) {
    case 'MANITOU':
      return 'Grand Manitou';
    case 'CHEF':
      return 'Chef(fe) de Tribbu';
    case 'PYGMEE':
      return 'Pygmée';
  }
}

export function getRoleBadgeClasses(role: TribbuRole): string {
  switch (role) {
    case 'MANITOU':
      return 'bg-tribbu-purple/15 text-tribbu-purple-light border-tribbu-purple/40';
    case 'CHEF':
      return 'bg-tribbu-teal/15 text-tribbu-teal-light border-tribbu-teal/40';
    case 'PYGMEE':
      return 'bg-tribbu-green/15 text-tribbu-green-light border-tribbu-green/40';
  }
}

export function getCanalTypeLabelFr(type: CanalType): string {
  switch (type) {
    case 'GRANDE_TRIBBU_ANNONCES':
      return 'Annonces Grande Tribbu';
    case 'AGORA_GENERALE':
      return 'Agora Générale';
    case 'TRIBBU_ANNONCES':
      return 'Annonces de Tribbu';
    case 'TRIBBU_AGORA':
      return 'Agora de Tribbu';
    case 'TIPPI':
      return 'Tippi (Sous-groupe)';
    case 'FEU_DE_CAMP':
      return 'Feu de camp';
  }
}

/**
 * Découpe un texte en segments (texte brut ou URL) pour convertir automatiquement
 * les liens en balises <a> sécurisées sans risque d'injection HTML.
 */
export interface TextSegment {
  type: 'text' | 'link';
  value: string;
  href?: string;
}

const URL_REGEX = /((?:https?:\/\/|www\.)[^\s<>"']+)/gi;

export function parseTextWithLinks(text: string): TextSegment[] {
  if (!text) return [];
  const segments: TextSegment[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(URL_REGEX)) {
    const matchIndex = match.index ?? 0;
    if (matchIndex > lastIndex) {
      segments.push({
        type: 'text',
        value: text.slice(lastIndex, matchIndex),
      });
    }
    const rawUrl = match[0];
    const href = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
    segments.push({
      type: 'link',
      value: rawUrl,
      href,
    });
    lastIndex = matchIndex + rawUrl.length;
  }

  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      value: text.slice(lastIndex),
    });
  }

  return segments;
}

/**
 * Vérifie si un utilisateur a le droit de LIRE un canal selon la hiérarchie RLS Tribbu.
 */
export function canUserReadCanal(params: {
  userId: string;
  globalRole: TribbuRole;
  canal: Canal;
  userRoles: MembreRole[];
  tippis: Tippi[];
  feuxDeCamp: FeuDeCamp[];
}): boolean {
  const { userId, globalRole, canal, userRoles, tippis, feuxDeCamp } = params;
  if (globalRole === 'MANITOU') return true;

  const activeRoles = userRoles.filter(
    (r) => r.user_id === userId && r.status === 'ACTIVE'
  );

  switch (canal.type) {
    case 'GRANDE_TRIBBU_ANNONCES':
    case 'AGORA_GENERALE':
      return true;

    case 'TRIBBU_ANNONCES':
    case 'TRIBBU_AGORA':
      return activeRoles.some((r) => r.tribbu_id === canal.tribbu_id);

    case 'TIPPI': {
      const tippi = tippis.find((t) => t.id === canal.tippi_id);
      if (!tippi) return false;
      const isChefOfParent = activeRoles.some(
        (r) => r.tribbu_id === tippi.tribbu_id && r.role === 'CHEF'
      );
      if (isChefOfParent) return true;
      return tippi.member_ids.includes(userId);
    }

    case 'FEU_DE_CAMP': {
      const fdc = feuxDeCamp.find((f) => f.id === canal.feu_de_camp_id);
      if (!fdc) return false;
      if (fdc.created_by === userId || fdc.participant_ids.includes(userId)) {
        return true;
      }
      if (fdc.tribbu_id) {
        return activeRoles.some(
          (r) => r.tribbu_id === fdc.tribbu_id && r.role === 'CHEF'
        );
      }
      return false;
    }

    default:
      return false;
  }
}

/**
 * Vérifie si un utilisateur a le droit d'ÉCRIRE dans un canal.
 * Seuls le Grand Manitou et les Chefs peuvent écrire dans GRANDE_TRIBBU_ANNONCES.
 * Seuls le Grand Manitou et les Chefs de la Tribbu peuvent écrire dans TRIBBU_ANNONCES.
 */
export function canUserWriteToCanal(params: {
  userId: string;
  globalRole: TribbuRole;
  canal: Canal;
  userRoles: MembreRole[];
  tippis: Tippi[];
  feuxDeCamp: FeuDeCamp[];
}): boolean {
  const { userId, globalRole, canal, userRoles } = params;
  if (globalRole === 'MANITOU') return true;

  const activeRoles = userRoles.filter(
    (r) => r.user_id === userId && r.status === 'ACTIVE'
  );
  const isAnyChef =
    globalRole === 'CHEF' || activeRoles.some((r) => r.role === 'CHEF');

  if (canal.type === 'GRANDE_TRIBBU_ANNONCES') {
    return isAnyChef;
  }

  if (canal.type === 'TRIBBU_ANNONCES') {
    return activeRoles.some(
      (r) => r.tribbu_id === canal.tribbu_id && r.role === 'CHEF'
    );
  }

  return canUserReadCanal(params);
}

