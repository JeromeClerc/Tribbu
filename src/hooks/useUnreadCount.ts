import { useEffect, useMemo, useState } from 'react';
import { notificationService } from '@/services/notificationService';
import { canUserReadCanal } from '@/lib/utils';
import type {
  Canal,
  CanalMutationSummary,
  ChatMessage,
  FeuDeCamp,
  MembreRole,
  Profile,
  Tippi,
  Tribbu,
  TribbuRole,
} from '@/types/tribbu.types';

export function useUnreadCount(params: {
  user: Profile | null;
  globalRole: TribbuRole;
  canaux: Canal[];
  messages: ChatMessage[];
  tribbus: Tribbu[];
  tippis: Tippi[];
  feuxDeCamp: FeuDeCamp[];
  userRoles: MembreRole[];
  activeCanalId: string | null;
}) {
  const {
    user,
    globalRole,
    canaux,
    messages,
    tribbus,
    tippis,
    feuxDeCamp,
    userRoles,
    activeCanalId,
  } = params;

  const [readTick, setReadTick] = useState(0);

  useEffect(() => {
    const handleReadUpdate = () => setReadTick((t) => t + 1);
    window.addEventListener('tribbu-read-updated', handleReadUpdate);
    return () =>
      window.removeEventListener('tribbu-read-updated', handleReadUpdate);
  }, []);

  // Marque automatiquement le canal actif comme lu
  useEffect(() => {
    if (user && activeCanalId) {
      void notificationService.markCanalAsRead(activeCanalId, user.id);
    }
  }, [user, activeCanalId, messages.length]);

  const accessibleCanaux = useMemo(() => {
    if (!user) return [];
    return canaux.filter((canal) =>
      canUserReadCanal({
        userId: user.id,
        globalRole,
        canal,
        userRoles,
        tippis,
        feuxDeCamp,
      })
    );
  }, [user, globalRole, canaux, userRoles, tippis, feuxDeCamp]);

  const summariesByCanalId = useMemo<Record<string, CanalMutationSummary>>(() => {
    if (!user) return {};
    void readTick; // Dépendance réactive aux marquages de lecture
    return notificationService.computeCanalSummaries({
      userId: user.id,
      userLastSeenAt: user.last_seen_at,
      canaux: accessibleCanaux,
      messages,
      tribbus,
      activeCanalId,
    });
  }, [
    user,
    accessibleCanaux,
    messages,
    tribbus,
    activeCanalId,
    readTick,
  ]);

  const mutatedCanauxList = useMemo(() => {
    return Object.values(summariesByCanalId)
      .filter((s) => s.mutatedSinceLastSeen || s.unreadCount > 0)
      .sort(
        (a, b) =>
          new Date(b.lastMessageAt).getTime() -
          new Date(a.lastMessageAt).getTime()
      );
  }, [summariesByCanalId]);

  const totalUnreadCount = useMemo(() => {
    return Object.values(summariesByCanalId).reduce(
      (acc, item) => acc + item.unreadCount,
      0
    );
  }, [summariesByCanalId]);

  const markAllRead = async () => {
    if (!user) return;
    await notificationService.markAllCanauxAsRead(
      accessibleCanaux.map((c) => c.id),
      user.id
    );
  };

  return {
    accessibleCanaux,
    summariesByCanalId,
    mutatedCanauxList,
    totalUnreadCount,
    markAllRead,
  };
}

