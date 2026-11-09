import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  arrayUnion,
} from 'firebase/firestore';
import {
  firebaseAuth,
  firestoreDb,
  isFirebaseConfigured,
} from '@/lib/firebaseClient';
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
   * Récupère le profil de l'utilisateur courant depuis Cloud Firestore (ou profil démo actif).
   */
  async getCurrentProfile(): Promise<Profile | null> {
    if (isFirebaseConfigured && firebaseAuth && firestoreDb) {
      const fbUser = firebaseAuth.currentUser;
      if (!fbUser) return null;

      const profRef = doc(firestoreDb, 'profiles', fbUser.uid);
      const snap = await getDoc(profRef);

      if (snap.exists()) {
        return { id: snap.id, ...(snap.data() as Omit<Profile, 'id'>) };
      }

      const fallbackProfile: Profile = {
        id: fbUser.uid,
        email: fbUser.email || '',
        display_name:
          fbUser.displayName || fbUser.email?.split('@')[0] || 'Membre Tribbu',
        avatar_url: fbUser.photoURL || null,
        phone_number: null,
        sms_notifications_enabled: false,
        last_seen_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      await setDoc(profRef, fallbackProfile, { merge: true });
      return fallbackProfile;
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
   * Connexion Firebase Auth par paire e-mail / mot de passe (créateurs & membres).
   */
  async signInWithEmail(email: string, password: string): Promise<Profile> {
    if (isFirebaseConfigured && firebaseAuth) {
      const cred = await signInWithEmailAndPassword(
        firebaseAuth,
        email,
        password
      );
      if (!cred.user) {
        throw new Error('Identifiants invalides.');
      }
      const profile = await this.getCurrentProfile();
      if (!profile) throw new Error('Profil introuvable dans Firestore.');
      return profile;
    }

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
   * Crée le compte dans Firebase Auth, enregistre le document `profiles` dans Firestore,
   * et affilie automatiquement le membre à la Tribbu qui l'a invité.
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

    const nowIso = new Date().toISOString();

    if (isFirebaseConfigured && firebaseAuth && firestoreDb) {
      const cred = await createUserWithEmailAndPassword(
        firebaseAuth,
        email,
        password
      );
      await updateProfile(cred.user, { displayName });

      const newProfile: Profile = {
        id: cred.user.uid,
        email,
        display_name: displayName,
        avatar_url: null,
        phone_number: phoneNumber || null,
        sms_notifications_enabled: Boolean(phoneNumber),
        last_seen_at: nowIso,
        created_at: nowIso,
      };

      // Recherche de l'invitation correspondante dans `membres_roles`
      const rolesRef = collection(firestoreDb, 'membres_roles');
      const qToken = query(
        rolesRef,
        where('invitation_token', '==', invitationToken)
      );
      const tokenSnap = await getDocs(qToken);

      const targetTribbuIds: string[] = tribbuId ? [tribbuId] : [];
      const chefTribbuIds: string[] = [];

      if (!tokenSnap.empty) {
        for (const docSnap of tokenSnap.docs) {
          const data = docSnap.data() as MembreRole;
          await updateDoc(doc(firestoreDb, 'membres_roles', docSnap.id), {
            user_id: cred.user.uid,
            status: 'ACTIVE',
            updated_at: nowIso,
          });
          if (data.tribbu_id && !targetTribbuIds.includes(data.tribbu_id)) {
            targetTribbuIds.push(data.tribbu_id);
          }
          if (data.role === 'CHEF' && data.tribbu_id) {
            chefTribbuIds.push(data.tribbu_id);
          }
        }
      } else if (tribbuId) {
        const newRoleId = `mr-${crypto.randomUUID().slice(0, 8)}`;
        await setDoc(doc(firestoreDb, 'membres_roles', newRoleId), {
          id: newRoleId,
          user_id: cred.user.uid,
          invited_email: email,
          role: 'PYGMEE',
          grande_tribbu_id: 'gt-main',
          tribbu_id: tribbuId,
          status: 'ACTIVE',
          invitation_token: invitationToken,
          invited_by: null,
          created_at: nowIso,
          updated_at: nowIso,
        });
      }

      await setDoc(doc(firestoreDb, 'profiles', cred.user.uid), {
        ...newProfile,
        global_role: chefTribbuIds.length > 0 ? 'CHEF' : 'PYGMEE',
        tribbu_ids: targetTribbuIds,
        chef_tribbu_ids: chefTribbuIds,
        updated_at: nowIso,
      });

      return newProfile;
    }

    // Mode local/démo : création du profil et rattachement immédiat à la Tribbu invitante
    const newProfile: Profile = {
      id: `user-${crypto.randomUUID().slice(0, 8)}`,
      email,
      display_name: displayName,
      avatar_url: null,
      phone_number: phoneNumber || null,
      sms_notifications_enabled: Boolean(phoneNumber),
      last_seen_at: nowIso,
      created_at: nowIso,
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
        created_at: nowIso,
      });
    }

    localStorage.setItem('tribbu_custom_roles', JSON.stringify(customRoles));
    localStorage.setItem(DEMO_USER_STORAGE_KEY, newProfile.id);

    return newProfile;
  },

  /**
   * Bascule rapide entre personas (Grand Manitou, Chef de Tribbu, Pygmée) pour tester les droits.
   */
  switchDemoPersona(userId: string): Profile {
    localStorage.setItem(DEMO_USER_STORAGE_KEY, userId);
    const found = DEMO_PROFILES.find((p) => p.id === userId) || DEMO_PROFILES[0];
    return found;
  },

  /**
   * Met à jour `last_seen_at` et les préférences de notification téléphone/SMS dans Firestore.
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
    if (isFirebaseConfigured && firestoreDb) {
      const profRef = doc(firestoreDb, 'profiles', userId);
      await setDoc(
        profRef,
        {
          ...updates,
          updated_at: new Date().toISOString(),
        },
        { merge: true }
      );
    }
  },

  /**
   * Synchronise les listes `tribbu_ids` et `chef_tribbu_ids` sur le document `profiles/{userId}`
   * afin d'optimiser l'évaluation des Security Rules Firestore.
   */
  async syncUserTribbuClaimsInFirestore(
    userId: string,
    tribbuId: string,
    role: TribbuRole
  ): Promise<void> {
    if (isFirebaseConfigured && firestoreDb) {
      const profRef = doc(firestoreDb, 'profiles', userId);
      await setDoc(
        profRef,
        {
          tribbu_ids: arrayUnion(tribbuId),
          ...(role === 'CHEF' ? { chef_tribbu_ids: arrayUnion(tribbuId) } : {}),
          updated_at: new Date().toISOString(),
        },
        { merge: true }
      );
    }
  },

  /**
   * Déconnexion Firebase Auth.
   */
  async signOut(): Promise<void> {
    if (isFirebaseConfigured && firebaseAuth) {
      await firebaseSignOut(firebaseAuth);
      return;
    }
    localStorage.setItem(DEMO_USER_STORAGE_KEY, 'logged-out');
  },
};
