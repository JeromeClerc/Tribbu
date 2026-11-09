import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Compass,
  Flame,
  Hash,
  Megaphone,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Shield,
  Tent,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/lib/uiStore';
import { useAuth } from '@/contexts/AuthContext';
import { UnreadBadge } from '@/components/common/Badge';
import type {
  Canal,
  CanalMutationSummary,
  FeuDeCamp,
  Tippi,
  Tribbu,
} from '@/types/tribbu.types';

interface SidebarProps {
  tribbus: Tribbu[];
  tippis: Tippi[];
  feuxDeCamp: FeuDeCamp[];
  accessibleCanaux: Canal[];
  summariesByCanalId: Record<string, CanalMutationSummary>;
  isMobileDrawer?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  tribbus,
  tippis,
  feuxDeCamp,
  accessibleCanaux,
  summariesByCanalId,
  isMobileDrawer = false,
}) => {
  const { user, globalRole, userRoles } = useAuth();
  const {
    activeCanalId,
    sidebarCollapsed,
    toggleSidebarCollapsed,
    openCanalTab,
    openModal,
  } = useUIStore();

  const [expandedTribbus, setExpandedTribbus] = useState<Record<string, boolean>>(
    () =>
      Object.fromEntries(tribbus.map((t) => [t.id, true]))
  );

  const toggleTribbu = (id: string) => {
    setExpandedTribbus((prev) => ({
      ...prev,
      [id]: !(prev[id] ?? true),
    }));
  };

  // Canaux de la Grande Tribbu
  const gtCanaux = accessibleCanaux.filter(
    (c) =>
      c.type === 'GRANDE_TRIBBU_ANNONCES' || c.type === 'AGORA_GENERALE'
  );

  // Tribbus auxquelles l'utilisateur a accès
  const visibleTribbus = tribbus.filter((tr) =>
    accessibleCanaux.some((c) => c.tribbu_id === tr.id)
  );

  // Canaux Feux de camp accessibles
  const fdcCanaux = accessibleCanaux.filter((c) => c.type === 'FEU_DE_CAMP');

  const isChefOfTribbu = (tribbuId: string) => {
    if (globalRole === 'MANITOU') return true;
    return userRoles.some(
      (r) =>
        r.user_id === user?.id &&
        r.tribbu_id === tribbuId &&
        r.role === 'CHEF' &&
        r.status === 'ACTIVE'
    );
  };

  const renderCanalButton = (
    canal: Canal,
    options?: {
      displayLabel?: string;
      parentLabel?: string;
      accentColor?: string;
      indent?: boolean;
    }
  ) => {
    const isActive = activeCanalId === canal.id;
    const summary = summariesByCanalId[canal.id];
    const unreadCount = summary?.unreadCount || 0;
    const mutated = Boolean(summary?.mutatedSinceLastSeen);

    const icon = (() => {
      switch (canal.type) {
        case 'GRANDE_TRIBBU_ANNONCES':
        case 'TRIBBU_ANNONCES':
          return (
            <Megaphone
              className={cn(
                'w-4 h-4 shrink-0',
                isActive ? 'text-tribbu-green' : 'text-tribbu-green/80'
              )}
            />
          );
        case 'TIPPI':
          return (
            <Tent
              className={cn(
                'w-4 h-4 shrink-0',
                isActive ? 'text-tribbu-purple-light' : 'text-tribbu-purple'
              )}
            />
          );
        case 'FEU_DE_CAMP':
          return (
            <Flame
              className={cn(
                'w-4 h-4 shrink-0',
                isActive ? 'text-amber-400' : 'text-amber-500/80'
              )}
            />
          );
        default:
          return (
            <Hash
              className={cn(
                'w-4 h-4 shrink-0',
                isActive ? 'text-tribbu-teal-light' : 'text-tribbu-teal'
              )}
            />
          );
      }
    })();

    if (sidebarCollapsed && !isMobileDrawer) {
      return (
        <button
          key={canal.id}
          type="button"
          onClick={() =>
            openCanalTab({
              canalId: canal.id,
              title: canal.name,
              type: canal.type,
              parentLabel: options?.parentLabel,
              accentColor: options?.accentColor,
            })
          }
          title={`${canal.name}${unreadCount > 0 ? ` (${unreadCount} non-lus)` : ''}`}
          className={cn(
            'relative w-10 h-10 mx-auto rounded-xl flex items-center justify-center transition-all',
            isActive
              ? 'bg-tribbu-teal/20 text-white ring-1 ring-tribbu-teal'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-tribbu-charcoal-surface'
          )}
        >
          {icon}
          {(unreadCount > 0 || mutated) && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-tribbu-green ring-2 ring-white dark:ring-tribbu-charcoal" />
          )}
        </button>
      );
    }

    return (
      <button
        key={canal.id}
        type="button"
        onClick={() =>
          openCanalTab({
            canalId: canal.id,
            title: canal.name,
            type: canal.type,
            parentLabel: options?.parentLabel,
            accentColor: options?.accentColor,
          })
        }
        className={cn(
          'w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-left text-xs transition-all group',
          options?.indent && 'pl-6',
          isActive
            ? 'bg-tribbu-teal/15 dark:bg-tribbu-teal/20 text-tribbu-teal-dark dark:text-white font-semibold ring-1 ring-tribbu-teal/30'
            : unreadCount > 0
              ? 'text-slate-900 dark:text-white font-semibold hover:bg-slate-200/50 dark:hover:bg-tribbu-charcoal-surface/70'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-tribbu-charcoal-surface/60'
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <span className="truncate">
            {options?.displayLabel || canal.name}
          </span>
        </div>

        <UnreadBadge count={unreadCount} mutatedSinceLastSeen={mutated} />
      </button>
    );
  };

  return (
    <aside
      className={cn(
        'h-full flex flex-col bg-slate-50/90 dark:bg-tribbu-charcoal border-r border-slate-200 dark:border-tribbu-charcoal-border select-none transition-all duration-200',
        isMobileDrawer
          ? 'w-full'
          : sidebarCollapsed
            ? 'w-16 shrink-0'
            : 'w-72 shrink-0'
      )}
    >
      {/* En-tête de la Sidebar */}
      <div className="h-11 px-3 border-b border-slate-200/80 dark:border-tribbu-charcoal-border flex items-center justify-between">
        {(!sidebarCollapsed || isMobileDrawer) && (
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">
            Arborescence Tribbu
          </span>
        )}
        {!isMobileDrawer && (
          <button
            type="button"
            onClick={toggleSidebarCollapsed}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-tribbu-charcoal-surface mx-auto mr-0"
            title={
              sidebarCollapsed
                ? 'Déplier la barre latérale'
                : 'Replier la barre latérale'
            }
            aria-label="Basculer la barre latérale"
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Corps scrollable de l'arborescence */}
      <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-5">
        {/* 1. LA GRANDE TRIBBU */}
        <div>
          {(!sidebarCollapsed || isMobileDrawer) && (
            <div className="px-2 mb-1.5 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-tribbu-green">
                La Grande Tribbu
              </span>
            </div>
          )}
          <div className="space-y-1">
            {gtCanaux.map((canal) =>
              renderCanalButton(canal, {
                displayLabel:
                  canal.type === 'GRANDE_TRIBBU_ANNONCES'
                    ? 'Annonces Officielles'
                    : 'Agora Générale',
                parentLabel: 'Grande Tribbu',
                accentColor:
                  canal.type === 'GRANDE_TRIBBU_ANNONCES'
                    ? '#3BA55D'
                    : '#0E8A9E',
              })
            )}
          </div>
        </div>

        {/* 2. TRIBBUS & TIPPIS RATTACHÉS */}
        <div>
          {(!sidebarCollapsed || isMobileDrawer) && (
            <div className="px-2 mb-1.5 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-tribbu-teal">
                Mes Tribbus ({visibleTribbus.length})
              </span>
              {globalRole === 'MANITOU' && (
                <button
                  type="button"
                  onClick={() => openModal('create-tribbu')}
                  className="p-1 rounded-md text-tribbu-teal hover:bg-tribbu-teal/15 transition-colors"
                  title="Créer une nouvelle Tribbu (Grand Manitou)"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          <div className="space-y-2.5">
            {visibleTribbus.map((tribbu) => {
              const isExpanded = expandedTribbus[tribbu.id] ?? true;
              const tribbuCoreCanaux = accessibleCanaux.filter(
                (c) =>
                  c.tribbu_id === tribbu.id &&
                  (c.type === 'TRIBBU_ANNONCES' || c.type === 'TRIBBU_AGORA')
              );
              const tribbuTippiCanaux = accessibleCanaux.filter(
                (c) => c.tribbu_id === tribbu.id && c.type === 'TIPPI'
              );
              const canManageThisTribbu = isChefOfTribbu(tribbu.id);

              if (sidebarCollapsed && !isMobileDrawer) {
                return (
                  <div key={tribbu.id} className="space-y-1 pt-1 border-t border-slate-200 dark:border-tribbu-charcoal-border">
                    {[...tribbuCoreCanaux, ...tribbuTippiCanaux].map((c) =>
                      renderCanalButton(c, {
                        parentLabel: tribbu.name,
                        accentColor: tribbu.color,
                      })
                    )}
                  </div>
                );
              }

              return (
                <div
                  key={tribbu.id}
                  className="rounded-xl bg-white/70 dark:bg-tribbu-charcoal-deep/40 border border-slate-200/70 dark:border-tribbu-charcoal-border/70 p-1.5"
                >
                  <div className="flex items-center justify-between px-1.5 py-1">
                    <button
                      type="button"
                      onClick={() => toggleTribbu(tribbu.id)}
                      className="flex items-center gap-1.5 text-left min-w-0 flex-1"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: tribbu.color }}
                      />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                        {tribbu.name}
                      </span>
                    </button>

                    {canManageThisTribbu && (
                      <button
                        type="button"
                        onClick={() => openModal('create-tippi', tribbu.id)}
                        className="p-1 rounded-md text-slate-400 hover:text-tribbu-purple hover:bg-tribbu-purple/10 transition-colors"
                        title={`Créer un Tippi dans ${tribbu.name}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="mt-1 space-y-0.5">
                      {tribbuCoreCanaux.map((canal) =>
                        renderCanalButton(canal, {
                          displayLabel:
                            canal.type === 'TRIBBU_ANNONCES'
                              ? 'Annonces'
                              : 'Agora',
                          parentLabel: tribbu.name,
                          accentColor: tribbu.color,
                        })
                      )}

                      {tribbuTippiCanaux.length > 0 && (
                        <div className="pt-1.5 mt-1 border-t border-slate-200/50 dark:border-tribbu-charcoal-border/50">
                          <div className="px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-tribbu-purple-light flex items-center justify-between">
                            <span>Tippis ({tribbuTippiCanaux.length})</span>
                          </div>
                          {tribbuTippiCanaux.map((tippiCanal) => {
                            const tippiObj = tippis.find(
                              (tp) => tp.id === tippiCanal.tippi_id
                            );
                            return renderCanalButton(tippiCanal, {
                              displayLabel: tippiObj?.name || tippiCanal.name,
                              parentLabel: `${tribbu.name} • Tippi`,
                              accentColor: '#8B329C',
                              indent: true,
                            });
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. FEUX DE CAMP (Créables par tous les membres, y compris les Pygmées) */}
        <div>
          {(!sidebarCollapsed || isMobileDrawer) && (
            <div className="px-2 mb-1.5 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500">
                Feux de camp ({fdcCanaux.length})
              </span>
              <button
                type="button"
                onClick={() => openModal('create-feu-de-camp')}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-semibold text-amber-500 hover:bg-amber-500/15 transition-colors"
                title="Allumer un nouveau Feu de camp"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Créer</span>
              </button>
            </div>
          )}

          <div className="space-y-1">
            {fdcCanaux.map((fdcCanal) => {
              const fdcObj = feuxDeCamp.find(
                (f) => f.id === fdcCanal.feu_de_camp_id
              );
              return renderCanalButton(fdcCanal, {
                displayLabel: fdcObj?.name || fdcCanal.name,
                parentLabel: 'Feu de camp privé',
                accentColor: '#F59E0B',
              });
            })}
          </div>
        </div>
      </div>

      {/* Pied de Sidebar : Raccourcis rapides */}
      {(!sidebarCollapsed || isMobileDrawer) && (
        <div className="p-3 border-t border-slate-200 dark:border-tribbu-charcoal-border bg-white/60 dark:bg-tribbu-charcoal-deep/60 space-y-2">
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => openModal('create-feu-de-camp')}
              className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 transition-colors"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Feu de camp</span>
            </button>

            {(globalRole === 'MANITOU' || globalRole === 'CHEF') ? (
              <button
                type="button"
                onClick={() => openModal('invite')}
                className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-semibold bg-tribbu-teal/15 text-tribbu-teal hover:bg-tribbu-teal/25 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Inviter</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  openCanalTab({
                    canalId: 'canal-gt-agora',
                    title: 'Agora Générale',
                    type: 'AGORA_GENERALE',
                    parentLabel: 'Grande Tribbu',
                  })
                }
                className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-[11px] font-semibold bg-tribbu-green/15 text-tribbu-green hover:bg-tribbu-green/25 transition-colors"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Agora</span>
              </button>
            )}
          </div>

          {(globalRole === 'MANITOU' || globalRole === 'CHEF') && (
            <button
              type="button"
              onClick={() => openModal('role-manager')}
              className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-tribbu-charcoal-surface transition-colors"
            >
              <Shield className="w-3.5 h-3.5 text-tribbu-purple" />
              <span>Administration des rôles & Tribbus</span>
            </button>
          )}

          {globalRole === 'MANITOU' && (
            <button
              type="button"
              onClick={() => openModal('delete-association')}
              className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Supprimer l'association</span>
            </button>
          )}
        </div>
      )}
    </aside>
  );
};

