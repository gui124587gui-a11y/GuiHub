/// <reference types="vite/client" />

interface StatusUpdate {
  step: number;
  totalSteps: number;
  text: string;
  status: 'in-progress' | 'success' | 'error' | 'warning';
  progress?: number;
  type?: 'prompt-sent' | 'ai-response';
  content?: string | Record<string, string>;
}

interface Window {
  electronAPI?: {
    minimizeWindow: () => Promise<void>;
    maximizeWindow: () => Promise<void>;
    closeWindow: () => Promise<void>;
    openExternal: (url: string) => Promise<void>;
    executeCommand: (command: string) => Promise<string>;
    spotifyLogin: () => void;
    spotifyLogout: () => Promise<void>;
    spotifyGetTokens: () => Promise<{ accessToken: string | null; refreshToken: string | null; }>;
    spotifyRefreshToken: () => Promise<{ accessToken: string | null; refreshToken: string | null; }>;
    spotifyApi: (options: { endpoint: string; method?: string; body?: any }) => Promise<any>;
    onSpotifyAuthSuccess: (callback: () => void) => void;
    hardwareGetStats: () => Promise<any>;
    getInstalledApps: () => Promise<any[]>;
    selectDirectory: () => Promise<string | null>;
    selectFile: () => Promise<string[] | null>;
    readDirectory: (dirPath: string) => Promise<any[]>;
    openPath: (filePath: string) => Promise<void>;
    systemUptime: () => Promise<number>;
    processList: () => Promise<any[]>;
    getStoreData: () => Promise<any>;
    setStoreData: (data: any) => Promise<boolean>;
    launchApp: (app: any) => Promise<{ success: boolean; error?: string }>;
    searchFilesystem: (query: string) => Promise<any[]>;
    clearStoreData: () => Promise<boolean>;
    // Installer Magic
    installerStart: (softwareName: string) => Promise<void>;
    installerOnStatus: (callback: (status: StatusUpdate) => void) => void;
    installerOnNeedsManual: (callback: () => void) => void;
    installerConfirmComplete: () => Promise<boolean>;
    // Uninstaller Magic
    uninstallerDetect: (softwareName: string) => Promise<void>;
    uninstallerStart: (softwareName: string) => Promise<void>;
    uninstallerOnStatus: (callback: (status: StatusUpdate) => void) => void;
    uninstallerOnNeedsManual: (callback: () => void) => void;
    uninstallerOnDetected: (callback: (software: string) => void) => void;
    uninstallerConfirmComplete: () => Promise<boolean>;
  };
}

