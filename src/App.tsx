import React, { useEffect } from 'react';
import { Compass, Crown, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUIStore } from '@/lib/uiStore';
import {
  useAllMessages,
  useChatActions,
  useHierarchy,
} from '@/hooks/useChat';
import { useRealtimeChannel } from '@/hooks/useRealtimeChannel';
import { useUnreadCount } from '@/hooks/useUnreadCount';
import { useTyping } from '@/hooks/useTyping';
import { canUserWriteToCanal } from '@/lib/utils';

import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { TabBar } from '@/components/layout/TabBar';
import { MobileNav } from '@/components/layout/MobileNav';
import { NotificationDrawer } from '@/components/layout/NotificationDrawer';
import { ChannelHeader } from '@/components/chat/ChannelHeader';
import { MessageList } from '@/components/chat/MessageList';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { ChatInput } from '@/components/chat/ChatInput';
import { InviteModal } from '@/components/modals/InviteModal';
import { CreateTippiModal } from '@/components/modals/CreateTippiModal';
import { RoleManager } from '@/components/modals/RoleManager';
import { DeleteAssociationModal } from '@/components/modals/DeleteAssociationModal';
import { DeleteTribbuModal } from '@/components/modals/DeleteTribbuModal';
import { UserProfileModal } from '@/components/modals/UserProfileModal';
import { AuthScreen } from '@/components/modals/AuthScreen';

export const App: React.FC = () => {
  const {
    user,
    globalRole,
    activeSlug,
    activeAssociation,
    isMemberOfActiveAssociation,
    isLoading: authLoading,
    pendingInvitation,
  } = useAuth();
  const { activeCanalId, setActiveCanalId, mobileView, openModal } =
    useUIStore();

  const { data: hierarchy, isLoading: hierarchyLoading } =
    useHierarchy(activeSlug);
  const { data: allMessages = [] } = useAllMessages(activeSlug);

  const canaux = hierarchy?.canaux ?? [];
  const tribbus = hierarchy?.tribbus ?? [];
  const tippis = hierarchy?.tippis ?? [];
  const feuxDeCamp = hierarchy?.feuxDeCamp ?? [];
  const membresRoles = hierarchy?.membresRoles ?? [];
  const profiles = hierarchy?.profiles ?? [];
  const grandeTribbu = hierarchy?.grandeTribbu || activeAssociation;

  useRealtimeChannel(
    grandeTribbu?.id || null,
    activeCanalId,
    Boolean(user && isMemberOfActiveAssociation)
  );

  const {
    accessibleCanaux,
    summariesByCanalId,
    mutatedCanauxList,
    totalUnreadCount,
    mentionedMessages,
    markAllRead,
  } = useUnreadCount({
    user,
    globalRole,
    canaux,
    messages: allMessages,
    tribbus,
    tippis,
    feuxDeCamp,
    userRoles: membresRoles,
    activeCanalId,
  });

  // Assure que le canal actif fait toujours partie des canaux accessibles par le rôle courant dans l'association active
  useEffect(() => {
    if (accessibleCanaux.length === 0) return;
    const isCurrentValid = accessibleCanaux.some(
      (c) => c.id === activeCanalId
    );
    if (!isCurrentValid) {
      setActiveCanalId(accessibleCanaux[0].id);
    }
  }, [accessibleCanaux, activeCanalId, setActiveCanalId]);

  const activeCanal =
    accessibleCanaux.find((c) => c.id === activeCanalId) ||
    accessibleCanaux[0] ||
    null;

  const activeCanalMessages = React.useMemo(() => {
    if (!activeCanal) return [];
    return allMessages.filter((m) => m.canal_id === activeCanal.id);
  }, [allMessages, activeCanal]);

  const { typingUsers, notifyTyping } = useTyping(activeCanal?.id || null);

  const {
    sendMessage,
    isSending,
    confirmEmargement,
    isConfirmingEmargement,
    createTribbu,
    createTippi,
    createFeuDeCamp,
    createInvitation,
    updateMemberRole,
    assignMember,
    deleteTribbu,
  } = useChatActions(
    activeSlug,
    grandeTribbu?.id || null,
    activeCanal?.id || null
  );

  if (authLoading || (Boolean(activeSlug) && hierarchyLoading)) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-tribbu-charcoal-deep text-white gap-3">
        <div className="w-10 h-10 rounded-full border-3 border-tribbu-teal border-t-tribbu-green animate-spin" />
        <span className="text-xs font-semibold tracking-wide text-slate-300">
          Initialisation de la Grande Tribbu (Firebase)...
        </span>
      </div>
    );
  }

  // Affiche la page initiale SaaS si non connecté, invitation en attente,
  // aucune association sélectionnée, ou cloisonnement inter-associations actif
  if (
    !user ||
    pendingInvitation ||
    !grandeTribbu ||
    !isMemberOfActiveAssociation
  ) {
    return <AuthScreen />;
  }

  const canWriteActiveCanal = activeCanal
    ? canUserWriteToCanal({
        userId: user.id,
        globalRole,
        canal: activeCanal,
        userRoles: membresRoles,
        tippis,
        feuxDeCamp,
      })
    : false;

  const parentTribbuName = activeCanal?.tribbu_id
    ? tribbus.find((t) => t.id === activeCanal.tribbu_id)?.name
    : undefined;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-tribbu-ivory dark:bg-tribbu-charcoal-deep">
      {/* Barre supérieure globale avec slug d'URL de l'association */}
      <Header
        associationName={grandeTribbu.name}
        associationSlug={grandeTribbu.slug}
        totalUnreadCount={totalUnreadCount}
        mutatedChannelsCount={mutatedCanauxList.length}
        mentionsCount={mentionedMessages.length}
      />

      {/* Tiroir des notifications (Canaux modifiés + Messages où vous êtes cité(e) <@vous>) */}
      <NotificationDrawer
        mutatedCanaux={mutatedCanauxList}
        mentionedMessages={mentionedMessages}
        canaux={accessibleCanaux}
        onMarkAllRead={markAllRead}
      />

      {/* Corps de l'application : Sidebar hiérarchique + Zone principale à onglets */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Sidebar Desktop */}
        <div className="hidden lg:block h-full">
          <Sidebar
            tribbus={tribbus}
            tippis={tippis}
            feuxDeCamp={feuxDeCamp}
            accessibleCanaux={accessibleCanaux}
            summariesByCanalId={summariesByCanalId}
          />
        </div>

        {/* Vue Liste Mobile (quand l'onglet mobile 'Canaux' est actif) */}
        {mobileView === 'list' && (
          <div className="lg:hidden flex-1 h-full overflow-hidden">
            <Sidebar
              tribbus={tribbus}
              tippis={tippis}
              feuxDeCamp={feuxDeCamp}
              accessibleCanaux={accessibleCanaux}
              summariesByCanalId={summariesByCanalId}
              isMobileDrawer={true}
            />
          </div>
        )}

        {/* Zone Principale (Onglets navigateur + En-tête de présence + Messages + Input riche) */}
        <main
          className={`flex-1 flex flex-col min-w-0 h-full bg-white dark:bg-tribbu-charcoal ${
            mobileView === 'list' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Système d'onglets persistants façon navigateur */}
          <TabBar summariesByCanalId={summariesByCanalId} />

          {/* Bandeau d'onboarding Grand Manitou lorsqu'une nouvelle association vient d'être créée */}
          {globalRole === 'MANITOU' && tribbus.length === 0 && (
            <div className="mx-3 mt-2.5 p-3 rounded-2xl bg-gradient-to-r from-tribbu-teal/15 via-tribbu-green/10 to-tribbu-purple/10 border border-tribbu-teal/30 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-tribbu-teal text-white flex items-center justify-center shrink-0">
                  <Crown className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <div className="font-bold text-slate-900 dark:text-white">
                    Bienvenue dans votre association « {grandeTribbu.name} » (
                    <code className="font-mono text-tribbu-teal">
                      /{grandeTribbu.slug}
                    </code>
                    ) !
                  </div>
                  <div className="text-slate-600 dark:text-slate-300">
                    Vous êtes le Grand Manitou. Créez vos premières Tribbus et
                    invitez vos membres par adresse e-mail.
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => openModal('create-tribbu')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-tribbu-teal text-white text-xs font-bold shadow-sm hover:bg-tribbu-teal-dark transition-colors"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>+ Créer une Tribbu</span>
                </button>
                <button
                  type="button"
                  onClick={() => openModal('invite')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-tribbu-green text-white text-xs font-bold shadow-sm hover:opacity-95 transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Inviter des membres</span>
                </button>
              </div>
            </div>
          )}

          {activeCanal ? (
            <>
              {/* En-tête du canal actif (Utilisateurs en focus + Indicateur d'écriture) */}
              <ChannelHeader
                canal={activeCanal}
                parentTribbuName={parentTribbuName}
                canWrite={canWriteActiveCanal}
              />

              {/* Liste fluide des messages avec mentions <@nom_personne>, émargements et liens */}
              <MessageList
                canal={activeCanal}
                messages={activeCanalMessages}
                currentUser={user}
                userRoles={membresRoles}
                manitouId={grandeTribbu.manitou_id}
                onConfirmEmargement={(messageId) =>
                  confirmEmargement({ messageId, userId: user.id })
                }
                isConfirmingEmargement={isConfirmingEmargement}
              />

              {/* Indicateur de frappe temps réel */}
              <TypingIndicator typingUsers={typingUsers} />

              {/* Zone de saisie riche avec autocomplétion <@nom_personne> */}
              <ChatInput
                canal={activeCanal}
                currentUserId={user.id}
                profiles={profiles}
                canWrite={canWriteActiveCanal}
                isSending={isSending}
                onSendMessage={async ({
                  content,
                  replyToMessageId,
                  replyToPreview,
                  quotedExcerpt,
                  attachments,
                }) => {
                  await sendMessage({
                    canalId: activeCanal.id,
                    authorId: user.id,
                    content,
                    replyToMessageId,
                    replyToPreview,
                    quotedExcerpt,
                    attachments,
                    canalName: activeCanal.name,
                    profiles,
                  });
                }}
                onTypingChange={notifyTyping}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6 text-center text-sm text-slate-500">
              Sélectionnez un canal dans l'arborescence de gauche pour démarrer.
            </div>
          )}
        </main>
      </div>

      {/* Navigation inférieure & Drawer Mobile PWA */}
      <MobileNav
        tribbus={tribbus}
        tippis={tippis}
        feuxDeCamp={feuxDeCamp}
        accessibleCanaux={accessibleCanaux}
        summariesByCanalId={summariesByCanalId}
        totalUnreadCount={totalUnreadCount}
      />

      {/* Modales fonctionnelles */}
      <InviteModal
        tribbus={tribbus}
        onCreateInvitation={createInvitation}
      />

      <CreateTippiModal
        tribbus={tribbus}
        profiles={profiles}
        onCreateTippi={createTippi}
        onCreateFeuDeCamp={createFeuDeCamp}
        onCreateTribbu={createTribbu}
      />

      <RoleManager
        tribbus={tribbus}
        profiles={profiles}
        membresRoles={membresRoles}
        onUpdateRole={updateMemberRole}
        onAssignMember={assignMember}
      />

      <DeleteAssociationModal
        associationName={grandeTribbu.name}
        associationSlug={grandeTribbu.slug}
        messages={allMessages}
        canaux={canaux}
        tribbus={tribbus}
        tippis={tippis}
        feuxDeCamp={feuxDeCamp}
        profiles={profiles}
        membresRoles={membresRoles}
      />

      <DeleteTribbuModal
        tribbus={tribbus}
        tippis={tippis}
        feuxDeCamp={feuxDeCamp}
        canaux={canaux}
        messages={allMessages}
        membresRoles={membresRoles}
        onDeleteTribbu={deleteTribbu}
      />

      <UserProfileModal />
    </div>
  );
};

export default App;
