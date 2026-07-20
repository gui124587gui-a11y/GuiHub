"use strict";
const { app, BrowserWindow, ipcMain, shell } = require('electron');
// electron-store for persisting app state
let Store;
try {
    Store = require('electron-store');
} catch (err) {
    console.warn('electron-store not available. Persistent store disabled.');
}
// Auto-updater (electron-updater)
let autoUpdater;
try {
    // require at runtime; project must install `electron-updater`
    ({ autoUpdater } = require('electron-updater'));
} catch (err) {
    console.warn('electron-updater not available. Auto-update disabled.');
}
const path = require('path');
let mainWindow = null;
// hardware monitor (started after window is created)
let hardwareMonitor;
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        frame: false,
        transparent: true,
        backgroundColor: '#0f172a',
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
        mainWindow?.focus();
    });

    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    }
    else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    try {
        hardwareMonitor = require(path.join(__dirname, 'hardwareMonitor'));
        if (hardwareMonitor && typeof hardwareMonitor.startHardwareMonitor === 'function') {
            hardwareMonitor.startHardwareMonitor(mainWindow);
        }
    } catch (err) {
        console.warn('Failed to start hardware monitor:', err);
    }
}
app.on('ready', createWindow);
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
// IPC Handlers
ipcMain.handle('minimize-window', () => mainWindow?.minimize());
ipcMain.handle('maximize-window', () => {
    if (mainWindow?.isMaximized()) {
        mainWindow.unmaximize();
    }
    else {
        mainWindow?.maximize();
    }
});
ipcMain.handle('close-window', () => mainWindow?.close());
// Open external links
ipcMain.handle('open-external', async (event, url) => {
    await shell.openExternal(url);
});
// Execute shell commands (for workspaces, shortcuts)
ipcMain.handle('execute-command', async (event, command) => {
    const { exec } = require('child_process');
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            }
            else {
                resolve(stdout);
            }
        });
    });
});

// Provide latest hardware snapshot on-demand
ipcMain.handle('hardware-get-stats', async () => {
    try {
        if (hardwareMonitor && typeof hardwareMonitor.getLatestStats === 'function') {
            return hardwareMonitor.getLatestStats();
        }
        return null;
    } catch (error) {
        return null;
    }
});

// Auto-update handlers (if available)
if (autoUpdater) {
    autoUpdater.autoDownload = true;

    ipcMain.handle('check-for-updates', async () => {
        try {
            await autoUpdater.checkForUpdates();
            return { ok: true };
        } catch (error) {
            return { ok: false, error: String(error) };
        }
    });

    ipcMain.handle('install-update', async () => {
        try {
            autoUpdater.quitAndInstall();
            return { ok: true };
        } catch (error) {
            return { ok: false, error: String(error) };
        }
    });

    autoUpdater.on('checking-for-update', () => mainWindow?.webContents.send('update-checking'));
    autoUpdater.on('update-available', (info) => mainWindow?.webContents.send('update-available', info));
    autoUpdater.on('update-not-available', (info) => mainWindow?.webContents.send('update-not-available', info));
    autoUpdater.on('download-progress', (progress) => mainWindow?.webContents.send('update-progress', progress));
    autoUpdater.on('update-downloaded', (info) => mainWindow?.webContents.send('update-downloaded', info));
}

// Store IPC handlers (persist app state from renderer)
if (Store) {
    const store = new Store();

    ipcMain.handle('set-store-data', async (event, data) => {
        try {
            store.set('appState', data);
            return { ok: true };
        } catch (error) {
            return { ok: false, error: String(error) };
        }
    });

    ipcMain.handle('get-store-data', async () => {
        try {
            const data = store.get('appState');
            return { ok: true, data };
        } catch (error) {
            return { ok: false, error: String(error) };
        }
    });

    ipcMain.handle('clear-store-data', async () => {
        try {
            store.delete('appState');
            return { ok: true };
        } catch (error) {
            return { ok: false, error: String(error) };
        }
    });
}
