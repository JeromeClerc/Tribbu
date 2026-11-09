import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { chatService } from '@/services/chatService';
import { notificationService } from '@/services/notificationService';
import type { MessageAttachment, TribbuRole } from '@/types/tribbu.types';

export const QUERY_KEYS = {
  hierarchy: ['tribbu', 'hierarchy'] as const,
  allMessages: ['tribbu', 'messages', 'all'] as const,
  canalMessages: (canalId: string | null) =>
    ['tribbu', 'messages', canalId] as const,
};

export function useHierarchy() {
  return useQuery({
    queryKey: QUERY_KEYS.hierarchy,
    queryFn: () => chatService.fetchHierarchy(),
    staleTime: 10_000,
  });
}

export function useAllMessages() {
  return useQuery({
    queryKey: QUERY_KEYS.allMessages,
    queryFn: () => chatService.fetchMessages(),
    staleTime: 5_000,
  });
}

export function useCanalMessages(canalId: string | null) {
  return useQuery({
    queryKey: QUERY_KEYS.canalMessages(canalId),
    queryFn: () =>
      canalId ? chatService.fetchMessages(canalId) : Promise.resolve([]),
    enabled: Boolean(canalId),
    staleTime: 3_000,
  });
}

export function useChatActions(activeCanalId: string | null) {
  const queryClient = useQueryClient();

  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.hierarchy }),
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.allMessages }),
      ...(activeCanalId
        ? [
            queryClient.invalidateQueries({
              queryKey: QUERY_KEYS.canalMessages(activeCanalId),
            }),
          ]
        : []),
    ]);
  };

  const sendMessageMutation = useMutation({
    mutationFn: (params: {
      canalId: string;
      authorId: string;
      content: string;
      replyToMessageId?: string | null;
      replyToPreview?: {
        id: string;
        author_name: string;
        content: string;
      } | null;
      quotedExcerpt?: string | null;
      attachments?: MessageAttachment[];
      canalName?: string;
    }) => chatService.sendMessage(params),
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
    }) => chatService.confirmEmargement(messageId, userId),
    onSuccess: invalidateAll,
  });

  const createTribbuMutation = useMutation({
    mutationFn: (params: {
      name: string;
      description: string;
      color: string;
      createdBy: string;
    }) => chatService.createTribbu(params),
    onSuccess: invalidateAll,
  });

  const createTippiMutation = useMutation({
    mutationFn: (params: {
      tribbuId: string;
      name: string;
      description: string;
      memberIds: string[];
      createdBy: string;
    }) => chatService.createTippi(params),
    onSuccess: invalidateAll,
  });

  const createFeuDeCampMutation = useMutation({
    mutationFn: (params: {
      tribbuId: string | null;
      name: string;
      topic: string;
      participantIds: string[];
      createdBy: string;
    }) => chatService.createFeuDeCamp(params),
    onSuccess: invalidateAll,
  });

  const createInvitationMutation = useMutation({
    mutationFn: (params: {
      email: string;
      tribbuId: string;
      role: TribbuRole;
      invitedBy: string;
    }) => chatService.createInvitation(params),
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
    }) => chatService.assignMemberToTribbu(params),
    onSuccess: invalidateAll,
  });

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

