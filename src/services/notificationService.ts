import { doc, setDoc } from 'firebase/firestore';
import { firestoreDb, isFirebaseConfigured } from '@/lib/firebaseClient';
import { isUserMentionedInMessage } from '@/lib/utils';
import type {
  Canal,
  CanalMutationSummary,
  ChatMessage,
  Profile,
  Tribbu,
} from '@/types/tribbu.types';

const READ_TIMESTAMPS_KEY = 'tribbu_canal_last_read_map';

export interface SmsDispatchLog {
  id: string;
  recipientPhone: string;
  recipientName: string;
  canalName: string;
  preview: string;
  sentAt: string;
}

const SMS_LOGS_KEY = 'tribbu_sms_dispatch_logs';

export const notificationService = {
  /**
   * Récupère la carte `canalId -> lastReadIso` pour l'utilisateur courant.
   */
  getReadTimestampsMap(userId: string): Record<string, string> {
    try {
      const raw = localStorage.getItem(`${READ_TIMESTAMPS_KEY}_${userId}`);
      return raw ? (JSON.parse(raw) as Record<string, string>) : {};
    } catch {
      return {};
    }
  },

  /**
   * Marque un canal comme lu à l'instant T (localement et dans Firestore `canal_lectures`).
   */
  async markCanalAsRead(canalId: string, userId: string): Promise<void> {
    const nowIso = new Date().toISOString();
    const current = this.getReadTimestampsMap(userId);
    current[canalId] = nowIso;

    try {
      localStorage.setItem(
        `${READ_TIMESTAMPS_KEY}_${userId}`,
        JSON.stringify(current)
      );
      window.dispatchEvent(new CustomEvent('tribbu-read-updated'));
    } catch {
      // Ignore storage error
    }

    if (isFirebaseConfigured && firestoreDb) {
      const lectureId = `${canalId}_${userId}`;
      await setDoc(
        doc(firestoreDb, 'canal_lectures', lectureId),
        {
          id: lectureId,
          canal_id: canalId,
          user_id: userId,
          last_read_at: nowIso,
        },
        { merge: true }
      );
    }
  },

  /**
   * Marque l'ensemble des canaux comme lus et met à jour `last_seen_at` dans Firestore.
   */
  async markAllCanauxAsRead(canalIds: string[], userId: string): Promise<void> {
    const nowIso = new Date().toISOString();
    const current = this.getReadTimestampsMap(userId);
    for (const id of canalIds) {
      current[id] = nowIso;
    }

    try {
      localStorage.setItem(
        `${READ_TIMESTAMPS_KEY}_${userId}`,
        JSON.stringify(current)
      );
      window.dispatchEvent(new CustomEvent('tribbu-read-updated'));
    } catch {
      // Ignore
    }

    if (isFirebaseConfigured && firestoreDb) {
      await setDoc(
        doc(firestoreDb, 'profiles', userId),
        { last_seen_at: nowIso, updated_at: nowIso },
        { merge: true }
      );
    }
  },

  /**
   * Calcule pour chaque canal accessible :
   * - le nombre de messages non-lus (`unreadCount`)
   * - le nombre de mentions explicites `<@nom_personne>` de l'utilisateur (`mentionCount`)
   * - si le canal a subi une mutation depuis la dernière connexion (`mutatedSinceLastSeen`)
   * - l'aperçu du dernier message
   */
  computeCanalSummaries(params: {
    user: Profile;
    canaux: Canal[];
    messages: ChatMessage[];
    tribbus: Tribbu[];
    activeCanalId: string | null;
  }): Record<string, CanalMutationSummary> {
    const { user, canaux, messages, tribbus, activeCanalId } = params;

    const readMap = this.getReadTimestampsMap(user.id);
    const lastSeenTime = new Date(user.last_seen_at).getTime();
    const tribbuMap = new Map(tribbus.map((t) => [t.id, t.name]));

    const result: Record<string, CanalMutationSummary> = {};

    for (const canal of canaux) {
      const canalMessages = messages.filter((m) => m.canal_id === canal.id);
      const lastMsg =
        canalMessages.length > 0
          ? canalMessages[canalMessages.length - 1]
          : undefined;

      const lastReadIso = readMap[canal.id];
      const thresholdTime = lastReadIso
        ? new Date(lastReadIso).getTime()
        : lastSeenTime;

      const isCurrentlyFocused = activeCanalId === canal.id;

      const unreadMessages = isCurrentlyFocused
        ? []
        : canalMessages.filter(
            (m) =>
              m.author_id !== user.id &&
              new Date(m.created_at).getTime() > thresholdTime
          );

      const mentionCount = canalMessages.filter((m) =>
        isUserMentionedInMessage(m, user)
      ).length;

      const latestActivityIso = lastMsg?.created_at || canal.last_message_at;
      const latestActivityTime = new Date(latestActivityIso).getTime();

      const mutatedSinceLastSeen =
        !isCurrentlyFocused &&
        (unreadMessages.length > 0 || latestActivityTime > lastSeenTime);

      result[canal.id] = {
        canal,
        unreadCount: unreadMessages.length,
        mentionCount,
        mutatedSinceLastSeen,
        lastMessagePreview: lastMsg?.content,
        lastMessageAuthor: lastMsg?.author?.display_name,
        lastMessageAt: latestActivityIso,
        parentTribbuName: canal.tribbu_id
          ? tribbuMap.get(canal.tribbu_id)
          : undefined,
      };
    }

    return result;
  },

  /**
   * Simule ou déclenche via Firebase Cloud Functions l'envoi d'une alerte SMS
   * sur le numéro de téléphone des membres concernés lors d'une annonce ou mention.
   */
  async dispatchPhoneNotification(params: {
    recipientPhone: string;
    recipientName: string;
    canalName: string;
    preview: string;
  }): Promise<SmsDispatchLog> {
    const log: SmsDispatchLog = {
      id: `sms-${crypto.randomUUID().slice(0, 8)}`,
      recipientPhone: params.recipientPhone,
      recipientName: params.recipientName,
      canalName: params.canalName,
      preview: params.preview.slice(0, 120),
      sentAt: new Date().toISOString(),
    };

    try {
      const existingRaw = localStorage.getItem(SMS_LOGS_KEY);
      const existing: SmsDispatchLog[] = existingRaw
        ? JSON.parse(existingRaw)
        : [];
      localStorage.setItem(
        SMS_LOGS_KEY,
        JSON.stringify([log, ...existing].slice(0, 25))
      );
    } catch {
      // Ignore
    }

    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      new Notification(`Tribbu • ${params.canalName}`, {
        body: params.preview.slice(0, 100),
        icon: '/icons/icon-192x192.png',
      });
    }

    return log;
  },

  getRecentSmsLogs(): SmsDispatchLog[] {
    try {
      const raw = localStorage.getItem(SMS_LOGS_KEY);
      return raw ? (JSON.parse(raw) as SmsDispatchLog[]) : [];
    } catch {
      return [];
    }
  },
};
