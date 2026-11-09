import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  authService,
  type CreateAssociationParams,
} from '@/services/authService';
import { chatService } from '@/services/chatService';
import { firebaseAuth, isFirebaseConfigured } from '@/lib/firebaseClient';
import {
  getAssociationSlugFromPathname,
  navigateToAssociationSlug,
} from '@/lib/utils';
import type {
  GrandeTribbu,
  MembreRole,
  Profile,
  TribbuRole,
} from '@/types/tribbu.types';

export interface PendingInvitationParams {
  token: string;
  email: string;
  tribbuId: string | null;
  slug: string | null;
}

interface AuthContextValue {
  user: Profile | null;
  userRoles: MembreRole[];
  globalRole: TribbuRole;
  activeSlug: string | null;
  activeAssociation: GrandeTribbu | null;
  allAssociations: GrandeTribbu[];
  isMemberOfActiveAssociation: boolean;
  isLoading: boolean;
  pendingInvitation: PendingInvitationParams | null;
  signIn: (email: string, password: string, targetSlug?: string | null) => Promise<void>;
  createAssociationWithAccount: (
    params: CreateAssociationParams
  ) => Promise<GrandeTribbu>;
  completeInvitationSignup: (params: {
    email: string;
    displayName: string;
    password: string;
    phoneNumber?: string;
    invitationToken: string;
    tribbuId?: string | null;
    grandeTribbuId?: string | null;
  }) => Promise<void>;
  switchPersona: (userId: string) => Promise<void>;
  selectAssociationSlug: (slug: string | null) => void;
  updatePreferences: (
    updates: Partial<
      Pick<
        Profile,
        'display_name' | 'phone_number' | 'sms_notifications_enabled'
      >
    >
  ) => Promise<void>;
  clearPendingInvitation: () => void;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function computeHighestRole(
  userId: string | undefined,
  roles: MembreRole[],
  manitouId?: string
): TribbuRole {
  if (!userId) return 'PYGMEE';
  if (manitouId && userId === manitouId) return 'MANITOU';
  const myActiveRoles = roles.filter(
    (r) => r.user_id === userId && r.status === 'ACTIVE'
  );
  if (myActiveRoles.some((r) => r.role === 'MANITOU')) return 'MANITOU';
  if (myActiveRoles.some((r) => r.role === 'CHEF')) return 'CHEF';
  return 'PYGMEE';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [userRoles, setUserRoles] = useState<MembreRole[]>([]);
  const [globalRole, setGlobalRole] = useState<TribbuRole>('PYGMEE');
  const [activeSlug, setActiveSlug] = useState<string | null>(() =>
    getAssociationSlugFromPathname()
  );
  const [activeAssociation, setActiveAssociation] =
    useState<GrandeTribbu | null>(null);
  const [allAssociations, setAllAssociations] = useState<GrandeTribbu[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pendingInvitation, setPendingInvitation] =
    useState<PendingInvitationParams | null>(null);

  // Synchronise `activeSlug` avec l'URL du navigateur (`/<slug>`)
  useEffect(() => {
    const syncRoute = () => {
      setActiveSlug(getAssociationSlugFromPathname());
    };
    window.addEventListener('popstate', syncRoute);
    window.addEventListener('tribbu-route-changed', syncRoute);
    return () => {
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('tribbu-route-changed', syncRoute);
    };
  }, []);

  // Détection automatique d'une URL d'invitation (`/<slug>?invite_token=...&email=...`)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('invite_token');
    const email = params.get('email') || '';
    const tribbuId = params.get('tribbu_id');
    const slug = getAssociationSlugFromPathname();

    if (token) {
      setPendingInvitation({ token, email, tribbuId, slug });
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    try {
      const currentSlug = getAssociationSlugFromPathname();
      const [profile, associations] = await Promise.all([
        authService.getCurrentProfile(),
        authService.listAssociations(),
      ]);

      setAllAssociations(associations);

      // Si aucun slug n'est dans l'URL mais que l'utilisateur est connecté,
      // on retrouve automatiquement son association et on met à jour l'URL `/<slug>` !
      let resolvedSlug = currentSlug;
      if (!resolvedSlug && profile) {
        const userAsso =
          associations.find((a) => a.manitou_id === profile.id) ||
          associations.find((a) =>
            profile.grande_tribbu_ids?.includes(a.id)
          );
        if (userAsso) {
          resolvedSlug = userAsso.slug;
          navigateToAssociationSlug(resolvedSlug, true);
        }
      }

      const hierarchy = await chatService.fetchHierarchy(resolvedSlug);

      setUser(profile);
      setActiveAssociation(hierarchy.grandeTribbu);
      setUserRoles(hierarchy.membresRoles);
      setGlobalRole(
        computeHighestRole(
          profile?.id,
          hierarchy.membresRoles,
          hierarchy.grandeTribbu?.manitou_id
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshAuth();

    if (isFirebaseConfigured && firebaseAuth) {
      const unsubscribe = onAuthStateChanged(firebaseAuth, () => {
        void refreshAuth();
      });
      return () => unsubscribe();
    }

    const handleLocalMutation = () => {
      void refreshAuth();
    };
    window.addEventListener('tribbu-local-mutation', handleLocalMutation);
    return () =>
      window.removeEventListener('tribbu-local-mutation', handleLocalMutation);
  }, [refreshAuth, activeSlug]);

  const isMemberOfActiveAssociation = React.useMemo(() => {
    if (!user || !activeAssociation) return false;
    if (activeAssociation.manitou_id === user.id) return true;
    if (user.grande_tribbu_ids?.includes(activeAssociation.id)) return true;
    return userRoles.some(
      (r) =>
        r.user_id === user.id &&
        r.grande_tribbu_id === activeAssociation.id &&
        r.status === 'ACTIVE'
    );
  }, [user, activeAssociation, userRoles]);

  const selectAssociationSlug = useCallback((slug: string | null) => {
    navigateToAssociationSlug(slug, false);
    setActiveSlug(slug);
  }, []);

  const signIn = async (
    email: string,
    password: string,
    targetSlug?: string | null
  ) => {
    setIsLoading(true);
    try {
      const profile = await authService.signInWithEmail(email, password);
      const associations = await authService.listAssociations();

      const desiredSlug =
        targetSlug ||
        getAssociationSlugFromPathname() ||
        associations.find((a) => a.manitou_id === profile.id)?.slug ||
        associations.find((a) => profile.grande_tribbu_ids?.includes(a.id))
          ?.slug ||
        associations[0]?.slug ||
        null;

      if (desiredSlug) {
        navigateToAssociationSlug(desiredSlug, false);
      }
      await refreshAuth();
    } finally {
      setIsLoading(false);
    }
  };

  const createAssociationWithAccount = async (
    params: CreateAssociationParams
  ): Promise<GrandeTribbu> => {
    setIsLoading(true);
    try {
      const { association } =
        await authService.registerCreatorAndCreateAssociation(params);
      navigateToAssociationSlug(association.slug, false);
      await refreshAuth();
      return association;
    } finally {
      setIsLoading(false);
    }
  };

  const completeInvitationSignup = async (params: {
    email: string;
    displayName: string;
    password: string;
    phoneNumber?: string;
    invitationToken: string;
    tribbuId?: string | null;
    grandeTribbuId?: string | null;
  }) => {
    setIsLoading(true);
    try {
      const targetSlug =
        pendingInvitation?.slug || getAssociationSlugFromPathname();
      const targetAsso = targetSlug
        ? await authService.getAssociationBySlug(targetSlug)
        : null;

      await authService.finalizeInvitationSignup({
        ...params,
        grandeTribbuId: targetAsso?.id || params.grandeTribbuId || 'gt-main',
      });

      setPendingInvitation(null);
      const finalSlug = targetAsso?.slug || targetSlug || 'les-sentiers-vivants';
      navigateToAssociationSlug(finalSlug, false);
      await refreshAuth();
    } finally {
      setIsLoading(false);
    }
  };

  const switchPersona = async (userId: string) => {
    const prof = authService.switchDemoPersona(userId);
    const associations = await authService.listAssociations();
    const userAsso =
      associations.find((a) => a.manitou_id === prof.id) ||
      associations.find((a) => prof.grande_tribbu_ids?.includes(a.id)) ||
      associations[0];

    if (userAsso && !getAssociationSlugFromPathname()) {
      navigateToAssociationSlug(userAsso.slug, false);
    }
    await refreshAuth();
  };

  const updatePreferences = async (
    updates: Partial<
      Pick<
        Profile,
        'display_name' | 'phone_number' | 'sms_notifications_enabled'
      >
    >
  ) => {
    if (!user) return;
    await authService.updateProfilePreferences(user.id, updates);
    setUser((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  const clearPendingInvitation = () => {
    setPendingInvitation(null);
    const slug = getAssociationSlugFromPathname();
    navigateToAssociationSlug(slug, false);
  };

  const signOut = async () => {
    await authService.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userRoles,
        globalRole,
        activeSlug,
        activeAssociation,
        allAssociations,
        isMemberOfActiveAssociation,
        isLoading,
        pendingInvitation,
        signIn,
        createAssociationWithAccount,
        completeInvitationSignup,
        switchPersona,
        selectAssociationSlug,
        updatePreferences,
        clearPendingInvitation,
        signOut,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth doit être utilisé au sein de AuthProvider');
  }
  return ctx;
}
