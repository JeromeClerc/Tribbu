import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { OpenTab } from '@/types/tribbu.types';

export type ModalType =
  | 'invite'
  | 'create-tippi'
  | 'create-tribbu'
  | 'create-feu-de-camp'
  | 'role-manager'
  | 'delete-association'
  | 'user-profile'
  | null;

export interface ReplyTarget {
  canalId: string;
  messageId: string;
  authorName: string;
  content: string;
  quotedExcerpt?: string;
}

interface UIState {
  openTabs: OpenTab[];
  activeCanalId: string | null;
  sidebarCollapsed: boolean;
  mobileDrawerOpen: boolean;
  mobileView: 'list' | 'chat';
  notificationDrawerOpen: boolean;
  activeModal: ModalType;
  modalContextTribbuId: string | null;
  replyTarget: ReplyTarget | null;
  searchQuery: string;
  filterMentionsOnly: boolean;

  openCanalTab: (tab: OpenTab) => void;
  closeCanalTab: (canalId: string) => void;
  setActiveCanalId: (canalId: string) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapsed: () => void;
  setMobileDrawerOpen: (open: boolean) => void;
  setMobileView: (view: 'list' | 'chat') => void;
  setNotificationDrawerOpen: (open: boolean) => void;
  openModal: (modal: ModalType, tribbuId?: string | null) => void;
  closeModal: () => void;
  setReplyTarget: (target: ReplyTarget | null) => void;
  setSearchQuery: (query: string) => void;
  setFilterMentionsOnly: (val: boolean) => void;
  toggleFilterMentionsOnly: () => void;
  resetAfterAssociationDeletion: () => void;
}

const DEFAULT_TABS: OpenTab[] = [
  {
    canalId: 'canal-gt-annonces',
    title: 'Annonces Officielles',
    type: 'GRANDE_TRIBBU_ANNONCES',
    parentLabel: 'Grande Tribbu',
    accentColor: '#3BA55D',
    pinned: true,
  },
  {
    canalId: 'canal-gt-agora',
    title: 'Agora Générale',
    type: 'AGORA_GENERALE',
    parentLabel: 'Grande Tribbu',
    accentColor: '#0E8A9E',
    pinned: true,
  },
  {
    canalId: 'canal-comm-agora',
    title: 'Communication — Agora',
    type: 'TRIBBU_AGORA',
    parentLabel: 'Tribbu Communication',
    accentColor: '#0E8A9E',
  },
];

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      openTabs: DEFAULT_TABS,
      activeCanalId: 'canal-gt-annonces',
      sidebarCollapsed: false,
      mobileDrawerOpen: false,
      mobileView: 'chat',
      notificationDrawerOpen: false,
      activeModal: null,
      modalContextTribbuId: null,
      replyTarget: null,
      searchQuery: '',
      filterMentionsOnly: false,

      openCanalTab: (tab) => {
        const currentTabs = get().openTabs;
        const exists = currentTabs.some((t) => t.canalId === tab.canalId);
        const nextTabs = exists
          ? currentTabs.map((t) => (t.canalId === tab.canalId ? { ...t, ...tab } : t))
          : [...currentTabs, tab];

        set({
          openTabs: nextTabs,
          activeCanalId: tab.canalId,
          mobileDrawerOpen: false,
          mobileView: 'chat',
        });
      },

      closeCanalTab: (canalId) => {
        const { openTabs, activeCanalId } = get();
        if (openTabs.length <= 1) return;

        const idx = openTabs.findIndex((t) => t.canalId === canalId);
        const nextTabs = openTabs.filter((t) => t.canalId !== canalId);

        let nextActive = activeCanalId;
        if (activeCanalId === canalId) {
          const fallbackTab = nextTabs[Math.max(0, idx - 1)] || nextTabs[0];
          nextActive = fallbackTab ? fallbackTab.canalId : null;
        }

        set({
          openTabs: nextTabs,
          activeCanalId: nextActive,
        });
      },

      setActiveCanalId: (canalId) =>
        set({
          activeCanalId: canalId,
          mobileView: 'chat',
          mobileDrawerOpen: false,
        }),

      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      toggleSidebarCollapsed: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setMobileDrawerOpen: (open) => set({ mobileDrawerOpen: open }),
      setMobileView: (view) => set({ mobileView: view }),
      setNotificationDrawerOpen: (open) => set({ notificationDrawerOpen: open }),
      openModal: (modal, tribbuId = null) =>
        set({ activeModal: modal, modalContextTribbuId: tribbuId }),
      closeModal: () => set({ activeModal: null, modalContextTribbuId: null }),
      setReplyTarget: (target) => set({ replyTarget: target }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setFilterMentionsOnly: (val) => set({ filterMentionsOnly: val }),
      toggleFilterMentionsOnly: () =>
        set((state) => ({ filterMentionsOnly: !state.filterMentionsOnly })),
      resetAfterAssociationDeletion: () =>
        set({
          openTabs: [],
          activeCanalId: null,
          activeModal: null,
          modalContextTribbuId: null,
          replyTarget: null,
          searchQuery: '',
          filterMentionsOnly: false,
          notificationDrawerOpen: false,
          mobileDrawerOpen: false,
        }),
    }),
    {
      name: 'tribbu-ui-tabs-storage',
      partialize: (state) => ({
        openTabs: state.openTabs,
        activeCanalId: state.activeCanalId,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
