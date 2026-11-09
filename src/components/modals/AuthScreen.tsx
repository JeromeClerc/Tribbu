import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Crown,
  FileText,
  Globe,
  KeyRound,
  Lock,
  LogIn,
  LogOut,
  Mail,
  MapPin,
  Phone,
  PlusCircle,
  ShieldAlert,
  Sparkles,
  User,
} from 'lucide-react';
import { TribbuLogo } from '@/components/common/TribbuLogo';
import { useAuth } from '@/contexts/AuthContext';
import {
  cn,
   sanitizeSlugInput,
  slugifyAssociationName,
} from '@/lib/utils';
import { DEMO_PROFILES, DEMO_TRIBBUS } from '@/services/demoData';

type AuthMode = 'create-saas' | 'login';

export const AuthScreen: React.FC = () => {
  const {
    user,
    activeSlug,
    activeAssociation,
    allAssociations,
    isMemberOfActiveAssociation,
    pendingInvitation,
    signIn,
    createAssociationWithAccount,
    completeInvitationSignup,
    selectAssociationSlug,
    switchPersona,
    signOut,
    clearPendingInvitation,
  } = useAuth();

  // Si l'URL pointe déjà vers une association existante (/les-sentiers-vivants ou autre),
  // on ouvre l'onglet Connexion par défaut ; sinon (racine "/" ou nouveau slug), on ouvre la Création initiale SaaS.
  const [mode, setMode] = useState<AuthMode>(() =>
    activeSlug && activeAssociation ? 'login' : 'create-saas'
  );

  useEffect(() => {
    if (activeSlug && activeAssociation) {
      setMode('login');
    } else if (!activeSlug) {
      setMode('create-saas');
    }
  }, [activeSlug, activeAssociation]);

  // --- État : Création initiale SaaS (1er membre + Nouvelle Association) ---
  const [creatorDisplayName, setCreatorDisplayName] = useState('');
  const [creatorEmail, setCreatorEmail] = useState('');
  const [creatorPhone, setCreatorPhone] = useState('');
  const [creatorPassword, setCreatorPassword] = useState('');
  const [creatorPasswordConfirm, setCreatorPasswordConfirm] = useState('');

  // Seul champ obligatoire pour l'association : le nom
  const [associationName, setAssociationName] = useState(() =>
    activeSlug && !activeAssociation ? activeSlug.replace(/-/g, ' ') : ''
  );
  const [customSlug, setCustomSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Champs optionnels de l'association
  const [associationDescription, setAssociationDescription] = useState('');
  const [associationAddress, setAssociationAddress] = useState('');
  const [associationContactPhone, setAssociationContactPhone] = useState('');
  const [associationContactEmail, setAssociationContactEmail] = useState('');

  // --- État : Connexion à une association existante ---
  const [targetSlugInput, setTargetSlugInput] = useState(
    activeAssociation?.slug || activeSlug || 'les-sentiers-vivants'
  );
  const [loginEmail, setLoginEmail] = useState(
    'camille.moreau@tribbu-asso.fr'
  );
  const [loginPassword, setLoginPassword] = useState('••••••••••••');

  // --- État : Finalisation d'Invitation (mot de passe 2x) ---
  const [inviteDisplayName, setInviteDisplayName] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [password1, setPassword1] = useState('');
  const [password2, setPassword2] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (activeAssociation?.slug) {
      setTargetSlugInput(activeAssociation.slug);
    } else if (activeSlug) {
      setTargetSlugInput(activeSlug);
    }
  }, [activeAssociation, activeSlug]);

  // Calcul temps réel du slug d'URL en minuscule sans accents et sans espaces
  const computedSlug = useMemo(() => {
    if (slugManuallyEdited && customSlug.trim()) {
      return sanitizeSlugInput(customSlug);
    }
    return slugifyAssociationName(associationName);
  }, [associationName, customSlug, slugManuallyEdited]);

  const originUrl =
    typeof window !== 'undefined' ? window.location.origin : 'https://tribbu.app';

  const invitedTribbuName = useMemo(() => {
    if (!pendingInvitation?.tribbuId) {
      return activeAssociation?.name || 'La Grande Tribbu';
    }
    return (
      DEMO_TRIBBUS.find((t) => t.id === pendingInvitation.tribbuId)?.name ||
      'Tribbu Associative'
    );
  }, [pendingInvitation, activeAssociation]);

  // Associations auxquelles l'utilisateur connecté appartient déjà
  const userOwnAssociations = useMemo(() => {
    if (!user) return [];
    return allAssociations.filter(
      (a) =>
        a.manitou_id === user.id ||
        user.grande_tribbu_ids?.includes(a.id)
    );
  }, [user, allAssociations]);

  const handleCreateSaasAssociation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!associationName.trim()) {
      setError("Le nom de l'association est obligatoire.");
      return;
    }
    if (!computedSlug) {
      setError("Le slug d'URL généré pour l'association est invalide.");
      return;
    }
    if (!creatorEmail.trim()) {
      setError('Veuillez saisir votre adresse e-mail de connexion.');
      return;
    }
    if (creatorPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (creatorPassword !== creatorPasswordConfirm) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setSubmitting(true);
    try {
      await createAssociationWithAccount({
        email: creatorEmail.trim(),
        password: creatorPassword,
        displayName:
          creatorDisplayName.trim() ||
          creatorEmail.split('@')[0] ||
          'Grand Manitou',
        userPhone: creatorPhone.trim() || undefined,
        associationName: associationName.trim(),
        slug: computedSlug,
        description: associationDescription.trim() || undefined,
        address: associationAddress.trim() || undefined,
        contactPhone: associationContactPhone.trim() || undefined,
        contactEmail: associationContactEmail.trim() || undefined,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de la création de l'association."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanSlug = sanitizeSlugInput(targetSlugInput);
    if (!cleanSlug) {
      setError("Veuillez choisir ou saisir le slug URL de votre association.");
      return;
    }

    setSubmitting(true);
    try {
      await signIn(loginEmail, loginPassword, cleanSlug);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de connexion');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password1.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.');
      return;
    }
    if (password1 !== password2) {
      setError('Les deux mots de passe saisis ne correspondent pas.');
      return;
    }

    if (!pendingInvitation) return;

    setSubmitting(true);
    try {
      await completeInvitationSignup({
        email: pendingInvitation.email || 'membre.invite@tribbu-asso.fr',
        displayName:
          inviteDisplayName.trim() ||
          pendingInvitation.email.split('@')[0] ||
          'Nouveau Membre',
        password: password1,
        phoneNumber: invitePhone.trim() || undefined,
        invitationToken: pendingInvitation.token,
        tribbuId: pendingInvitation.tribbuId,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'activation");
    } finally {
      setSubmitting(false);
    }
  };

  // CAS D'ISOLATION MULTI-TENANT : L'utilisateur est connecté à l'Association A,
  // mais tente d'accéder à l'URL `/<slug>` d'une Association B dont il n'est pas membre.
  if (
    user &&
    !pendingInvitation &&
    activeAssociation &&
    !isMemberOfActiveAssociation
  ) {
    return (
      <div className="min-h-screen w-full bg-tribbu-ivory dark:bg-tribbu-charcoal-deep flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-tribbu-charcoal border border-slate-200 dark:border-tribbu-charcoal-border shadow-2xl overflow-hidden">
          <div className="p-6 text-center bg-gradient-to-b from-rose-500/15 via-tribbu-purple/10 to-transparent border-b border-slate-200/70 dark:border-tribbu-charcoal-border">
            <TribbuLogo size="lg" className="justify-center" />
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 text-rose-500 text-xs font-bold">
              <ShieldAlert className="w-4 h-4" />
              <span>Cloisonnement inter-associations actif</span>
            </div>
          </div>

          <div className="p-6 space-y-4 text-center">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Accès réservé aux membres de « {activeAssociation.name} »
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Vous êtes actuellement connecté(e) en tant que{' '}
              <strong>{user.display_name}</strong> ({user.email}), mais votre
              compte n'appartient pas à l'association{' '}
              <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-tribbu-charcoal-deep font-mono text-tribbu-teal">
                /{activeAssociation.slug}
              </code>
              . Conformément à la sécurité multi-associations de Tribbu, les
              membres d'une association ne peuvent ni voir ni interagir avec les
              Tribbus ou Tippis d'une autre association.
            </p>

            {userOwnAssociations.length > 0 && (
              <div className="pt-2 space-y-2">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Rejoindre votre espace associatif autorisé :
                </p>
                <div className="flex flex-col gap-2">
                  {userOwnAssociations.map((asso) => (
                    <button
                      key={asso.id}
                      type="button"
                      onClick={() => selectAssociationSlug(asso.slug)}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-tribbu-teal to-tribbu-green text-white text-xs font-bold shadow-md hover:opacity-95 flex items-center justify-between"
                    >
                      <span>{asso.name}</span>
                      <span className="font-mono text-[11px] bg-black/20 px-2 py-0.5 rounded-lg">
                        /{asso.slug}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-200 dark:border-tribbu-charcoal-border flex flex-col sm:flex-row gap-2 justify-center">
              <button
                type="button"
                onClick={() => void signOut()}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-tribbu-charcoal-border text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-tribbu-charcoal-surface"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Changer de compte ou créer une nouvelle association</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-tribbu-ivory dark:bg-tribbu-charcoal-deep flex flex-col justify-center items-center p-4 py-8">
      <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-tribbu-charcoal border border-slate-200 dark:border-tribbu-charcoal-border shadow-2xl overflow-hidden">
        {/* Bandeau identitaire avec le logo Tribbu */}
        <div className="p-6 text-center bg-gradient-to-b from-tribbu-teal/15 via-tribbu-green/10 to-transparent border-b border-slate-200/70 dark:border-tribbu-charcoal-border">
          <TribbuLogo size="xl" className="justify-center" />
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-2">
            Plateforme SaaS collaborative hiérarchique en temps réel pour associations
          </p>

          {/* Badge d'URL d'association si présent dans la barre d'adresse */}
          {activeAssociation && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-tribbu-teal/15 border border-tribbu-teal/30 text-xs">
              <Globe className="w-3.5 h-3.5 text-tribbu-teal" />
              <span className="font-bold text-slate-800 dark:text-white">
                {activeAssociation.name}
              </span>
              <code className="text-[11px] font-mono text-tribbu-teal">
                /{activeAssociation.slug}
              </code>
            </div>
          )}
        </div>

        {/* Sélecteur d'onglets : Création initiale d'Association vs Connexion */}
        {!pendingInvitation && (
          <div className="grid grid-cols-2 border-b border-slate-200 dark:border-tribbu-charcoal-border bg-slate-50/70 dark:bg-tribbu-charcoal-deep/60 p-1.5 gap-1.5">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode('create-saas');
              }}
              className={cn(
                'py-2.5 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all',
                mode === 'create-saas'
                  ? 'bg-gradient-to-r from-tribbu-teal to-tribbu-green text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-tribbu-charcoal-surface'
              )}
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>Créer mon Association (1er membre)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode('login');
              }}
              className={cn(
                'py-2.5 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all',
                mode === 'login'
                  ? 'bg-gradient-to-r from-tribbu-teal to-tribbu-green text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-tribbu-charcoal-surface'
              )}
            >
              <LogIn className="w-4 h-4 shrink-0" />
              <span>Se connecter à une Association</span>
            </button>
          </div>
        )}

        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-500">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {pendingInvitation ? (
            /* =====================================================================
               MODE 3 : FINALISATION D'INVITATION PAR LIEN TOKENISÉ (MOT DE PASSE 2X)
               ===================================================================== */
            <form
              onSubmit={(e) => void handleCompleteInvitation(e)}
              className="space-y-4"
            >
              <div className="p-3.5 rounded-2xl bg-tribbu-green/10 border border-tribbu-green/30 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-tribbu-green">
                  <Sparkles className="w-4 h-4" />
                  <span>Invitation officielle détectée</span>
                </div>
                <p className="text-slate-600 dark:text-slate-300">
                  Vous rejoignez l'association{' '}
                  <strong>
                    {activeAssociation?.name || 'votre Grande Tribbu'}
                  </strong>{' '}
                  ({invitedTribbuName}). Choisissez votre mot de passe (2x) pour
                  activer votre compte.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Identifiant de connexion (E-mail invité)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    readOnly
                    value={pendingInvitation.email}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-tribbu-charcoal-deep border border-slate-300 dark:border-tribbu-charcoal-border text-slate-500 dark:text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Votre prénom et nom
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={inviteDisplayName}
                      onChange={(e) => setInviteDisplayName(e.target.value)}
                      placeholder="Ex: Julien Marchand"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-tribbu-charcoal-deep border border-slate-300 dark:border-tribbu-charcoal-border text-slate-900 dark:text-white focus:border-tribbu-teal focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Téléphone mobile (optionnel)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="tel"
                      value={invitePhone}
                      onChange={(e) => setInvitePhone(e.target.value)}
                      placeholder="+41 70 000 00 00"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-tribbu-charcoal-deep border border-slate-300 dark:border-tribbu-charcoal-border text-slate-900 dark:text-white focus:border-tribbu-teal focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Mot de passe (1/2)
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={password1}
                      onChange={(e) => setPassword1(e.target.value)}
                      placeholder="Min. 8 caractères"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-tribbu-charcoal-deep border border-slate-300 dark:border-tribbu-charcoal-border text-slate-900 dark:text-white focus:border-tribbu-teal focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                    Confirmer (2/2)
                  </label>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={password2}
                      onChange={(e) => setPassword2(e.target.value)}
                      placeholder="Répétez le mot de passe"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-tribbu-charcoal-deep border border-slate-300 dark:border-tribbu-charcoal-border text-slate-900 dark:text-white focus:border-tribbu-teal focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-tribbu-teal to-tribbu-green text-white text-xs font-bold shadow-md hover:opacity-95 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Finaliser mon compte et rejoindre la Tribbu</span>
              </button>

              <button
                type="button"
                onClick={clearPendingInvitation}
                className="w-full text-center text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Retour au portail d'accueil
              </button>
            </form>
          ) : mode === 'create-saas' ? (
            /* =====================================================================
               MODE 1 : CRÉATION INITIALE SAAS (1ER MEMBRE + NOUVELLE ASSOCIATION)
               ===================================================================== */
            <form
              onSubmit={(e) => void handleCreateSaasAssociation(e)}
              className="space-y-5"
            >
              <div className="p-3.5 rounded-2xl bg-tribbu-teal/10 border border-tribbu-teal/30 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-tribbu-teal">
                  <Crown className="w-4 h-4" />
                  <span>
                    Initialisation d'une nouvelle association sur Tribbu
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                  Créez votre compte personnel puis votre association. Vous en
                  deviendrez automatiquement le{' '}
                  <strong>Grand Manitou</strong> et obtiendrez une URL dédiée{' '}
                  <code className="px-1 py-0.5 rounded bg-white/70 dark:bg-tribbu-charcoal-deep font-mono text-tribbu-teal">
                    /{computedSlug || 'nom-association'}
                  </code>{' '}
                  totalement isolée des autres associations.
                </p>
              </div>

              {/* SECTION 1 : COMPTE DU 1ER MEMBRE (GRAND MANITOU) */}
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50/80 dark:bg-tribbu-charcoal-deep/50 border border-slate-200/80 dark:border-tribbu-charcoal-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-tribbu-teal flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    <span>1. Votre compte personnel (Grand Manitou)</span>
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-tribbu-teal/15 text-tribbu-teal">
                    1er Membre Fondateur
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      Votre prénom et nom *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={creatorDisplayName}
                        onChange={(e) => setCreatorDisplayName(e.target.value)}
                        placeholder="Ex: Claire Fontaine"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-tribbu-charcoal border border-slate-300 dark:border-tribbu-charcoal-border text-slate-900 dark:text-white focus:border-tribbu-teal focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      Votre e-mail de connexion *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        value={creatorEmail}
                        onChange={(e) => setCreatorEmail(e.target.value)}
                        placeholder="claire@mon-association.org"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-tribbu-charcoal border border-slate-300 dark:border-tribbu-charcoal-border text-slate-900 dark:text-white focus:border-tribbu-teal focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      Mot de passe *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={creatorPassword}
                        onChange={(e) => setCreatorPassword(e.target.value)}
                        placeholder="Min. 8 caractères"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-tribbu-charcoal border border-slate-300 dark:border-tribbu-charcoal-border text-slate-900 dark:text-white focus:border-tribbu-teal focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      Confirmer le mot de passe *
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={creatorPasswordConfirm}
                        onChange={(e) =>
                          setCreatorPasswordConfirm(e.target.value)
                        }
                        placeholder="Répétez le mot de passe"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-tribbu-charcoal border border-slate-300 dark:border-tribbu-charcoal-border text-slate-900 dark:text-white focus:border-tribbu-teal focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      Téléphone mobile (optionnel)
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="tel"
                        value={creatorPhone}
                        onChange={(e) => setCreatorPhone(e.target.value)}
                        placeholder="+41 70 000 00 00"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-tribbu-charcoal border border-slate-300 dark:border-tribbu-charcoal-border text-slate-900 dark:text-white focus:border-tribbu-teal focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 2 : IDENTITÉ DE L'ASSOCIATION (1 SEUL CHAMP OBLIGATOIRE : LE NOM) */}
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50/80 dark:bg-tribbu-charcoal-deep/50 border border-slate-200/80 dark:border-tribbu-charcoal-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-tribbu-green flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>2. Votre Association (La Grande Tribbu)</span>
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-tribbu-green/15 text-tribbu-green">
                    Nom seul obligatoire
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      Nom de l'association (seul champ obligatoire) *
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={associationName}
                        onChange={(e) => setAssociationName(e.target.value)}
                        placeholder="Ex: Les Éclaireurs des Alpes"
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-tribbu-charcoal border border-slate-300 dark:border-tribbu-charcoal-border text-slate-900 dark:text-white focus:border-tribbu-teal focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      Slug URL (minuscule, sans accents ni espaces)
                    </label>
                    <div className="relative">
                      <Globe className="w-4 h-4 text-tribbu-teal absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={
                          slugManuallyEdited ? customSlug : computedSlug
                        }
                        onChange={(e) => {
                          setSlugManuallyEdited(true);
                          setCustomSlug(sanitizeSlugInput(e.target.value));
                        }}
                        placeholder="les-eclaireurs-des-alpes"
                        className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl bg-white dark:bg-tribbu-charcoal border border-slate-300 dark:border-tribbu-charcoal-border text-tribbu-teal focus:border-tribbu-teal focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Aperçu en direct de l'URL dédiée de l'association */}
                <div className="px-3 py-2 rounded-xl bg-tribbu-teal/10 border border-tribbu-teal/25 flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-slate-600 dark:text-slate-300">
                    URL d'accès direct de votre association :
                  </span>
                  <code className="font-mono font-bold text-tribbu-teal truncate">
                    {originUrl}/{computedSlug || 'votre-association'}
                  </code>
                </div>

                {/* Champs optionnels : Descriptif, Adresse, Téléphone, E-mail général */}
                <div className="pt-1">
                  <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2">
                    Informations complémentaires de l'association (optionnelles) :
                  </p>

                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                        Descriptif de l'association (optionnel)
                      </label>
                      <div className="relative">
                        <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={associationDescription}
                          onChange={(e) =>
                            setAssociationDescription(e.target.value)
                          }
                          placeholder="Objet de l'association, mission, activités..."
                          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-tribbu-charcoal border border-slate-300 dark:border-tribbu-charcoal-border text-slate-900 dark:text-white focus:border-tribbu-teal focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                          Adresse postale (optionnel)
                        </label>
                        <div className="relative">
                          <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            value={associationAddress}
                            onChange={(e) =>
                              setAssociationAddress(e.target.value)
                            }
                            placeholder="12 rue des Associations, Lyon"
                            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-tribbu-charcoal border border-slate-300 dark:border-tribbu-charcoal-border text-slate-900 dark:text-white focus:border-tribbu-teal focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                          Téléphone général (optionnel)
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="tel"
                            value={associationContactPhone}
                            onChange={(e) =>
                              setAssociationContactPhone(e.target.value)
                            }
                            placeholder="+41 70 000 00 00"
                            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-tribbu-charcoal border border-slate-300 dark:border-tribbu-charcoal-border text-slate-900 dark:text-white focus:border-tribbu-teal focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                          E-mail général (optionnel)
                        </label>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="email"
                            value={associationContactEmail}
                            onChange={(e) =>
                              setAssociationContactEmail(e.target.value)
                            }
                            placeholder="contact@mon-association.org"
                            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-tribbu-charcoal border border-slate-300 dark:border-tribbu-charcoal-border text-slate-900 dark:text-white focus:border-tribbu-teal focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || !associationName.trim()}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-tribbu-teal to-tribbu-green text-white text-xs font-bold shadow-lg hover:opacity-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Crown className="w-4 h-4" />
                <span>
                  Créer mon compte et initialiser l'association «{' '}
                  {associationName.trim() || '...'} » (/{computedSlug || 'slug'})
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            /* =====================================================================
               MODE 2 : CONNEXION À UNE ASSOCIATION EXISTANTE (/slug)
               ===================================================================== */
            <>
              <form
                onSubmit={(e) => void handleLogin(e)}
                className="space-y-4"
              >
                {/* Sélection ou saisie du slug d'URL de l'association */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-tribbu-charcoal-deep/60 border border-slate-200 dark:border-tribbu-charcoal-border space-y-2.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                    Association ciblée (URL /slug)
                  </label>

                  {allAssociations.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {allAssociations.map((asso) => {
                        const isSelected = targetSlugInput === asso.slug;
                        return (
                          <button
                            key={asso.id}
                            type="button"
                            onClick={() => {
                              setTargetSlugInput(asso.slug);
                              selectAssociationSlug(asso.slug);
                            }}
                            className={cn(
                              'px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5',
                              isSelected
                                ? 'bg-tribbu-teal text-white border-tribbu-teal shadow-sm'
                                : 'bg-white dark:bg-tribbu-charcoal text-slate-700 dark:text-slate-200 border-slate-200 dark:border-tribbu-charcoal-border hover:border-tribbu-teal'
                            )}
                          >
                            <span>{asso.name}</span>
                            <code
                              className={cn(
                                'text-[10px] font-mono px-1.5 py-0.5 rounded',
                                isSelected
                                  ? 'bg-black/20 text-white'
                                  : 'bg-slate-100 dark:bg-tribbu-charcoal-deep text-tribbu-teal'
                              )}
                            >
                              /{asso.slug}
                            </code>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="relative">
                    <Globe className="w-4 h-4 text-tribbu-teal absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      value={targetSlugInput}
                      onChange={(e) =>
                        setTargetSlugInput(sanitizeSlugInput(e.target.value))
                      }
                      placeholder="slug-de-votre-association"
                      className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl bg-white dark:bg-tribbu-charcoal border border-slate-300 dark:border-tribbu-charcoal-border text-slate-900 dark:text-white focus:border-tribbu-teal focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      Adresse e-mail
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-tribbu-charcoal-deep border border-slate-300 dark:border-tribbu-charcoal-border text-slate-900 dark:text-white focus:border-tribbu-teal focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                      Mot de passe
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="password"
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-tribbu-charcoal-deep border border-slate-300 dark:border-tribbu-charcoal-border text-slate-900 dark:text-white focus:border-tribbu-teal focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-tribbu-teal to-tribbu-green text-white text-xs font-bold shadow-md hover:opacity-95"
                >
                  Se connecter à /{targetSlugInput || 'mon-association'}
                </button>
              </form>

              <div className="pt-4 border-t border-slate-200 dark:border-tribbu-charcoal-border">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2 text-center">
                  Accès rapide de démonstration sur{' '}
                  <code className="text-tribbu-teal font-mono">
                    /les-sentiers-vivants
                  </code>{' '}
                  :
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  {DEMO_PROFILES.slice(0, 3).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        selectAssociationSlug('les-sentiers-vivants');
                        void switchPersona(p.id);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-tribbu-charcoal-border hover:border-tribbu-teal text-left text-xs flex flex-col justify-between transition-colors"
                    >
                      <span className="font-semibold text-slate-800 dark:text-white truncate">
                        {p.display_name}
                      </span>
                      <span className="text-[10px] font-bold text-tribbu-teal">
                        {p.id === 'user-manitou'
                          ? 'Grand Manitou'
                          : p.id.includes('chef')
                            ? 'Chef(fe) de Tribbu'
                            : 'Pygmée'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
