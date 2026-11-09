import React from 'react';
import {
  Bell,
  Flame,
  Layers,
  MessageSquare,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/lib/uiStore';
import { Sidebar } from './Sidebar';
import { TribbuLogo } from '@/components/common/TribbuLogo';
import type {
  Canal,
  CanalMutationSummary,
  FeuDeCamp,
  Tippi,
  Tribbu,
} from '@/types/tribbu.types';

interface MobileNavProps {
  tribbus: Tribbu[];
  tippis: Tippi[];
  feuxDeCamp: FeuDeCamp[];
  accessibleCanaux: Canal[];
  summariesByCanalId: Record<string, CanalMutationSummary>;
  totalUnreadCount: number;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  tribbus,
  tippis,
  feuxDeCamp,
  accessibleCanaux,
  summariesByCanalId,
  totalUnreadCount,
}) => {
  const {
    mobileDrawerOpen,
    setMobileDrawerOpen,
    mobileView,
    setMobileView,
    setNotificationDrawerOpen,
    openModal,
  } = useUIStore();

  return (
    <>
      {/* Tiroir tactile (Drawer) Mobile */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="relative w-80 max-w-[85vw] h-full bg-white dark:bg-tribbu-charcoal z-10 flex flex-col shadow-2xl">
            <div className="p-3.5 border-b border-slate-200 dark:border-tribbu-charcoal-border flex items-center justify-between">
              <TribbuLogo size="sm" />
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                aria-label="Fermer le menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <Sidebar
                tribbus={tribbus}
                tippis={tippis}
                feuxDeCamp={feuxDeCamp}
                accessibleCanaux={accessibleCanaux}
                summariesByCanalId={summariesByCanalId}
                isMobileDrawer={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* Barre de navigation inférieure Mobile PWA (Safe-area inset) */}
      <nav
        className="lg:hidden shrink-0 bg-white/95 dark:bg-tribbu-charcoal/95 border-t border-slate-200 dark:border-tribbu-charcoal-border px-4 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] flex items-center justify-around z-30"
        aria-label="Navigation mobile"
      >
        <button
          type="button"
          onClick={() => setMobileView('list')}
          className={cn(
            'flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[11px] font-medium transition-colors relative',
            mobileView === 'list'
              ? 'text-tribbu-teal font-semibold'
              : 'text-slate-500 dark:text-slate-400'
          )}
        >
          <Layers className="w-5 h-5" />
          <span>Canaux</span>
          {totalUnreadCount > 0 && (
            <span className="absolute top-0.5 right-2 w-2 h-2 rounded-full bg-tribbu-green" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setMobileView('chat')}
          className={cn(
            'flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[11px] font-medium transition-colors',
            mobileView === 'chat'
              ? 'text-tribbu-green font-semibold'
              : 'text-slate-500 dark:text-slate-400'
          )}
        >
          <MessageSquare className="w-5 h-5" />
          <span>Discussion</span>
        </button>

        <button
          type="button"
          onClick={() => openModal('create-feu-de-camp')}
          className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[11px] font-medium text-amber-500"
        >
          <Flame className="w-5 h-5" />
          <span>Feu de camp</span>
        </button>

        <button
          type="button"
          onClick={() => setNotificationDrawerOpen(true)}
          className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-[11px] font-medium text-slate-500 dark:text-slate-400 relative"
        >
          <Bell className="w-5 h-5" />
          <span>Activité</span>
          {totalUnreadCount > 0 && (
            <span className="absolute top-0 right-2 px-1 rounded-full bg-tribbu-green text-white text-[9px] font-bold">
              {totalUnreadCount}
            </span>
          )}
        </button>
      </nav>
    </>
  );
};

