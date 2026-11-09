import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  FileWarning,
  Loader2,
  MessageSquareOff,
  ShieldAlert,
  Tent,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { useUIStore } from '@/lib/uiStore';
import { useAuth } from '@/contexts/AuthContext';
import type {
  Canal,
  ChatMessage,
  FeuDeCamp,
  MembreRole,
  Tippi,
  Tribbu,
} from '@/types/tribbu.types';

interface DeleteTribbuModalProps {
  tribbus: Tribbu[];
  tippis: Tippi[];
  feuxDeCamp: FeuDeCamp[];
  canaux: Canal[];
  messages: ChatMessage[];
  membresRoles: MembreRole[];
  onDeleteTribbu: (tribbuId: string) => Promise<{
    deletedCanalIds: string[];
    deletedMessagesCount: number;
    deletedFilesCount: number;
    deletedTippisCount: number;
    unassignedMembersCount: number;
  }>;
}

export const DeleteTribbuModal: React.FC<DeleteTribbuModalProps> = ({
  tribbus,
  tippis,
  feuxDeCamp,
  canaux,
  messages,
  membresRoles,
  onDeleteTribbu,
}) => {
  const {
    activeModal,
    modalContextTribbuId,
    closeModal,
    closeDeletedCanauxTabs,
  } = useUIStore();
  const { globalRole } = useAuth();

  const [selectedTribbuId, setSelectedTribbuId] = useState<string>('');
  const [confirmationText, setConfirmationText] = useState('');
  const [ackChecked, setAckChecked] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [progressStep, setProgressStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isOpen = activeModal === 'delete-tribbu' && globalRole === 'MANITOU';

  useEffect(() => {
    if (isOpen) {
      setSelectedTribbuId(modalContextTribbuId || tribbus[0]?.id || '');
      setConfirmationText('');
      setAckChecked(false);
      setError(null);
      setProgressStep(null);
    }
  }, [isOpen, modalContextTribbuId, tribbus]);

  const targetTribbu = useMemo(
    () => tribbus.find((t) => t.id === selectedTribbuId) || null,
    [tribbus, selectedTribbuId]
  );

  // Calcul précis de l'impact pour la Tribbu ciblée
  const impact = useMemo(() => {
    if (!targetTribbu) {
      return {
        tippisCount: 0,
        canauxCount: 0,
        messagesCount: 0,
        attachmentsCount: 0,
        membersCount: 0,
        membersBecomingUnassignedCount: 0,
      };
    }

    const tribbuTippis = tippis.filter((tp) => tp.tribbu_id === targetTribbu.id);
    const tippiIds = new Set(tribbuTippis.map((tp) => tp.id));

    const tribbuFdcs = feuxDeCamp.filter(
      (f) => f.tribbu_id === targetTribbu.id
    );
    const fdcIds = new Set(tribbuFdcs.map((f) => f.id));

    const tribbuCanaux = canaux.filter(
      (c) =>
        c.tribbu_id === targetTribbu.id ||
        (c.tippi_id && tippiIds.has(c.tippi_id)) ||
        (c.feu_de_camp_id && fdcIds.has(c.feu_de_camp_id))
    );
    const canalIds = new Set(tribbuCanaux.map((c) => c.id));

    const tribbuMessages = messages.filter((m) => canalIds.has(m.canal_id));
    const attachmentsCount = tribbuMessages.reduce(
      (acc, m) => acc + (m.attachments?.length || 0),
      0
    );

    const tribbuRoles = membresRoles.filter(
      (r) => r.tribbu_id === targetTribbu.id
    );
    const memberIdsInTribbu = new Set(
      tribbuRoles.map((r) => r.user_id).filter(Boolean) as string[]
    );

    let becomingUnassigned = 0;
    for (const uid of memberIdsInTribbu) {
      const hasOtherActiveTribbu = membresRoles.some(
        (r) =>
          r.user_id === uid &&
          r.tribbu_id !== null &&
          r.tribbu_id !== targetTribbu.id &&
          r.status === 'ACTIVE'
      );
      const isManitou = membresRoles.some(
        (r) => r.user_id === uid && r.role === 'MANITOU'
      );
      if (!hasOtherActiveTribbu && !isManitou) {
        becomingUnassigned += 1;
      }
    }

    return {
      tippisCount: tribbuTippis.length,
      canauxCount: tribbuCanaux.length,
      messagesCount: tribbuMessages.length,
      attachmentsCount,
      membersCount: tribbuRoles.length,
      membersBecomingUnassignedCount: becomingUnassigned,
    };
  }, [targetTribbu, tippis, feuxDeCamp, canaux, messages, membresRoles]);

  const expectedPhrase = targetTribbu
    ? `supprimer ${targetTribbu.name.trim()}`
    : '';

  const isPhraseMatch =
    Boolean(targetTribbu) &&
    confirmationText.trim().toLowerCase() === expectedPhrase.toLowerCase();

  const canConfirm = Boolean(targetTribbu) && isPhraseMatch && ackChecked && !isDeleting;

  const handleClose = () => {
    if (isDeleting) return;
    setConfirmationText('');
    setAckChecked(false);
    setError(null);
    setProgressStep(null);
    closeModal();
  };

  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canConfirm || !targetTribbu) return;

    setError(null);
    setIsDeleting(true);
    try {
      setProgressStep(
        '1/3 — Suppression des fichiers joints (.png, .jpg, .pdf) dans Firebase Storage...'
      );
      await new Promise((r) => setTimeout(r, 200));

      setProgressStep(
        '2/3 — Suppression des messages, des Tippis et des canaux de la Tribbu...'
      );
      const res = await onDeleteTribbu(targetTribbu.id);

      setProgressStep(
        '3/3 — Conservation des membres (passage en statut « Sans Tribbu » avec accès Annonces & Agora Générale)...'
      );
      const fallbackCanal =
        canaux.find((c) => c.type === 'GRANDE_TRIBBU_ANNONCES') ||
        canaux.find((c) => c.type === 'AGORA_GENERALE');
      closeDeletedCanauxTabs(
        res.deletedCanalIds,
        fallbackCanal?.id || 'canal-gt-annonces'
      );

      setIsDeleting(false);
      setProgressStep(null);
      closeModal();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erreur lors de la suppression de la Tribbu.'
      );
      setIsDeleting(false);
      setProgressStep(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Suppression sécurisée d'une Tribbu"
      subtitle="Action réservée exclusivement au Grand Manitou • Garde-fou de sécurité obligatoire."
      maxWidthClass="max-w-xl"
    >
      {!targetTribbu ? (
        <div className="p-4 rounded-xl bg-slate-100 dark:bg-tribbu-charcoal-deep text-xs text-slate-600 dark:text-slate-300">
          Aucune Tribbu disponible à supprimer.
        </div>
      ) : (
        <form onSubmit={(e) => void handleConfirmDelete(e)} className="space-y-4">
          {/* Sélecteur de Tribbu si plusieurs existent */}
          {tribbus.length > 1 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Tribbu ciblée pour la suppression
              </label>
              <select
                value={selectedTribbuId}
                onChange={(e) => {
                  setSelectedTribbuId(e.target.value);
                  setConfirmationText('');
                  setAckChecked(false);
                }}
                disabled={isDeleting}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-slate-50 dark:bg-tribbu-charcoal-deep border border-slate-300 dark:border-tribbu-charcoal-border text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                {tribbus.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Alerte de sécurité critique */}
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2.5">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <span>
                Attention : Suppression irréversible de la Tribbu «{' '}
                {targetTribbu.name} »
              </span>
            </div>
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              Cette procédure va supprimer définitivement tous les échanges et
              sous-groupes de la Tribbu{' '}
              <strong className="text-slate-900 dark:text-white">
                {targetTribbu.name}
              </strong>
              , tout en <strong>préservant les comptes de ses membres</strong> au
              sein de la Grande Tribbu :
            </p>

            {/* Bilan chiffré de ce qui sera supprimé vs conservé */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/80 dark:bg-tribbu-charcoal-deep/80 border border-rose-500/20">
                <MessageSquareOff className="w-4 h-4 text-rose-500 shrink-0" />
                <div className="text-xs">
                  <div className="font-bold text-slate-900 dark:text-white">
                    {impact.messagesCount} message(s) supprimé(s)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Dans {impact.canauxCount} canal/canaux de cette Tribbu
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/80 dark:bg-tribbu-charcoal-deep/80 border border-rose-500/20">
                <FileWarning className="w-4 h-4 text-rose-500 shrink-0" />
                <div className="text-xs">
                  <div className="font-bold text-slate-900 dark:text-white">
                    {impact.attachmentsCount} fichier(s) supprimé(s)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Images & PDF stockés dans Firebase Storage
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/80 dark:bg-tribbu-charcoal-deep/80 border border-rose-500/20">
                <Tent className="w-4 h-4 text-rose-500 shrink-0" />
                <div className="text-xs">
                  <div className="font-bold text-slate-900 dark:text-white">
                    {impact.tippisCount} Tippi(s) supprimé(s)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Sous-groupes et tous leurs contenus
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <UserCheck className="w-4 h-4 text-tribbu-green shrink-0" />
                <div className="text-xs">
                  <div className="font-bold text-slate-900 dark:text-white">
                    {impact.membersCount} membre(s) conservé(s)
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-300">
                    {impact.membersBecomingUnassignedCount > 0
                      ? `${impact.membersBecomingUnassignedCount} deviendra/ont « Sans Tribbu »`
                      : 'Rattachés à la Grande Tribbu'}
                  </div>
                </div>
              </div>
            </div>

            {/* Rappel explicite des droits d'un utilisateur sans Tribbu */}
            <div className="p-2.5 rounded-xl bg-tribbu-teal/10 border border-tribbu-teal/25 text-[11px] text-slate-700 dark:text-slate-200 leading-relaxed">
              <strong>Devenir des utilisateurs de la Tribbu :</strong> Aucun
              utilisateur n'est supprimé. Les membres qui n'appartiennent à
              aucune autre Tribbu se retrouvent <strong>sans Tribbu</strong> en
              attendant que le Grand Manitou ou un(e) Chef(fe) de Tribbu les
              assigne à une Tribbu. En attendant, ils peuvent{' '}
              <strong>lire les Annonces Officielles</strong> et{' '}
              <strong>interagir dans l'Agora Générale</strong>.
            </div>
          </div>

          {/* Garde-fou 1 : Case à cocher d'engagement */}
          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-100 dark:bg-tribbu-charcoal-deep border border-slate-200 dark:border-tribbu-charcoal-border cursor-pointer select-none">
            <input
              type="checkbox"
              checked={ackChecked}
              onChange={(e) => setAckChecked(e.target.checked)}
              disabled={isDeleting}
              className="mt-0.5 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
            />
            <span className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              Je confirme vouloir supprimer définitivement la Tribbu{' '}
              <strong>« {targetTribbu.name} »</strong>, tous ses messages,
              fichiers uploadés et Tippis, et basculer ses membres exclusifs en
              statut « Sans Tribbu ».
            </span>
          </label>

          {/* Garde-fou 2 : Saisie manuelle obligatoire "supprimer <nom_tribbu>" */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
              Pour déverrouiller la suppression, retapez manuellement la phrase
              suivante :
            </label>
            <div className="px-3 py-2 rounded-xl bg-slate-900 text-rose-400 font-mono text-xs font-bold tracking-wide select-none border border-rose-500/30 flex items-center justify-between">
              <span>{expectedPhrase}</span>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-sans">
                Saisie manuelle requise
              </span>
            </div>
            <input
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              onPaste={(e) => {
                // Empêche le copier-coller accidentel pour garantir une saisie volontaire
                e.preventDefault();
              }}
              disabled={isDeleting}
              autoComplete="off"
              spellCheck={false}
              placeholder={`Tapez exactement : ${expectedPhrase}`}
              className="w-full px-3.5 py-2.5 text-sm font-mono rounded-xl bg-white dark:bg-tribbu-charcoal-deep border border-slate-300 dark:border-tribbu-charcoal-border text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {progressStep && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2.5 text-xs text-amber-600 dark:text-amber-300 font-medium">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>{progressStep}</span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-600 dark:text-rose-300 font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-tribbu-charcoal-border">
            <button
              type="button"
              onClick={handleClose}
              disabled={isDeleting}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-tribbu-charcoal-surface disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={!canConfirm}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition-all shadow-md shadow-rose-600/25 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Suppression en cours...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Supprimer la Tribbu « {targetTribbu.name} »</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
