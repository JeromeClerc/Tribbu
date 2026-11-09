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
import { sanitizeSlugInput, slugifyAssociationName } from '@/lib/utils';
import {
  DEMO_CANAUX,
  DEMO_GRANDE_TRIBBU,
  DEMO_MEMBRES_ROLES,
  DEMO_MESSAGES,
  DEMO_PROFILES,
} from './demoData';
import type {
  Canal,
  ChatMessage,
  GrandeTribbu,
  MembreRole,
  Profile,
  TribbuRole,
} from '@/types/tribbu.types';

const DEMO_USER_STORAGE_KEY = 'tribbu_active_demo_user_id';
const ASSOCIATIONS_STORAGE_KEY = 'tribbu_state_associations';
const CANAUX_STORAGE_KEY = 'tribbu_state_canaux';
const ROLES_STORAGE_KEY = 'tribbu_custom_roles';
const MESSAGES_STORAGE_KEY = 'tribbu_state_messages';
const PROFILES_STORAGE_KEY = 'tribbu_custom_profiles';

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
}

export interface CreateAssociationParams {
  // Compte du 1er membre (futur Grand Manitou)
  email: string;
  password: string;
  displayName: string;
  userPhone?: string;
  // Informations de l'association (seul `associationName` est obligatoire)
  associationName: string;
  slug?: string;
  description?: string;
  address?: string;
  contactPhone?: string;
  contactEmail?: string;
}

export const authService = {
  /**
   * Récupère toutes les associations existantes (pour résolution de slug d'URL).
   */
  async listAssociations(): Promise<GrandeTribbu[]> {
    if (isFirebaseConfigured && firestoreDb) {
      const snap = await getDocs(collection(firestoreDb, 'grande_tribbu'));
      return snap.docs.map(
        (d) => ({ id: d.id, ...(d.data() as Omit<GrandeTribbu, 'id'>) })
      );
    }

    return readLocal<GrandeTribbu[]>(ASSOCIATIONS_STORAGE_KEY, [
      DEMO_GRANDE_TRIBBU,
    ]);
  },

  /**
   * Recherche une association par son slug d'URL (ex: `les-sentiers-vivants`).
   */
  async getAssociationBySlug(slug: string): Promise<GrandeTribbu | null> {
    const cleanSlug = sanitizeSlugInput(slug);
    if (!cleanSlug) return null;

    if (isFirebaseConfigured && firestoreDb) {
      const q = query(
        collection(firestoreDb, 'grande_tribbu'),
        where('slug', '==', cleanSlug)
      );
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const docSnap = snap.docs[0];
      return {
        id: docSnap.id,
        ...(docSnap.data() as Omit<GrandeTribbu, 'id'>),
      };
    }

    const list = await this.listAssociations();
    return list.find((a) => a.slug === cleanSlug) || null;
  },

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
        grande_tribbu_ids: [],
        last_seen_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      await setDoc(profRef, fallbackProfile, { merge: true });
      return fallbackProfile;
    }

    const savedId = localStorage.getItem(DEMO_USER_STORAGE_KEY);
    // Si aucune session active n'est démarrée ou si déconnecté, retourne null pour afficher la page initiale
    if (!savedId || savedId === 'logged-out') return null;

    const customProfiles = readLocal<Profile[]>(PROFILES_STORAGE_KEY, []);
    const allProfiles = [...DEMO_PROFILES, ...customProfiles];

    return allProfiles.find((p) => p.id === savedId) || null;
  },

  /**
   * CRÉATION INITIALE SAAS :
   * 1. Le 1er membre crée son compte (e-mail / mot de passe).
   * 2. Il crée son association (nom obligatoire + descriptif, adresse, téléphone, e-mail général optionnels).
   * 3. Il devient automatiquement le Grand Manitou de cette nouvelle association.
   * 4. L'association reçoit son slug unique sans accents ni espaces pour son URL dédiée `/<slug>`.
   */
  async registerCreatorAndCreateAssociation(
    params: CreateAssociationParams
  ): Promise<{ profile: Profile; association: GrandeTribbu }> {
    const nowIso = new Date().toISOString();
    const cleanName = params.associationName.trim();
    if (!cleanName) {
      throw new Error("Le nom de l'association est obligatoire.");
    }

    const finalSlug = sanitizeSlugInput(
      params.slug?.trim() || slugifyAssociationName(cleanName)
    );
    if (!finalSlug) {
      throw new Error(
        "Impossible de générer un identifiant URL (slug) valide pour l'association."
      );
    }

    // Vérifie que le slug n'est pas déjà pris par une autre association
    const existingWithSlug = await this.getAssociationBySlug(finalSlug);
    if (existingWithSlug) {
      throw new Error(
        `L'URL "/${finalSlug}" est déjà utilisée par une autre association. Veuillez personnaliser le slug.`
      );
    }

    const gtId = `gt-${crypto.randomUUID().slice(0, 8)}`;

    if (isFirebaseConfigured && firebaseAuth && firestoreDb) {
      const cred = await createUserWithEmailAndPassword(
        firebaseAuth,
        params.email.trim(),
        params.password
      );
      await updateProfile(cred.user, {
        displayName: params.displayName.trim(),
      });

      const newProfile: Profile = {
        id: cred.user.uid,
        email: params.email.trim(),
        display_name: params.displayName.trim(),
        avatar_url: null,
        phone_number: params.userPhone?.trim() || null,
        sms_notifications_enabled: Boolean(params.userPhone?.trim()),
        grande_tribbu_ids: [gtId],
        last_seen_at: nowIso,
        created_at: nowIso,
      };

      const newAssociation: GrandeTribbu = {
        id: gtId,
        slug: finalSlug,
        name: cleanName,
        description: params.description?.trim() || null,
        address: params.address?.trim() || null,
        contact_phone: params.contactPhone?.trim() || null,
        contact_email: params.contactEmail?.trim() || null,
        logo_url: '/Tribbu_logo.png',
        manitou_id: cred.user.uid,
        settings: {
          allow_pygmee_feux_de_camp: true,
          require_emargement_on_annonces: true,
          sms_gateway_enabled: true,
        },
        created_at: nowIso,
      };

      const annoncesCanal: Canal = {
        id: `canal-${gtId}-annonces`,
        type: 'GRANDE_TRIBBU_ANNONCES',
        name: 'Annonces Officielles',
        description: `Canal officiel d'information descendante de ${cleanName}. Émargement requis.`,
        grande_tribbu_id: gtId,
        tribbu_id: null,
        tippi_id: null,
        feu_de_camp_id: null,
        last_message_at: nowIso,
        created_at: nowIso,
      };

      const agoraCanal: Canal = {
        id: `canal-${gtId}-agora`,
        type: 'AGORA_GENERALE',
        name: 'Agora Générale',
        description: `Agora générale ouverte à tous les membres de ${cleanName}.`,
        grande_tribbu_id: gtId,
        tribbu_id: null,
        tippi_id: null,
        feu_de_camp_id: null,
        last_message_at: nowIso,
        created_at: nowIso,
      };

      const manitouRole: MembreRole = {
        id: `mr-${gtId}-manitou`,
        user_id: cred.user.uid,
        invited_email: newProfile.email,
        role: 'MANITOU',
        grande_tribbu_id: gtId,
        tribbu_id: null,
        status: 'ACTIVE',
        invitation_token: null,
        invited_by: cred.user.uid,
        created_at: nowIso,
      };

      const welcomeMsgId = `msg-${gtId}-welcome`;
      const welcomeMsg = {
        id: welcomeMsgId,
        grande_tribbu_id: gtId,
        canal_id: annoncesCanal.id,
        author_id: cred.user.uid,
        content: `🎉 Bienvenue dans l'espace collaboratif officiel de **${cleanName}** !\n\nEn tant que **Grand Manitou**, vous pouvez dès maintenant :\n1. Créer vos premières **Tribbus** (commissions / groupes) via le bouton **+** dans la barre latérale gauche.\n2. Inviter les membres de votre association par e-mail via le bouton **Inviter** en haut à droite.\n\n🔗 Lien direct de connexion à votre association : ${window.location.origin}/${finalSlug}`,
        reply_to_message_id: null,
        quoted_excerpt: null,
        mentioned_user_ids: [cred.user.uid],
        mentioned_names: [newProfile.display_name],
        attachments: [],
        created_at: nowIso,
        updated_at: nowIso,
      };

      await Promise.all([
        setDoc(doc(firestoreDb, 'profiles', cred.user.uid), {
          ...newProfile,
          global_role: 'MANITOU',
          tribbu_ids: [],
          chef_tribbu_ids: [],
          updated_at: nowIso,
        }),
        setDoc(doc(firestoreDb, 'grande_tribbu', gtId), {
          ...newAssociation,
          updated_at: nowIso,
        }),
        setDoc(doc(firestoreDb, 'canaux', annoncesCanal.id), annoncesCanal),
        setDoc(doc(firestoreDb, 'canaux', agoraCanal.id), agoraCanal),
        setDoc(doc(firestoreDb, 'membres_roles', manitouRole.id), {
          ...manitouRole,
          updated_at: nowIso,
        }),
        setDoc(doc(firestoreDb, 'messages', welcomeMsgId), welcomeMsg),
      ]);

      return { profile: newProfile, association: newAssociation };
    }

    // Mode local : création complète et isolée de la nouvelle association et de son Grand Manitou
    const userId = `user-${crypto.randomUUID().slice(0, 8)}`;
    const newProfile: Profile = {
      id: userId,
      email: params.email.trim(),
      display_name: params.displayName.trim(),
      avatar_url: null,
      phone_number: params.userPhone?.trim() || null,
      sms_notifications_enabled: Boolean(params.userPhone?.trim()),
      grande_tribbu_ids: [gtId],
      last_seen_at: nowIso,
      created_at: nowIso,
    };

    const newAssociation: GrandeTribbu = {
      id: gtId,
      slug: finalSlug,
      name: cleanName,
      description: params.description?.trim() || null,
      address: params.address?.trim() || null,
      contact_phone: params.contactPhone?.trim() || null,
      contact_email: params.contactEmail?.trim() || null,
      logo_url: '/Tribbu_logo.png',
      manitou_id: userId,
      settings: {
        allow_pygmee_feux_de_camp: true,
        require_emargement_on_annonces: true,
        sms_gateway_enabled: true,
      },
      created_at: nowIso,
    };

    const annoncesCanal: Canal = {
      id: `canal-${gtId}-annonces`,
      type: 'GRANDE_TRIBBU_ANNONCES',
      name: 'Annonces Officielles',
      description: `Canal officiel d'information descendante de ${cleanName}. Émargement requis.`,
      grande_tribbu_id: gtId,
      tribbu_id: null,
      tippi_id: null,
      feu_de_camp_id: null,
      last_message_at: nowIso,
      created_at: nowIso,
    };

    const agoraCanal: Canal = {
      id: `canal-${gtId}-agora`,
      type: 'AGORA_GENERALE',
      name: 'Agora Générale',
      description: `Agora générale ouverte à tous les membres de ${cleanName}.`,
      grande_tribbu_id: gtId,
      tribbu_id: null,
      tippi_id: null,
      feu_de_camp_id: null,
      last_message_at: nowIso,
      created_at: nowIso,
    };

    const manitouRole: MembreRole = {
      id: `mr-${gtId}-manitou`,
      user_id: userId,
      invited_email: newProfile.email,
      role: 'MANITOU',
      grande_tribbu_id: gtId,
      tribbu_id: null,
      status: 'ACTIVE',
      invitation_token: null,
      invited_by: userId,
      created_at: nowIso,
    };

    const welcomeMsg: ChatMessage = {
      id: `msg-${gtId}-welcome`,
      grande_tribbu_id: gtId,
      canal_id: annoncesCanal.id,
      author_id: userId,
      content: `🎉 Bienvenue dans l'espace collaboratif officiel de **${cleanName}** !\n\nEn tant que **Grand Manitou**, vous pouvez dès maintenant :\n1. Créer vos premières **Tribbus** (commissions / groupes) via le bouton **+** dans la barre latérale gauche.\n2. Inviter les membres de votre association par e-mail via le bouton **Inviter** en haut à droite.\n\n🔗 URL dédiée de votre association : ${window.location.origin}/${finalSlug}`,
      reply_to_message_id: null,
      quoted_excerpt: null,
      mentioned_user_ids: [userId],
      mentioned_names: [newProfile.display_name],
      attachments: [],
      emargements: [],
      created_at: nowIso,
      updated_at: nowIso,
    };

    const customProfiles = readLocal<Profile[]>(PROFILES_STORAGE_KEY, []);
    writeLocal(PROFILES_STORAGE_KEY, [...customProfiles, newProfile]);

    const associations = readLocal<GrandeTribbu[]>(ASSOCIATIONS_STORAGE_KEY, [
      DEMO_GRANDE_TRIBBU,
    ]);
    writeLocal(ASSOCIATIONS_STORAGE_KEY, [...associations, newAssociation]);

    const canaux = readLocal<Canal[]>(CANAUX_STORAGE_KEY, DEMO_CANAUX);
    writeLocal(CANAUX_STORAGE_KEY, [...canaux, annoncesCanal, agoraCanal]);

    const roles = readLocal<MembreRole[]>(
      ROLES_STORAGE_KEY,
      DEMO_MEMBRES_ROLES
    );
    writeLocal(ROLES_STORAGE_KEY, [...roles, manitouRole]);

    const messages = readLocal<ChatMessage[]>(
      MESSAGES_STORAGE_KEY,
      DEMO_MESSAGES
    );
    writeLocal(MESSAGES_STORAGE_KEY, [...messages, welcomeMsg]);

    localStorage.setItem(DEMO_USER_STORAGE_KEY, newProfile.id);

    return { profile: newProfile, association: newAssociation };
  },

  /**
   * Connexion Firebase Auth par paire e-mail / mot de passe.
   */
  async signInWithEmail(email: string, password: string): Promise<Profile> {
    if (isFirebaseConfigured && firebaseAuth) {
      const cred = await signInWithEmailAndPassword(
        firebaseAuth,
        email.trim(),
        password
      );
      if (!cred.user) {
        throw new Error('Identifiants invalides.');
      }
      const profile = await this.getCurrentProfile();
      if (!profile) throw new Error('Profil introuvable dans Firestore.');
      return profile;
    }

    const customProfiles = readLocal<Profile[]>(PROFILES_STORAGE_KEY, []);
    const allProfiles = [...DEMO_PROFILES, ...customProfiles];

    const matched = allProfiles.find(
      (p) => p.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (!matched) {
      throw new Error(
        'Aucun compte trouvé pour cette adresse e-mail. Créez votre association ou utilisez un lien d’invitation.'
      );
    }

    localStorage.setItem(DEMO_USER_STORAGE_KEY, matched.id);
    return matched;
  },

  /**
   * Finalisation d'un compte membre via URL d'invitation (`/<slug>?invite_token=...&email=...`).
   */
  async finalizeInvitationSignup(params: {
    email: string;
    displayName: string;
    password: string;
    phoneNumber?: string;
    invitationToken: string;
    tribbuId?: string | null;
    grandeTribbuId?: string | null;
  }): Promise<Profile> {
    const {
      email,
      displayName,
      password,
      phoneNumber,
      invitationToken,
      tribbuId,
      grandeTribbuId,
    } = params;

    const nowIso = new Date().toISOString();

    if (isFirebaseConfigured && firebaseAuth && firestoreDb) {
      const cred = await createUserWithEmailAndPassword(
        firebaseAuth,
        email,
        password
      );
      await updateProfile(cred.user, { displayName });

      const rolesRef = collection(firestoreDb, 'membres_roles');
      const qToken = query(
        rolesRef,
        where('invitation_token', '==', invitationToken)
      );
      const tokenSnap = await getDocs(qToken);

      const targetGtIds = new Set<string>(
        grandeTribbuId ? [grandeTribbuId] : []
      );
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
          if (data.grande_tribbu_id) {
            targetGtIds.add(data.grande_tribbu_id);
          }
          if (data.tribbu_id && !targetTribbuIds.includes(data.tribbu_id)) {
            targetTribbuIds.push(data.tribbu_id);
          }
          if (data.role === 'CHEF' && data.tribbu_id) {
            chefTribbuIds.push(data.tribbu_id);
          }
        }
      }

      const newProfile: Profile = {
        id: cred.user.uid,
        email,
        display_name: displayName,
        avatar_url: null,
        phone_number: phoneNumber || null,
        sms_notifications_enabled: Boolean(phoneNumber),
        grande_tribbu_ids: Array.from(targetGtIds),
        last_seen_at: nowIso,
        created_at: nowIso,
      };

      await setDoc(doc(firestoreDb, 'profiles', cred.user.uid), {
        ...newProfile,
        global_role: chefTribbuIds.length > 0 ? 'CHEF' : 'PYGMEE',
        tribbu_ids: targetTribbuIds,
        chef_tribbu_ids: chefTribbuIds,
        updated_at: nowIso,
      });

      return newProfile;
    }

    // Mode local
    const customRoles = readLocal<MembreRole[]>(
      ROLES_STORAGE_KEY,
      DEMO_MEMBRES_ROLES
    );
    const existingInviteIdx = customRoles.findIndex(
      (r) =>
        r.invitation_token === invitationToken ||
        r.invited_email?.toLowerCase() === email.toLowerCase()
    );

    const resolvedGtId =
      existingInviteIdx >= 0
        ? customRoles[existingInviteIdx].grande_tribbu_id
        : grandeTribbuId || 'gt-main';

    const newProfile: Profile = {
      id: `user-${crypto.randomUUID().slice(0, 8)}`,
      email,
      display_name: displayName,
      avatar_url: null,
      phone_number: phoneNumber || null,
      sms_notifications_enabled: Boolean(phoneNumber),
      grande_tribbu_ids: [resolvedGtId],
      last_seen_at: nowIso,
      created_at: nowIso,
    };

    const customProfiles = readLocal<Profile[]>(PROFILES_STORAGE_KEY, []);
    writeLocal(PROFILES_STORAGE_KEY, [...customProfiles, newProfile]);

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
        grande_tribbu_id: resolvedGtId,
        tribbu_id: tribbuId || null,
        status: 'ACTIVE',
        invitation_token: invitationToken,
        invited_by: null,
        created_at: nowIso,
      });
    }

    writeLocal(ROLES_STORAGE_KEY, customRoles);
    localStorage.setItem(DEMO_USER_STORAGE_KEY, newProfile.id);

    return newProfile;
  },

  /**
   * Bascule rapide entre personas de démonstration.
   */
  switchDemoPersona(userId: string): Profile {
    localStorage.setItem(DEMO_USER_STORAGE_KEY, userId);
    const customProfiles = readLocal<Profile[]>(PROFILES_STORAGE_KEY, []);
    const all = [...DEMO_PROFILES, ...customProfiles];
    return all.find((p) => p.id === userId) || DEMO_PROFILES[0];
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
   * Synchronise les listes `grande_tribbu_ids`, `tribbu_ids` et `chef_tribbu_ids` dans Firestore.
   */
  async syncUserTribbuClaimsInFirestore(
    userId: string,
    grandeTribbuId: string,
    tribbuId: string,
    role: TribbuRole
  ): Promise<void> {
    if (isFirebaseConfigured && firestoreDb) {
      const profRef = doc(firestoreDb, 'profiles', userId);
      await setDoc(
        profRef,
        {
          grande_tribbu_ids: arrayUnion(grandeTribbuId),
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
