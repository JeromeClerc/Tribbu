import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { DEMO_MEMBRES_ROLES, DEMO_PROFILES } from './demoData';
import type { MembreRole, Profile, TribbuRole } from '@/types/tribbu.types';

const DEMO_USER_STORAGE_KEY = 'tribbu_active_demo_user_id';

export interface InvitationLinkPayload {
  token: string;
  email: string;
  tribbuId: string | null;
  tribbuName: string;
  role: TribbuRole;
  url: string;
}

export const authService = {
  /**
   * Récupère le profil de l'utilisateur courant (Supabase ou profil démo actif).
   */
  async getCurrentProfile(): Promise<Profile | null> {
    if (isSupabaseConfigured) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error || !data) {
        return {
          id: user.id,
          email: user.email || '',
          display_name:
            (user.user_metadata?.display_name as string) ||
            user.email?.split('@')[0] ||
            'Membre Tribbu',
          avatar_url: null,
          phone_number: (user.user_metadata?.phone_number as string) || null,
          sms_notifications_enabled: Boolean(
            user.user_metadata?.sms_notifications_enabled
          ),
          last_seen_at: new Date().toISOString(),
          created_at: user.created_at,
        };
      }

      return data as Profile;
    }

    const savedId = localStorage.getItem(DEMO_USER_STORAGE_KEY) || 'user-manitou';
    if (savedId === 'logged-out') return null;

    const customProfilesRaw = localStorage.getItem('tribbu_custom_profiles');
    const customProfiles: Profile[] = customProfilesRaw
      ? JSON.parse(customProfilesRaw)
      : [];
    const allProfiles = [...DEMO_PROFILES, ...customProfiles];

    return allProfiles.find((p) => p.id === savedId) || DEMO_PROFILES[0];
  },

  /**
   * Connexion par paire e-mail / mot de passe (créateurs & membres).
   */
  async signInWithEmail(email: string, password: string): Promise<Profile> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error || !data.user) {
        throw new Error(error?.message || 'Identifiants invalides.');
      }
      const profile = await this.getCurrentProfile();
      if (!profile) throw new Error('Profil introuvable.');
      return profile;
    }

    // Mode démo : recherche par e-mail ou bascule sur Grand Manitou
    const customProfilesRaw = localStorage.getItem('tribbu_custom_profiles');
    const customProfiles: Profile[] = customProfilesRaw
      ? JSON.parse(customProfilesRaw)
      : [];
    const allProfiles = [...DEMO_PROFILES, ...customProfiles];

    const matched =
      allProfiles.find((p) => p.email.toLowerCase() === email.toLowerCase()) ||
      DEMO_PROFILES[0];

    localStorage.setItem(DEMO_USER_STORAGE_KEY, matched.id);
    return matched;
  },

  /**
   * Finalisation d'un compte membre via URL d'invitation (token + saisie mot de passe 2x).
   * Affilie automatiquement le nouveau membre à la Tribbu qui l'a invité.
   */
  async finalizeInvitationSignup(params: {
    email: string;
    displayName: string;
    password: string;
    phoneNumber?: string;
    invitationToken: string;
    tribbuId?: string | null;
  }): Promise<Profile> {
    const {
      email,
      displayName,
      password,
      phoneNumber,
      invitationToken,
      tribbuId,
    } = params;

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
            phone_number: phoneNumber || null,
            invitation_token: invitationToken,
          },
        },
      });
      if (error || !data.user) {
        throw new Error(
          error?.message || "Impossible de finaliser l'inscription."
        );
      }
      const profile = await this.getCurrentProfile();
      if (!profile) {
        throw new Error('Compte créé. Veuillez vérifier votre boîte e-mail.');
      }
      return profile;
    }

    // Mode local/démo : création du profil et rattachement immédiat à la Tribbu invitante
    const newProfile: Profile = {
      id: `user-${crypto.randomUUID().slice(0, 8)}`,
      email,
      display_name: displayName,
      avatar_url: null,
      phone_number: phoneNumber || null,
      sms_notifications_enabled: Boolean(phoneNumber),
      last_seen_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };

    const customProfilesRaw = localStorage.getItem('tribbu_custom_profiles');
    const customProfiles: Profile[] = customProfilesRaw
      ? JSON.parse(customProfilesRaw)
      : [];
    localStorage.setItem(
      'tribbu_custom_profiles',
      JSON.stringify([...customProfiles, newProfile])
    );

    const customRolesRaw = localStorage.getItem('tribbu_custom_roles');
    const customRoles: MembreRole[] = customRolesRaw
      ? JSON.parse(customRolesRaw)
      : [...DEMO_MEMBRES_ROLES];

    const existingInviteIdx = customRoles.findIndex(
      (r) =>
        r.invitation_token === invitationToken ||
        r.invited_email?.toLowerCase() === email.toLowerCase()
    );

    if (existingInviteIdx >= 0) {
      customRoles[existingInviteIdx] = {
        ...customRoles[existingInviteIdx],
        user_id: newProfile.id,
        status: 'ACTIVE',
      };
    } else {
      customRoles.push({
        id: `mr-${crypto.randomUUID().slice(0, 8)}`,
        user_id: newProfile.id,
        invited_email: email,
        role: 'PYGMEE',
        grande_tribbu_id: 'gt-main',
        tribbu_id: tribbuId || 'tribbu-comm',
        status: 'ACTIVE',
        invitation_token: invitationToken,
        invited_by: 'user-manitou',
        created_at: new Date().toISOString(),
      });
    }

    localStorage.setItem('tribbu_custom_roles', JSON.stringify(customRoles));
    localStorage.setItem(DEMO_USER_STORAGE_KEY, newProfile.id);

    return newProfile;
  },

  /**
   * Bascule rapide entre personas (Grand Manitou, Chef de Tribbu, Pygmée) pour tester les droits RLS/UI.
   */
  switchDemoPersona(userId: string): Profile {
    localStorage.setItem(DEMO_USER_STORAGE_KEY, userId);
    const found = DEMO_PROFILES.find((p) => p.id === userId) || DEMO_PROFILES[0];
    return found;
  },

  /**
   * Met à jour `last_seen_at` et les préférences de notification téléphone/SMS.
   */
  async updateProfilePreferences(
    userId: string,
    updates: Partial<
      Pick<
        Profile,
        'display_name' | 'phone_number' | 'sms_notifications_enabled' | 'last_seen_at'
      >
    >
  ): Promise<void> {
    if (isSupabaseConfigured) {
      await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
    }
  },

  /**
   * Déconnexion de la session courante.
   */
  async signOut(): Promise<void> {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
      return;
    }
    localStorage.setItem(DEMO_USER_STORAGE_KEY, 'logged-out');
  },
};

