import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { chatService } from '@/services/chatService';
import { notificationService } from '@/services/notificationService';
import type {
  MessageAttachment,
  Profile,
  TribbuRole,
} from '@/types/tribbu.types';

export const QUERY_KEYS = {
  hierarchy: (slug?: string | null) =>
    ['tribbu', 'hierarchy', slug || 'default'] as const,
  allMessages: (slug?: string | null) =>
    ['tribbu', 'messages', 'all', slug || 'default'] as const,
  canalMessages: (slug?: string | null, canalId?: string | null) =>
    ['tribbu', 'messages', slug || 'default', canalId] as const,
};

export function useHierarchy(activeSlug: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.hierarchy(activeSlug),
    queryFn: () => chatService.fetchHierarchy(activeSlug),
    staleTime: 10_000,
  });
}

export function useAllMessages(activeSlug: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.allMessages(activeSlug),
    queryFn: () => chatService.fetchMessages(activeSlug),
    staleTime: 5_000,
  });
}

export function useCanalMessages(
  activeSlug: string | null,
  canalId: string | null
) {
  return useQuery({
    queryKey: QUERY_KEYS.canalMessages(activeSlug, canalId),
    queryFn: () =>
      canalId
        ? chatService.fetchMessages(activeSlug, canalId)
        : Promise.resolve([]),
    enabled: Boolean(canalId),
    staleTime: 3_000,
  });
}

export function useChatActions(
  activeSlug: string | null,
  activeGrandeTribbuId: string | null,
  activeCanalId: string | null
) {
  const queryClient = useQueryClient();

  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['tribbu', 'hierarchy'] }),
      queryClient.invalidateQueries({ queryKey: ['tribbu', 'messages'] }),
    ]);
  };

  const sendMessageMutation = useMutation({
    mutationFn: (params: {
      canalId: string;
      authorId: string;
      content: string;
      profiles: Profile[];
      replyToMessageId?: string | null;
      replyToPreview?: {
        id: string;
        author_name: string;
        content: string;
      } | null;
      quotedExcerpt?: string | null;
      attachments?: MessageAttachment[];
      canalName?: string;
    }) =>
      chatService.sendMessage({
        ...params,
        grandeTribbuId: activeGrandeTribbuId || 'gt-main',
      }),
    onSuccess: async (msg, vars) => {
      await notificationService.markCanalAsRead(vars.canalId, vars.authorId);
      if (vars.canalName && msg.content) {
        await notificationService.dispatchPhoneNotification({
          recipientPhone: '+33 6 •• •• •• 90 (Membres abonnés)',
          recipientName: 'Membres du canal',
          canalName: vars.canalName,
          preview: msg.content,
        });
      }
      await invalidateAll();
    },
  });

  const confirmEmargementMutation = useMutation({
    mutationFn: ({
      messageId,
      userId,
    }: {
      messageId: string;
      userId: string;
    }) =>
      chatService.confirmEmargement(
        activeGrandeTribbuId || 'gt-main',
        messageId,
        userId
      ),
    onSuccess: invalidateAll,
  });

  const createTribbuMutation = useMutation({
    mutationFn: (params: {
      name: string;
      description: string;
      color: string;
      createdBy: string;
    }) =>
      chatService.createTribbu({
        ...params,
        grandeTribbuId: activeGrandeTribbuId || 'gt-main',
      }),
    onSuccess: invalidateAll,
  });

  const createTippiMutation = useMutation({
    mutationFn: (params: {
      tribbuId: string;
      name: string;
      description: string;
      memberIds: string[];
      createdBy: string;
    }) =>
      chatService.createTippi({
        ...params,
        grandeTribbuId: activeGrandeTribbuId || 'gt-main',
      }),
    onSuccess: invalidateAll,
  });

  const createFeuDeCampMutation = useMutation({
    mutationFn: (params: {
      tribbuId: string | null;
      name: string;
      topic: string;
      participantIds: string[];
      createdBy: string;
    }) =>
      chatService.createFeuDeCamp({
        ...params,
        grandeTribbuId: activeGrandeTribbuId || 'gt-main',
      }),
    onSuccess: invalidateAll,
  });

  const createInvitationMutation = useMutation({
    mutationFn: (params: {
      email: string;
      tribbuId: string;
      role: TribbuRole;
      invitedBy: string;
    }) =>
      chatService.createInvitation({
        ...params,
        grandeTribbuId: activeGrandeTribbuId || 'gt-main',
        grandeTribbuSlug: activeSlug || 'les-sentiers-vivants',
      }),
    onSuccess: invalidateAll,
  });

  const updateMemberRoleMutation = useMutation({
    mutationFn: (params: {
      roleRecordId: string;
      role: TribbuRole;
      status?: 'ACTIVE' | 'REJECTED';
    }) => chatService.updateMemberRole(params),
    onSuccess: invalidateAll,
  });

  const assignMemberMutation = useMutation({
    mutationFn: (params: {
      userId: string;
      tribbuId: string;
      role: TribbuRole;
      assignedBy: string;
    }) =>
      chatService.assignMemberToTribbu({
        ...params,
        grandeTribbuId: activeGrandeTribbuId || 'gt-main',
      }),
    onSuccess: invalidateAll,
  });

  void activeCanalId;

  return {
    sendMessage: sendMessageMutation.mutateAsync,
    isSending: sendMessageMutation.isPending,
    confirmEmargement: confirmEmargementMutation.mutateAsync,
    isConfirmingEmargement: confirmEmargementMutation.isPending,
    createTribbu: createTribbuMutation.mutateAsync,
    createTippi: createTippiMutation.mutateAsync,
    createFeuDeCamp: createFeuDeCampMutation.mutateAsync,
    createInvitation: createInvitationMutation.mutateAsync,
    updateMemberRole: updateMemberRoleMutation.mutateAsync,
    assignMember: assignMemberMutation.mutateAsync,
  };
}
