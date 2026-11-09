import React from 'react';
import {
  AtSign,
  CheckCircle2,
  CornerDownRight,
  ExternalLink,
  Quote,
  Reply,
  Users,
} from 'lucide-react';
import { Avatar } from '@/components/common/Avatar';
import { RoleBadge } from '@/components/common/Badge';
import { Attachments } from './Attachments';
import {
  cn,
  formatTimeFr,
  isUserMentionedInMessage,
  normalizeMentionKey,
  parseTextWithLinks,
} from '@/lib/utils';
import { useUIStore } from '@/lib/uiStore';
import type {
  CanalType,
  ChatMessage,
  MembreRole,
  Profile,
  TribbuRole,
} from '@/types/tribbu.types';

interface MessageItemProps {
  message: ChatMessage;
  canalType: CanalType;
  currentUser: Profile;
  userRoles: MembreRole[];
  manitouId: string;
  onConfirmEmargement: (messageId: string) => Promise<void>;
  isConfirmingEmargement: boolean;
}

function resolveAuthorRole(
  authorId: string,
  userRoles: MembreRole[],
  manitouId: string
): TribbuRole {
  if (authorId === manitouId) return 'MANITOU';
  const roles = userRoles.filter(
    (r) => r.user_id === authorId && r.status === 'ACTIVE'
  );
  if (roles.some((r) => r.role === 'MANITOU')) return 'MANITOU';
  if (roles.some((r) => r.role === 'CHEF')) return 'CHEF';
  return 'PYGMEE';
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  canalType,
  currentUser,
  userRoles,
  manitouId,
  onConfirmEmargement,
  isConfirmingEmargement,
}) => {
  const { setReplyTarget, setSearchQuery } = useUIStore();

  const isOwn = message.author_id === currentUser.id;
  const isMentioned = isUserMentionedInMessage(message, currentUser);
  const authorName = message.author?.display_name || 'Membre Tribbu';
  const authorRole = resolveAuthorRole(
    message.author_id,
    userRoles,
    manitouId
  );

  const isAnnouncementChannel =
    canalType === 'GRANDE_TRIBBU_ANNONCES' ||
    canalType === 'TRIBBU_ANNONCES';

  const hasConfirmedEmargement = message.emargements.some(
    (e) => e.user_id === currentUser.id
  );

  // Permet de répondre au message entier OU à la partie de texte surlignée par l'utilisateur
  const handleReplyClick = () => {
    const selection = window.getSelection()?.toString().trim();
    const quotedExcerpt =
      selection && message.content.includes(selection)
        ? selection
        : undefined;

    setReplyTarget({
      canalId: message.canal_id,
      messageId: message.id,
      authorName,
      content: message.content,
      quotedExcerpt,
    });
  };

  const segments = parseTextWithLinks(message.content);
  const normCurrentUser = normalizeMentionKey(currentUser.display_name);

  return (
    <div
      className={cn(
        'group relative flex items-start gap-3 px-4 py-3 rounded-2xl transition-colors',
        isMentioned
          ? 'bg-tribbu-purple/10 dark:bg-tribbu-purple/15 border-l-4 border-tribbu-purple shadow-xs my-1.5'
          : isAnnouncementChannel
            ? 'bg-white dark:bg-tribbu-charcoal border border-tribbu-green/25 shadow-soft my-2'
            : isOwn
              ? 'bg-tribbu-teal/8 dark:bg-tribbu-teal/12 hover:bg-tribbu-teal/12 dark:hover:bg-tribbu-teal/18'
              : 'hover:bg-slate-100/80 dark:hover:bg-tribbu-charcoal/60'
      )}
    >
      <Avatar
        name={authorName}
        src={message.author?.avatar_url}
        role={authorRole}
        size="md"
      />

      <div className="min-w-0 flex-1">
        {/* En-tête du message : Auteur, Rôle, Badge Mention, Heure, Action Répondre */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              {authorName}
            </span>
            <RoleBadge role={authorRole} size="xs" />
            {isMentioned && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-tribbu-purple text-white shadow-xs">
                <AtSign className="w-2.5 h-2.5" />
                <span>Vous êtes cité(e)</span>
              </span>
            )}
            <time
              dateTime={message.created_at}
              className="text-[11px] text-slate-400"
            >
              {formatTimeFr(message.created_at)}
            </time>
          </div>

          <button
            type="button"
            onClick={handleReplyClick}
            className="opacity-0 group-hover:opacity-100 focus:opacity-100 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-slate-500 dark:text-slate-300 hover:text-tribbu-teal hover:bg-slate-200/60 dark:hover:bg-tribbu-charcoal-surface transition-all"
            title="Astuce : surlignez une partie du message avant de cliquer pour citer uniquement cet extrait"
          >
            <Reply className="w-3.5 h-3.5" />
            <span>Répondre / Citer</span>
          </button>
        </div>

        {/* Citation du message parent ou de l'extrait sélectionné */}
        {(message.reply_to_message || message.quoted_excerpt) && (
          <div className="mt-1.5 mb-2 pl-3 py-1.5 pr-3 rounded-r-xl border-l-3 border-tribbu-teal bg-slate-100/90 dark:bg-tribbu-charcoal-deep/80 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-1.5 font-semibold text-tribbu-teal text-[11px]">
              <CornerDownRight className="w-3 h-3 shrink-0" />
              <span>
                En réponse à{' '}
                {message.reply_to_message?.author_name || 'un message'}
              </span>
            </div>
            {message.quoted_excerpt ? (
              <p className="mt-0.5 italic text-slate-700 dark:text-slate-200 flex items-start gap-1">
                <Quote className="w-3 h-3 text-tribbu-purple shrink-0 mt-0.5" />
                <span>« {message.quoted_excerpt} »</span>
              </p>
            ) : (
              message.reply_to_message && (
                <p className="mt-0.5 line-clamp-2 text-slate-500 dark:text-slate-400">
                  {message.reply_to_message.content}
                </p>
              )
            )}
          </div>
        )}

        {/* Corps du message avec sauts de ligne, mentions <@nom_personne> et liens cliquables */}
        {message.content && (
          <div className="mt-1 text-xs sm:text-sm text-slate-800 dark:text-slate-100 whitespace-pre-wrap break-words leading-relaxed">
            {segments.map((seg, i) => {
              if (seg.type === 'mention' && seg.mentionName) {
                const isSelfMention =
                  normalizeMentionKey(seg.mentionName) === normCurrentUser;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSearchQuery(`<@${seg.mentionName}>`)}
                    title={`Filtrer les messages citant <@${seg.mentionName}>`}
                    className={cn(
                      'inline-flex items-center gap-0.5 px-1.5 py-0.5 mx-0.5 rounded-md text-xs font-semibold transition-all cursor-pointer align-baseline',
                      isSelfMention
                        ? 'bg-tribbu-purple text-white ring-2 ring-tribbu-purple-light/40 shadow-xs'
                        : 'bg-tribbu-teal/15 text-tribbu-teal-dark dark:text-tribbu-teal-light border border-tribbu-teal/30 hover:bg-tribbu-teal/25'
                    )}
                  >
                    <span>@{seg.mentionName}</span>
                  </button>
                );
              }

              if (seg.type === 'link') {
                return (
                  <a
                    key={i}
                    href={seg.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-tribbu-teal hover:text-tribbu-teal-light underline underline-offset-2 font-medium break-all"
                  >
                    <span>{seg.value}</span>
                    <ExternalLink className="w-3 h-3 shrink-0 inline" />
                  </a>
                );
              }

              return <React.Fragment key={i}>{seg.value}</React.Fragment>;
            })}
          </div>
        )}

        {/* Pièces jointes (.png, .jpg, .pdf) */}
        <Attachments attachments={message.attachments} />

        {/* Barre d'Émargement (Read receipts) pour les Annonces de la Grande Tribbu / Tribbu */}
        {isAnnouncementChannel && (
          <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-tribbu-charcoal-border/80 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              disabled={hasConfirmedEmargement || isConfirmingEmargement}
              onClick={() => void onConfirmEmargement(message.id)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
                hasConfirmedEmargement
                  ? 'bg-tribbu-green/15 text-tribbu-green cursor-default'
                  : 'bg-tribbu-green text-white hover:bg-tribbu-green-dark shadow-xs cursor-pointer'
              )}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {hasConfirmedEmargement
                  ? "J'ai lu et émargé cette annonce"
                  : "Valider la lecture (Émarger l'annonce)"}
              </span>
            </button>

            <div
              className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400"
              title={
                message.emargements.length > 0
                  ? `Validé par : ${message.emargements
                      .map((e) => e.user?.display_name || 'Membre')
                      .join(', ')}`
                  : 'Aucun émargement pour le moment'
              }
            >
              <Users className="w-3.5 h-3.5 text-tribbu-green" />
              <span>
                <strong className="text-slate-800 dark:text-white">
                  {message.emargements.length}
                </strong>{' '}
                émargement{message.emargements.length > 1 ? 's' : ''} confirmé
                {message.emargements.length > 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
