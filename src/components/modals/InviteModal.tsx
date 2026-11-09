import React, { useState } from 'react';
import { Check, Copy, ExternalLink, Mail, Sparkles, UserPlus } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { useUIStore } from '@/lib/uiStore';
import { useAuth } from '@/contexts/AuthContext';
import type { MembreRole, Tribbu, TribbuRole } from '@/types/tribbu.types';

interface InviteModalProps {
  tribbus: Tribbu[];
  onCreateInvitation: (params: {
    email: string;
    tribbuId: string;
    role: TribbuRole;
    invitedBy: string;
  }) => Promise<{ invitation: MembreRole; invitationUrl: string }>;
}

export const InviteModal: React.FC<InviteModalProps> = ({
  tribbus,
  onCreateInvitation,
}) => {
  const { activeModal, closeModal } = useUIStore();
  const { user, globalRole, userRoles } = useAuth();

  const manageableTribbus = React.useMemo(() => {
    if (globalRole === 'MANITOU') return tribbus;
    return tribbus.filter((t) =>
      userRoles.some(
        (r) =>
          r.user_id === user?.id &&
          r.tribbu_id === t.id &&
          r.role === 'CHEF' &&
          r.status === 'ACTIVE'
      )
    );
  }, [tribbus, globalRole, userRoles, user?.id]);

  const [email, setEmail] = useState('');
  const [selectedTribbuId, setSelectedTribbuId] = useState(
    manageableTribbus[0]?.id || tribbus[0]?.id || ''
  );
  const [role, setRole] = useState<TribbuRole>('PYGMEE');
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOpen = activeModal === 'invite';

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !email.trim() || !selectedTribbuId) return;

    setIsSubmitting(true);
    try {
      const res = await onCreateInvitation({
        email: email.trim(),
        tribbuId: selectedTribbuId,
        role,
        invitedBy: user.id,
      });
      setGeneratedUrl(res.invitationUrl);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedUrl) return;
    await navigator.clipboard.writeText(generatedUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  };

  const handleClose = () => {
    setEmail('');
    setGeneratedUrl(null);
    setCopied(false);
    closeModal();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Inviter un nouveau membre dans une Tribbu"
      subtitle="Générez un lien d'invitation sécurisé avec token. L'adresse e-mail deviendra l'identifiant du membre."
    >
      <form onSubmit={(e) => void handleGenerate(e)} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
            Adresse e-mail du futur membre (deviendra son login)
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prenom.nom@association.fr"
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-tribbu-charcoal-deep border border-slate-300 dark:border-tribbu-charcoal-border text-slate-900 dark:text-white focus:border-tribbu-teal focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Tribbu d'affiliation automatique
            </label>
            <select
              value={selectedTribbuId}
              onChange={(e) => setSelectedTribbuId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-tribbu-charcoal-deep border border-slate-300 dark:border-tribbu-charcoal-border text-slate-900 dark:text-white focus:border-tribbu-teal focus:outline-none"
            >
              {manageableTribbus.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Rôle initial attribué
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as TribbuRole)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-tribbu-charcoal-deep border border-slate-300 dark:border-tribbu-charcoal-border text-slate-900 dark:text-white focus:border-tribbu-teal focus:outline-none"
            >
              <option value="PYGMEE">Pygmée (Membre de la Tribbu)</option>
              <option value="CHEF">Chef(fe) de Tribbu</option>
              {globalRole === 'MANITOU' && (
                <option value="MANITOU">Grand Manitou</option>
              )}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !email.trim()}
          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-tribbu-teal to-tribbu-green text-white text-xs font-bold shadow-sm hover:opacity-95 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          <span>Générer l'URL d'invitation avec token</span>
        </button>
      </form>

      {generatedUrl && (
        <div className="mt-5 p-4 rounded-2xl bg-tribbu-green/10 border border-tribbu-green/30 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-tribbu-green">
            <Sparkles className="w-4 h-4" />
            <span>Lien d'invitation prêt à être envoyé !</span>
          </div>

          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
            En cliquant sur cette URL, <strong>{email}</strong> sera invité(e) à
            saisir son mot de passe 2 fois et sera automatiquement affilié(e) à la
            Tribbu sélectionnée.
          </p>

          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={generatedUrl}
              className="flex-1 px-3 py-2 text-[11px] font-mono rounded-xl bg-white dark:bg-tribbu-charcoal-deep border border-slate-200 dark:border-tribbu-charcoal-border text-slate-700 dark:text-slate-200"
            />
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="px-3 py-2 rounded-xl bg-tribbu-teal text-white text-xs font-semibold hover:bg-tribbu-teal-dark inline-flex items-center gap-1.5 shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copié</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copier</span>
                </>
              )}
            </button>
          </div>

          <div className="pt-1 flex justify-end">
            <a
              href={generatedUrl}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-tribbu-teal hover:underline"
            >
              <span>Tester le parcours d'activation de ce lien maintenant</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}
    </Modal>
  );
};

