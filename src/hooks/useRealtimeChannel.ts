import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { collection, onSnapshot } from 'firebase/firestore';
import { firestoreDb, isFirebaseConfigured } from '@/lib/firebaseClient';
import { QUERY_KEYS } from './useChat';

/**
 * Souscrit aux changements temps réel Cloud Firestore (`onSnapshot`) et au BroadcastChannel local
 * pour synchroniser instantanément les messages, émargements, canaux et rôles.
 */
export function useRealtimeChannel(activeCanalId: string | null) {
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

    if (isFirebaseConfigured && firestoreDb) {
      const unsubMessages = onSnapshot(
        collection(firestoreDb, 'messages'),
        refreshQueries
      );
      const unsubEmargements = onSnapshot(
        collection(firestoreDb, 'emargements'),
        refreshQueries
      );
      const unsubCanaux = onSnapshot(
        collection(firestoreDb, 'canaux'),
        refreshQueries
      );
      const unsubTribbus = onSnapshot(
        collection(firestoreDb, 'tribbus'),
        refreshQueries
      );
      const unsubTippis = onSnapshot(
        collection(firestoreDb, 'tippis'),
        refreshQueries
      );
      const unsubFeux = onSnapshot(
        collection(firestoreDb, 'feux_de_camp'),
        refreshQueries
      );
      const unsubRoles = onSnapshot(
        collection(firestoreDb, 'membres_roles'),
        refreshQueries
      );

      return () => {
        unsubMessages();
        unsubEmargements();
        unsubCanaux();
        unsubTribbus();
        unsubTippis();
        unsubFeux();
        unsubRoles();
      };
    }

    // Mode local / multi-onglets via BroadcastChannel et événements DOM
    const bc =
      'BroadcastChannel' in window
        ? new BroadcastChannel('tribbu-realtime-sync')
        : null;

    if (bc) {
      bc.onmessage = () => refreshQueries();
    }

    window.addEventListener('tribbu-local-mutation', refreshQueries);

    return () => {
      bc?.close();
      window.removeEventListener('tribbu-local-mutation', refreshQueries);
    };
  }, [activeCanalId, queryClient]);
}
