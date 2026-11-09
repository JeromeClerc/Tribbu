import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { firestoreDb, isFirebaseConfigured } from '@/lib/firebaseClient';
import { useAuth } from './AuthContext';
import { useUIStore } from '@/lib/uiStore';
import { DEMO_PROFILES } from '@/services/demoData';
import type { PresenceUser, TribbuRole } from '@/types/tribbu.types';

interface PresenceContextValue {
  onlineUsers: PresenceUser[];
  getUsersInCanal: (canalId: string) => PresenceUser[];
  getTypingUsersInCanal: (canalId: string) => PresenceUser[];
  broadcastTyping: (canalId: string, isTyping: boolean) => void;
}

const PresenceContext = createContext<PresenceContextValue | undefined>(
  undefined
);

const PRESENCE_BROADCAST_NAME = 'tribbu-presence-channel';

export const PresenceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, globalRole } = useAuth();
  const activeCanalId = useUIStore((s) => s.activeCanalId);
  const [remoteUsers, setRemoteUsers] = useState<Record<string, PresenceUser>>(
    {}
  );
  const [myTypingCanalId, setMyTypingCanalId] = useState<string | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const localBcRef = useRef<BroadcastChannel | null>(null);

  // En mode démo, simule la présence réaliste de collègues connectés sur les canaux
  const simulatedPeers: PresenceUser[] = React.useMemo(() => {
    if (!user) return [];
    const others = DEMO_PROFILES.filter((p) => p.id !== user.id);
    const assignments: Array<{
      id: string;
      role: TribbuRole;
      canalId: string;
    }> = [
      {
        id: 'user-manitou',
        role: 'MANITOU',
        canalId: 'canal-gt-annonces',
      },
      {
        id: 'user-chef-comm',
        role: 'CHEF',
        canalId: activeCanalId || 'canal-comm-agora',
      },
      {
        id: 'user-pygmee-ines',
        role: 'PYGMEE',
        canalId: activeCanalId || 'canal-gt-agora',
      },
      {
        id: 'user-pygmee-thomas',
        role: 'PYGMEE',
        canalId: 'canal-gt-agora',
      },
    ];

    return assignments
      .map((a): PresenceUser | null => {
        const prof = others.find((p) => p.id === a.id);
        if (!prof) return null;
        return {
          userId: prof.id,
          displayName: prof.display_name,
          avatarUrl: prof.avatar_url,
          role: a.role,
          activeCanalId: a.canalId,
          isTypingInCanalId: null,
          onlineAt: new Date().toISOString(),
        };
      })
      .filter((x): x is PresenceUser => x !== null);
  }, [user, activeCanalId]);

  // Synchronisation Cloud Firestore `presence` + BroadcastChannel inter-onglets
  useEffect(() => {
    if (!user) return;

    const myPresence: PresenceUser = {
      userId: user.id,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      role: globalRole,
      activeCanalId,
      isTypingInCanalId: myTypingCanalId,
      onlineAt: new Date().toISOString(),
    };

    if (isFirebaseConfigured && firestoreDb) {
      const myPresenceRef = doc(firestoreDb, 'presence', user.id);
      void setDoc(myPresenceRef, myPresence, { merge: true });

      const unsubscribe = onSnapshot(
        collection(firestoreDb, 'presence'),
        (snap) => {
          const mapped: Record<string, PresenceUser> = {};
          snap.docs.forEach((d) => {
            mapped[d.id] = d.data() as PresenceUser;
          });
          setRemoteUsers(mapped);
        }
      );

      return () => unsubscribe();
    }

    // Mode inter-onglets navigateur via BroadcastChannel
    if ('BroadcastChannel' in window) {
      const bc = new BroadcastChannel(PRESENCE_BROADCAST_NAME);
      localBcRef.current = bc;

      bc.postMessage({ type: 'PRESENCE_UPDATE', payload: myPresence });

      bc.onmessage = (ev) => {
        const data = ev.data as {
          type: string;
          payload: PresenceUser;
        };
        if (data?.type === 'PRESENCE_UPDATE' && data.payload?.userId) {
          setRemoteUsers((prev) => ({
            ...prev,
            [data.payload.userId]: data.payload,
          }));
        }
      };

      return () => {
        bc.close();
        localBcRef.current = null;
      };
    }
  }, [user, globalRole, activeCanalId, myTypingCanalId]);

  const broadcastTyping = useCallback(
    (canalId: string, isTyping: boolean) => {
      if (!user) return;
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }

      const nextCanal = isTyping ? canalId : null;
      setMyTypingCanalId(nextCanal);

      if (isTyping) {
        typingTimeoutRef.current = window.setTimeout(() => {
          setMyTypingCanalId(null);
        }, 3000);
      }
    },
    [user]
  );

  const onlineUsers: PresenceUser[] = React.useMemo(() => {
    if (!user) return [];
    const selfPresence: PresenceUser = {
      userId: user.id,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      role: globalRole,
      activeCanalId,
      isTypingInCanalId: myTypingCanalId,
      onlineAt: new Date().toISOString(),
    };

    const map = new Map<string, PresenceUser>();
    for (const sim of simulatedPeers) {
      map.set(sim.userId, sim);
    }
    for (const rem of Object.values(remoteUsers)) {
      map.set(rem.userId, rem);
    }
    map.set(user.id, selfPresence);

    return Array.from(map.values());
  }, [
    user,
    globalRole,
    activeCanalId,
    myTypingCanalId,
    simulatedPeers,
    remoteUsers,
  ]);

  const getUsersInCanal = useCallback(
    (canalId: string) =>
      onlineUsers.filter((u) => u.activeCanalId === canalId),
    [onlineUsers]
  );

  const getTypingUsersInCanal = useCallback(
    (canalId: string) =>
      onlineUsers.filter(
        (u) => u.isTypingInCanalId === canalId && u.userId !== user?.id
      ),
    [onlineUsers, user?.id]
  );

  return (
    <PresenceContext.Provider
      value={{
        onlineUsers,
        getUsersInCanal,
        getTypingUsersInCanal,
        broadcastTyping,
      }}
    >
      {children}
    </PresenceContext.Provider>
  );
};

export function usePresence(): PresenceContextValue {
  const ctx = useContext(PresenceContext);
  if (!ctx) {
    throw new Error('usePresence doit être utilisé au sein de PresenceProvider');
  }
  return ctx;
}
