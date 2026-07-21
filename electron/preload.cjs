const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  executeCommand: (command) => ipcRenderer.invoke('execute-command', command),
  spotifyLogin: () => ipcRenderer.invoke('spotify-login'),
  spotifyLogout: () => ipcRenderer.invoke('spotify-logout'),
  spotifyGetTokens: () => ipcRenderer.invoke('spotify-get-tokens'),
  spotifyRefreshToken: () => ipcRenderer.invoke('spotify-refresh-token'),
  spotifyApi: (options) => ipcRenderer.invoke('spotify-api', options),
  onSpotifyAuthSuccess: (callback) => ipcRenderer.on('spotify-auth-success', callback),
  hardwareGetStats: () => ipcRenderer.invoke('hardware-get-stats'),
  getInstalledApps: () => ipcRenderer.invoke('get-installed-apps'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  selectFile: () => ipcRenderer.invoke('select-file'),
  readDirectory: (dirPath) => ipcRenderer.invoke('read-directory', dirPath),
  openPath: (filePath) => ipcRenderer.invoke('open-path', filePath),
  systemUptime: () => ipcRenderer.invoke('system-uptime'),
  processList: () => ipcRenderer.invoke('process-list'),
  getStoreData: async () => {
    const res = await ipcRenderer.invoke('getStoreData');
    if (res && typeof res === 'object' && 'data' in res) return res.data;
    return res;
  },
  setStoreData: (data) => ipcRenderer.invoke('setStoreData', data),
  clearStoreData: () => ipcRenderer.invoke('clearStoreData'),
  openRouterChat: async ({ systemPrompt, userPrompt }) => ipcRenderer.invoke('openRouterChat', { systemPrompt, userPrompt }),
  launchApp: (app) => ipcRenderer.invoke('launch-app', app),
  searchFilesystem: (query) => ipcRenderer.invoke('search-filesystem', query),
  clearStoreData: () => ipcRenderer.invoke('clearStoreData'),
  checkForUpdates: () => ipcRenderer.invoke('checkForUpdates'),
  downloadUpdate: () => ipcRenderer.invoke('downloadUpdate'),
  installUpdate: () => ipcRenderer.invoke('installUpdate'),
  getUpdatePreferences: () => ipcRenderer.invoke('getUpdatePreferences'),
  setUpdatePreferences: (prefs) => ipcRenderer.invoke('setUpdatePreferences', prefs),
  getAppVersion: () => ipcRenderer.invoke('getAppVersion'),
  isPackaged: () => ipcRenderer.invoke('isPackaged'),
  onUpdateMessage: (callback) => ipcRenderer.on('update-message', (_event, status) => callback(status)),
  // Installer Magic
  installerStart: (softwareName) => ipcRenderer.invoke('installer:start', softwareName),
  installerOnStatus: (callback) => ipcRenderer.on('installer:status', (event, status) => callback(status)),
  installerOnNeedsManual: (callback) => ipcRenderer.on('installer:needs-manual', callback),
  installerConfirmComplete: () => ipcRenderer.invoke('installer:confirmComplete'),
  // Uninstaller Magic
  uninstallerDetect: (softwareName) => ipcRenderer.invoke('uninstaller:detect', softwareName),
  uninstallerStart: (softwareName) => ipcRenderer.invoke('uninstaller:start', softwareName),
  uninstallerOnStatus: (callback) => ipcRenderer.on('uninstaller:status', (event, status) => callback(status)),
  uninstallerOnNeedsManual: (callback) => ipcRenderer.on('uninstaller:needs-manual', callback),
  uninstallerOnDetected: (callback) => ipcRenderer.on('uninstaller:detected', (event, software) => callback(software)),
  uninstallerConfirmComplete: () => ipcRenderer.invoke('uninstaller:confirmComplete'),
});
