import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import {
  DEMO_CANAUX,
  DEMO_FEUX_DE_CAMP,
  DEMO_GRANDE_TRIBBU,
  DEMO_MEMBRES_ROLES,
  DEMO_MESSAGES,
  DEMO_PROFILES,
  DEMO_TIPPIS,
  DEMO_TRIBBUS,
} from './demoData';
import type {
  Canal,
  ChatMessage,
  Emargement,
  FeuDeCamp,
  GrandeTribbu,
  MembreRole,
  MessageAttachment,
  Profile,
  Tippi,
  Tribbu,
  TribbuRole,
} from '@/types/tribbu.types';

const STORAGE_KEYS = {
  TRIBBUS: 'tribbu_state_tribbus',
  TIPPIS: 'tribbu_state_tippis',
  FEUX: 'tribbu_state_feux',
  CANAUX: 'tribbu_state_canaux',
  ROLES: 'tribbu_custom_roles',
  MESSAGES: 'tribbu_state_messages',
  PROFILES: 'tribbu_custom_profiles',
};

const broadcastChannel =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('tribbu-realtime-sync')
    : null;

function notifyRealtimeListeners(event: string, payload?: unknown) {
  broadcastChannel?.postMessage({ event, payload, timestamp: Date.now() });
  window.dispatchEvent(
    new CustomEvent('tribbu-local-mutation', { detail: { event, payload } })
  );
}

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota errors
  }
}

export interface HierarchyBundle {
  grandeTribbu: GrandeTribbu;
  tribbus: Tribbu[];
  tippis: Tippi[];
  feuxDeCamp: FeuDeCamp[];
  canaux: Canal[];
  membresRoles: MembreRole[];
  profiles: Profile[];
}

export const chatService = {
  /**
   * Charge toute la hiérarchie de l'association (Grande Tribbu, Tribbus, Tippis, Feux de camp, Canaux, Rôles, Profils).
   */
  async fetchHierarchy(): Promise<HierarchyBundle> {
    if (isSupabaseConfigured) {
      const [
        gtRes,
        tribbusRes,
        tippisRes,
        tippiMembresRes,
        feuxRes,
        fdcPartRes,
        canauxRes,
        rolesRes,
        profilesRes,
      ] = await Promise.all([
        supabase.from('grande_tribbu').select('*').limit(1).maybeSingle(),
        supabase.from('tribbus').select('*').order('created_at', { ascending: true }),
        supabase.from('tippis').select('*').order('created_at', { ascending: true }),
        supabase.from('tippi_membres').select('*'),
        supabase.from('feux_de_camp').select('*').order('created_at', { ascending: true }),
        supabase.from('feu_de_camp_participants').select('*'),
        supabase.from('canaux').select('*').order('created_at', { ascending: true }),
        supabase.from('membres_roles').select('*').order('created_at', { ascending: true }),
        supabase.from('profiles').select('*'),
      ]);

      const profiles = (profilesRes.data as Profile[]) || DEMO_PROFILES;
      const tippiMembres = tippiMembresRes.data || [];
      const fdcParticipants = fdcPartRes.data || [];

      const tippis: Tippi[] = ((tippisRes.data as Omit<Tippi, 'member_ids'>[]) || []).map(
        (t) => ({
          ...t,
          member_ids: tippiMembres
            .filter((tm) => tm.tippi_id === t.id)
            .map((tm) => tm.user_id),
        })
      );

      const feuxDeCamp: FeuDeCamp[] = (
        (feuxRes.data as Omit<FeuDeCamp, 'participant_ids'>[]) || []
      ).map((f) => ({
        ...f,
        participant_ids: fdcParticipants
          .filter((fp) => fp.feu_de_camp_id === f.id)
          .map((fp) => fp.user_id),
      }));

      return {
        grandeTribbu: (gtRes.data as unknown as GrandeTribbu) || DEMO_GRANDE_TRIBBU,
        tribbus: (tribbusRes.data as Tribbu[]) || [],
        tippis,
        feuxDeCamp,
        canaux: (canauxRes.data as Canal[]) || [],
        membresRoles: (rolesRes.data as MembreRole[]) || [],
        profiles,
      };
    }

    const customProfiles = readLocal<Profile[]>(STORAGE_KEYS.PROFILES, []);
    const allProfiles = [...DEMO_PROFILES];
    for (const cp of customProfiles) {
      if (!allProfiles.some((p) => p.id === cp.id)) {
        allProfiles.push(cp);
      }
    }

    return {
      grandeTribbu: DEMO_GRANDE_TRIBBU,
      tribbus: readLocal<Tribbu[]>(STORAGE_KEYS.TRIBBUS, DEMO_TRIBBUS),
      tippis: readLocal<Tippi[]>(STORAGE_KEYS.TIPPIS, DEMO_TIPPIS),
      feuxDeCamp: readLocal<FeuDeCamp[]>(STORAGE_KEYS.FEUX, DEMO_FEUX_DE_CAMP),
      canaux: readLocal<Canal[]>(STORAGE_KEYS.CANAUX, DEMO_CANAUX),
      membresRoles: readLocal<MembreRole[]>(
        STORAGE_KEYS.ROLES,
        DEMO_MEMBRES_ROLES
      ),
      profiles: allProfiles,
    };
  },

  /**
   * Récupère tous les messages (ou d'un canal spécifique) enrichis des auteurs et émargements.
   */
  async fetchMessages(canalId?: string): Promise<ChatMessage[]> {
    const hierarchy = await this.fetchHierarchy();
    const profileMap = new Map(hierarchy.profiles.map((p) => [p.id, p]));

    if (isSupabaseConfigured) {
      let query = supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (canalId) {
        query = query.eq('canal_id', canalId);
      }

      const [{ data: rawMessages }, { data: rawEmargements }] = await Promise.all([
        query,
        supabase.from('emargements').select('*'),
      ]);

      const msgs = rawMessages || [];
      const emargements = rawEmargements || [];
      const msgMap = new Map(msgs.map((m) => [m.id, m]));

      return msgs.map((m) => {
        const author = profileMap.get(m.author_id);
        const replyParent = m.reply_to_message_id
          ? msgMap.get(m.reply_to_message_id)
          : null;
        const replyAuthor = replyParent
          ? profileMap.get(replyParent.author_id)
          : null;

        const msgEmargements: Emargement[] = emargements
          .filter((e) => e.message_id === m.id)
          .map((e) => ({
            ...e,
            user: profileMap.get(e.user_id),
          }));

        return {
          id: m.id,
          canal_id: m.canal_id,
          author_id: m.author_id,
          author,
          content: m.content,
          reply_to_message_id: m.reply_to_message_id,
          reply_to_message: replyParent
            ? {
                id: replyParent.id,
                author_name: replyAuthor?.display_name || 'Membre',
                content: replyParent.content,
              }
            : null,
          quoted_excerpt: m.quoted_excerpt,
          attachments: Array.isArray(m.attachments)
            ? (m.attachments as unknown as MessageAttachment[])
            : [],
          emargements: msgEmargements,
          created_at: m.created_at,
          updated_at: m.updated_at,
        };
      });
    }

    const stored = readLocal<ChatMessage[]>(STORAGE_KEYS.MESSAGES, DEMO_MESSAGES);
    const filtered = canalId
      ? stored.filter((m) => m.canal_id === canalId)
      : stored;

    return filtered.map((m) => ({
      ...m,
      author: profileMap.get(m.author_id),
      emargements: (m.emargements || []).map((em) => ({
        ...em,
        user: profileMap.get(em.user_id),
      })),
    }));
  },

  /**
   * Envoie un nouveau message dans un canal.
   */
  async sendMessage(params: {
    canalId: string;
    authorId: string;
    content: string;
    replyToMessageId?: string | null;
    replyToPreview?: { id: string; author_name: string; content: string } | null;
    quotedExcerpt?: string | null;
    attachments?: MessageAttachment[];
  }): Promise<ChatMessage> {
    const {
      canalId,
      authorId,
      content,
      replyToMessageId = null,
      replyToPreview = null,
      quotedExcerpt = null,
      attachments = [],
    } = params;

    const nowIso = new Date().toISOString();

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          canal_id: canalId,
          author_id: authorId,
          content,
          reply_to_message_id: replyToMessageId,
          quoted_excerpt: quotedExcerpt,
          attachments: attachments as unknown as never,
        })
        .select('*')
        .single();

      if (error || !data) {
        throw new Error(error?.message || "Impossible d'envoyer le message.");
      }

      return {
        id: data.id,
        canal_id: data.canal_id,
        author_id: data.author_id,
        content: data.content,
        reply_to_message_id: data.reply_to_message_id,
        reply_to_message: replyToPreview,
        quoted_excerpt: data.quoted_excerpt,
        attachments,
        emargements: [],
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    }

    const newMessage: ChatMessage = {
      id: `msg-${crypto.randomUUID()}`,
      canal_id: canalId,
      author_id: authorId,
      content,
      reply_to_message_id: replyToMessageId,
      reply_to_message: replyToPreview,
      quoted_excerpt: quotedExcerpt,
      attachments,
      emargements: [],
      created_at: nowIso,
      updated_at: nowIso,
    };

    const allMessages = readLocal<ChatMessage[]>(
      STORAGE_KEYS.MESSAGES,
      DEMO_MESSAGES
    );
    writeLocal(STORAGE_KEYS.MESSAGES, [...allMessages, newMessage]);

    const canaux = readLocal<Canal[]>(STORAGE_KEYS.CANAUX, DEMO_CANAUX);
    writeLocal(
      STORAGE_KEYS.CANAUX,
      canaux.map((c) =>
        c.id === canalId ? { ...c, last_message_at: nowIso } : c
      )
    );

    notifyRealtimeListeners('message:inserted', newMessage);
    return newMessage;
  },

  /**
   * Valide la lecture (Émargement / Read receipt) d'un message d'annonce officielle.
   */
  async confirmEmargement(messageId: string, userId: string): Promise<void> {
    const nowIso = new Date().toISOString();

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('emargements').upsert(
        {
          message_id: messageId,
          user_id: userId,
          confirmed_at: nowIso,
        },
        { onConflict: 'message_id,user_id' }
      );
      if (error) throw new Error(error.message);
      return;
    }

    const allMessages = readLocal<ChatMessage[]>(
      STORAGE_KEYS.MESSAGES,
      DEMO_MESSAGES
    );
    const updated = allMessages.map((msg) => {
      if (msg.id !== messageId) return msg;
      const alreadyConfirmed = msg.emargements.some((e) => e.user_id === userId);
      if (alreadyConfirmed) return msg;

      return {
        ...msg,
        emargements: [
          ...msg.emargements,
          {
            id: `em-${crypto.randomUUID().slice(0, 8)}`,
            message_id: messageId,
            user_id: userId,
            confirmed_at: nowIso,
          },
        ],
      };
    });

    writeLocal(STORAGE_KEYS.MESSAGES, updated);
    notifyRealtimeListeners('emargement:confirmed', { messageId, userId });
  },

  /**
   * Crée une nouvelle Tribbu (Commission/Groupe) avec ses canaux Annonces et Agora.
   */
  async createTribbu(params: {
    name: string;
    description: string;
    color: string;
    createdBy: string;
  }): Promise<{ tribbu: Tribbu; agoraCanal: Canal }> {
    const nowIso = new Date().toISOString();

    if (isSupabaseConfigured) {
      const { data: gt } = await supabase
        .from('grande_tribbu')
        .select('id')
        .limit(1)
        .single();

      const { data: tribbu, error } = await supabase
        .from('tribbus')
        .insert({
          grande_tribbu_id: gt?.id || 'gt-main',
          name: params.name,
          description: params.description,
          color: params.color,
          created_by: params.createdBy,
        })
        .select('*')
        .single();

      if (error || !tribbu) {
        throw new Error(error?.message || 'Erreur lors de la création de la Tribbu.');
      }

      const { data: canaux } = await supabase
        .from('canaux')
        .select('*')
        .eq('tribbu_id', tribbu.id);

      const agoraCanal =
        (canaux as Canal[] | null)?.find((c) => c.type === 'TRIBBU_AGORA') ||
        ((canaux?.[0] as unknown) as Canal);

      return { tribbu: tribbu as Tribbu, agoraCanal };
    }

    const tribbuId = `tribbu-${crypto.randomUUID().slice(0, 8)}`;
    const newTribbu: Tribbu = {
      id: tribbuId,
      grande_tribbu_id: 'gt-main',
      name: params.name,
      description: params.description,
      color: params.color,
      icon: 'compass',
      created_by: params.createdBy,
      created_at: nowIso,
    };

    const annoncesCanal: Canal = {
      id: `canal-${tribbuId}-annonces`,
      type: 'TRIBBU_ANNONCES',
      name: `${params.name} — Annonces`,
      description: `Annonces des Chef(fe)s de la Tribbu ${params.name}`,
      grande_tribbu_id: 'gt-main',
      tribbu_id: tribbuId,
      tippi_id: null,
      feu_de_camp_id: null,
      last_message_at: nowIso,
      created_at: nowIso,
    };

    const agoraCanal: Canal = {
      id: `canal-${tribbuId}-agora`,
      type: 'TRIBBU_AGORA',
      name: `${params.name} — Agora`,
      description: `Agora générale de la Tribbu ${params.name}`,
      grande_tribbu_id: 'gt-main',
      tribbu_id: tribbuId,
      tippi_id: null,
      feu_de_camp_id: null,
      last_message_at: nowIso,
      created_at: nowIso,
    };

    const tribbus = readLocal<Tribbu[]>(STORAGE_KEYS.TRIBBUS, DEMO_TRIBBUS);
    writeLocal(STORAGE_KEYS.TRIBBUS, [...tribbus, newTribbu]);

    const canaux = readLocal<Canal[]>(STORAGE_KEYS.CANAUX, DEMO_CANAUX);
    writeLocal(STORAGE_KEYS.CANAUX, [...canaux, annoncesCanal, agoraCanal]);

    notifyRealtimeListeners('hierarchy:updated');
    return { tribbu: newTribbu, agoraCanal };
  },

  /**
   * Crée un nouveau Tippi rattaché à une Tribbu ainsi que son canal dédié.
   */
  async createTippi(params: {
    tribbuId: string;
    name: string;
    description: string;
    memberIds: string[];
    createdBy: string;
  }): Promise<{ tippi: Tippi; canal: Canal }> {
    const nowIso = new Date().toISOString();
    const uniqueMembers = Array.from(
      new Set([...params.memberIds, params.createdBy])
    );

    if (isSupabaseConfigured) {
      const { data: tippi, error } = await supabase
        .from('tippis')
        .insert({
          tribbu_id: params.tribbuId,
          name: params.name,
          description: params.description,
          created_by: params.createdBy,
        })
        .select('*')
        .single();

      if (error || !tippi) {
        throw new Error(error?.message || 'Erreur lors de la création du Tippi.');
      }

      if (uniqueMembers.length > 0) {
        await supabase.from('tippi_membres').upsert(
          uniqueMembers.map((uid) => ({
            tippi_id: tippi.id,
            user_id: uid,
            added_by: params.createdBy,
          }))
        );
      }

      const { data: canal } = await supabase
        .from('canaux')
        .select('*')
        .eq('tippi_id', tippi.id)
        .single();

      return {
        tippi: { ...(tippi as Omit<Tippi, 'member_ids'>), member_ids: uniqueMembers },
        canal: (canal as unknown) as Canal,
      };
    }

    const tippiId = `tippi-${crypto.randomUUID().slice(0, 8)}`;
    const newTippi: Tippi = {
      id: tippiId,
      tribbu_id: params.tribbuId,
      name: params.name,
      description: params.description,
      created_by: params.createdBy,
      member_ids: uniqueMembers,
      created_at: nowIso,
    };

    const newCanal: Canal = {
      id: `canal-${tippiId}`,
      type: 'TIPPI',
      name: params.name,
      description: params.description || 'Sous-groupe Tippi',
      grande_tribbu_id: 'gt-main',
      tribbu_id: params.tribbuId,
      tippi_id: tippiId,
      feu_de_camp_id: null,
      last_message_at: nowIso,
      created_at: nowIso,
    };

    const tippis = readLocal<Tippi[]>(STORAGE_KEYS.TIPPIS, DEMO_TIPPIS);
    writeLocal(STORAGE_KEYS.TIPPIS, [...tippis, newTippi]);

    const canaux = readLocal<Canal[]>(STORAGE_KEYS.CANAUX, DEMO_CANAUX);
    writeLocal(STORAGE_KEYS.CANAUX, [...canaux, newCanal]);

    notifyRealtimeListeners('hierarchy:updated');
    return { tippi: newTippi, canal: newCanal };
  },

  /**
   * Crée un nouveau Feu de camp (accessible à tout niveau par tout membre, y compris les Pygmées).
   */
  async createFeuDeCamp(params: {
    tribbuId: string | null;
    name: string;
    topic: string;
    participantIds: string[];
    createdBy: string;
  }): Promise<{ feuDeCamp: FeuDeCamp; canal: Canal }> {
    const nowIso = new Date().toISOString();
    const uniqueParticipants = Array.from(
      new Set([...params.participantIds, params.createdBy])
    );

    if (isSupabaseConfigured) {
      const { data: gt } = await supabase
        .from('grande_tribbu')
        .select('id')
        .limit(1)
        .single();

      const { data: fdc, error } = await supabase
        .from('feux_de_camp')
        .insert({
          grande_tribbu_id: gt?.id || 'gt-main',
          tribbu_id: params.tribbuId,
          name: params.name,
          topic: params.topic,
          created_by: params.createdBy,
        })
        .select('*')
        .single();

      if (error || !fdc) {
        throw new Error(error?.message || 'Erreur lors de la création du Feu de camp.');
      }

      await supabase.from('feu_de_camp_participants').upsert(
        uniqueParticipants.map((uid) => ({
          feu_de_camp_id: fdc.id,
          user_id: uid,
        }))
      );

      const { data: canal } = await supabase
        .from('canaux')
        .select('*')
        .eq('feu_de_camp_id', fdc.id)
        .single();

      return {
        feuDeCamp: {
          ...(fdc as Omit<FeuDeCamp, 'participant_ids'>),
          participant_ids: uniqueParticipants,
        },
        canal: (canal as unknown) as Canal,
      };
    }

    const fdcId = `fdc-${crypto.randomUUID().slice(0, 8)}`;
    const newFeu: FeuDeCamp = {
      id: fdcId,
      grande_tribbu_id: 'gt-main',
      tribbu_id: params.tribbuId,
      name: params.name,
      topic: params.topic,
      created_by: params.createdBy,
      participant_ids: uniqueParticipants,
      created_at: nowIso,
    };

    const newCanal: Canal = {
      id: `canal-${fdcId}`,
      type: 'FEU_DE_CAMP',
      name: params.name,
      description: params.topic || 'Feu de camp privé',
      grande_tribbu_id: 'gt-main',
      tribbu_id: params.tribbuId,
      tippi_id: null,
      feu_de_camp_id: fdcId,
      last_message_at: nowIso,
      created_at: nowIso,
    };

    const feux = readLocal<FeuDeCamp[]>(STORAGE_KEYS.FEUX, DEMO_FEUX_DE_CAMP);
    writeLocal(STORAGE_KEYS.FEUX, [...feux, newFeu]);

    const canaux = readLocal<Canal[]>(STORAGE_KEYS.CANAUX, DEMO_CANAUX);
    writeLocal(STORAGE_KEYS.CANAUX, [...canaux, newCanal]);

    notifyRealtimeListeners('hierarchy:updated');
    return { feuDeCamp: newFeu, canal: newCanal };
  },

  /**
   * Génère une invitation par e-mail avec token unique rattachée à une Tribbu.
   */
  async createInvitation(params: {
    email: string;
    tribbuId: string;
    role: TribbuRole;
    invitedBy: string;
  }): Promise<{ invitation: MembreRole; invitationUrl: string }> {
    const token = `tribbu_${crypto.randomUUID().replace(/-/g, '')}`;
    const nowIso = new Date().toISOString();
    const baseUrl =
      import.meta.env.VITE_APP_URL ||
      (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173');

    const invitationUrl = `${baseUrl}/?invite_token=${encodeURIComponent(
      token
    )}&email=${encodeURIComponent(params.email)}&tribbu_id=${encodeURIComponent(
      params.tribbuId
    )}`;

    if (isSupabaseConfigured) {
      const { data: gt } = await supabase
        .from('grande_tribbu')
        .select('id')
        .limit(1)
        .single();

      const { data, error } = await supabase
        .from('membres_roles')
        .insert({
          invited_email: params.email,
          role: params.role,
          grande_tribbu_id: gt?.id || 'gt-main',
          tribbu_id: params.tribbuId,
          status: 'INVITED',
          invitation_token: token,
          invited_by: params.invitedBy,
        })
        .select('*')
        .single();

      if (error || !data) {
        throw new Error(error?.message || "Impossible de créer l'invitation.");
      }

      return { invitation: data as MembreRole, invitationUrl };
    }

    const newInvite: MembreRole = {
      id: `mr-${crypto.randomUUID().slice(0, 8)}`,
      user_id: null,
      invited_email: params.email,
      role: params.role,
      grande_tribbu_id: 'gt-main',
      tribbu_id: params.tribbuId,
      status: 'INVITED',
      invitation_token: token,
      invited_by: params.invitedBy,
      created_at: nowIso,
    };

    const roles = readLocal<MembreRole[]>(
      STORAGE_KEYS.ROLES,
      DEMO_MEMBRES_ROLES
    );
    writeLocal(STORAGE_KEYS.ROLES, [...roles, newInvite]);
    notifyRealtimeListeners('hierarchy:updated');

    return { invitation: newInvite, invitationUrl };
  },

  /**
   * Met à jour le rôle (MANITOU, CHEF, PYGMEE) ou le statut d'un membre dans une Tribbu.
   */
  async updateMemberRole(params: {
    roleRecordId: string;
    role: TribbuRole;
    status?: 'ACTIVE' | 'REJECTED';
  }): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase
        .from('membres_roles')
        .update({
          role: params.role,
          ...(params.status ? { status: params.status } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.roleRecordId);

      if (error) throw new Error(error.message);
      return;
    }

    const roles = readLocal<MembreRole[]>(
      STORAGE_KEYS.ROLES,
      DEMO_MEMBRES_ROLES
    );
    const updated = roles.map((r) =>
      r.id === params.roleRecordId
        ? {
            ...r,
            role: params.role,
            status: params.status || r.status,
          }
        : r
    );
    writeLocal(STORAGE_KEYS.ROLES, updated);
    notifyRealtimeListeners('hierarchy:updated');
  },

  /**
   * Ajoute un membre existant à une Tribbu avec un rôle défini.
   */
  async assignMemberToTribbu(params: {
    userId: string;
    tribbuId: string;
    role: TribbuRole;
    assignedBy: string;
  }): Promise<void> {
    if (isSupabaseConfigured) {
      const { data: gt } = await supabase
        .from('grande_tribbu')
        .select('id')
        .limit(1)
        .single();

      await supabase.from('membres_roles').insert({
        user_id: params.userId,
        role: params.role,
        grande_tribbu_id: gt?.id || 'gt-main',
        tribbu_id: params.tribbuId,
        status: 'ACTIVE',
        invited_by: params.assignedBy,
      });
      return;
    }

    const roles = readLocal<MembreRole[]>(
      STORAGE_KEYS.ROLES,
      DEMO_MEMBRES_ROLES
    );
    const exists = roles.some(
      (r) => r.user_id === params.userId && r.tribbu_id === params.tribbuId
    );
    if (!exists) {
      roles.push({
        id: `mr-${crypto.randomUUID().slice(0, 8)}`,
        user_id: params.userId,
        invited_email: null,
        role: params.role,
        grande_tribbu_id: 'gt-main',
        tribbu_id: params.tribbuId,
        status: 'ACTIVE',
        invitation_token: null,
        invited_by: params.assignedBy,
        created_at: new Date().toISOString(),
      });
      writeLocal(STORAGE_KEYS.ROLES, roles);
      notifyRealtimeListeners('hierarchy:updated');
    }
  },
};

