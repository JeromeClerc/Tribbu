import React from 'react';
import {
  Bell,
  LogOut,
  Menu,
  Moon,
  Search,
  Shield,
  Sun,
  UserPlus,
  Users,
} from 'lucide-react';
import { TribbuLogo } from '@/components/common/TribbuLogo';
import { Avatar } from '@/components/common/Avatar';
import { RoleBadge } from '@/components/common/Badge';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUIStore } from '@/lib/uiStore';
import { isSupabaseConfigured } from '@/lib/supabaseClient';
import { DEMO_PROFILES } from '@/services/demoData';

interface HeaderProps {
  associationName: string;
  totalUnreadCount: number;
  mutatedChannelsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  associationName,
  totalUnreadCount,
  mutatedChannelsCount,
}) => {
  const { resolvedTheme, toggleTheme } = useTheme();
  const { user, globalRole, switchPersona, signOut } = useAuth();
  const {
    setMobileDrawerOpen,
    notificationDrawerOpen,
    setNotificationDrawerOpen,
    openModal,
    searchQuery,
    setSearchQuery,
  } = useUIStore();

  const canInviteOrManage = globalRole === 'MANITOU' || globalRole === 'CHEF';

  return (
    <header className="h-14 shrink-0 px-3 lg:px-5 border-b border-slate-200 dark:border-tribbu-charcoal-border bg-white/95 dark:bg-tribbu-charcoal/95 backdrop-blur-md flex items-center justify-between gap-3 z-30">
      {/* Gauche : Menu Mobile + Logo Tribbu + Identité Association */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={() => setMobileDrawerOpen(true)}
          className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-tribbu-charcoal-surface"
          aria-label="Ouvrir la navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <TribbuLogo size="md" />

        <div className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-tribbu-charcoal-border min-w-0">
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate max-w-[220px]">
            {associationName}
          </span>
        </div>
      </div>

      {/* Centre : Recherche rapide dans le canal & Sélecteur de Persona (Démo / Test des rôles) */}
      <div className="flex items-center gap-2.5 flex-1 max-w-xl justify-end md:justify-center">
        <div className="relative hidden sm:flex items-center w-full max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrer les messages..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-100 dark:bg-tribbu-charcoal-deep border border-transparent focus:border-tribbu-teal focus:outline-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
          />
        </div>

        {!isSupabaseConfigured && user && (
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-tribbu-charcoal-deep border border-slate-200 dark:border-tribbu-charcoal-border">
            <Users className="w-3.5 h-3.5 text-tribbu-teal shrink-0" />
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Vue rôle :
            </span>
            <select
              value={user.id}
              onChange={(e) => void switchPersona(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer"
              aria-label="Changer de rôle utilisateur (Mode Démo)"
            >
              {DEMO_PROFILES.slice(0, 4).map((p) => (
                <option
                  key={p.id}
                  value={p.id}
                  className="bg-white dark:bg-tribbu-charcoal text-slate-900 dark:text-white"
                >
                  {p.display_name} (
                  {p.id === 'user-manitou'
                    ? 'Grand Manitou'
                    : p.id.includes('chef')
                      ? 'Chef de Tribbu'
                      : 'Pygmée'}
                  )
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Droite : Actions d'administration, Notifications, Thème, Profil */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {canInviteOrManage && (
          <>
            <button
              type="button"
              onClick={() => openModal('invite')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-tribbu-teal/15 text-tribbu-teal hover:bg-tribbu-teal hover:text-white transition-colors"
              title="Inviter un nouveau membre par lien e-mail"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Inviter</span>
            </button>

            <button
              type="button"
              onClick={() => openModal('role-manager')}
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-tribbu-charcoal-surface transition-colors"
              title="Gérer les rôles (Manitou, Chefs, Pygmées)"
            >
              <Shield className="w-3.5 h-3.5 text-tribbu-purple" />
              <span>Rôles</span>
            </button>
          </>
        )}

        {/* Bouton Tiroir des Notifications (Mutations depuis dernière connexion) */}
        <button
          type="button"
          onClick={() => setNotificationDrawerOpen(!notificationDrawerOpen)}
          className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-tribbu-charcoal-surface transition-colors"
          aria-label="Ouvrir le centre de notifications"
          title="Conversations modifiées depuis votre dernière connexion"
        >
          <Bell className="w-5 h-5" />
          {(totalUnreadCount > 0 || mutatedChannelsCount > 0) && (
            <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-tribbu-green text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-tribbu-charcoal">
              {totalUnreadCount > 0 ? totalUnreadCount : mutatedChannelsCount}
            </span>
          )}
        </button>

        {/* Toggle Dark / Light Mode */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-tribbu-charcoal-surface transition-colors"
          aria-label="Basculer entre le mode clair et le mode sombre"
          title={
            resolvedTheme === 'dark'
              ? 'Passer en mode clair'
              : 'Passer en mode sombre'
          }
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 text-slate-700" />
          )}
        </button>

        {/* Profil Utilisateur Connecté */}
        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-tribbu-charcoal-border">
            <Avatar
              name={user.display_name}
              src={user.avatar_url}
              role={globalRole}
              size="sm"
              online={true}
            />
            <div className="hidden lg:flex flex-col items-start leading-tight">
              <span className="text-xs font-semibold text-slate-800 dark:text-white max-w-[120px] truncate">
                {user.display_name}
              </span>
              <RoleBadge role={globalRole} size="xs" />
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
              title="Se déconnecter"
              aria-label="Se déconnecter"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

