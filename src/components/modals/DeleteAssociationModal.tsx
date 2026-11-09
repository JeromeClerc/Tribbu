import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  FileWarning,
  Flame,
  MessageSquareOff,
  ShieldAlert,
  Trash2,
  Users,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/common/Modal';
import { useUIStore } from '@/lib/uiStore';
import { useAuth } from '@/contexts/AuthContext';
import type {
  Canal,
  ChatMessage,
  FeuDeCamp,
  MembreRole,
  Profile,
  Tippi,
  Tribbu,
} from '@/types/tribbu.types';

interface DeleteAssociationModalProps {
  associationName: string;
  associationSlug: string;
  messages: ChatMessage[];
  canaux: Canal[];
  tribbus: Tribbu[];
  tippis: Tippi[];
  feuxDeCamp: FeuDeCamp[];
  profiles: Profile[];
  membresRoles: MembreRole[];
}

export const DeleteAssociationModal: React.FC<DeleteAssociationModalProps> = ({
  associationName,
  associationSlug,
  messages,
  canaux,
  tribbus,
  tippis,
  feuxDeCamp,
  profiles,
  membresRoles,
}) => {
  const queryClient = useQueryClient();
  const { activeModal, closeModal, resetAfterAssociationDeletion } =
    useUIStore();
  const { globalRole, deleteActiveAssociation } = useAuth();

  const [typedConfirmation, setTypedConfirmation] = useState('');
  const [acknowledgedIrreversible, setAcknowledgedIrreversible] =
    useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOpen =
    activeModal === 'delete-association' && globalRole === 'MANITOU';

  // Phrase exacte que le Grand Manitou doit retaper manuellement
  const expectedPhrase = `supprimer ${associationName.trim()}`;

  const isPhraseMatching =
    typedConfirmation.trim() === expectedPhrase &&
    acknowledgedIrreversible;

  // Statistiques des éléments qui seront purgés
  const stats = useMemo(() => {
    let filesCount = 0;
    for (const msg of messages) {
      if (Array.isArray(msg.attachments)) {
        filesCount += msg.attachments.length;
      }
    }

    const uniqueMemberIds = new Set<string>();
    for (const p of profiles) uniqueMemberIds.add(p.id);
    for (const r of membresRoles) {
      if (r.user_id) uniqueMemberIds.add(r.user_id);
    }

    const invitedCount = membresRoles.filter(
      (r) => r.status === 'INVITED'
    ).length;

    return {
      messagesCount: messages.length,
      filesCount,
      canauxCount: canaux.length,
      spacesCount: tribbus.length + tippis.length + feuxDeCamp.length,
      membersCount: Math.max(1, uniqueMemberIds.size) + invitedCount,
    };
  }, [messages, canaux, tribbus, tippis, feuxDeCamp, profiles, membresRoles]);

  const handleClose = () => {
    if (isDeleting) return;
    setTypedConfirmation('');
    setAcknowledgedIrreversible(false);
    setError(null);
    closeModal();
  };

  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPhraseMatching || isDeleting) return;

    setError(null);
    setIsDeleting(true);

    try {
      await deleteActiveAssociation();
      resetAfterAssociationDeletion();
      queryClient.clear();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de la suppression de l'association."
      );
      setIsDeleting(false);
    }
  };

  if (globalRole !== 'MANITOU') return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Zone de Danger — Supprimer définitivement l'association"
      subtitle="Action réservée exclusivement au Grand Manitou. Cette opération est totale et irréversible."
    >
      <form onSubmit={(e) => void handleConfirmDelete(e)} className="space-y-4">
        {/* Bandeau d'avertissement critique */}
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-rose-500">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>
              Destruction intégrale de « {associationName} » (/{associationSlug})
            </span>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            La confirmation de cette procédure va supprimer immédiatement de
            Firebase et du stockage :
          </p>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="p-2.5 rounded-xl bg-white/80 dark:bg-tribbu-charcoal-deep border border-rose-500/20 flex items-center gap-2">
              <MessageSquareOff className="w-4 h-4 text-rose-500 shrink-0" />
              <div className="text-[11px] leading-tight">
                <div className="font-bold text-slate-900 dark:text-white">
                  {stats.messagesCount} message{stats.messagesCount > 1 ? 's' : ''}
                </div>
                <div className="text-slate-500 dark:text-slate-400">
                  & émargements dans {stats.canauxCount} canaux
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white/80 dark:bg-tribbu-charcoal-deep border border-rose-500/20 flex items-center gap-2">
              <FileWarning className="w-4 h-4 text-rose-500 shrink-0" />
              <div className="text-[11px] leading-tight">
                <div className="font-bold text-slate-900 dark:text-white">
                  {stats.filesCount} fichier{stats.filesCount > 1 ? 's' : ''}
                </div>
                <div className="text-slate-500 dark:text-slate-400">
                  Images (.png/.jpg) & PDF
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white/80 dark:bg-tribbu-charcoal-deep border border-rose-500/20 flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-500 shrink-0" />
              <div className="text-[11px] leading-tight">
                <div className="font-bold text-slate-900 dark:text-white">
                  {stats.spacesCount} sous-espace{stats.spacesCount > 1 ? 's' : ''}
                </div>
                <div className="text-slate-500 dark:text-slate-400">
                  Tribbus, Tippis & Feux de camp
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white/80 dark:bg-tribbu-charcoal-deep border border-rose-500/20 flex items-center gap-2">
              <Users className="w-4 h-4 text-rose-500 shrink-0" />
              <div className="text-[11px] leading-tight">
                <div className="font-bold text-slate-900 dark:text-white">
                  {stats.membersCount} membre{stats.membersCount > 1 ? 's' : ''}
                </div>
                <div className="text-slate-500 dark:text-slate-400">
                  Profils & invitations liés
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-500 font-semibold">
            {error}
          </div>
        )}

        {/* Garde-fou 1 : Case à cocher obligatoire */}
        <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-tribbu-charcoal-deep border border-slate-200 dark:border-tribbu-charcoal-border cursor-pointer select-none">
          <input
            type="checkbox"
            checked={acknowledgedIrreversible}
            onChange={(e) => setAcknowledgedIrreversible(e.target.checked)}
            disabled={isDeleting}
            className="mt-0.5 w-4 h-4 accent-rose-600 rounded shrink-0"
          />
          <span className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
            Je confirme vouloir supprimer définitivement l'association{' '}
            <strong>{associationName}</strong>, l'ensemble de ses messages,
            fichiers joints (images, PDF) et tous les membres qui y sont rattachés.
          </span>
        </label>

        {/* Garde-fou 2 : Saisie manuelle stricte (copier-coller désactivé) */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
            Pour déverrouiller la suppression, retapez manuellement au clavier :
          </label>
          <div className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-tribbu-charcoal-deep border border-slate-300 dark:border-tribbu-charcoal-border font-mono text-xs font-bold text-rose-500 select-none">
            {expectedPhrase}
          </div>
          <input
            type="text"
            required
            disabled={isDeleting}
            value={typedConfirmation}
            onChange={(e) => setTypedConfirmation(e.target.value)}
            onPaste={(e) => {
              // Empêche le copier-coller accidentel pour imposer la saisie manuelle
              e.preventDefault();
            }}
            placeholder={`Tapez exactement : ${expectedPhrase}`}
            autoComplete="off"
            spellCheck={false}
            className="w-full px-3 py-2.5 text-xs font-mono rounded-xl bg-white dark:bg-tribbu-charcoal-deep border border-slate-300 dark:border-tribbu-charcoal-border text-slate-900 dark:text-white focus:border-rose-500 focus:outline-none"
          />
          <p className="text-[11px] text-slate-400">
            Le copier-coller est désactivé par sécurité. Respectez la casse du
            nom de l'association.
          </p>
        </div>

        {/* Boutons d'action */}
        <div className="pt-2 flex flex-col-reverse sm:flex-row justify-end gap-2">
          <button
            type="button"
            disabled={isDeleting}
            onClick={handleClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-tribbu-charcoal-surface"
          >
            Annuler et conserver l'association
          </button>

          <button
            type="submit"
            disabled={!isPhraseMatching || isDeleting}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {isDeleting ? (
              <>
                <AlertTriangle className="w-4 h-4 animate-pulse" />
                <span>Suppression intégrale en cours...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Supprimer définitivement l'association</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

