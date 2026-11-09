import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { authService } from '@/services/authService';
import { chatService } from '@/services/chatService';
import { firebaseAuth, isFirebaseConfigured } from '@/lib/firebaseClient';
import type { MembreRole, Profile, TribbuRole } from '@/types/tribbu.types';

export interface PendingInvitationParams {
  token: string;
  email: string;
  tribbuId: string | null;
}

interface AuthContextValue {
  user: Profile | null;
  userRoles: MembreRole[];
  globalRole: TribbuRole;
  isLoading: boolean;
  pendingInvitation: PendingInvitationParams | null;
  signIn: (email: string, password: string) => Promise<void>;
  completeInvitationSignup: (params: {
    email: string;
    displayName: string;
    password: string;
    phoneNumber?: string;
    invitationToken: string;
    tribbuId?: string | null;
  }) => Promise<void>;
  switchPersona: (userId: string) => Promise<void>;
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
  const [globalRole, setGlobalRole] = useState<TribbuRole>('MANITOU');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pendingInvitation, setPendingInvitation] =
    useState<PendingInvitationParams | null>(null);

  // Détection automatique d'une URL d'invitation (?invite_token=...&email=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('invite_token');
    const email = params.get('email') || '';
    const tribbuId = params.get('tribbu_id');

    if (token) {
      setPendingInvitation({ token, email, tribbuId });
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    try {
      const [profile, hierarchy] = await Promise.all([
        authService.getCurrentProfile(),
        chatService.fetchHierarchy(),
      ]);

      setUser(profile);
      setUserRoles(hierarchy.membresRoles);
      setGlobalRole(
        computeHighestRole(
          profile?.id,
          hierarchy.membresRoles,
          hierarchy.grandeTribbu.manitou_id
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
  }, [refreshAuth]);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await authService.signInWithEmail(email, password);
      await refreshAuth();
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
  }) => {
    setIsLoading(true);
    try {
      await authService.finalizeInvitationSignup(params);
      setPendingInvitation(null);
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
      await refreshAuth();
    } finally {
      setIsLoading(false);
    }
  };

  const switchPersona = async (userId: string) => {
    authService.switchDemoPersona(userId);
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
    const cleanUrl = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
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
        isLoading,
        pendingInvitation,
        signIn,
        completeInvitationSignup,
        switchPersona,
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
