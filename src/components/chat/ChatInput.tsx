import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  FileText,
  Image as ImageIcon,
  Link2,
  Lock,
  Paperclip,
  Reply,
  Send,
  Smile,
  X,
} from 'lucide-react';
import { useUIStore } from '@/lib/uiStore';
import { uploadChatAttachment } from '@/lib/storage';
import { formatFileSize, parseTextWithLinks } from '@/lib/utils';
import type { Canal, MessageAttachment } from '@/types/tribbu.types';

interface ChatInputProps {
  canal: Canal;
  currentUserId: string;
  canWrite: boolean;
  isSending: boolean;
  onSendMessage: (params: {
    content: string;
    replyToMessageId?: string | null;
    replyToPreview?: {
      id: string;
      author_name: string;
      content: string;
    } | null;
    quotedExcerpt?: string | null;
    attachments: MessageAttachment[];
  }) => Promise<void>;
  onTypingChange: (isTyping: boolean) => void;
}

const TRIBBU_EMOJIS = [
  '😊',
  '👋',
  '🔥',
  '🏕️',
  '📣',
  '✅',
  '👏',
  '💚',
  '🙌',
  '🎉',
  '📌',
  '🤝',
  '🚀',
  '💡',
  '📅',
  '🙏',
];

export const ChatInput: React.FC<ChatInputProps> = ({
  canal,
  currentUserId,
  canWrite,
  isSending,
  onSendMessage,
  onTypingChange,
}) => {
  const { replyTarget, setReplyTarget } = useUIStore();
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeReply =
    replyTarget && replyTarget.canalId === canal.id ? replyTarget : null;

  // Auto-redimensionnement vertical du textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [content]);

  // Focus auto lors d'une action "Répondre"
  useEffect(() => {
    if (activeReply) {
      textareaRef.current?.focus();
    }
  }, [activeReply]);

  const detectedLinks = React.useMemo(() => {
    return parseTextWithLinks(content).filter((s) => s.type === 'link');
  }, [content]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    onTypingChange(e.target.value.trim().length > 0);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadError(null);
    setIsUploading(true);
    try {
      const uploaded: MessageAttachment[] = [];
      for (const file of Array.from(files)) {
        const att = await uploadChatAttachment(file, canal.id, currentUserId);
        uploaded.push(att);
      }
      setAttachments((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Erreur d'upload du fichier."
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleInsertEmoji = (emoji: string) => {
    setContent((prev) => `${prev}${emoji}`);
    setEmojiOpen(false);
    textareaRef.current?.focus();
  };

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if ((!trimmed && attachments.length === 0) || isSending || isUploading) {
      return;
    }

    await onSendMessage({
      content: trimmed,
      replyToMessageId: activeReply?.messageId || null,
      replyToPreview: activeReply
        ? {
            id: activeReply.messageId,
            author_name: activeReply.authorName,
            content: activeReply.content,
          }
        : null,
      quotedExcerpt: activeReply?.quotedExcerpt || null,
      attachments,
    });

    setContent('');
    setAttachments([]);
    setReplyTarget(null);
    onTypingChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  if (!canWrite) {
    return (
      <div className="p-3.5 border-t border-slate-200 dark:border-tribbu-charcoal-border bg-slate-100/90 dark:bg-tribbu-charcoal-deep/90 flex items-center justify-center gap-2 text-xs text-slate-600 dark:text-slate-300">
        <Lock className="w-4 h-4 text-amber-500 shrink-0" />
        <span>
          Ce canal d'annonces est réservé aux publications du{' '}
          <strong>Grand Manitou</strong> et des <strong>Chef(fe)s</strong>. Vous
          pouvez valider la lecture de chaque annonce via le bouton d'émargement.
        </span>
      </div>
    );
  }

  return (
    <div className="px-3 sm:px-5 py-3 border-t border-slate-200 dark:border-tribbu-charcoal-border bg-white dark:bg-tribbu-charcoal shrink-0">
      {/* Bannière de réponse / citation active */}
      {activeReply && (
        <div className="mb-2 px-3 py-2 rounded-xl bg-tribbu-teal/10 border border-tribbu-teal/30 flex items-start justify-between gap-2">
          <div className="min-w-0 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-tribbu-teal">
              <Reply className="w-3.5 h-3.5" />
              <span>Réponse à {activeReply.authorName}</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 truncate mt-0.5">
              {activeReply.quotedExcerpt
                ? `Extrait cité : « ${activeReply.quotedExcerpt} »`
                : activeReply.content}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setReplyTarget(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white"
            aria-label="Annuler la réponse"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Alerte d'erreur d'upload */}
      {uploadError && (
        <div className="mb-2 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-2 text-xs text-rose-500">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{uploadError}</span>
          </div>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Prévisualisation des fichiers joints avant envoi */}
      {attachments.length > 0 && (
        <div className="mb-2.5 flex flex-wrap gap-2">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="relative flex items-center gap-2.5 p-2 pr-7 rounded-xl border border-slate-200 dark:border-tribbu-charcoal-border bg-slate-50 dark:bg-tribbu-charcoal-deep text-xs"
            >
              {att.type === 'image' ? (
                <img
                  src={att.url}
                  alt={att.name}
                  className="w-10 h-10 rounded-lg object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-rose-500/15 text-rose-500 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0 max-w-[160px]">
                <p className="font-semibold text-slate-800 dark:text-white truncate">
                  {att.name}
                </p>
                <p className="text-[10px] text-slate-400">
                  {formatFileSize(att.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveAttachment(att.id)}
                className="absolute top-1.5 right-1.5 p-0.5 rounded-full bg-slate-200 dark:bg-tribbu-charcoal-surface text-slate-500 hover:text-rose-500"
                title="Retirer cette pièce jointe"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Indicateur de détection automatique de liens URL */}
      {detectedLinks.length > 0 && (
        <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-tribbu-teal">
          <Link2 className="w-3.5 h-3.5" />
          <span>
            {detectedLinks.length} lien{detectedLinks.length > 1 ? 's' : ''}{' '}
            détecté{detectedLinks.length > 1 ? 's' : ''} (sera converti en lien
            cliquable)
          </span>
        </div>
      )}

      {/* Zone de saisie principale */}
      <div className="relative flex items-end gap-2 p-2 rounded-2xl bg-slate-100 dark:bg-tribbu-charcoal-deep border border-slate-200/80 dark:border-tribbu-charcoal-border focus-within:border-tribbu-teal transition-colors">
        {/* Sélecteur d'Emojis */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setEmojiOpen((o) => !o)}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-tribbu-green hover:bg-white/60 dark:hover:bg-tribbu-charcoal transition-colors"
            title="Insérer un smiley"
            aria-label="Insérer un smiley"
          >
            <Smile className="w-5 h-5" />
          </button>

          {emojiOpen && (
            <div className="absolute bottom-12 left-0 z-30 p-2.5 rounded-2xl bg-white dark:bg-tribbu-charcoal border border-slate-200 dark:border-tribbu-charcoal-border shadow-xl grid grid-cols-4 gap-1.5 w-48">
              {TRIBBU_EMOJIS.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => handleInsertEmoji(em)}
                  className="p-1.5 text-lg rounded-lg hover:bg-slate-100 dark:hover:bg-tribbu-charcoal-surface transition-colors"
                >
                  {em}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Upload Images (.png, .jpg) & PDF */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
          multiple
          onChange={(e) => void handleFileSelect(e)}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-tribbu-teal hover:bg-white/60 dark:hover:bg-tribbu-charcoal transition-colors"
          title="Joindre une image (.jpg, .png) ou un document (.pdf)"
          aria-label="Joindre un fichier"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Textarea auto-extensible */}
        <textarea
          ref={textareaRef}
          rows={1}
          value={content}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder={`Écrire dans ${canal.name}... (Entrée pour envoyer, Maj+Entrée pour retour à la ligne)`}
          className="flex-1 bg-transparent resize-none py-1.5 px-1 text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none max-h-40"
        />

        {/* Bouton Envoyer */}
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={
            (!content.trim() && attachments.length === 0) ||
            isSending ||
            isUploading
          }
          className="p-2.5 rounded-xl bg-gradient-to-r from-tribbu-teal to-tribbu-green text-white font-semibold shadow-sm hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0"
          title="Envoyer le message (Entrée)"
          aria-label="Envoyer le message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-1.5 px-1 flex items-center justify-between text-[10px] text-slate-400">
        <span>
          <strong>Entrée</strong> pour envoyer • <strong>Maj + Entrée</strong>{' '}
          pour un saut de ligne
        </span>
        <span className="hidden sm:inline-flex items-center gap-1">
          <ImageIcon className="w-3 h-3" /> .JPG, .PNG & .PDF acceptés (max 10 Mo)
        </span>
      </div>
    </div>
  );
};

