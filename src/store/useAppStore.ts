import { create } from 'zustand';

export interface WorkspaceItem {
  id: string;
  type: 'app' | 'url' | 'folder' | 'command';
  name: string;
  path?: string;
  url?: string;
  command?: string;
  delay?: number;
  runAsAdmin?: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  color: string;
  icon: string;
  description: string;
  items: WorkspaceItem[];
}

export interface Shortcut {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  command: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  color: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatConversation {
  id: string;
  title: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface AgendaEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  color: string;
  location?: string;
  description?: string;
}

export interface LinkItem {
  id: string;
  name: string;
  url: string;
  icon: string;
  category: string;
  favorite: boolean;
}

export interface FavoriteItem {
  id: string;
  type: 'folder' | 'program' | 'website';
  name: string;
  path?: string;
  url?: string;
}

export interface Stat {
  id: string;
  appName: string;
  duration: number;
  color: string;
  lastUsedAt?: string;
}

export interface HistoryItem {
  id: string;
  type: 'workspace' | 'shortcut' | 'link' | 'note' | 'event' | 'music' | 'app' | 'folder' | 'favorite';
  title: string;
  description: string;
  timestamp: string;
}

export interface AppMetadata {
  version: string;
  copyrightYear: string;
  description: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
}

interface BackupProfile {
  id: string;
  name: string;
  folders: string[];
  lastBackup: string;
  size: string;
  status: 'idle' | 'running' | 'completed';
  progress: number;
}

interface AppState {
  activePage: string;
  setActivePage: (page: string) => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  workspaces: Workspace[];
  addWorkspace: (workspace: Omit<Workspace, 'id'>) => void;
  updateWorkspace: (id: string, workspace: Partial<Workspace>) => void;
  deleteWorkspace: (id: string) => void;
  shortcuts: Shortcut[];
  addShortcut: (shortcut: Omit<Shortcut, 'id'>) => void;
  updateShortcut: (id: string, shortcut: Partial<Shortcut>) => void;
  deleteShortcut: (id: string) => void;
  notes: Note[];
  addNote: (note: Omit<Note, 'id' | 'createdAt'>) => void;
  updateNote: (id: string, note: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  chatConversations: ChatConversation[];
  addChatConversation: (conversation: Omit<ChatConversation, 'id' | 'createdAt' | 'updatedAt'>) => ChatConversation;
  updateChatConversation: (id: string, conversation: Partial<ChatConversation>) => void;
  archiveChatConversation: (id: string) => void;
  deleteChatConversation: (id: string) => void;
  agenda: AgendaEvent[];
  addAgendaEvent: (event: Omit<AgendaEvent, 'id'>) => void;
  updateAgendaEvent: (id: string, event: Partial<AgendaEvent>) => void;
  deleteAgendaEvent: (id: string) => void;
  links: LinkItem[];
  addLink: (link: Omit<LinkItem, 'id'>) => void;
  updateLink: (id: string, link: Partial<LinkItem>) => void;
  deleteLink: (id: string) => void;
  favorites: FavoriteItem[];
  addFavorite: (favorite: Omit<FavoriteItem, 'id'>) => void;
  updateFavorite: (id: string, favorite: Partial<FavoriteItem>) => void;
  deleteFavorite: (id: string) => void;
  stats: Stat[];
  setStats: (stats: Stat[]) => void;
  updateStats: (appName: string, minutes: number) => void;
  history: HistoryItem[];
  addHistoryItem: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  removeHistoryItem: (id: string) => void;
  clearHistory: () => void;
  spotifyConnected: boolean;
  spotifyAccessToken: string | null;
  spotifyRefreshToken: string | null;
  setSpotifyTokens: (accessToken: string | null, refreshToken: string | null) => void;
  disconnectSpotify: () => void;
  userProfile: UserProfile;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  appMetadata: AppMetadata;
  updateAppMetadata: (metadata: Partial<AppMetadata>) => void;
  backupProfiles: BackupProfile[];
  addBackupProfile: (profile: Omit<BackupProfile, 'id'>) => void;
  updateBackupProfile: (id: string, profile: Partial<BackupProfile>) => void;
  deleteBackupProfile: (id: string) => void;
}

const nowPtBr = () => new Date().toLocaleString('pt-BR');
const todayIso = () => new Date().toISOString().split('T')[0];

const STORAGE_KEY = 'guihub-app-state-v1';

const buildPersistedState = (state: AppState) => ({
  activePage: state.activePage,
  sidebarCollapsed: state.sidebarCollapsed,
  theme: state.theme,
  searchQuery: state.searchQuery,
  workspaces: state.workspaces,
  shortcuts: state.shortcuts,
  notes: state.notes,
  chatConversations: state.chatConversations,
  agenda: state.agenda,
  links: state.links,
  favorites: state.favorites,
  stats: state.stats,
  history: state.history,
  spotifyConnected: state.spotifyConnected,
  spotifyAccessToken: state.spotifyAccessToken,
  spotifyRefreshToken: state.spotifyRefreshToken,
  userProfile: state.userProfile,
  backupProfiles: state.backupProfiles,
  appMetadata: state.appMetadata,
});

const readPersistedState = () => {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<AppState>;
  } catch (error) {
    console.error('Failed to read persisted state', error);
    return null;
  }
};

export const useAppStore = create<AppState>((set, get) => {
  const persistState = async () => {
    try {
      const stateToPersist = buildPersistedState(get());

      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToPersist));
        } catch (error) {
          console.error('Failed to save to localStorage', error);
        }
      }

      if (typeof window !== 'undefined' && (window as any).electronAPI?.setStoreData) {
        await (window as any).electronAPI.setStoreData(stateToPersist);
      }
    } catch (error) {
      console.error('Failed to save store data', error);
    }
  };

  const updateAndPersist = (updater: (state: AppState) => Partial<AppState>) => {
    set((state) => updater(state));
    void persistState();
  };

  const initialState: AppState = {
    activePage: 'home',
    setActivePage: (page) => {
      set({ activePage: page });
      void persistState();
    },
    sidebarCollapsed: false,
    toggleSidebar: () => updateAndPersist((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
    theme: 'dark',
    toggleTheme: () => updateAndPersist((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
    searchQuery: '',
    setSearchQuery: (query) => updateAndPersist(() => ({ searchQuery: query })),
    workspaces: [
      {
        id: '1',
        name: 'Programação',
        color: '#3B82F6',
        icon: '💻',
        description: 'Ambiente de desenvolvimento',
        items: [
          { id: '1-1', type: 'app', name: 'Visual Studio Code', path: 'code', delay: 0, runAsAdmin: false },
          { id: '1-2', type: 'app', name: 'Windows Terminal', path: 'wt', delay: 500, runAsAdmin: false },
          { id: '1-3', type: 'url', name: 'GitHub', url: 'https://github.com', delay: 1000, runAsAdmin: false },
        ],
      },
      {
        id: '2',
        name: 'Estudos',
        color: '#22C55E',
        icon: '📚',
        description: 'Aprendizado e pesquisa',
        items: [
          { id: '2-1', type: 'url', name: 'ChatGPT', url: 'https://chat.openai.com', delay: 0, runAsAdmin: false },
          { id: '2-2', type: 'url', name: 'YouTube', url: 'https://youtube.com', delay: 400, runAsAdmin: false },
        ],
      },
    ],
    addWorkspace: (workspace) => updateAndPersist((state) => ({
      workspaces: [...state.workspaces, { ...workspace, id: crypto.randomUUID() }],
    })),
    updateWorkspace: (id, workspace) => updateAndPersist((state) => ({
      workspaces: state.workspaces.map((item) => item.id === id ? { ...item, ...workspace } : item),
    })),
    deleteWorkspace: (id) => updateAndPersist((state) => ({
      workspaces: state.workspaces.filter((item) => item.id !== id),
    })),
    shortcuts: [
      { id: '1', name: 'Limpar Temp', description: 'Remove arquivos temporários do usuário', icon: 'Trash2', color: '#EF4444', category: 'Sistema', command: 'Remove-Item -Path $env:TEMP\\* -Recurse -Force -ErrorAction SilentlyContinue' },
      { id: '2', name: 'Reiniciar Explorer', description: 'Reinicia o Windows Explorer', icon: 'RefreshCw', color: '#3B82F6', category: 'Sistema', command: 'Stop-Process -Name explorer -Force; Start-Process explorer.exe' },
      { id: '3', name: 'Flush DNS', description: 'Limpa o cache DNS', icon: 'Globe', color: '#22C55E', category: 'Rede', command: 'ipconfig /flushdns' },
      { id: '4', name: 'Painel de Controle', description: 'Abre o Painel de Controle', icon: 'Settings', color: '#F59E0B', category: 'Windows', command: 'control' },
      { id: '5', name: 'Gerenciador de Tarefas', description: 'Abre o gerenciador de tarefas', icon: 'Terminal', color: '#8B5CF6', category: 'Sistema', command: 'taskmgr' },
    ],
    addShortcut: (shortcut) => updateAndPersist((state) => ({
      shortcuts: [...state.shortcuts, { ...shortcut, id: crypto.randomUUID() }],
    })),
    updateShortcut: (id, shortcut) => updateAndPersist((state) => ({
      shortcuts: state.shortcuts.map((item) => item.id === id ? { ...item, ...shortcut } : item),
    })),
    deleteShortcut: (id) => updateAndPersist((state) => ({
      shortcuts: state.shortcuts.filter((item) => item.id !== id),
    })),
    notes: [
      { id: '1', title: 'Reunião com a equipe', content: 'Alinhar entregas e próximos passos.', pinned: true, color: '#22C55E', createdAt: todayIso() },
      { id: '2', title: 'Estudar JavaScript', content: 'Funções, arrays e objetos.', pinned: false, color: '#8B5CF6', createdAt: todayIso() },
      { id: '3', title: 'Projeto pessoal', content: 'Terminar o sistema de login.', pinned: false, color: '#3B82F6', createdAt: todayIso() },
    ],
    addNote: (note) => updateAndPersist((state) => ({
      notes: [{ ...note, id: crypto.randomUUID(), createdAt: todayIso() }, ...state.notes],
    })),
    updateNote: (id, note) => updateAndPersist((state) => ({
      notes: state.notes.map((item) => item.id === id ? { ...item, ...note } : item),
    })),
    deleteNote: (id) => updateAndPersist((state) => ({
      notes: state.notes.filter((item) => item.id !== id),
    })),
    chatConversations: [
      {
        id: 'chat-1',
        title: 'Assistente de produtividade',
        archived: false,
        createdAt: nowPtBr(),
        updatedAt: nowPtBr(),
        messages: [
          {
            id: 'chat-1-msg-1',
            role: 'assistant',
            content: 'Olá! Eu posso te ajudar a organizar ideias, resumir tarefas e manter um histórico das conversas.',
            timestamp: nowPtBr(),
          },
        ],
      },
    ],
    addChatConversation: (conversation) => {
      const created = {
        id: crypto.randomUUID(),
        createdAt: nowPtBr(),
        updatedAt: nowPtBr(),
        ...conversation,
      };
      updateAndPersist((state) => ({
        chatConversations: [created, ...state.chatConversations],
      }));
      return created;
    },
    updateChatConversation: (id, conversation) => updateAndPersist((state) => ({
      chatConversations: state.chatConversations.map((item) => item.id === id ? { ...item, ...conversation, updatedAt: nowPtBr() } : item),
    })),
    archiveChatConversation: (id) => updateAndPersist((state) => ({
      chatConversations: state.chatConversations.map((item) => item.id === id ? { ...item, archived: !item.archived, updatedAt: nowPtBr() } : item),
    })),
    deleteChatConversation: (id) => updateAndPersist((state) => ({
      chatConversations: state.chatConversations.filter((item) => item.id !== id),
    })),
    agenda: [
      { id: '1', title: 'Reunião com a equipe', date: todayIso(), time: '15:00', color: '#3B82F6', location: 'Discord', description: 'Revisar o dashboard.' },
      { id: '2', title: 'Estudar para a prova', date: todayIso(), time: '20:00', color: '#8B5CF6', description: 'Matéria de algoritmos.' },
    ],
    addAgendaEvent: (event) => updateAndPersist((state) => ({
      agenda: [...state.agenda, { ...event, id: crypto.randomUUID() }],
    })),
    updateAgendaEvent: (id, event) => updateAndPersist((state) => ({
      agenda: state.agenda.map((item) => item.id === id ? { ...item, ...event } : item),
    })),
    deleteAgendaEvent: (id) => updateAndPersist((state) => ({
      agenda: state.agenda.filter((item) => item.id !== id),
    })),
    links: [
      { id: '1', name: 'GitHub', url: 'https://github.com', icon: 'Globe', category: 'Desenvolvimento', favorite: true },
      { id: '2', name: 'YouTube', url: 'https://youtube.com', icon: 'Globe', category: 'Entretenimento', favorite: true },
      { id: '3', name: 'ChatGPT', url: 'https://chat.openai.com', icon: 'Globe', category: 'Produtividade', favorite: false },
      { id: '4', name: 'Spotify', url: 'https://spotify.com', icon: 'Globe', category: 'Entretenimento', favorite: false },
    ],
    addLink: (link) => updateAndPersist((state) => ({
      links: [...state.links, { ...link, id: crypto.randomUUID() }],
    })),
    updateLink: (id, link) => updateAndPersist((state) => ({
      links: state.links.map((item) => item.id === id ? { ...item, ...link } : item),
    })),
    deleteLink: (id) => updateAndPersist((state) => ({
      links: state.links.filter((item) => item.id !== id),
    })),
    favorites: [
      { id: '1', type: 'folder', name: 'Projetos', path: 'C:\\Projetos' },
      { id: '2', type: 'website', name: 'GitHub', url: 'https://github.com' },
    ],
    addFavorite: (favorite) => updateAndPersist((state) => ({
      favorites: [...state.favorites, { ...favorite, id: crypto.randomUUID() }],
    })),
    updateFavorite: (id, favorite) => updateAndPersist((state) => ({
      favorites: state.favorites.map((item) => item.id === id ? { ...item, ...favorite } : item),
    })),
    deleteFavorite: (id) => updateAndPersist((state) => ({
      favorites: state.favorites.filter((item) => item.id !== id),
    })),
    stats: [
      { id: '1', appName: 'VS Code', duration: 210, color: '#3B82F6', lastUsedAt: nowPtBr() },
      { id: '2', appName: 'Chrome', duration: 150, color: '#8B5CF6', lastUsedAt: nowPtBr() },
      { id: '3', appName: 'Spotify', duration: 90, color: '#22C55E', lastUsedAt: nowPtBr() },
    ],
    setStats: (stats) => {
      set({ stats });
      void persistState();
    },
    updateStats: (appName, minutes) => updateAndPersist((state) => {
      const current = state.stats.find((item) => item.appName === appName);
      if (current) {
        return {
          stats: state.stats.map((item) => item.id === current.id ? { ...item, duration: item.duration + minutes, lastUsedAt: nowPtBr() } : item),
        };
      }

      return {
        stats: [...state.stats, { id: crypto.randomUUID(), appName, duration: minutes, color: '#3B82F6', lastUsedAt: nowPtBr() }],
      };
    }),
    history: [],
    addHistoryItem: (item) => updateAndPersist((state) => ({
      history: [{ ...item, id: crypto.randomUUID(), timestamp: nowPtBr() }, ...state.history].slice(0, 200),
    })),
    removeHistoryItem: (id) => updateAndPersist((state) => ({
      history: state.history.filter((item) => item.id !== id),
    })),
    clearHistory: () => {
      set({ history: [] });
      void persistState();
    },
    spotifyConnected: false,
    spotifyAccessToken: null,
    spotifyRefreshToken: null,
    setSpotifyTokens: (accessToken, refreshToken) => {
      set({
        spotifyConnected: Boolean(accessToken),
        spotifyAccessToken: accessToken,
        spotifyRefreshToken: refreshToken,
      });
      void persistState();
    },
    disconnectSpotify: () => {
      set({
        spotifyConnected: false,
        spotifyAccessToken: null,
        spotifyRefreshToken: null,
      });
      void persistState();
    },
    userProfile: {
      id: 'user-1',
      name: 'Gui',
      email: 'gui@email.com',
      avatarColor: '#3B82F6',
    },
    updateUserProfile: (profile) => updateAndPersist((state) => ({
      userProfile: { ...state.userProfile, ...profile },
    })),
    appMetadata: {
      version: '1.0.0',
      copyrightYear: '2026',
      description: 'O centro de controle definitivo para produtividade, automação e monitoramento de hardware.',
    },
    updateAppMetadata: (metadata) => updateAndPersist((state) => ({
      appMetadata: { ...state.appMetadata, ...metadata },
    })),
    backupProfiles: [
      { id: '1', name: 'Backup Projetos', folders: [], lastBackup: 'Nunca', size: '0 GB', status: 'idle', progress: 0 },
      { id: '2', name: 'Backup Documentos', folders: [], lastBackup: 'Nunca', size: '0 GB', status: 'idle', progress: 0 },
    ],
    addBackupProfile: (profile) => updateAndPersist((state) => ({
      backupProfiles: [...state.backupProfiles, { ...profile, id: crypto.randomUUID() }],
    })),
    updateBackupProfile: (id, profile) => updateAndPersist((state) => ({
      backupProfiles: state.backupProfiles.map((item) => item.id === id ? { ...item, ...profile } : item),
    })),
    deleteBackupProfile: (id) => updateAndPersist((state) => ({
      backupProfiles: state.backupProfiles.filter((item) => item.id !== id),
    })),
  };

  const loadPersistedState = async () => {
    if (typeof window === 'undefined') return;

    try {
      const localData: Partial<AppState> | null = readPersistedState();
      let electronData: Partial<AppState> | null = null;

      if ((window as any).electronAPI?.getStoreData) {
        try {
          electronData = await (window as any).electronAPI.getStoreData();
        } catch (err) {
          console.error('Erro ao ler store do Electron:', err);
          electronData = null;
        }
      }

      const storeData: Partial<AppState> | null = electronData ?? localData;

      if (storeData) {
        const {
          activePage,
          sidebarCollapsed,
          theme,
          workspaces,
          shortcuts,
          notes,
          chatConversations,
          agenda,
          links,
          favorites,
          stats,
          history,
          spotifyConnected,
          spotifyAccessToken,
          spotifyRefreshToken,
          userProfile,
          backupProfiles,
          appMetadata
        } = storeData;

        set((state) => ({
          ...state,
          activePage: activePage ?? state.activePage,
          sidebarCollapsed: sidebarCollapsed ?? state.sidebarCollapsed,
          theme: theme ?? state.theme,
          workspaces: workspaces ?? state.workspaces,
          shortcuts: shortcuts ?? state.shortcuts,
          notes: notes ?? state.notes,
          chatConversations: chatConversations ?? state.chatConversations,
          agenda: agenda ?? state.agenda,
          links: links ?? state.links,
          favorites: favorites ?? state.favorites,
          stats: stats ?? state.stats,
          history: history ?? state.history,
          searchQuery: state.searchQuery,
          spotifyConnected: spotifyConnected ?? state.spotifyConnected,
          spotifyAccessToken: spotifyAccessToken ?? state.spotifyAccessToken,
          spotifyRefreshToken: spotifyRefreshToken ?? state.spotifyRefreshToken,
          userProfile: userProfile ?? state.userProfile,
          backupProfiles: backupProfiles ?? state.backupProfiles,
          appMetadata: appMetadata ?? state.appMetadata,
        }));
      }
    } catch (error) {
      console.error('Failed to load store data', error);
    }
  };

  void loadPersistedState();

  return initialState;
});
