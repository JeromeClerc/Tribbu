import React, { useEffect, useState } from 'react';
import {
  Building,
  Check,
  Lock,
  Mail,
  MapPin,
  Phone,
  Save,
  User,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/common/Modal';
import { Avatar } from '@/components/common/Avatar';
import { RoleBadge } from '@/components/common/Badge';
import { useUIStore } from '@/lib/uiStore';
import { useAuth } from '@/contexts/AuthContext';

export const UserProfileModal: React.FC = () => {
  const queryClient = useQueryClient();
  const { activeModal, closeModal } = useUIStore();
  const { user, globalRole, activeAssociation, updatePreferences } = useAuth();

  const isOpen = activeModal === 'user-profile';

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [smsEnabled, setSmsEnabled] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Initialise les champs à l'ouverture de la modale à partir du profil courant
  useEffect(() => {
    if (!user || !isOpen) return;

    let initialFirst = user.first_name ?? '';
    let initialLast = user.last_name ?? '';

    // Si first_name / last_name n'étaient pas encore séparés mais que display_name existe
    if (
      user.first_name === undefined &&
      user.last_name === undefined &&
      user.display_name &&
      user.display_name !== user.email.split('@')[0]
    ) {
      const parts = user.display_name.trim().split(/\s+/);
      initialFirst = parts[0] || '';
      initialLast = parts.slice(1).join(' ');
    }

    setFirstName(initialFirst);
    setLastName(initialLast);
    setPhoneNumber(user.phone_number || '');
    setAddress(user.address || '');
    setPostalCode(user.postal_code || '');
    setCity(user.city || '');
    setSmsEnabled(Boolean(user.sms_notifications_enabled));
    setSavedSuccess(false);
  }, [user, isOpen]);

  if (!user) return null;

  const computedDisplayName =
    `${firstName.trim()} ${lastName.trim()}`.trim() ||
    user.email.split('@')[0] ||
    user.email;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);

    try {
      await updatePreferences({
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        display_name: computedDisplayName,
        phone_number: phoneNumber.trim() || null,
        address: address.trim() || null,
        postal_code: postalCode.trim() || null,
        city: city.trim() || null,
        sms_notifications_enabled: Boolean(phoneNumber.trim()) && smsEnabled,
      });

      void queryClient.invalidateQueries({ queryKey: ['tribbu', 'hierarchy'] });
      void queryClient.invalidateQueries({ queryKey: ['tribbu', 'messages'] });

      setSavedSuccess(true);
      window.setTimeout(() => {
        setSavedSuccess(false);
        closeModal();
      }, 900);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      title="Mes informations personnelles"
      subtitle="Toutes vos coordonnées sont facultatives et modifiables librement. Seule votre adresse e-mail reste fixe comme clé d'accès."
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {/* Aperçu en direct de l'identité du membre dans l'association */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-tribbu-charcoal-deep/60 border border-slate-200 dark:border-tribbu-charcoal-border flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar
              name={computedDisplayName}
              src={user.avatar_url}
              role={globalRole}
              size="md"
              online={true}
            />
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {computedDisplayName}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {activeAssociation?.name || 'La Grande Tribbu'}
              </div>
            </div>
          </div>
          <RoleBadge role={globalRole} size="sm" />
        </div>

        {/* E-mail verrouillé (Clé d'accès unique et d'invitation) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1 flex items-center justify-between">
            <span>Adresse e-mail (clé d'accès & d'invitation)</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-tribbu-teal">
              <Lock className="w-3 h-3" />
              <span>Identifiant permanent</span>
            </span>
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="email"
              readOnly
              value={user.email}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-tribbu-charcoal-deep border border-slate-300 dark:border-tribbu-charcoal-border text-slate-500 dark:text-slate-400 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Prénom & Nom (Facultatifs) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Prénom <span className="text-slate-400 font-normal">(facultatif)</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Ex: Camille"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-tribbu-charcoal-deep border border-slate-300 dark:border-tribbu-charcoal-border text-slate-900 dark:text-white focus:border-tribbu-teal focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Nom <span className="text-slate-400 font-normal">(facultatif)</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Ex: Moreau"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-tribbu-charcoal-deep border border-slate-300 dark:border-tribbu-charcoal-border text-slate-900 dark:text-white focus:border-tribbu-teal focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Téléphone (Facultatif, format suisse) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
            Téléphone <span className="text-slate-400 font-normal">(facultatif)</span>
          </label>
          <div className="relative">
            <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => {
                setPhoneNumber(e.target.value);
                if (e.target.value.trim() && !smsEnabled) {
                  setSmsEnabled(true);
                }
              }}
              placeholder="+41 70 000 00 00"
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-tribbu-charcoal-deep border border-slate-300 dark:border-tribbu-charcoal-border text-slate-900 dark:text-white focus:border-tribbu-teal focus:outline-none"
            />
          </div>

          {phoneNumber.trim() && (
            <label className="mt-2 flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={smsEnabled}
                onChange={(e) => setSmsEnabled(e.target.checked)}
                className="w-3.5 h-3.5 accent-tribbu-teal rounded"
              />
              <span>
                Recevoir les notifications importantes de la Grande Tribbu sur
                ce numéro
              </span>
            </label>
          )}
        </div>

        {/* Adresse, NPA, Commune (Facultatifs) */}
        <div className="space-y-3 pt-1 border-t border-slate-200/70 dark:border-tribbu-charcoal-border">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Adresse <span className="text-slate-400 font-normal">(facultatif)</span>
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ex: Rue de Bourg 14"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-tribbu-charcoal-deep border border-slate-300 dark:border-tribbu-charcoal-border text-slate-900 dark:text-white focus:border-tribbu-teal focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                NPA <span className="text-slate-400 font-normal">(facultatif)</span>
              </label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="Ex: 1003"
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-tribbu-charcoal-deep border border-slate-300 dark:border-tribbu-charcoal-border text-slate-900 dark:text-white focus:border-tribbu-teal focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                Commune <span className="text-slate-400 font-normal">(facultatif)</span>
              </label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ex: Lausanne"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-tribbu-charcoal-deep border border-slate-300 dark:border-tribbu-charcoal-border text-slate-900 dark:text-white focus:border-tribbu-teal focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={closeModal}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-tribbu-charcoal-surface"
          >
            Annuler
          </button>

          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-tribbu-teal to-tribbu-green text-white text-xs font-bold shadow-sm hover:opacity-95 disabled:opacity-50 transition-all"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4" />
                <span>Informations enregistrées !</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Enregistrer mes informations</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

