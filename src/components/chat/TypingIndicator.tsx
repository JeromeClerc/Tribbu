import React from 'react';
import type { PresenceUser } from '@/types/tribbu.types';

interface TypingIndicatorProps {
  typingUsers: PresenceUser[];
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  typingUsers,
}) => {
  if (typingUsers.length === 0) return null;

  const label =
    typingUsers.length === 1
      ? `${typingUsers[0].displayName} est en train d'écrire...`
      : `${typingUsers.map((u) => u.displayName).join(', ')} sont en train d'écrire...`;

  return (
    <div className="px-4 py-1.5 flex items-center gap-2 text-xs text-tribbu-green font-medium bg-slate-50/80 dark:bg-tribbu-charcoal-deep/60 border-t border-slate-200/60 dark:border-tribbu-charcoal-border/50">
      <span className="inline-flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-tribbu-green animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-tribbu-teal animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-tribbu-purple animate-bounce" />
      </span>
      <span>{label}</span>
    </div>
  );
};

