import React from 'react';
import {
  ArrowLeft,
  Eye,
  Flame,
  Hash,
  Lock,
  Megaphone,
  PenLine,
  Tent,
} from 'lucide-react';
import { Avatar } from '@/components/common/Avatar';
import { usePresence } from '@/contexts/PresenceContext';
import { useUIStore } from '@/lib/uiStore';
import { getCanalTypeLabelFr } from '@/lib/utils';
import type { Canal } from '@/types/tribbu.types';

interface ChannelHeaderProps {
  canal: Canal;
  parentTribbuName?: string;
  canWrite: boolean;
}

export const ChannelHeader: React.FC<ChannelHeaderProps> = ({
  canal,
  parentTribbuName,
  canWrite,
}) => {
  const { getUsersInCanal, getTypingUsersInCanal } = usePresence();
  const { setMobileView } = useUIStore();

  const usersInFocus = getUsersInCanal(canal.id);
  const typingUsers = getTypingUsersInCanal(canal.id);

  const icon = (() => {
    switch (canal.type) {
      case 'GRANDE_TRIBBU_ANNONCES':
      case 'TRIBBU_ANNONCES':
        return <Megaphone className="w-5 h-5 text-tribbu-green shrink-0" />;
      case 'TIPPI':
        return <Tent className="w-5 h-5 text-tribbu-purple shrink-0" />;
      case 'FEU_DE_CAMP':
        return <Flame className="w-5 h-5 text-amber-500 shrink-0" />;
      default:
        return <Hash className="w-5 h-5 text-tribbu-teal shrink-0" />;
    }
  })();

  return (
    <div className="px-4 py-2.5 border-b border-slate-200 dark:border-tribbu-charcoal-border bg-white/90 dark:bg-tribbu-charcoal/90 backdrop-blur-xs flex flex-wrap items-center justify-between gap-3 shrink-0">
      {/* Gauche : Retour mobile + Titre du canal + Description */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <button
          type="button"
          onClick={() => setMobileView('list')}
          className="lg:hidden p-1.5 -ml-1 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-tribbu-charcoal-surface"
          aria-label="Retour à la liste des conversations"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="p-2 rounded-xl bg-slate-100 dark:bg-tribbu-charcoal-deep">
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
              {canal.name}
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-tribbu-charcoal-surface text-slate-600 dark:text-slate-300">
              {parentTribbuName || getCanalTypeLabelFr(canal.type)}
            </span>
            {!canWrite && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <Lock className="w-3 h-3" />
                <span>Lecture & Émargement</span>
              </span>
            )}
          </div>
          {canal.description && (
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {canal.description}
            </p>
          )}
        </div>
      </div>

      {/* Droite : Utilisateurs ayant ce canal en focus + Utilisateurs en train d'écrire */}
      <div className="flex items-center gap-3 shrink-0">
        {typingUsers.length > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-tribbu-green/15 text-tribbu-green text-xs font-medium animate-pulse">
            <PenLine className="w-3.5 h-3.5" />
            <span>
              {typingUsers.map((u) => u.displayName.split(' ')[0]).join(', ')}{' '}
              écrit...
            </span>
          </div>
        )}

        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-tribbu-charcoal-deep border border-slate-200/70 dark:border-tribbu-charcoal-border"
          title={`Membres ayant ce canal en focus : ${usersInFocus
            .map((u) => u.displayName)
            .join(', ')}`}
        >
          <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <Eye className="w-3.5 h-3.5 text-tribbu-teal" />
            <span className="hidden md:inline">En focus :</span>
            <strong className="text-slate-800 dark:text-white">
              {usersInFocus.length}
            </strong>
          </div>

          <div className="flex items-center -space-x-1.5">
            {usersInFocus.slice(0, 5).map((u) => (
              <Avatar
                key={u.userId}
                name={u.displayName}
                src={u.avatarUrl}
                role={u.role}
                size="xs"
                online={true}
                isTyping={u.isTypingInCanalId === canal.id}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

