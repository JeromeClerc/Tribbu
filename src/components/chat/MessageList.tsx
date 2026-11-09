import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, MessageSquarePlus, Sparkles } from 'lucide-react';
import { MessageItem } from './MessageItem';
import { formatDateHeaderFr } from '@/lib/utils';
import { useUIStore } from '@/lib/uiStore';
import type {
  Canal,
  ChatMessage,
  MembreRole,
} from '@/types/tribbu.types';

interface MessageListProps {
  canal: Canal;
  messages: ChatMessage[];
  currentUserId: string;
  userRoles: MembreRole[];
  manitouId: string;
  onConfirmEmargement: (messageId: string) => Promise<void>;
  isConfirmingEmargement: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
  canal,
  messages,
  currentUserId,
  userRoles,
  manitouId,
  onConfirmEmargement,
  isConfirmingEmargement,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const searchQuery = useUIStore((s) => s.searchQuery);

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase();
    return messages.filter(
      (m) =>
        m.content.toLowerCase().includes(q) ||
        m.author?.display_name.toLowerCase().includes(q)
    );
  }, [messages, searchQuery]);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior });
  };

  // Auto-scroll intelligent lors d'un changement de canal ou d'un nouveau message
  useEffect(() => {
    scrollToBottom('auto');
  }, [canal.id]);

  useEffect(() => {
    if (!showScrollBottom) {
      scrollToBottom('smooth');
    }
  }, [filteredMessages.length, showScrollBottom]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBottom(distanceFromBottom > 180);
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="relative flex-1 overflow-y-auto px-2 sm:px-5 py-4 space-y-1"
    >
      {/* Bannière d'accueil du canal */}
      <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-tribbu-teal/10 via-tribbu-green/10 to-tribbu-purple/10 border border-slate-200/70 dark:border-tribbu-charcoal-border">
        <div className="flex items-center gap-2 text-xs font-bold text-tribbu-teal">
          <Sparkles className="w-4 h-4 text-tribbu-green" />
          <span>Début de l'historique — {canal.name}</span>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
          {canal.description ||
            'Échangez en temps réel avec les membres autorisés de ce canal. Les liens collés sont automatiquement convertis et vous pouvez surligner un extrait pour y répondre.'}
        </p>
      </div>

      {filteredMessages.length === 0 ? (
        <div className="py-14 text-center">
          <MessageSquarePlus className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-60" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {searchQuery
              ? `Aucun message ne correspond à « ${searchQuery} »`
              : 'Aucun message dans ce canal pour le moment'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Lancez la discussion ou partagez un document (.jpg, .png, .pdf).
          </p>
        </div>
      ) : (
        filteredMessages.map((msg, idx) => {
          const prevMsg = idx > 0 ? filteredMessages[idx - 1] : null;
          const currentDateLabel = formatDateHeaderFr(msg.created_at);
          const prevDateLabel = prevMsg
            ? formatDateHeaderFr(prevMsg.created_at)
            : null;
          const showDateSeparator = currentDateLabel !== prevDateLabel;

          return (
            <React.Fragment key={msg.id}>
              {showDateSeparator && (
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-slate-200 dark:bg-tribbu-charcoal-border" />
                  <span className="px-3 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200/70 dark:bg-tribbu-charcoal-surface text-slate-600 dark:text-slate-300 capitalize">
                    {currentDateLabel}
                  </span>
                  <div className="flex-1 h-px bg-slate-200 dark:bg-tribbu-charcoal-border" />
                </div>
              )}

              <MessageItem
                message={msg}
                canalType={canal.type}
                currentUserId={currentUserId}
                userRoles={userRoles}
                manitouId={manitouId}
                onConfirmEmargement={onConfirmEmargement}
                isConfirmingEmargement={isConfirmingEmargement}
              />
            </React.Fragment>
          );
        })
      )}

      <div ref={bottomRef} />

      {showScrollBottom && (
        <button
          type="button"
          onClick={() => scrollToBottom('smooth')}
          className="sticky bottom-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-tribbu-teal text-white text-xs font-semibold shadow-lg hover:bg-tribbu-teal-dark transition-all"
        >
          <ArrowDown className="w-3.5 h-3.5" />
          <span>Revenir aux derniers messages</span>
        </button>
      )}
    </div>
  );
};

