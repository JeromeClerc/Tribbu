import React from 'react';
import { cn, getInitials } from '@/lib/utils';
import type { TribbuRole } from '@/types/tribbu.types';

interface AvatarProps {
  name: string;
  src?: string | null;
  role?: TribbuRole;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  online?: boolean;
  isTyping?: boolean;
  className?: string;
}

const SIZE_CLASSES = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-9 h-9 text-xs',
  lg: 'w-11 h-11 text-sm',
};

const ROLE_BG: Record<TribbuRole, string> = {
  MANITOU: 'bg-gradient-to-br from-tribbu-purple to-tribbu-teal text-white',
  CHEF: 'bg-gradient-to-br from-tribbu-teal to-tribbu-green text-white',
  PYGMEE: 'bg-gradient-to-br from-tribbu-green to-emerald-700 text-white',
};

export const Avatar: React.FC<AvatarProps> = ({
  name,
  src,
  role = 'PYGMEE',
  size = 'md',
  online,
  isTyping,
  className,
}) => {
  return (
    <div
      className={cn('relative inline-flex shrink-0 select-none', className)}
      title={name}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          className={cn(
            SIZE_CLASSES[size],
            'rounded-full object-cover ring-2 ring-white/10'
          )}
        />
      ) : (
        <div
          className={cn(
            SIZE_CLASSES[size],
            ROLE_BG[role],
            'rounded-full font-semibold flex items-center justify-center shadow-sm ring-1 ring-white/15'
          )}
        >
          {getInitials(name)}
        </div>
      )}

      {online !== undefined && (
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 block rounded-full ring-2 ring-white dark:ring-tribbu-charcoal',
            size === 'xs' ? 'w-2 h-2' : 'w-2.5 h-2.5',
            isTyping
              ? 'bg-amber-400 animate-ping'
              : online
                ? 'bg-tribbu-green'
                : 'bg-slate-400'
          )}
        />
      )}
    </div>
  );
};

