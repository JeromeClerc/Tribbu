import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { firestoreDb, isFirebaseConfigured } from '@/lib/firebaseClient';
import { QUERY_KEYS } from './useChat';

/**
 * Souscrit aux changements temps réel Cloud Firestore (`onSnapshot` filtré par `grande_tribbu_id`)
 * et au BroadcastChannel local uniquement lorsque l'utilisateur est authentifié sur une association active.
 */
export function useRealtimeChannel(
  activeGrandeTribbuId: string | null,
  activeCanalId: string | null,
  isAuthenticated = false
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const refreshQueries = () => {
      void queryClient.invalidateQueries({ queryKey: ['tribbu', 'hierarchy'] });
      void queryClient.invalidateQueries({ queryKey: ['tribbu', 'messages'] });
      if (activeCanalId) {
        void queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.canalMessages(activeCanalId),
        });
      }
    };

    const handleSnapshotError = () => {
      // Ignore silencieusement les erreurs de permission transitoires ou lorsque
      // les règles Firestore de la console n'ont pas encore été publiées.
    };

    // Synchronisation locale / multi-onglets toujours active
    const bc =
      'BroadcastChannel' in window
        ? new BroadcastChannel('tribbu-realtime-sync')
        : null;

    if (bc) {
      bc.onmessage = () => refreshQueries();
    }

    window.addEventListener('tribbu-local-mutation', refreshQueries);

    // N'ouvre les listeners temps réel Firestore que si un membre est authentifié sur une association active
    let cleanupFirestore: (() => void) | null = null;

    if (
      isFirebaseConfigured &&
      firestoreDb &&
      isAuthenticated &&
      activeGrandeTribbuId
    ) {
      const unsubMessages = onSnapshot(
        query(
          collection(firestoreDb, 'messages'),
          where('grande_tribbu_id', '==', activeGrandeTribbuId)
        ),
        refreshQueries,
        handleSnapshotError
      );
      const unsubEmargements = onSnapshot(
        query(
          collection(firestoreDb, 'emargements'),
          where('grande_tribbu_id', '==', activeGrandeTribbuId)
        ),
        refreshQueries,
        handleSnapshotError
      );
      const unsubCanaux = onSnapshot(
        query(
          collection(firestoreDb, 'canaux'),
          where('grande_tribbu_id', '==', activeGrandeTribbuId)
        ),
        refreshQueries,
        handleSnapshotError
      );
      const unsubTribbus = onSnapshot(
        query(
          collection(firestoreDb, 'tribbus'),
          where('grande_tribbu_id', '==', activeGrandeTribbuId)
        ),
        refreshQueries,
        handleSnapshotError
      );
      const unsubTippis = onSnapshot(
        query(
          collection(firestoreDb, 'tippis'),
          where('grande_tribbu_id', '==', activeGrandeTribbuId)
        ),
        refreshQueries,
        handleSnapshotError
      );
      const unsubFeux = onSnapshot(
        query(
          collection(firestoreDb, 'feux_de_camp'),
          where('grande_tribbu_id', '==', activeGrandeTribbuId)
        ),
        refreshQueries,
        handleSnapshotError
      );
      const unsubRoles = onSnapshot(
        query(
          collection(firestoreDb, 'membres_roles'),
          where('grande_tribbu_id', '==', activeGrandeTribbuId)
        ),
        refreshQueries,
        handleSnapshotError
      );

      cleanupFirestore = () => {
        unsubMessages();
        unsubEmargements();
        unsubCanaux();
        unsubTribbus();
        unsubTippis();
        unsubFeux();
        unsubRoles();
      };
    }

    return () => {
      cleanupFirestore?.();
      bc?.close();
      window.removeEventListener('tribbu-local-mutation', refreshQueries);
    };
  }, [activeGrandeTribbuId, activeCanalId, isAuthenticated, queryClient]);
}
