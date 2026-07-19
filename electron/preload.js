"use strict";
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('electronAPI', {
    minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
    maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
    closeWindow: () => ipcRenderer.invoke('close-window'),
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    executeCommand: (command) => ipcRenderer.invoke('execute-command', command),
    // Auto-update API
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    installUpdate: () => ipcRenderer.invoke('install-update'),
    onUpdateChecking: (cb) => ipcRenderer.on('update-checking', cb),
    onUpdateAvailable: (cb) => ipcRenderer.on('update-available', (e, info) => cb(info)),
    onUpdateNotAvailable: (cb) => ipcRenderer.on('update-not-available', (e, info) => cb(info)),
    onUpdateProgress: (cb) => ipcRenderer.on('update-progress', (e, progress) => cb(progress)),
    onUpdateDownloaded: (cb) => ipcRenderer.on('update-downloaded', (e, info) => cb(info)),
    // Store API (persist app state)
        setStoreData: (data) => ipcRenderer.invoke('set-store-data', data),
        getStoreData: async () => {
            const res = await ipcRenderer.invoke('get-store-data');
            // if main returned wrapper { ok, data }, unwrap
            if (res && typeof res === 'object' && 'data' in res) return res.data;
            return res;
        },
        clearStoreData: () => ipcRenderer.invoke('clear-store-data'),
});
