import React from 'react';
import { Flame, Hash, Megaphone, Tent, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/lib/uiStore';
import { usePresence } from '@/contexts/PresenceContext';
import type {
  CanalMutationSummary,
  CanalType,
} from '@/types/tribbu.types';

interface TabBarProps {
  summariesByCanalId: Record<string, CanalMutationSummary>;
}

function getTabIcon(type: CanalType, isActive: boolean) {
  switch (type) {
    case 'GRANDE_TRIBBU_ANNONCES':
    case 'TRIBBU_ANNONCES':
      return (
        <Megaphone
          className={cn(
            'w-3.5 h-3.5 shrink-0',
            isActive ? 'text-tribbu-green' : 'text-tribbu-green/75'
          )}
        />
      );
    case 'TIPPI':
      return (
        <Tent
          className={cn(
            'w-3.5 h-3.5 shrink-0',
            isActive ? 'text-tribbu-purple-light' : 'text-tribbu-purple'
          )}
        />
      );
    case 'FEU_DE_CAMP':
      return (
        <Flame
          className={cn(
            'w-3.5 h-3.5 shrink-0',
            isActive ? 'text-amber-400' : 'text-amber-500/80'
          )}
        />
      );
    default:
      return (
        <Hash
          className={cn(
            'w-3.5 h-3.5 shrink-0',
            isActive ? 'text-tribbu-teal-light' : 'text-tribbu-teal'
          )}
        />
      );
  }
}

export const TabBar: React.FC<TabBarProps> = ({ summariesByCanalId }) => {
  const { openTabs, activeCanalId, setActiveCanalId, closeCanalTab } =
    useUIStore();
  const { getUsersInCanal, getTypingUsersInCanal } = usePresence();

  return (
    <div
      className="h-11 shrink-0 bg-slate-200/70 dark:bg-tribbu-charcoal-deep border-b border-slate-200 dark:border-tribbu-charcoal-border px-2 flex items-end gap-1 overflow-x-auto no-scrollbar select-none"
      role="tablist"
      aria-label="Conversations ouvertes"
    >
      {openTabs.map((tab) => {
        const isActive = tab.canalId === activeCanalId;
        const summary = summariesByCanalId[tab.canalId];
        const unreadCount = summary?.unreadCount || 0;
        const focusedUsersCount = getUsersInCanal(tab.canalId).length;
        const typingUsersCount = getTypingUsersInCanal(tab.canalId).length;

        return (
          <div
            key={tab.canalId}
            role="tab"
            aria-selected={isActive}
            onClick={() => setActiveCanalId(tab.canalId)}
            className={cn(
              'group relative flex items-center gap-2 px-3.5 py-2 rounded-t-xl text-xs cursor-pointer transition-all min-w-[150px] max-w-[240px] border-t border-x',
              isActive
                ? 'bg-white dark:bg-tribbu-charcoal text-slate-900 dark:text-white font-semibold border-slate-200 dark:border-tribbu-charcoal-border shadow-xs'
                : 'bg-slate-100/60 dark:bg-tribbu-charcoal/40 text-slate-600 dark:text-slate-400 border-transparent hover:bg-white/60 dark:hover:bg-tribbu-charcoal/70'
            )}
          >
            {/* Liseré supérieur coloré sur l'onglet actif */}
            {isActive && (
              <span
                className="absolute top-0 left-2 right-2 h-0.5 rounded-full bg-gradient-to-r from-tribbu-teal via-tribbu-green to-tribbu-purple"
              />
            )}

            {getTabIcon(tab.type, isActive)}

            <div className="flex flex-col min-w-0 flex-1 leading-tight">
              <span className="truncate">{tab.title}</span>
              <span className="text-[9px] text-slate-400 truncate">
                {typingUsersCount > 0 ? (
                  <span className="text-tribbu-green font-medium">
                    ✍️ écrit en direct...
                  </span>
                ) : (
                  `${focusedUsersCount} en focus`
                )}
              </span>
            </div>

            {!isActive && unreadCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-tribbu-teal text-white text-[10px] font-bold shrink-0">
                {unreadCount}
              </span>
            )}

            {openTabs.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  closeCanalTab(tab.canalId);
                }}
                className="p-0.5 rounded-md opacity-60 group-hover:opacity-100 hover:bg-slate-200 dark:hover:bg-tribbu-charcoal-surface text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all shrink-0"
                title="Fermer cet onglet"
                aria-label={`Fermer l'onglet ${tab.title}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

