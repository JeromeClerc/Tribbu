import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Lock,
  Mail,
  Phone,
  Sparkles,
  User,
} from 'lucide-react';
import { TribbuLogo } from '@/components/common/TribbuLogo';
import { useAuth } from '@/contexts/AuthContext';
import { DEMO_PROFILES, DEMO_TRIBBUS } from '@/services/demoData';

export const AuthScreen: React.FC = () => {
  const {
    pendingInvitation,
    signIn,
    completeInvitationSignup,
    switchPersona,
    clearPendingInvitation,
  } = useAuth();

  // État Connexion standard
  const [loginEmail, setLoginEmail] = useState(
    'camille.moreau@tribbu-asso.fr'
  );
  const [loginPassword, setLoginPassword] = useState('••••••••••••');

  // État Finalisation d'Invitation (mot de passe saisi 2x)
  const [inviteDisplayName, setInviteDisplayName] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [password1, setPassword1] = useState('');
  const [password2, setPassword2] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const invitedTribbuName = React.useMemo(() => {
    if (!pendingInvitation?.tribbuId) return 'Commission Communication';
    return (
      DEMO_TRIBBUS.find((t) => t.id === pendingInvitation.tribbuId)?.name ||
      'Tribbu Associative'
    );
  }, [pendingInvitation]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(loginEmail, loginPassword);
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

  return (
    <div className="min-h-screen w-full bg-tribbu-ivory dark:bg-tribbu-charcoal-deep flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-tribbu-charcoal border border-slate-200 dark:border-tribbu-charcoal-border shadow-2xl overflow-hidden">
        {/* Bandeau identitaire avec le logo Tribbu */}
        <div className="p-6 text-center bg-gradient-to-b from-tribbu-teal/15 via-tribbu-green/10 to-transparent border-b border-slate-200/70 dark:border-tribbu-charcoal-border">
          <TribbuLogo size="xl" className="justify-center" />
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-2">
            Plateforme collaborative hiérarchique en temps réel pour associations
          </p>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-500">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {pendingInvitation ? (
            /* PARCOURS D'INVITATION PAR LIEN TOKENISÉ (MOT DE PASSE 2X) */
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
                  Vous rejoignez automatiquement{' '}
                  <strong>{invitedTribbuName}</strong>. Choisissez votre mot de
                  passe (2x) pour finaliser votre compte.
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Votre prénom et nom (affichés dans la Tribbu)
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
                  Téléphone mobile (pour notifications SMS de la Tribbu)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    value={invitePhone}
                    onChange={(e) => setInvitePhone(e.target.value)}
                    placeholder="+33 6 12 34 56 78"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-tribbu-charcoal-deep border border-slate-300 dark:border-tribbu-charcoal-border text-slate-900 dark:text-white focus:border-tribbu-teal focus:outline-none"
                  />
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
                Retour à la connexion standard
              </button>
            </form>
          ) : (
            /* PARCOURS DE CONNEXION E-MAIL / MOT DE PASSE */
            <>
              <form
                onSubmit={(e) => void handleLogin(e)}
                className="space-y-4"
              >
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

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-tribbu-teal to-tribbu-green text-white text-xs font-bold shadow-md hover:opacity-95"
                >
                  Se connecter à la Grande Tribbu
                </button>
              </form>

              <div className="pt-4 border-t border-slate-200 dark:border-tribbu-charcoal-border">
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2 text-center">
                  Accès rapide par rôle (Démonstration interactive) :
                </p>
                <div className="grid grid-cols-1 gap-1.5">
                  {DEMO_PROFILES.slice(0, 3).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => void switchPersona(p.id)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-tribbu-charcoal-border hover:border-tribbu-teal text-left text-xs flex items-center justify-between transition-colors"
                    >
                      <span className="font-semibold text-slate-800 dark:text-white">
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

