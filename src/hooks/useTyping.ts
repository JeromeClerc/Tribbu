import { useCallback } from 'react';
import { usePresence } from '@/contexts/PresenceContext';

export function useTyping(canalId: string | null) {
  const { getTypingUsersInCanal, broadcastTyping } = usePresence();

  const typingUsers = canalId ? getTypingUsersInCanal(canalId) : [];

  const notifyTyping = useCallback(
    (isTyping: boolean) => {
      if (!canalId) return;
      broadcastTyping(canalId, isTyping);
    },
    [canalId, broadcastTyping]
  );

  return {
    typingUsers,
    notifyTyping,
  };
}

