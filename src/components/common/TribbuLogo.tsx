import React from 'react';
import { cn } from '@/lib/utils';

interface TribbuLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

const SIZE_MAP = {
  sm: { svg: 'w-7 h-5', text: 'text-base' },
  md: { svg: 'w-9 h-6', text: 'text-xl' },
  lg: { svg: 'w-12 h-8', text: 'text-2xl' },
  xl: { svg: 'w-16 h-11', text: 'text-3xl' },
};

export const TribbuLogo: React.FC<TribbuLogoProps> = ({
  size = 'md',
  showText = true,
  className,
}) => {
  const s = SIZE_MAP[size];

  return (
    <div className={cn('inline-flex items-center gap-2.5 select-none', className)}>
      <svg
        viewBox="0 0 240 160"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(s.svg, 'shrink-0 drop-shadow-sm')}
        aria-label="Logo Tribbu"
      >
        <defs>
          <linearGradient
            id="logo-teal"
            x1="20"
            y1="150"
            x2="90"
            y2="20"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#0A4C7A" />
            <stop offset="55%" stopColor="#0E85A1" />
            <stop offset="100%" stopColor="#19B5CE" />
          </linearGradient>
          <linearGradient
            id="logo-purple"
            x1="150"
            y1="150"
            x2="210"
            y2="20"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#532B88" />
            <stop offset="55%" stopColor="#7B2D90" />
            <stop offset="100%" stopColor="#A53896" />
          </linearGradient>
          <linearGradient
            id="logo-green"
            x1="65"
            y1="150"
            x2="155"
            y2="20"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#158F68" />
            <stop offset="50%" stopColor="#3BA55D" />
            <stop offset="100%" stopColor="#68C151" />
          </linearGradient>
        </defs>
        {/* Tipi Gauche (Teal) */}
        <path
          d="M16 146 L70 30 L61 14 L69 14 L75 25 L81 14 L89 14 L80 30 L134 146 L94 146 L75 104 L56 146 Z"
          fill="url(#logo-teal)"
        />
        {/* Tipi Droit (Violet) */}
        <path
          d="M106 146 L160 30 L151 14 L159 14 L165 25 L171 14 L179 14 L170 30 L224 146 L184 146 L165 104 L146 146 Z"
          fill="url(#logo-purple)"
        />
        {/* Tipi Central (Vert) */}
        <path
          d="M60 146 L115 28 L106 12 L114 12 L120 23 L126 12 L134 12 L125 28 L180 146 L139 146 L120 102 L101 146 Z"
          fill="url(#logo-green)"
        />
      </svg>
      {showText && (
        <span
          className={cn(
            s.text,
            'font-bold tracking-tight text-tribbu-charcoal dark:text-white'
          )}
        >
          Tribbu
        </span>
      )}
    </div>
  );
};

