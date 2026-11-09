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
import {
  firebaseAuth,
  firestoreDb,
  isFirebaseConfigured,
} from '@/lib/firebaseClient';
import { extractMentionsFromContent } from '@/lib/utils';
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
import { authService } from './authService';
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
  ASSOCIATIONS: 'tribbu_state_associations',
  MESSAGES: 'tribbu_state_messages',
  CANAUX: 'tribbu_state_canaux',
  TRIBBUS: 'tribbu_state_tribbus',
  TIPPIS: 'tribbu_state_tippis',
  FEUX: 'tribbu_state_feux_de_camp',
  ROLES: 'tribbu_custom_roles',
  PROFILES: 'tribbu_custom_profiles',
};

const REALTIME_CHANNEL_NAME = 'tribbu-realtime-sync';

function notifyRealtimeListeners(type: string, payload?: unknown) {
  if ('BroadcastChannel' in window) {
    const bc = new BroadcastChannel(REALTIME_CHANNEL_NAME);
    bc.postMessage({ type, payload, timestamp: Date.now() });
    bc.close();
  }
  window.dispatchEvent(
    new CustomEvent('tribbu-local-mutation', { detail: { type, payload } })
  );
}

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
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

function mergeById<T extends { id: string }>(localItems: T[], remoteItems: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of localItems) map.set(item.id, item);
  for (const item of remoteItems) map.set(item.id, item);
  return Array.from(map.values());
}

export interface HierarchyBundle {
  grandeTribbu: GrandeTribbu | null;
  allAssociations: GrandeTribbu[];
  tribbus: Tribbu[];
  tippis: Tippi[];
  feuxDeCamp: FeuDeCamp[];
  canaux: Canal[];
  membresRoles: MembreRole[];
  profiles: Profile[];
}

export const chatService = {
  /**
   * Charge la hiérarchie STRICTEMENT ISOLÉE pour l'association correspondant au `slug`
   * (ou à l'association de l'utilisateur connecté).
   * Aucun membre, canal, Tribbu ou Tippi d'une autre association n'est exposé.
   */
  async fetchHierarchy(targetSlug?: string | null): Promise<HierarchyBundle> {
    const localAssociations = readLocal<GrandeTribbu[]>(
      STORAGE_KEYS.ASSOCIATIONS,
      [DEMO_GRANDE_TRIBBU]
    );

    let allAssociations = [...localAssociations];

    if (isFirebaseConfigured && firestoreDb) {
      try {
        const gtSnap = await getDocs(collection(firestoreDb, 'grande_tribbu'));
        const remoteAssociations = gtSnap.docs.map(
          (d) => ({ id: d.id, ...(d.data() as Omit<GrandeTribbu, 'id'>) })
        );
        const bySlug = new Map<string, GrandeTribbu>();
        for (const a of localAssociations) bySlug.set(a.slug, a);
        for (const a of remoteAssociations) bySlug.set(a.slug, a);
        allAssociations = Array.from(bySlug.values());
      } catch {
        // Repli sur la liste locale si Firestore bloque la lecture avant connexion
      }
    }

    const activeGt = targetSlug
      ? allAssociations.find((a) => a.slug === targetSlug) || null
      : null;

    if (!activeGt) {
      return {
        grandeTribbu: null,
        allAssociations,
        tribbus: [],
        tippis: [],
        feuxDeCamp: [],
        canaux: [],
        membresRoles: [],
        profiles: [],
      };
    }

    const gtId = activeGt.id;

    // Données locales isolées par `grande_tribbu_id`
    const localTribbus = readLocal<Tribbu[]>(
      STORAGE_KEYS.TRIBBUS,
      DEMO_TRIBBUS
    ).filter((t) => t.grande_tribbu_id === gtId);
    const localTribbuIdSet = new Set(localTribbus.map((t) => t.id));

    const localTippis = readLocal<Tippi[]>(
      STORAGE_KEYS.TIPPIS,
      DEMO_TIPPIS
    ).filter(
      (tp) =>
        tp.grande_tribbu_id === gtId || localTribbuIdSet.has(tp.tribbu_id)
    );

    const localFeux = readLocal<FeuDeCamp[]>(
      STORAGE_KEYS.FEUX,
      DEMO_FEUX_DE_CAMP
    ).filter((f) => f.grande_tribbu_id === gtId);

    const localCanaux = readLocal<Canal[]>(
      STORAGE_KEYS.CANAUX,
      DEMO_CANAUX
    ).filter((c) => c.grande_tribbu_id === gtId);

    const localRoles = readLocal<MembreRole[]>(
      STORAGE_KEYS.ROLES,
      DEMO_MEMBRES_ROLES
    ).filter((r) => r.grande_tribbu_id === gtId);

    const customProfiles = readLocal<Profile[]>(STORAGE_KEYS.PROFILES, []);
    const mergedLocalProfiles = mergeById(DEMO_PROFILES, customProfiles);

    // Si Firebase est configuré ET que l'utilisateur est authentifié dans Firebase Auth,
    // on interroge Cloud Firestore et on fusionne avec le cache local.
    if (isFirebaseConfigured && firestoreDb && firebaseAuth?.currentUser) {
      try {
        const [
          tribbusSnap,
          tippisSnap,
          feuxSnap,
          canauxSnap,
          rolesSnap,
          profilesSnap,
        ] = await Promise.all([
          getDocs(
            query(
              collection(firestoreDb, 'tribbus'),
              where('grande_tribbu_id', '==', gtId)
            )
          ),
          getDocs(
            query(
              collection(firestoreDb, 'tippis'),
              where('grande_tribbu_id', '==', gtId)
            )
          ),
          getDocs(
            query(
              collection(firestoreDb, 'feux_de_camp'),
              where('grande_tribbu_id', '==', gtId)
            )
          ),
          getDocs(
            query(
              collection(firestoreDb, 'canaux'),
              where('grande_tribbu_id', '==', gtId)
            )
          ),
          getDocs(
            query(
              collection(firestoreDb, 'membres_roles'),
              where('grande_tribbu_id', '==', gtId)
            )
          ),
          getDocs(collection(firestoreDb, 'profiles')),
        ]);

        const remoteTribbus = tribbusSnap.docs.map(
          (d) => ({ id: d.id, ...(d.data() as Omit<Tribbu, 'id'>) })
        );
        const remoteTippis = tippisSnap.docs.map(
          (d) => ({
            ...(d.data() as Omit<Tippi, 'id'>),
            id: d.id,
          })
        );
        const remoteFeux = feuxSnap.docs.map(
          (d) => ({
            ...(d.data() as Omit<FeuDeCamp, 'id'>),
            id: d.id,
          })
        );
        const remoteCanaux = canauxSnap.docs.map(
          (d) => ({ id: d.id, ...(d.data() as Omit<Canal, 'id'>) })
        );
        const remoteRoles = rolesSnap.docs.map(
          (d) => ({ id: d.id, ...(d.data() as Omit<MembreRole, 'id'>) })
        );
        const remoteProfiles = profilesSnap.docs.map(
          (d) => ({ id: d.id, ...(d.data() as Omit<Profile, 'id'>) })
        );

        const tribbus = mergeById(localTribbus, remoteTribbus);
        const tippis = mergeById(localTippis, remoteTippis);
        const feuxDeCamp = mergeById(localFeux, remoteFeux);
        const canaux = mergeById(localCanaux, remoteCanaux);
        const membresRoles = mergeById(localRoles, remoteRoles);
        const allProfiles = mergeById(mergedLocalProfiles, remoteProfiles);

        const memberUserIds = new Set<string>([activeGt.manitou_id]);
        membresRoles.forEach((mr) => {
          if (mr.user_id && mr.status !== 'REJECTED') {
            memberUserIds.add(mr.user_id);
          }
        });

        const isolatedProfiles = allProfiles.filter(
          (p) =>
            memberUserIds.has(p.id) || p.grande_tribbu_ids?.includes(gtId)
        );

        return {
          grandeTribbu: activeGt,
          allAssociations,
          tribbus,
          tippis,
          feuxDeCamp,
          canaux,
          membresRoles,
          profiles: isolatedProfiles,
        };
      } catch {
        // Si les règles Firestore ne sont pas encore publiées dans la console,
        // repli transparent sur les données locales de l'association.
      }
    }

    const memberUserIds = new Set<string>([activeGt.manitou_id]);
    localRoles.forEach((r) => {
      if (r.user_id && r.status !== 'REJECTED') {
        memberUserIds.add(r.user_id);
      }
    });

    const isolatedProfiles = mergedLocalProfiles.filter(
      (p) =>
        memberUserIds.has(p.id) || p.grande_tribbu_ids?.includes(gtId)
    );

    return {
      grandeTribbu: activeGt,
      allAssociations,
      tribbus: localTribbus,
      tippis: localTippis,
      feuxDeCamp: localFeux,
      canaux: localCanaux,
      membresRoles: localRoles,
      profiles: isolatedProfiles,
    };
  },

  /**
   * Récupère uniquement les messages appartenant aux canaux de l'association active.
   */
  async fetchMessages(
    targetSlug?: string | null,
    canalId?: string
  ): Promise<ChatMessage[]> {
    if (!targetSlug) return [];
    const hierarchy = await this.fetchHierarchy(targetSlug);
    if (!hierarchy.grandeTribbu) return [];

    const gtId = hierarchy.grandeTribbu.id;
    const validCanalIds = new Set(hierarchy.canaux.map((c) => c.id));
    const profileMap = new Map(hierarchy.profiles.map((p) => [p.id, p]));

    const localStored = readLocal<ChatMessage[]>(
      STORAGE_KEYS.MESSAGES,
      DEMO_MESSAGES
    ).filter(
      (m) =>
        validCanalIds.has(m.canal_id) && (!canalId || m.canal_id === canalId)
    );

    if (isFirebaseConfigured && firestoreDb && firebaseAuth?.currentUser) {
      try {
        const msgCol = collection(firestoreDb, 'messages');
        const msgQuery = canalId
          ? query(
              msgCol,
              where('canal_id', '==', canalId),
              orderBy('created_at', 'asc')
            )
          : query(
              msgCol,
              where('grande_tribbu_id', '==', gtId),
              orderBy('created_at', 'asc')
            );

        const [msgSnap, emargementSnap] = await Promise.all([
          getDocs(msgQuery),
          getDocs(
            query(
              collection(firestoreDb, 'emargements'),
              where('grande_tribbu_id', '==', gtId)
            )
          ),
        ]);

        const remoteMessages = msgSnap.docs
          .map((d) => ({
            id: d.id,
            emargements: [] as Emargement[],
            ...(d.data() as Omit<ChatMessage, 'id' | 'emargements'>),
          }))
          .filter((m) => validCanalIds.has(m.canal_id));

        const rawEmargements = emargementSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Emargement, 'id'>),
        }));

        const mergedMessages = mergeById(localStored, remoteMessages).sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        const msgMap = new Map(mergedMessages.map((m) => [m.id, m]));

        return mergedMessages.map((m) => {
          const author = profileMap.get(m.author_id);
          const replyParent = m.reply_to_message_id
            ? msgMap.get(m.reply_to_message_id)
            : null;
          const replyAuthor = replyParent
            ? profileMap.get(replyParent.author_id)
            : null;

          const remoteEmargements: Emargement[] = rawEmargements
            .filter((e) => e.message_id === m.id)
            .map((e) => ({
              ...e,
              user: profileMap.get(e.user_id),
            }));

          const localEmargements: Emargement[] = (m.emargements || []).map(
            (e) => ({
              ...e,
              user: profileMap.get(e.user_id),
            })
          );

          const msgEmargements = mergeById(
            localEmargements,
            remoteEmargements
          );

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
      } catch {
        // Repli sur les messages locaux si l'index composite ou les règles Firestore ne sont pas encore prêts
      }
    }

    return localStored.map((m) => ({
      ...m,
      author: profileMap.get(m.author_id),
      emargements: (m.emargements || []).map((em) => ({
        ...em,
        user: profileMap.get(em.user_id),
      })),
    }));
  },

  /**
   * Envoie un nouveau message dans un canal de l'association active.
   */
  async sendMessage(params: {
    grandeTribbuId: string;
    canalId: string;
    authorId: string;
    content: string;
    profiles: Profile[];
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
      grandeTribbuId,
      canalId,
      authorId,
      content,
      profiles,
      replyToMessageId = null,
      replyToPreview = null,
      quotedExcerpt = null,
      attachments = [],
    } = params;

    const nowIso = new Date().toISOString();
    const { mentionedNames, mentionedUserIds } = extractMentionsFromContent(
      content,
      profiles
    );

    const messageId = `msg-${crypto.randomUUID()}`;
    const newMessage: ChatMessage = {
      id: messageId,
      grande_tribbu_id: grandeTribbuId,
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

    if (isFirebaseConfigured && firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, 'messages', messageId), {
          id: messageId,
          grande_tribbu_id: grandeTribbuId,
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
      } catch (err) {
        console.warn('[Tribbu Firebase] Message sauvegardé localement :', err);
      }
    }

    notifyRealtimeListeners('message:inserted', newMessage);
    return newMessage;
  },

  /**
   * Valide la lecture (Émargement) d'une annonce officielle.
   */
  async confirmEmargement(
    grandeTribbuId: string,
    messageId: string,
    userId: string
  ): Promise<void> {
    const nowIso = new Date().toISOString();
    const emId = `${messageId}_${userId}`;

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
            id: emId,
            grande_tribbu_id: grandeTribbuId,
            message_id: messageId,
            user_id: userId,
            confirmed_at: nowIso,
          },
        ],
      };
    });

    writeLocal(STORAGE_KEYS.MESSAGES, updated);

    if (isFirebaseConfigured && firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, 'emargements', emId), {
          id: emId,
          grande_tribbu_id: grandeTribbuId,
          message_id: messageId,
          user_id: userId,
          confirmed_at: nowIso,
        });
      } catch {
        // Repli local déjà enregistré
      }
    }

    notifyRealtimeListeners('emargement:confirmed', { messageId, userId });
  },

  /**
   * Crée une nouvelle Tribbu rattachée à l'association active (`grandeTribbuId`).
   */
  async createTribbu(params: {
    grandeTribbuId: string;
    name: string;
    description: string;
    color: string;
    createdBy: string;
  }): Promise<{ tribbu: Tribbu; agoraCanal: Canal }> {
    const nowIso = new Date().toISOString();
    const tribbuId = `tribbu-${crypto.randomUUID().slice(0, 8)}`;

    const newTribbu: Tribbu = {
      id: tribbuId,
      grande_tribbu_id: params.grandeTribbuId,
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
      grande_tribbu_id: params.grandeTribbuId,
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
      grande_tribbu_id: params.grandeTribbuId,
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

    if (isFirebaseConfigured && firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, 'tribbus', tribbuId), {
          ...newTribbu,
          updated_at: nowIso,
        });
        await setDoc(doc(firestoreDb, 'canaux', annoncesCanal.id), annoncesCanal);
        await setDoc(doc(firestoreDb, 'canaux', agoraCanal.id), agoraCanal);
      } catch (err) {
        console.warn('[Tribbu Firebase] Tribbu sauvegardée localement :', err);
      }
    }

    notifyRealtimeListeners('hierarchy:updated');
    return { tribbu: newTribbu, agoraCanal };
  },

  /**
   * Crée un nouveau Tippi rattaché à une Tribbu de l'association active.
   */
  async createTippi(params: {
    grandeTribbuId: string;
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
      grande_tribbu_id: params.grandeTribbuId,
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
      grande_tribbu_id: params.grandeTribbuId,
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

    if (isFirebaseConfigured && firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, 'tippis', tippiId), {
          ...newTippi,
          updated_at: nowIso,
        });
        await setDoc(doc(firestoreDb, 'canaux', newCanal.id), newCanal);
      } catch (err) {
        console.warn('[Tribbu Firebase] Tippi sauvegardé localement :', err);
      }
    }

    notifyRealtimeListeners('hierarchy:updated');
    return { tippi: newTippi, canal: newCanal };
  },

  /**
   * Crée un nouveau Feu de camp dans l'association active.
   */
  async createFeuDeCamp(params: {
    grandeTribbuId: string;
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
      grande_tribbu_id: params.grandeTribbuId,
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
      grande_tribbu_id: params.grandeTribbuId,
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

    if (isFirebaseConfigured && firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, 'feux_de_camp', fdcId), {
          ...newFeu,
          updated_at: nowIso,
        });
        await setDoc(doc(firestoreDb, 'canaux', newCanal.id), newCanal);
      } catch (err) {
        console.warn(
          '[Tribbu Firebase] Feu de camp sauvegardé localement :',
          err
        );
      }
    }

    notifyRealtimeListeners('hierarchy:updated');
    return { feuDeCamp: newFeu, canal: newCanal };
  },

  /**
   * Génère une invitation par e-mail avec token unique ET le slug d'URL de l'association :
   * `https://.../<slug>?invite_token=...&email=...&tribbu_id=...`
   */
  async createInvitation(params: {
    grandeTribbuId: string;
    grandeTribbuSlug: string;
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

    const invitationUrl = `${baseUrl}/${params.grandeTribbuSlug}?invite_token=${encodeURIComponent(
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
      grande_tribbu_id: params.grandeTribbuId,
      tribbu_id: params.tribbuId || null,
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

    if (isFirebaseConfigured && firestoreDb) {
      try {
        await setDoc(doc(firestoreDb, 'membres_roles', inviteId), {
          ...newInvite,
          updated_at: nowIso,
        });
      } catch (err) {
        console.warn('[Tribbu Firebase] Invitation sauvegardée localement :', err);
      }
    }

    notifyRealtimeListeners('hierarchy:updated');
    return { invitation: newInvite, invitationUrl };
  },

  /**
   * Met à jour le rôle d'un membre dans l'association.
   */
  async updateMemberRole(params: {
    roleRecordId: string;
    role: TribbuRole;
    status?: 'ACTIVE' | 'REJECTED';
  }): Promise<void> {
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

    if (isFirebaseConfigured && firestoreDb) {
      try {
        await updateDoc(doc(firestoreDb, 'membres_roles', params.roleRecordId), {
          role: params.role,
          ...(params.status ? { status: params.status } : {}),
          updated_at: new Date().toISOString(),
        });
      } catch {
        // Repli local déjà effectué
      }
    }

    notifyRealtimeListeners('hierarchy:updated');
  },

  /**
   * Ajoute un membre existant à une Tribbu de l'association.
   */
  async assignMemberToTribbu(params: {
    grandeTribbuId: string;
    userId: string;
    tribbuId: string;
    role: TribbuRole;
    assignedBy: string;
  }): Promise<void> {
    const nowIso = new Date().toISOString();
    const roleId = `mr-${params.userId}_${params.tribbuId}`;

    const roles = readLocal<MembreRole[]>(
      STORAGE_KEYS.ROLES,
      DEMO_MEMBRES_ROLES
    );
    const exists = roles.some(
      (r) => r.user_id === params.userId && r.tribbu_id === params.tribbuId
    );
    if (!exists) {
      roles.push({
        id: roleId,
        user_id: params.userId,
        invited_email: null,
        role: params.role,
        grande_tribbu_id: params.grandeTribbuId,
        tribbu_id: params.tribbuId,
        status: 'ACTIVE',
        invitation_token: null,
        invited_by: params.assignedBy,
        created_at: nowIso,
      });
      writeLocal(STORAGE_KEYS.ROLES, roles);
    }

    if (isFirebaseConfigured && firestoreDb) {
      try {
        await setDoc(
          doc(firestoreDb, 'membres_roles', roleId),
          {
            id: roleId,
            user_id: params.userId,
            invited_email: null,
            role: params.role,
            grande_tribbu_id: params.grandeTribbuId,
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
          params.grandeTribbuId,
          params.tribbuId,
          params.role
        );
      } catch {
        // Repli local déjà enregistré
      }
    }

    notifyRealtimeListeners('hierarchy:updated');
  },
};
