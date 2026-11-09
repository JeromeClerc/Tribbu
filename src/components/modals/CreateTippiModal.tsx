import React, { useEffect, useState } from 'react';
import { Compass, Flame, Plus, Tent } from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { useUIStore } from '@/lib/uiStore';
import { useAuth } from '@/contexts/AuthContext';
import type {
  Canal,
  FeuDeCamp,
  Profile,
  Tippi,
  Tribbu,
} from '@/types/tribbu.types';

interface CreateTippiModalProps {
  tribbus: Tribbu[];
  profiles: Profile[];
  onCreateTippi: (params: {
    tribbuId: string;
    name: string;
    description: string;
    memberIds: string[];
    createdBy: string;
  }) => Promise<{ tippi: Tippi; canal: Canal }>;
  onCreateFeuDeCamp: (params: {
    tribbuId: string | null;
    name: string;
    topic: string;
    participantIds: string[];
    createdBy: string;
  }) => Promise<{ feuDeCamp: FeuDeCamp; canal: Canal }>;
  onCreateTribbu: (params: {
    name: string;
    description: string;
    color: string;
    createdBy: string;
  }) => Promise<{ tribbu: Tribbu; agoraCanal: Canal }>;
}

const TRIBBU_PALETTE = [
  { label: 'Teal Tribbu', value: '#0E8A9E' },
  { label: 'Vert Tribbu', value: '#3BA55D' },
  { label: 'Violet Tribbu', value: '#8B329C' },
  { label: 'Ambre Feu', value: '#D97706' },
  { label: 'Indigo Nocturne', value: '#4F46E5' },
];

export const CreateTippiModal: React.FC<CreateTippiModalProps> = ({
  tribbus,
  profiles,
  onCreateTippi,
  onCreateFeuDeCamp,
  onCreateTribbu,
}) => {
  const {
    activeModal,
    modalContextTribbuId,
    closeModal,
    openCanalTab,
  } = useUIStore();
  const { user } = useAuth();

  const isTippiMode = activeModal === 'create-tippi';
  const isFeuMode = activeModal === 'create-feu-de-camp';
  const isTribbuMode = activeModal === 'create-tribbu';
  const isOpen = isTippiMode || isFeuMode || isTribbuMode;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tribbuId, setTribbuId] = useState<string>(
    modalContextTribbuId || tribbus[0]?.id || ''
  );
  const [selectedColor, setSelectedColor] = useState(TRIBBU_PALETTE[0].value);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (modalContextTribbuId) {
      setTribbuId(modalContextTribbuId);
    } else if (tribbus[0]?.id && !tribbuId) {
      setTribbuId(tribbus[0].id);
    }
  }, [modalContextTribbuId, tribbus, tribbuId]);

  const toggleMember = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const resetAndClose = () => {
    setName('');
    setDescription('');
    setSelectedMemberIds([]);
    closeModal();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;

    setIsSubmitting(true);
    try {
      if (isTribbuMode) {
        const { tribbu, agoraCanal } = await onCreateTribbu({
          name: name.trim(),
          description: description.trim(),
          color: selectedColor,
          createdBy: user.id,
        });
        openCanalTab({
          canalId: agoraCanal.id,
          title: agoraCanal.name,
          type: agoraCanal.type,
          parentLabel: tribbu.name,
          accentColor: tribbu.color,
        });
      } else if (isTippiMode) {
        const { canal } = await onCreateTippi({
          tribbuId: tribbuId || tribbus[0]?.id,
          name: name.trim(),
          description: description.trim(),
          memberIds: selectedMemberIds,
          createdBy: user.id,
        });
        openCanalTab({
          canalId: canal.id,
          title: canal.name,
          type: 'TIPPI',
          parentLabel: 'Tippi',
          accentColor: '#8B329C',
        });
      } else if (isFeuMode) {
        const { canal } = await onCreateFeuDeCamp({
          tribbuId: tribbuId === 'ALL' ? null : tribbuId || null,
          name: name.trim(),
          topic: description.trim(),
          participantIds: selectedMemberIds,
          createdBy: user.id,
        });
        openCanalTab({
          canalId: canal.id,
          title: canal.name,
          type: 'FEU_DE_CAMP',
          parentLabel: 'Feu de camp',
          accentColor: '#F59E0B',
        });
      }
      resetAndClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalTitle = isTribbuMode
    ? 'Créer une nouvelle Tribbu (Commission)'
    : isTippiMode
      ? 'Créer un nouveau Tippi (Sous-groupe projet)'
      : 'Allumer un nouveau Feu de camp';

  const modalSubtitle = isTribbuMode
    ? 'Crée automatiquement un canal Annonces et un canal Agora dédiés à cette Tribbu.'
    : isTippiMode
      ? "Un espace lié à votre Tribbu pour échanger sur un projet spécifique sans surcharger l'Agora."
      : 'Espace de discussion directe ou petit groupe que tout membre peut créer.';

  return (
    <Modal
      isOpen={isOpen}
      onClose={resetAndClose}
      title={modalTitle}
      subtitle={modalSubtitle}
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
            {isTribbuMode
              ? 'Nom de la Tribbu / Commission'
              : isTippiMode
                ? 'Nom du Tippi'
                : 'Nom du Feu de camp'}
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={
              isTribbuMode
                ? 'Ex: Commission Partenariats & Mécénat'
                : isTippiMode
                  ? 'Ex: Organisation Stand Accueil'
                  : 'Ex: Point logistique camionnette'
            }
            className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-tribbu-charcoal-deep border border-slate-300 dark:border-tribbu-charcoal-border text-slate-900 dark:text-white focus:border-tribbu-teal focus:outline-none"
          />
        </div>

        {(isTippiMode || isFeuMode) && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
              {isTippiMode
                ? 'Tribbu de rattachement'
                : 'Périmètre (Grande Tribbu ou Tribbu spécifique)'}
            </label>
            <select
              value={tribbuId}
              onChange={(e) => setTribbuId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-tribbu-charcoal-deep border border-slate-300 dark:border-tribbu-charcoal-border text-slate-900 dark:text-white focus:border-tribbu-teal focus:outline-none"
            >
              {isFeuMode && (
                <option value="ALL">
                  La Grande Tribbu (Inter-commissions)
                </option>
              )}
              {tribbus.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {isTribbuMode && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Couleur distinctive de la Tribbu
            </label>
            <div className="flex items-center gap-2.5">
              {TRIBBU_PALETTE.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setSelectedColor(c.value)}
                  className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c.value,
                    borderColor:
                      selectedColor === c.value ? '#FFFFFF' : 'transparent',
                    boxShadow:
                      selectedColor === c.value
                        ? `0 0 0 2px ${c.value}`
                        : 'none',
                  }}
                  title={c.label}
                />
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
            Description / Sujet
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Décrivez brièvement l'objectif de cet espace..."
            className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-tribbu-charcoal-deep border border-slate-300 dark:border-tribbu-charcoal-border text-slate-900 dark:text-white focus:border-tribbu-teal focus:outline-none"
          />
        </div>

        {(isTippiMode || isFeuMode) && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
              Membres invités à participer ({selectedMemberIds.length}{' '}
              sélectionné{selectedMemberIds.length > 1 ? 's' : ''})
            </label>
            <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 dark:border-tribbu-charcoal-border divide-y divide-slate-200/60 dark:divide-tribbu-charcoal-border/60">
              {profiles
                .filter((p) => p.id !== user?.id)
                .map((prof) => {
                  const checked = selectedMemberIds.includes(prof.id);
                  return (
                    <label
                      key={prof.id}
                      className="flex items-center justify-between px-3 py-2 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-tribbu-charcoal-deep"
                    >
                      <div>
                        <div className="font-semibold text-slate-800 dark:text-white">
                          {prof.display_name}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {prof.email}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleMember(prof.id)}
                        className="w-4 h-4 accent-tribbu-teal rounded"
                      />
                    </label>
                  );
                })}
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={resetAndClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-tribbu-charcoal-surface"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-tribbu-teal to-tribbu-green text-white text-xs font-bold shadow-sm hover:opacity-95 disabled:opacity-50"
          >
            {isTribbuMode ? (
              <Compass className="w-4 h-4" />
            ) : isTippiMode ? (
              <Tent className="w-4 h-4" />
            ) : (
              <Flame className="w-4 h-4" />
            )}
            <span>Créer et ouvrir l'onglet</span>
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </Modal>
  );
};

