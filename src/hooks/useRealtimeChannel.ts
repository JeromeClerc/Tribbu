import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';
import { QUERY_KEYS } from './useChat';

/**
 * Souscrit aux changements temps réel Supabase (Postgres Changes) et au BroadcastChannel local
 * pour synchroniser instantanément les messages, émargements, canaux et rôles.
 */
export function useRealtimeChannel(activeCanalId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const refreshQueries = () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.hierarchy });
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allMessages });
      if (activeCanalId) {
        void queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.canalMessages(activeCanalId),
        });
      }
    };

    if (isSupabaseConfigured) {
      const channel = supabase
        .channel('tribbu:realtime-db-sync')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'messages' },
          refreshQueries
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'emargements' },
          refreshQueries
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'canaux' },
          refreshQueries
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tribbus' },
          refreshQueries
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tippis' },
          refreshQueries
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'feux_de_camp' },
          refreshQueries
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'membres_roles' },
          refreshQueries
        )
        .subscribe();

      return () => {
        void supabase.removeChannel(channel);
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

