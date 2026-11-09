import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { firestoreDb, isFirebaseConfigured } from '@/lib/firebaseClient';
import { extractMentionsFromContent } from '@/lib/utils';
import { authService } from './authService';
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
    // Ignore storage quota errors
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
   * Charge toute la hiérarchie de l'association depuis Cloud Firestore (ou stockage local en mode démo).
   */
  async fetchHierarchy(): Promise<HierarchyBundle> {
    if (isFirebaseConfigured && firestoreDb) {
      const [
        gtSnap,
        tribbusSnap,
        tippisSnap,
        feuxSnap,
        canauxSnap,
        rolesSnap,
        profilesSnap,
      ] = await Promise.all([
        getDocs(collection(firestoreDb, 'grande_tribbu')),
        getDocs(
          query(collection(firestoreDb, 'tribbus'), orderBy('created_at', 'asc'))
        ),
        getDocs(
          query(collection(firestoreDb, 'tippis'), orderBy('created_at', 'asc'))
        ),
        getDocs(
          query(
            collection(firestoreDb, 'feux_de_camp'),
            orderBy('created_at', 'asc')
          )
        ),
        getDocs(
          query(collection(firestoreDb, 'canaux'), orderBy('created_at', 'asc'))
        ),
        getDocs(collection(firestoreDb, 'membres_roles')),
        getDocs(collection(firestoreDb, 'profiles')),
      ]);

      const grandeTribbu = !gtSnap.empty
        ? ({
            id: gtSnap.docs[0].id,
            ...gtSnap.docs[0].data(),
          } as GrandeTribbu)
        : DEMO_GRANDE_TRIBBU;

      const tribbus = tribbusSnap.docs.map(
        (d) => ({ id: d.id, ...(d.data() as Omit<Tribbu, 'id'>) })
      );
      const tippis = tippisSnap.docs.map(
        (d) => ({
          ...(d.data() as Omit<Tippi, 'id'>),
          id: d.id,
        })
      );
      const feuxDeCamp = feuxSnap.docs.map(
        (d) => ({
          ...(d.data() as Omit<FeuDeCamp, 'id'>),
          id: d.id,
        })
      );
      const canaux = canauxSnap.docs.map(
        (d) => ({ id: d.id, ...(d.data() as Omit<Canal, 'id'>) })
      );
      const membresRoles = rolesSnap.docs.map(
        (d) => ({ id: d.id, ...(d.data() as Omit<MembreRole, 'id'>) })
      );
      const profiles = profilesSnap.docs.map(
        (d) => ({ id: d.id, ...(d.data() as Omit<Profile, 'id'>) })
      );

      return {
        grandeTribbu,
        tribbus,
        tippis,
        feuxDeCamp,
        canaux,
        membresRoles,
        profiles: profiles.length > 0 ? profiles : DEMO_PROFILES,
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
   * Récupère tous les messages depuis Cloud Firestore enrichis des auteurs, citations,
   * mentions `<@nom_personne>` et émargements.
   */
  async fetchMessages(canalId?: string): Promise<ChatMessage[]> {
    const hierarchy = await this.fetchHierarchy();
    const profileMap = new Map(hierarchy.profiles.map((p) => [p.id, p]));

    if (isFirebaseConfigured && firestoreDb) {
      const msgCol = collection(firestoreDb, 'messages');
      const msgQuery = canalId
        ? query(
            msgCol,
            where('canal_id', '==', canalId),
            orderBy('created_at', 'asc')
          )
        : query(msgCol, orderBy('created_at', 'asc'));

      const [msgSnap, emargementSnap] = await Promise.all([
        getDocs(msgQuery),
        getDocs(collection(firestoreDb, 'emargements')),
      ]);

      const rawMessages = msgSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<ChatMessage, 'id' | 'emargements'>),
      }));

      const rawEmargements = emargementSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Emargement, 'id'>),
      }));

      const msgMap = new Map(rawMessages.map((m) => [m.id, m]));

      return rawMessages.map((m) => {
        const author = profileMap.get(m.author_id);
        const replyParent = m.reply_to_message_id
          ? msgMap.get(m.reply_to_message_id)
          : null;
        const replyAuthor = replyParent
          ? profileMap.get(replyParent.author_id)
          : null;

        const msgEmargements: Emargement[] = rawEmargements
          .filter((e) => e.message_id === m.id)
          .map((e) => ({
            ...e,
            user: profileMap.get(e.user_id),
          }));

        return {
          ...m,
          author,
          reply_to_message:
            m.reply_to_message ||
            (replyParent
              ? {
                  id: replyParent.id,
                  author_name: replyAuthor?.display_name || 'Membre',
                  content: replyParent.content,
                }
              : null),
          attachments: Array.isArray(m.attachments) ? m.attachments : [],
          emargements: msgEmargements,
        };
      });
    }

    const stored = readLocal<ChatMessage[]>(
      STORAGE_KEYS.MESSAGES,
      DEMO_MESSAGES
    );
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
   * Envoie un nouveau message dans un canal Firestore, en indexant automatiquement
   * les personnes citées via `<@nom_personne>`.
   */
  async sendMessage(params: {
    canalId: string;
    authorId: string;
    content: string;
    replyToMessageId?: string | null;
    replyToPreview?: {
      id: string;
      author_name: string;
      content: string;
    } | null;
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
    const hierarchy = await this.fetchHierarchy();
    const { mentionedNames, mentionedUserIds } = extractMentionsFromContent(
      content,
      hierarchy.profiles
    );

    const messageId = `msg-${crypto.randomUUID()}`;
    const newMessage: ChatMessage = {
      id: messageId,
      canal_id: canalId,
      author_id: authorId,
      content,
      reply_to_message_id: replyToMessageId,
      reply_to_message: replyToPreview,
      quoted_excerpt: quotedExcerpt,
      mentioned_user_ids: mentionedUserIds,
      mentioned_names: mentionedNames,
      attachments,
      emargements: [],
      created_at: nowIso,
      updated_at: nowIso,
    };

    if (isFirebaseConfigured && firestoreDb) {
      await setDoc(doc(firestoreDb, 'messages', messageId), {
        id: messageId,
        canal_id: canalId,
        author_id: authorId,
        content,
        reply_to_message_id: replyToMessageId,
        reply_to_message: replyToPreview,
        quoted_excerpt: quotedExcerpt,
        mentioned_user_ids: mentionedUserIds,
        mentioned_names: mentionedNames,
        attachments,
        created_at: nowIso,
        updated_at: nowIso,
      });

      await setDoc(
        doc(firestoreDb, 'canaux', canalId),
        { last_message_at: nowIso },
        { merge: true }
      );

      return newMessage;
    }

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
   * Valide la lecture (Émargement / Read receipt) d'un message d'annonce officielle dans Firestore.
   */
  async confirmEmargement(messageId: string, userId: string): Promise<void> {
    const nowIso = new Date().toISOString();

    if (isFirebaseConfigured && firestoreDb) {
      const emId = `${messageId}_${userId}`;
      await setDoc(doc(firestoreDb, 'emargements', emId), {
        id: emId,
        message_id: messageId,
        user_id: userId,
        confirmed_at: nowIso,
      });
      return;
    }

    const allMessages = readLocal<ChatMessage[]>(
      STORAGE_KEYS.MESSAGES,
      DEMO_MESSAGES
    );
    const updated = allMessages.map((msg) => {
      if (msg.id !== messageId) return msg;
      const alreadyConfirmed = msg.emargements.some(
        (e) => e.user_id === userId
      );
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
   * Crée une nouvelle Tribbu (Commission/Groupe) avec ses canaux Annonces et Agora dans Firestore.
   */
  async createTribbu(params: {
    name: string;
    description: string;
    color: string;
    createdBy: string;
  }): Promise<{ tribbu: Tribbu; agoraCanal: Canal }> {
    const nowIso = new Date().toISOString();
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

    if (isFirebaseConfigured && firestoreDb) {
      await Promise.all([
        setDoc(doc(firestoreDb, 'tribbus', tribbuId), {
          ...newTribbu,
          updated_at: nowIso,
        }),
        setDoc(doc(firestoreDb, 'canaux', annoncesCanal.id), annoncesCanal),
        setDoc(doc(firestoreDb, 'canaux', agoraCanal.id), agoraCanal),
      ]);
      return { tribbu: newTribbu, agoraCanal };
    }

    const tribbus = readLocal<Tribbu[]>(STORAGE_KEYS.TRIBBUS, DEMO_TRIBBUS);
    writeLocal(STORAGE_KEYS.TRIBBUS, [...tribbus, newTribbu]);

    const canaux = readLocal<Canal[]>(STORAGE_KEYS.CANAUX, DEMO_CANAUX);
    writeLocal(STORAGE_KEYS.CANAUX, [...canaux, annoncesCanal, agoraCanal]);

    notifyRealtimeListeners('hierarchy:updated');
    return { tribbu: newTribbu, agoraCanal };
  },

  /**
   * Crée un nouveau Tippi rattaché à une Tribbu ainsi que son canal dédié dans Firestore.
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

    if (isFirebaseConfigured && firestoreDb) {
      await Promise.all([
        setDoc(doc(firestoreDb, 'tippis', tippiId), {
          ...newTippi,
          updated_at: nowIso,
        }),
        setDoc(doc(firestoreDb, 'canaux', newCanal.id), newCanal),
      ]);
      return { tippi: newTippi, canal: newCanal };
    }

    const tippis = readLocal<Tippi[]>(STORAGE_KEYS.TIPPIS, DEMO_TIPPIS);
    writeLocal(STORAGE_KEYS.TIPPIS, [...tippis, newTippi]);

    const canaux = readLocal<Canal[]>(STORAGE_KEYS.CANAUX, DEMO_CANAUX);
    writeLocal(STORAGE_KEYS.CANAUX, [...canaux, newCanal]);

    notifyRealtimeListeners('hierarchy:updated');
    return { tippi: newTippi, canal: newCanal };
  },

  /**
   * Crée un nouveau Feu de camp dans Firestore (accessible à tout niveau par tout membre).
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

    if (isFirebaseConfigured && firestoreDb) {
      await Promise.all([
        setDoc(doc(firestoreDb, 'feux_de_camp', fdcId), {
          ...newFeu,
          updated_at: nowIso,
        }),
        setDoc(doc(firestoreDb, 'canaux', newCanal.id), newCanal),
      ]);
      return { feuDeCamp: newFeu, canal: newCanal };
    }

    const feux = readLocal<FeuDeCamp[]>(STORAGE_KEYS.FEUX, DEMO_FEUX_DE_CAMP);
    writeLocal(STORAGE_KEYS.FEUX, [...feux, newFeu]);

    const canaux = readLocal<Canal[]>(STORAGE_KEYS.CANAUX, DEMO_CANAUX);
    writeLocal(STORAGE_KEYS.CANAUX, [...canaux, newCanal]);

    notifyRealtimeListeners('hierarchy:updated');
    return { feuDeCamp: newFeu, canal: newCanal };
  },

  /**
   * Génère une invitation par e-mail avec token unique rattachée à une Tribbu dans Firestore.
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
      (typeof window !== 'undefined'
        ? window.location.origin
        : 'http://localhost:5173');

    const invitationUrl = `${baseUrl}/?invite_token=${encodeURIComponent(
      token
    )}&email=${encodeURIComponent(params.email)}&tribbu_id=${encodeURIComponent(
      params.tribbuId
    )}`;

    const inviteId = `mr-${crypto.randomUUID().slice(0, 8)}`;
    const newInvite: MembreRole = {
      id: inviteId,
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

    if (isFirebaseConfigured && firestoreDb) {
      await setDoc(doc(firestoreDb, 'membres_roles', inviteId), {
        ...newInvite,
        updated_at: nowIso,
      });
      return { invitation: newInvite, invitationUrl };
    }

    const roles = readLocal<MembreRole[]>(
      STORAGE_KEYS.ROLES,
      DEMO_MEMBRES_ROLES
    );
    writeLocal(STORAGE_KEYS.ROLES, [...roles, newInvite]);
    notifyRealtimeListeners('hierarchy:updated');

    return { invitation: newInvite, invitationUrl };
  },

  /**
   * Met à jour le rôle (MANITOU, CHEF, PYGMEE) ou le statut d'un membre dans Firestore.
   */
  async updateMemberRole(params: {
    roleRecordId: string;
    role: TribbuRole;
    status?: 'ACTIVE' | 'REJECTED';
  }): Promise<void> {
    if (isFirebaseConfigured && firestoreDb) {
      await updateDoc(doc(firestoreDb, 'membres_roles', params.roleRecordId), {
        role: params.role,
        ...(params.status ? { status: params.status } : {}),
        updated_at: new Date().toISOString(),
      });
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
   * Ajoute un membre existant à une Tribbu avec un rôle défini dans Firestore.
   */
  async assignMemberToTribbu(params: {
    userId: string;
    tribbuId: string;
    role: TribbuRole;
    assignedBy: string;
  }): Promise<void> {
    const nowIso = new Date().toISOString();

    if (isFirebaseConfigured && firestoreDb) {
      const roleId = `mr-${params.userId}_${params.tribbuId}`;
      await setDoc(
        doc(firestoreDb, 'membres_roles', roleId),
        {
          id: roleId,
          user_id: params.userId,
          invited_email: null,
          role: params.role,
          grande_tribbu_id: 'gt-main',
          tribbu_id: params.tribbuId,
          status: 'ACTIVE',
          invitation_token: null,
          invited_by: params.assignedBy,
          created_at: nowIso,
          updated_at: nowIso,
        },
        { merge: true }
      );
      await authService.syncUserTribbuClaimsInFirestore(
        params.userId,
        params.tribbuId,
        params.role
      );
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
        created_at: nowIso,
      });
      writeLocal(STORAGE_KEYS.ROLES, roles);
      notifyRealtimeListeners('hierarchy:updated');
    }
  },
};
