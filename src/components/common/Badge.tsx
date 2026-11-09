import React from 'react';
import { cn, getRoleBadgeClasses, getRoleLabelFr } from '@/lib/utils';
import type { TribbuRole } from '@/types/tribbu.types';

export const RoleBadge: React.FC<{
  role: TribbuRole;
  size?: 'xs' | 'sm';
}> = ({ role, size = 'xs' }) => {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium border rounded-full',
        size === 'xs' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs',
        getRoleBadgeClasses(role)
      )}
    >
      {getRoleLabelFr(role)}
    </span>
  );
};

export const UnreadBadge: React.FC<{
  count: number;
  mutatedSinceLastSeen?: boolean;
}> = ({ count, mutatedSinceLastSeen }) => {
  if (count <= 0 && !mutatedSinceLastSeen) return null;

  return (
    <span className="inline-flex items-center gap-1.5 shrink-0">
      {mutatedSinceLastSeen && (
        <span
          className="w-2 h-2 rounded-full bg-tribbu-green shadow-glow animate-pulse"
          title="Nouvelle activité depuis votre dernière connexion"
        />
      )}
      {count > 0 && (
        <span
          className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-tribbu-teal text-white text-[11px] font-bold inline-flex items-center justify-center shadow-xs"
          title={`${count} message(s) non-lu(s)`}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </span>
  );
};

