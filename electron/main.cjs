const { app, BrowserWindow, ipcMain, shell, protocol, dialog, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const crypto = require('crypto');
const Store = require('electron-store');
const si = require('systeminformation');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

app.setAppUserModelId('com.guihub.app');

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

// Create electron-store instance for persisting small app state (spotify tokens, prefs)
const store = new Store({ name: 'guihub' });
console.log('electron-store initialized');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { execFile, spawn } = require('child_process');
const os = require('os');

// Load .env manually to avoid dotenvx caching issues
const dotenvPath = path.join(__dirname, '../.env');
console.log('📂 Carregando .env manualmente de:', dotenvPath);
if (fs.existsSync(dotenvPath)) {
  const envContent = fs.readFileSync(dotenvPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
      console.log(`🔧 Definida variável: ${key.trim()}`);
    }
  });
  }

// --- Services ---

// Service 1: OpenRouter API calls using SDK
const { OpenRouter } = require('@openrouter/sdk');
const callOpenRouter = async (systemPrompt, userPrompt) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  console.log('🔑 OpenRouter API Key:', apiKey ? `Carregada (${apiKey.slice(0, 10)}...)` : 'NÃO CARREGADA!');
  if (!apiKey) throw new Error('OpenRouter API key not found');

  const openrouter = new OpenRouter({ apiKey });

  console.log('========================================');
  console.log('📤 ENVIANDO PARA OPENROUTER:');
  console.log('System Prompt:', systemPrompt);
  console.log('User Prompt:', userPrompt);
  console.log('========================================');

  const result = await openrouter.chat.send({
    chatRequest: {
      model: 'openai/gpt-oss-20b:free',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 500
    }
  });

  const aiResponse = result.choices[0].message.content.trim();

  console.log('========================================');
  console.log('📥 RESPOSTA DA OPENROUTER:');
  console.log(aiResponse);
  console.log('========================================');

  return aiResponse;
};

// Service 2: File download with progress
const downloadFile = async (url, destPath, onProgress) => {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const fileStream = fs.createWriteStream(destPath);

    client.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        // Handle redirect
        downloadFile(response.headers.location, destPath, onProgress).then(resolve).catch(reject);
        fileStream.close();
        fs.unlink(destPath, () => {}); // Clean up
        return;
      }

      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloaded = 0;

      response.on('data', (chunk) => {
        downloaded += chunk.length;
        if (onProgress && totalSize) {
          onProgress(Math.round((downloaded / totalSize) * 100));
        }
      });

      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve(destPath);
      });

      fileStream.on('error', (err) => {
        fileStream.close();
        fs.unlink(destPath, () => {}); // Clean up
        reject(err);
      });
    }).on('error', reject);
  });
};

// Service 3: SHA-256 Hash generation
const generateSHA256 = async (filePath) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
};

// Service 4: VirusTotal API
const checkVirusTotal = async (fileHash) => {
  const apiKey = process.env.VIRUSTOTAL_API_KEY;
  if (!apiKey) throw new Error('VirusTotal API key not found');

  const response = await fetch(`https://www.virustotal.com/api/v3/files/${fileHash}`, {
    method: 'GET',
    headers: { 'x-apikey': apiKey },
    signal: AbortSignal.timeout(60000) // 1 min timeout
  });

  if (!response.ok) {
    // If file not found in VirusTotal DB, we'll treat it as "needs analysis" but proceed?
    if (response.status === 404) {
      return { found: false, data: null };
    }
    throw new Error(`VirusTotal error: ${response.status}`);
  }

  const data = await response.json();
  return { found: true, data };
};

// --- Main Installation Orchestrator ---
const startInstallation = async (softwareName, sendStatus) => {
  try {
    // Step 1: Get download URL from OpenRouter
    const systemPrompt1 = 'Você é um assistente que ajuda a encontrar links de download oficiais de softwares para Windows (.exe ou .msi). Responda APENAS com o link direto, sem nenhum texto adicional.';
    sendStatus({ step: 1, totalSteps: 6, text: 'Buscando link de download oficial...', status: 'in-progress' });
    sendStatus({ step: 1, totalSteps: 6, text: '→ Enviando prompt para IA...', status: 'in-progress', type: 'prompt-sent', content: { system: systemPrompt1, user: softwareName } });
    const downloadUrl = await callOpenRouter(systemPrompt1, softwareName);
    sendStatus({ step: 1, totalSteps: 6, text: '← Resposta da IA recebida', status: 'success', type: 'ai-response', content: downloadUrl });
    sendStatus({ step: 1, totalSteps: 6, text: `Link encontrado: ${downloadUrl}`, status: 'success' });

    if (!downloadUrl.startsWith('http')) {
      throw new Error('Link de download inválido');
    }

    // Step 2: Download file
    sendStatus({ step: 2, totalSteps: 6, text: 'Baixando instalador...', status: 'in-progress' });
    const tempDir = path.join(app.getPath('temp'), 'GuiHubInstaller');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const fileName = path.basename(new URL(downloadUrl).pathname) || `${softwareName.replace(/[^a-zA-Z0-9]/g, '_')}.exe`;
    const tempFilePath = path.join(tempDir, fileName);
    currentTempFilePath = tempFilePath;

    await downloadFile(downloadUrl, tempFilePath, (progress) => {
      sendStatus({ step: 2, totalSteps: 6, text: `Baixando... ${progress}%`, status: 'in-progress', progress });
    });
    sendStatus({ step: 2, totalSteps: 6, text: `Arquivo baixado em: ${tempFilePath}`, status: 'success' });

    // Step 3: Generate SHA-256 hash
    sendStatus({ step: 3, totalSteps: 6, text: 'Gerando hash SHA-256 do arquivo...', status: 'in-progress' });
    const fileHash = await generateSHA256(tempFilePath);
    sendStatus({ step: 3, totalSteps: 6, text: `Hash SHA-256: ${fileHash}`, status: 'success' });

    // Step 4: Check VirusTotal and analyze
    sendStatus({ step: 4, totalSteps: 6, text: 'Consultando VirusTotal...', status: 'in-progress' });
    const vtResult = await checkVirusTotal(fileHash);
    sendStatus({ step: 4, totalSteps: 6, text: `VirusTotal: ${vtResult.found ? 'Relatório encontrado' : 'Arquivo não na base de dados'}`, status: 'success' });

    let isSafe = true;
    let justification = '';
    if (vtResult.found) {
      // Create tiny summary instead of sending whole response
      const vtSummary = {
        last_analysis_stats: vtResult.data.data?.attributes?.last_analysis_stats,
        total_votes: vtResult.data.data?.attributes?.total_votes,
        reputation: vtResult.data.data?.attributes?.reputation
      };
      const systemPrompt2 = 'Você é um especialista em segurança cibernética. Analise o resumo do VirusTotal e responda APENAS com um JSON estrito, sem Markdown: {"seguro": boolean, "justificativa": "string"}';
      sendStatus({ step: 4, totalSteps: 6, text: '→ Enviando resumo para análise da IA...', status: 'in-progress', type: 'prompt-sent', content: { system: systemPrompt2, user: JSON.stringify(vtSummary, null, 2) } });
      const securityAnalysis = await callOpenRouter(systemPrompt2, JSON.stringify(vtSummary));
      sendStatus({ step: 4, totalSteps: 6, text: '← Análise da IA recebida', status: 'success', type: 'ai-response', content: securityAnalysis });

      // Parse the JSON (remove any extra characters)
      const cleaned = securityAnalysis.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
      const analysis = JSON.parse(cleaned);
      isSafe = analysis.seguro;
      justification = analysis.justificativa;
      sendStatus({ step: 4, totalSteps: 6, text: `Análise IA: ${isSafe ? 'Arquivo seguro' : 'Arquivo suspeito'}`, status: isSafe ? 'success' : 'error' });
    }

    if (!isSafe) {
      // Delete file
      await fs.promises.unlink(tempFilePath).catch(() => {});
      currentTempFilePath = null;
      throw new Error(`Instalação bloqueada. Arquivo malicioso detectado. ${justification}`);
    }

    // Step 5: Get silent install flag
    const systemPrompt3 = 'Você é um especialista em instalação de softwares no Windows. Responda APENAS com a flag de instalação silenciosa para o programa especificado, sem nenhum texto adicional. Exemplos: /S, /quiet, --silent';
    sendStatus({ step: 5, totalSteps: 6, text: 'Consultando IA para flag de instalação silenciosa...', status: 'in-progress' });
    sendStatus({ step: 5, totalSteps: 6, text: '→ Enviando prompt para IA...', status: 'in-progress', type: 'prompt-sent', content: { system: systemPrompt3, user: softwareName } });
    const silentFlag = await callOpenRouter(systemPrompt3, softwareName);
    sendStatus({ step: 5, totalSteps: 6, text: '← Resposta da IA recebida', status: 'success', type: 'ai-response', content: silentFlag });
    sendStatus({ step: 5, totalSteps: 6, text: `Flag silenciosa: ${silentFlag}`, status: 'success' });

    // Step 6: Try silent install (wrap in Promise for proper waiting)
    sendStatus({ step: 6, totalSteps: 6, text: 'Iniciando instalação silenciosa...', status: 'in-progress' });
    let silentSuccess = false;
    const installPromise = new Promise((resolve) => {
      const installProcess = spawn(tempFilePath, [silentFlag], {
        detached: false,
        stdio: 'ignore'
      });

      const timeout = setTimeout(() => {
        if (!installProcess.killed) installProcess.kill();
        resolve(false);
      }, 60000); // Wait 1 minute instead of 2 for faster feedback

      installProcess.on('close', (code) => {
        clearTimeout(timeout);
        resolve(code === 0);
      });

      installProcess.on('error', () => {
        clearTimeout(timeout);
        resolve(false);
      });
    });

    silentSuccess = await installPromise;

    if (silentSuccess) {
      sendStatus({ step: 6, totalSteps: 6, text: 'Instalação concluída com sucesso!', status: 'success' });
      await fs.promises.unlink(tempFilePath).catch(() => {});
      currentTempFilePath = null;
    } else {
      sendStatus({ step: 6, totalSteps: 6, text: 'Instalação silenciosa falhou, abrindo instalador normal...', status: 'warning' });
      await shell.openPath(tempFilePath);
      if (mainWindow) {
        mainWindow.webContents.send('installer:needs-manual');
      }
    }

  } catch (err) {
    sendStatus({ step: 0, totalSteps: 6, text: `Erro: ${err.message}`, status: 'error' });
    console.error('Installation error:', err);
  }
};

/** @type {BrowserWindow | null} */
let mainWindow = null;
let authWindow = null;
let tray = null;

// Create tray icon
function createTray() {
  // Use a simple icon for now - we can create a native image
  // For now, let's use a placeholder or the app's icon
  // Let's try to use the public/favicon.svg as tray icon
  const iconPath = path.join(__dirname, '../public/favicon.svg');
  // But SVG may not work, so let's create a simple native image or use a built-in one
  // For Windows, let's use a default or create a simple icon
  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  } catch (e) {
    // Fallback to empty icon
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Abrir GuiHub', click: () => { if (mainWindow) mainWindow.show(); } },
    { type: 'separator' },
    { label: 'Sair', click: () => { app.isQuitting = true; app.quit(); } }
  ]);
  
  tray.setToolTip('GuiHub');
  tray.setContextMenu(contextMenu);
  
  // Show/hide main window when clicking tray icon
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
      }
    }
  });
}

// Spotify config
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || 'c7162dab98194a30a7ea9ba933b36e5';
const SPOTIFY_REDIRECT_URI = 'guihub://spotify-callback';
const SPOTIFY_SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'user-read-recently-played'
].join(' ');

function generateRandomString(length) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function base64URLEncode(str) {
  return str.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest();
}

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
      preload: path.join(__dirname, 'preload.cjs'),
    },
    // We'll add an icon once we have one, for now we can skip or use a placeholder
    // icon: path.join(__dirname, '../public/icon.png')
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('Falha ao carregar a interface:', errorCode, errorDescription);
  });

  const loadApp = async () => {
    if (process.env.NODE_ENV === 'development') {
      await mainWindow.loadURL('http://localhost:5173');
      // mainWindow.webContents.openDevTools(); // Descomente se precisar dos dev tools
    } else {
      const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
      const fallbackPath = path.join(__dirname, '..', 'index.html');

      if (fs.existsSync(indexPath)) {
        await mainWindow.loadFile(indexPath);
      } else {
        console.warn('dist/index.html não encontrado, carregando fallback index.html');
        await mainWindow.loadFile(fallbackPath);
      }
    }
  };

  loadApp().catch((err) => {
    console.error('Erro ao carregar a UI do app:', err);
  });

  // Instead of closing, minimize to tray
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.allowPrerelease = false;

  autoUpdater.on('checking-for-update', () => {
    console.log('AutoUpdater: verificando atualizações...');
    if (mainWindow) {
      mainWindow.webContents.send('update-message', { status: 'checking' });
    }
  });

  autoUpdater.on('update-available', (info) => {
    console.log('AutoUpdater: atualização disponível', info);
    if (mainWindow) {
      mainWindow.webContents.send('update-message', { status: 'update-available', info });
    }

    const prefs = store.get('update.preferences', { autoDownload: false });
    if (prefs.autoDownload) {
      autoUpdater.downloadUpdate().catch((err) => {
        console.error('Erro ao iniciar download automático:', err);
        if (mainWindow) {
          mainWindow.webContents.send('update-message', { status: 'error', error: String(err) });
        }
      });
      if (mainWindow) {
        mainWindow.webContents.send('update-message', { status: 'download-started' });
      }
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    console.log('AutoUpdater: nenhuma atualização disponível', info);
    if (mainWindow) {
      mainWindow.webContents.send('update-message', { status: 'update-not-available', info });
    }
  });

  autoUpdater.on('error', (err) => {
    console.error('AutoUpdater error:', err);
    if (mainWindow) {
      mainWindow.webContents.send('update-message', { status: 'error', error: err?.message || String(err) });
    }
  });

  autoUpdater.on('download-progress', (progressObj) => {
    if (mainWindow) {
      mainWindow.webContents.send('update-message', {
        status: 'download-progress',
        progress: progressObj.percent,
        transferred: progressObj.transferred,
        total: progressObj.total
      });
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('AutoUpdater: atualização baixada', info);
    if (mainWindow) {
      mainWindow.webContents.send('update-message', { status: 'update-downloaded', info });
    }
  });
}

function createSpotifyAuthWindow() {
  const codeVerifier = generateRandomString(128);
  const codeChallenge = base64URLEncode(sha256(codeVerifier));
  const state = generateRandomString(16);

  store.set('spotify.codeVerifier', codeVerifier);
  store.set('spotify.state', state);

  const authUrl = new URL('https://accounts.spotify.com/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', SPOTIFY_CLIENT_ID);
  authUrl.searchParams.set('scope', SPOTIFY_SCOPES);
  authUrl.searchParams.set('redirect_uri', SPOTIFY_REDIRECT_URI);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('code_challenge', codeChallenge);

  authWindow = new BrowserWindow({
    width: 800,
    height: 600,
    title: 'Conectar ao Spotify',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  authWindow.loadURL(authUrl.toString());

  authWindow.on('closed', () => {
    authWindow = null;
  });
}

async function exchangeCodeForToken(code) {
  const codeVerifier = store.get('spotify.codeVerifier');
  const tokenUrl = 'https://accounts.spotify.com/api/token';
  
  const params = new URLSearchParams();
  params.set('grant_type', 'authorization_code');
  params.set('code', code);
  params.set('redirect_uri', SPOTIFY_REDIRECT_URI);
  params.set('client_id', SPOTIFY_CLIENT_ID);
  params.set('code_verifier', codeVerifier);

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  const data = await response.json();
  
  if (data.access_token) {
    store.set('spotify.accessToken', data.access_token);
    store.set('spotify.refreshToken', data.refresh_token);
    store.set('spotify.expiresAt', Date.now() + (data.expires_in * 1000));
  }

  return data;
}

async function refreshSpotifyToken() {
  const refreshToken = store.get('spotify.refreshToken');
  if (!refreshToken) return null;

  const params = new URLSearchParams();
  params.set('grant_type', 'refresh_token');
  params.set('refresh_token', refreshToken);
  params.set('client_id', SPOTIFY_CLIENT_ID);

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  const data = await response.json();

  if (data.access_token) {
    store.set('spotify.accessToken', data.access_token);
    store.set('spotify.expiresAt', Date.now() + (data.expires_in * 1000));
    if (data.refresh_token) {
      store.set('spotify.refreshToken', data.refresh_token);
    }
  }

  return data;
}

app.on('ready', () => {
  setupAutoUpdater();

  // Registrar protocolo customizado guihub://
  protocol.registerFileProtocol('guihub', (request, callback) => {
    // Vamos tratar o callback aqui
    const url = new URL(request.url);
    if (url.hostname === 'spotify-callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const storedState = store.get('spotify.state');

      if (code && state && state === storedState) {
        exchangeCodeForToken(code).then(() => {
          if (authWindow) {
            authWindow.close();
          }
          if (mainWindow) {
            mainWindow.webContents.send('spotify-auth-success');
          }
        }).catch(err => {
          console.error('Erro ao trocar código por token:', err);
        });
      }
    }
    callback({ path: path.join(__dirname, '..', 'index.html') });
  });

  createWindow();
  createTray();
});

app.setAsDefaultProtocolClient('guihub');

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

// Tratar abrir links do protocolo (para quando app estiver fechado)
app.on('open-url', (event, url) => {
  event.preventDefault();
  const parsedUrl = new URL(url);
  if (parsedUrl.hostname === 'spotify-callback') {
    const code = parsedUrl.searchParams.get('code');
    const state = parsedUrl.searchParams.get('state');
    const storedState = store.get('spotify.state');
    if (code && state && state === storedState) {
      exchangeCodeForToken(code).then(() => {
        if (authWindow) {
          authWindow.close();
        }
        if (mainWindow) {
          mainWindow.webContents.send('spotify-auth-success');
        }
      }).catch(err => {
        console.error('Erro ao trocar código por token:', err);
      });
    }
  }
});

// IPC Handlers
ipcMain.handle('minimize-window', () => mainWindow?.minimize());
ipcMain.handle('maximize-window', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.handle('close-window', () => mainWindow?.close());

ipcMain.handle('checkForUpdates', async () => {
  if (!app.isPackaged) {
    return { ok: false, error: 'Auto-update só funciona em versão empacotada. Rode a build para testar.' };
  }
  try {
    await autoUpdater.checkForUpdates();
    return { ok: true };
  } catch (err) {
    console.error('Erro ao checar atualizações:', err);
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle('downloadUpdate', async () => {
  if (!app.isPackaged) {
    return { ok: false, error: 'Auto-update só funciona em versão empacotada. Rode a build para testar.' };
  }
  try {
    await autoUpdater.downloadUpdate();
    return { ok: true };
  } catch (err) {
    console.error('Erro ao iniciar download da atualização:', err);
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle('installUpdate', async () => {
  if (!app.isPackaged) {
    return { ok: false, error: 'Auto-update só funciona em versão empacotada. Rode a build para testar.' };
  }
  try {
    autoUpdater.quitAndInstall();
    return { ok: true };
  } catch (err) {
    console.error('Erro ao instalar atualização:', err);
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle('getAppVersion', () => {
  return {
    version: app.getVersion(),
    build: process.env.BUILD_NUMBER || null,
    isPackaged: app.isPackaged
  };
});

ipcMain.handle('isPackaged', () => {
  return app.isPackaged;
});

ipcMain.handle('getUpdatePreferences', async () => {
  try {
    const prefs = store.get('update.preferences', { autoDownload: false });
    return { ok: true, prefs };
  } catch (err) {
    console.error('Erro ao obter preferências de atualização:', err);
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle('setUpdatePreferences', async (_event, prefs) => {
  try {
    const existing = store.get('update.preferences', {});
    const newPrefs = { ...existing, ...prefs };
    store.set('update.preferences', newPrefs);
    return { ok: true, prefs: newPrefs };
  } catch (err) {
    console.error('Erro ao salvar preferências de atualização:', err);
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle('spotify-login', () => {
  createSpotifyAuthWindow();
});

ipcMain.handle('spotify-logout', () => {
  store.delete('spotify.accessToken');
  store.delete('spotify.refreshToken');
  store.delete('spotify.expiresAt');
});

ipcMain.handle('spotify-get-tokens', () => {
  return {
    accessToken: store.get('spotify.accessToken'),
    refreshToken: store.get('spotify.refreshToken'),
    expiresAt: store.get('spotify.expiresAt'),
  };
});

ipcMain.handle('spotify-refresh-token', async () => {
  return refreshSpotifyToken();
});

ipcMain.handle('spotify-api', async (_event, { endpoint, method = 'GET', body }) => {
  let accessToken = store.get('spotify.accessToken');
  const expiresAt = store.get('spotify.expiresAt');

  if (!accessToken) return null;

  // Refresh token se estiver expirado em menos de 1 minuto
  if (expiresAt && Date.now() > (expiresAt - 60000)) {
    await refreshSpotifyToken();
    accessToken = store.get('spotify.accessToken');
  }

  const url = `https://api.spotify.com/v1${endpoint}`;
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`Spotify API error: ${response.status}`);
    if (response.status === 204) return { success: true };
    return await response.json();
  } catch (err) {
    console.error('Spotify API error:', err);
    return null;
  }
});

// Open external links
ipcMain.handle('open-external', async (_event, url) => {
  await shell.openExternal(url);
});

// Execute shell commands (for workspaces, shortcuts)
ipcMain.handle('execute-command', async (_event, command) => {
  const { execFile } = require('child_process');
  return new Promise((resolve, reject) => {
    execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], { windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve(stdout || stderr || '');
      }
    });
  });
});

// Hardware monitoring handlers
// Keep previous network totals to compute deltas between calls
const _prevNetwork = { ts: 0, tx: 0, rx: 0 };

ipcMain.handle('hardware-get-stats', async () => {
  try {
    const [cpuLoad, memLoad, fsSize, networkStats, graphics, cpuInfo, currentLoadFull] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.networkStats(),
      si.graphics().catch(() => null), // Catch GPU errors gracefully
      si.cpu().catch(() => null),
      si.cpu().catch(() => null),
    ]);

    // CPU: Use currentLoad or avgLoad
    let cpu = null;
    let cpuModel = 'CPU não identificada';
    if (cpuInfo?.brand) cpuModel = cpuInfo.brand;

    if (cpuLoad) {
      // Try different properties
      cpu = Math.round(
        cpuLoad.currentLoad || 
        cpuLoad.currentLoadUser || 
        (cpuLoad.cpus && cpuLoad.cpus.length > 0 ? 
          cpuLoad.cpus.reduce((sum, c) => sum + (c.load || 0), 0) / cpuLoad.cpus.length : 
          0)
      );
      if (cpu > 100) cpu = 100;
      if (cpu < 0) cpu = 0;
    }

    // RAM
    let ram = null;
    let ramUsed = '0.0';
    let ramTotal = '0.0';
    if (memLoad && memLoad.total > 0) {
      ram = Math.round((memLoad.used / memLoad.total) * 100);
      ramUsed = (memLoad.used / 1024 / 1024 / 1024).toFixed(1);
      ramTotal = (memLoad.total / 1024 / 1024 / 1024).toFixed(1);
      if (ram > 100) ram = 100;
      if (ram < 0) ram = 0;
    }

    // GPU
    let gpu = null;
    let gpuModel = 'GPU não identificada';
    if (graphics && graphics.controllers && graphics.controllers.length > 0) {
      for (const controller of graphics.controllers) {
        if (controller.model) gpuModel = controller.model;
        if (controller.utilizationGpu !== undefined && controller.utilizationGpu !== null) {
          gpu = Math.round(controller.utilizationGpu);
        } else if (controller.memoryUsed && controller.memoryTotal) {
          // Fallback: use memory usage if utilization not available
          gpu = Math.round((controller.memoryUsed / controller.memoryTotal) * 100);
        }
        if (gpu > 0) break;
      }
      if (gpu > 100) gpu = 100;
      if (gpu < 0) gpu = 0;
    }

    // Additional GPU fallback: try to query nvidia-smi if available (Windows with NVIDIA)
    if (gpu === 0) {
      try {
        const { execSync } = require('child_process');
        const out = execSync('nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits', { stdio: ['ignore', 'pipe', 'ignore'] }).toString();
        const parsed = parseInt(out.split('\n')[0], 10);
        if (!Number.isNaN(parsed)) {
          gpu = Math.max(0, Math.min(100, parsed));
        }
      } catch (e) {
        // ignore if nvidia-smi not present
      }
    }

    // SSD - Find the main disk (usually C:)
    let ssd = null;
    let ssdUsed = null;
    let ssdTotal = null;
    if (fsSize && fsSize.length > 0) {
      let mainDisk = fsSize.find((disk) => {
        const source = `${disk.fs || ''} ${disk.mount || ''}`.toLowerCase();
        return source.includes('c:');
      });
      if (!mainDisk) {
        mainDisk = [...fsSize].sort((a, b) => (b.size || 0) - (a.size || 0))[0];
      }
      if (mainDisk && mainDisk.size > 0) {
        ssd = Math.round((mainDisk.used / mainDisk.size) * 100);
        ssdUsed = (mainDisk.used / 1024 / 1024 / 1024).toFixed(0);
        ssdTotal = (mainDisk.size / 1024 / 1024 / 1024).toFixed(0);
        if (ssd > 100) ssd = 100;
        if (ssd < 0) ssd = 0;
      }
    }

    // Internet - compute bytes/sec by looking at networkStats or using totals delta
    let internetKbs = null;
    let internetMbs = null;
    let netUpKbs = null;
    let netDownKbs = null;
    let netUpMbs = null;
    let netDownMbs = null;

    try {
      let totalTx = 0;
      let totalRx = 0;

      if (networkStats && networkStats.length > 0) {
        for (const iface of networkStats) {
          if (!iface) continue;
          // prefer tx_sec/rx_sec if provided
          if (typeof iface.tx_sec === 'number' && typeof iface.rx_sec === 'number') {
            totalTx += iface.tx_sec;
            totalRx += iface.rx_sec;
          } else if (typeof iface.tx === 'number' && typeof iface.rx === 'number') {
            totalTx += iface.tx;
            totalRx += iface.rx;
          }
        }
      }

      const now = Date.now();
      if (totalTx === 0 && totalRx === 0) {
        // fallback: try networkStats per-interface to get rx_sec/tx_sec
        const ifaces = await si.networkInterfaces();
        for (const iface of ifaces) {
          if (!iface || iface.internal) continue;
          try {
            const stats = await si.networkStats(iface.iface);
            if (stats && stats.length > 0) {
              totalTx += stats[0].tx_sec || 0;
              totalRx += stats[0].rx_sec || 0;
            }
          } catch (e) {
            // ignore
          }
        }
      }

      if (totalTx > 0 || totalRx > 0) {
        // totalTx/totalRx are bytes/sec already, aggregate
        const upBps = totalTx;
        const downBps = totalRx;
        const totalBps = upBps + downBps;

        internetKbs = Math.round(totalBps / 1024);
        internetMbs = (totalBps / 1024 / 1024).toFixed(1);
        netUpKbs = Math.round(upBps / 1024);
        netDownKbs = Math.round(downBps / 1024);
        netUpMbs = (upBps / 1024 / 1024).toFixed(1);
        netDownMbs = (downBps / 1024 / 1024).toFixed(1);
      } else {
        // If we couldn't get instant rates, try to compute delta from cumulative rx/tx
        const statsAll = await si.networkStats();
        if (statsAll && statsAll.length > 0) {
          const sumRx = statsAll.reduce((acc, s) => acc + (s.rx || 0), 0);
          const sumTx = statsAll.reduce((acc, s) => acc + (s.tx || 0), 0);
          const prev = _prevNetwork;
          if (prev.ts && now > prev.ts) {
            const dt = (now - prev.ts) / 1000; // seconds
            const deltaTx = Math.max(0, sumTx - prev.tx);
            const deltaRx = Math.max(0, sumRx - prev.rx);
            const upBps = deltaTx / dt;
            const downBps = deltaRx / dt;
            const totalBps = upBps + downBps;

            internetKbs = Math.round(totalBps / 1024);
            internetMbs = (totalBps / 1024 / 1024).toFixed(1);
            netUpKbs = Math.round(upBps / 1024);
            netDownKbs = Math.round(downBps / 1024);
            netUpMbs = (upBps / 1024 / 1024).toFixed(1);
            netDownMbs = (downBps / 1024 / 1024).toFixed(1);
          }
          // store for next call
          _prevNetwork.ts = now;
          _prevNetwork.tx = sumTx;
          _prevNetwork.rx = sumRx;
        }
      }
    } catch (e) {
      console.error('Erro calculando estatísticas de rede:', e);
    }

    return { 
      cpu, 
      ram, 
      gpu, 
      ssd, 
      internetKbs, 
      internetMbs,
      cpuModel, 
      ramUsed, 
      ramTotal, 
      gpuModel, 
      ssdUsed, 
      ssdTotal, 
      netUpKbs, 
      netDownKbs,
      netUpMbs,
      netDownMbs 
    };
  } catch (err) {
    console.error('Erro ao obter stats do hardware:', err);
    return { 
      cpu: null, 
      ram: null, 
      gpu: null, 
      ssd: null, 
      internetKbs: null, 
      internetMbs: null,
      cpuModel: 'CPU não identificada', 
      ramUsed: null, 
      ramTotal: null, 
      gpuModel: 'GPU não identificada', 
      ssdUsed: null, 
      ssdTotal: null, 
      netUpKbs: null, 
      netDownKbs: null,
      netUpMbs: null,
      netDownMbs: null 
    };
  }
});

// Get installed apps (Windows specific - from Start Menu and Desktop)
ipcMain.handle('get-installed-apps', async () => {
  try {
    const apps = [];
    const paths = [];
    
    // Add appData path
    try {
      paths.push(path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs'));
    } catch (e) { /* Ignore */ }
    
    // Add commonAppData path
    try {
      paths.push(path.join(app.getPath('commonAppData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs'));
    } catch (e) {
      if (process.env.ProgramData) {
        paths.push(path.join(process.env.ProgramData, 'Microsoft', 'Windows', 'Start Menu', 'Programs'));
      }
    }
    
    // Add desktop path
    try {
      paths.push(app.getPath('desktop'));
    } catch (e) { /* Ignore */ }

    // Add more common program directories
    if (process.env.LOCALAPPDATA) {
      paths.push(path.join(process.env.LOCALAPPDATA, 'Programs'));
    }
    if (process.env.ProgramFiles) {
      paths.push(process.env.ProgramFiles);
    }
    if (process.env['ProgramFiles(x86)']) {
      paths.push(process.env['ProgramFiles(x86)']);
    }

    // Common app names we want to include from deeper directories
    const commonAppNames = new Set([
      'chrome', 'firefox', 'edge', 'code', 'spotify', 'discord', 'steam',
      'notepad++', 'vlc', 'photoshop', 'illustrator', 'premiere', 'after effects',
      'obs', 'slack', 'teams', 'zoom', 'skype', 'telegram', 'whatsapp', 'discord',
      'epic games', 'origin', 'uplay', 'battle.net', 'riot client', 'valorant',
      'league of legends', 'fortnite', 'minecraft', 'roblox'
    ]);

    // Blacklist of system/background process names to exclude
    const blacklistNames = new Set([
      'dlpuseragent', 'dfrgui', 'system', 'svchost', 'explorer', 'taskmgr',
      'services', 'lsass', 'csrss', 'wininit', 'winlogon', 'dwm', 'fontdrvhost',
      'sihost', 'taskhostw', 'rundll32', 'mshta', 'conhost', 'wscript', 'cscript',
      'regsvr32', 'cmd', 'powershell', 'pwsh', 'pythonw', 'node', 'java',
      'javaw', 'jqs', 'jusched', 'googleupdate', 'dropboxupdate', 'onedrive',
      'steamwebhelper', 'discordptb', 'discordcanary', 'chrome', 'firefox',
      'edge', 'code', 'spotify', 'discord', 'steam' // Exclude duplicates from webhelper/ptb/etc
    ]);

    // Function to clean app names
    const cleanAppName = (name) => {
      let cleaned = name
        .replace(/\.(lnk|url|exe)$/i, '')
        .replace(/\s+\d+(\.\d+)*$/g, '') // Remove trailing versions like "App 1.2.3"
        .replace(/\s+\((x86|x64|64-bit|32-bit)\)$/i, '') // Remove architecture suffix
        .replace(/\s+\(.*?\)$/g, '') // Remove parenthetical suffixes
        .trim();
      
      // Capitalize first letter of each word
      cleaned = cleaned.replace(/\w\S*/g, (txt) => 
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
      );
      
      return cleaned;
    };

    const scanDirectory = async (dir, depth = 0) => {
      if (depth > 3) return; // Limit depth for performance
      try {
        const files = await fs.promises.readdir(dir, { withFileTypes: true });
        for (const file of files) {
          const fullPath = path.join(dir, file.name);
          if (file.isDirectory()) {
            await scanDirectory(fullPath, depth + 1);
          } else if (file.name.endsWith('.lnk') || file.name.endsWith('.url')) {
            const baseName = file.name.replace(/\.(lnk|url)$/i, '').toLowerCase();
            if (!blacklistNames.has(baseName)) {
              apps.push({
                id: `app-${fullPath}`,
                name: cleanAppName(file.name),
                path: fullPath,
                type: file.name.endsWith('.lnk') ? 'app' : 'url',
              });
            }
          } else if (file.name.endsWith('.exe')) {
            // Include .exe if it's in top-level OR it's a common app name
            const baseName = file.name.replace('.exe', '').toLowerCase();
            if ((depth <= 1 || commonAppNames.has(baseName)) && !blacklistNames.has(baseName)) {
              apps.push({
                id: `app-${fullPath}`,
                name: cleanAppName(file.name),
                path: fullPath,
                type: 'app',
              });
            }
          }
        }
      } catch (err) {
        if (err && (err.code === 'EPERM' || err.code === 'EACCES' || err.code === 'ENOENT')) {
          return;
        }
        console.error(`Erro ao escanear diretório ${dir}:`, err);
      }
    };

    for (const p of paths) {
      await scanDirectory(p);
    }

    // Deduplicate by name (case-insensitive) and path
    const nameMap = new Map();
    const pathMap = new Map();
    for (const app of apps) {
      const lowerName = app.name.toLowerCase();
      const lowerPath = app.path.toLowerCase();
      if (!nameMap.has(lowerName) && !pathMap.has(lowerPath)) {
        nameMap.set(lowerName, app);
        pathMap.set(lowerPath, app);
      }
    }
    const uniqueApps = Array.from(nameMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    return uniqueApps;
  } catch (err) {
    console.error('Erro ao obter apps instalados:', err);
    return [];
  }
});

// File system handlers
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths;
  }
  return null;
});

ipcMain.handle('read-directory', async (_event, dirPath) => {
  try {
    const files = await fs.promises.readdir(dirPath, { withFileTypes: true });
    return files.map(file => ({
      name: file.name,
      isDirectory: file.isDirectory(),
      path: path.join(dirPath, file.name),
    }));
  } catch (err) {
    console.error('Erro ao ler diretório:', err);
    return [];
  }
});

ipcMain.handle('open-path', async (_event, filePath) => {
  await shell.openPath(filePath);
});

// System stats for Estatísticas page
ipcMain.handle('system-uptime', async () => {
  try {
    const osInfo = await si.osInfo();
    const uptimeSeconds = osInfo.uptime || 0;
    return uptimeSeconds;
  } catch (err) {
    console.error('Erro ao obter uptime:', err);
    return 0;
  }
});

ipcMain.handle('process-list', async () => {
  try {
    const processes = await si.processes();
    return processes.list || [];
  } catch (err) {
    console.error('Erro ao obter lista de processos:', err);
    return [];
  }
});

// Store data
ipcMain.handle('getStoreData', async () => {
  try {
    const data = store.get('appData') || null;
    console.log('getStoreData returning:', data);
    return { ok: true, data };
  } catch (err) {
    console.error('Erro ao obter dados do store:', err);
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle('setStoreData', async (_event, data) => {
  try {
    console.log('setStoreData received:', data);
    store.set('appData', data);
    return { ok: true };
  } catch (err) {
    console.error('Erro ao salvar dados no store:', err);
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle('clearStoreData', async () => {
  try {
    store.delete('appData');
    console.log('Store cleared');
    return { ok: true };
  } catch (err) {
    console.error('Erro ao limpar store:', err);
    return { ok: false, error: String(err) };
  }
});

// Launch app or open url
ipcMain.handle('launch-app', async (_, app) => {
  try {
    if (app.type === 'url') {
      await shell.openExternal(app.path);
    } else {
      // For .lnk files, use shell.openPath
      await shell.openPath(app.path);
    }
    return { success: true };
  } catch (err) {
    console.error('Erro ao abrir app:', err);
    return { success: false, error: err.message };
  }
});

// Search filesystem
ipcMain.handle('search-filesystem', async (_, query) => {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const searchResults = [];
  const searchPaths = [];

  try {
    searchPaths.push(app.getPath('desktop'));
  } catch (e) { /* ignore */ }
  try {
    searchPaths.push(app.getPath('documents'));
  } catch (e) { /* ignore */ }
  try {
    searchPaths.push(app.getPath('downloads'));
  } catch (e) { /* ignore */ }
  try {
    searchPaths.push(app.getPath('pictures'));
  } catch (e) { /* ignore */ }
  try {
    searchPaths.push(app.getPath('videos'));
  } catch (e) { /* ignore */ }
  try {
    searchPaths.push(app.getPath('music'));
  } catch (e) { /* ignore */ }
  if (process.env.USERPROFILE) {
    searchPaths.push(process.env.USERPROFILE);
  }

  const searchDir = async (dir, depth = 0) => {
    if (depth > 3) return; // Increase depth for better results
    try {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const nameLower = entry.name.toLowerCase();
        const queryLower = query.toLowerCase();

        if (nameLower.includes(queryLower)) {
          searchResults.push({
            id: `file-${fullPath}`,
            type: entry.isDirectory() ? 'folder' : 'file',
            name: entry.name,
            path: fullPath,
            description: entry.isDirectory() ? 'Pasta' : 'Arquivo',
          });
        }

        if (entry.isDirectory() && depth < 3) {
          await searchDir(fullPath, depth + 1);
        }
      }
    } catch (err) {
      if (err && (err.code === 'EPERM' || err.code === 'EACCES' || err.code === 'ENOENT')) {
        return;
      }
      console.error('Erro ao buscar no diretório', dir, err);
    }
  };

  for (const searchPath of searchPaths) {
    await searchDir(searchPath, 0);
  }

  // Limit to first 100 results
  return searchResults.slice(0, 100);
});

// --- Installer Magic IPC ---
ipcMain.handle('installer:start', async (event, softwareName) => {
  if (!softwareName) {
    throw new Error('Nome do software não informado');
  }

  // We'll use IPC events to send status updates
  startInstallation(softwareName, (status) => {
    if (mainWindow) {
      mainWindow.webContents.send('installer:status', status);
    }
  });
});

// IPC to confirm manual installation is complete
ipcMain.handle('installer:confirmComplete', async () => {
  // Clean up the temp file
  if (currentTempFilePath && fs.existsSync(currentTempFilePath)) {
    await fs.promises.unlink(currentTempFilePath).catch(() => {});
  }
  currentTempFilePath = null;
  return true;
});

// --- Uninstaller Magic Functions ---
const getInstalledPrograms = async () => {
  return new Promise((resolve) => {
    try {
      const { execSync } = require('child_process');
      // Use PowerShell to get installed programs with display names
      const command = `Get-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | Where-Object { $_.DisplayName -ne $null } | Select-Object DisplayName, UninstallString | ConvertTo-Json`;
      
      const result = execSync(`powershell -Command "${command}"`, { 
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024 
      });
      
      let programs = [];
      try {
        const parsed = JSON.parse(result);
        programs = Array.isArray(parsed) ? parsed : [parsed];
      } catch (e) {
        programs = [];
      }
      
      // Filter and format
      const installedPrograms = programs
        .filter(p => p.DisplayName && p.UninstallString)
        .map(p => ({
          name: p.DisplayName,
          uninstallString: p.UninstallString
        }))
        .slice(0, 100); // Limit to 100 programs
      
      resolve(installedPrograms);
    } catch (err) {
      console.error('Error getting installed programs:', err);
      resolve([]);
    }
  });
};

const startUninstallation = async (detectedSoftwareName, sendStatus) => {
  try {
    sendStatus({ step: 1, totalSteps: 5, text: 'Preparando desinstalação...', status: 'in-progress' });
    
    // Get installed programs
    const installedPrograms = await getInstalledPrograms();
    console.log('Installed programs:', installedPrograms.length);
    
    // Find the exact match
    const program = installedPrograms.find(p => 
      p.name.toLowerCase() === detectedSoftwareName.toLowerCase()
    );
    
    if (!program) {
      throw new Error(`Programa não encontrado: ${detectedSoftwareName}`);
    }
    
    sendStatus({ step: 2, totalSteps: 5, text: `Programa encontrado: ${program.name}`, status: 'success' });
    
    // Get silent uninstall flag from IA
    const systemPrompt = 'Você é um especialista em desinstalação de softwares no Windows. Responda APENAS com a flag de desinstalação silenciosa para o programa especificado, sem nenhum texto adicional. Exemplos: /S, /quiet, --silent, -uninstall /S';
    sendStatus({ step: 3, totalSteps: 5, text: 'Consultando IA para flag de desinstalação silenciosa...', status: 'in-progress' });
    sendStatus({ step: 3, totalSteps: 5, text: '→ Enviando prompt para IA...', status: 'in-progress', type: 'prompt-sent', content: { system: systemPrompt, user: detectedSoftwareName } });
    
    const silentFlag = await callOpenRouter(systemPrompt, detectedSoftwareName);
    sendStatus({ step: 3, totalSteps: 5, text: '← Resposta da IA recebida', status: 'success', type: 'ai-response', content: silentFlag });
    sendStatus({ step: 3, totalSteps: 5, text: `Flag silenciosa: ${silentFlag}`, status: 'success' });
    
    // Step 4: Extract uninstall command and try silent uninstall
    sendStatus({ step: 4, totalSteps: 5, text: 'Iniciando desinstalação silenciosa...', status: 'in-progress' });
    
    let silentSuccess = false;
    const uninstallString = program.uninstallString;
    
    // Parse uninstall string (e.g., "C:\Program Files\...\uninstall.exe /S" or "msiexec.exe /x {GUID} /quiet")
    const uninstallPromise = new Promise((resolve) => {
      try {
        let command = uninstallString;
        let args = [];
        
        // If it contains msiexec, we need special handling
        if (uninstallString.toLowerCase().includes('msiexec')) {
          command = 'msiexec.exe';
          args = ['/x', extractGUID(uninstallString) || uninstallString, '/quiet'];
        } else {
          // Try to extract executable and arguments
          const match = uninstallString.match(/^"([^"]+)"(.*)$/) || uninstallString.match(/^(\S+)(.*)$/);
          if (match) {
            command = match[1];
            const argString = (match[2] || '').trim();
            if (argString) {
              args.push(argString, silentFlag);
            } else {
              args.push(silentFlag);
            }
          }
        }
        
        console.log('Uninstall command:', command);
        console.log('Uninstall args:', args);
        
        const uninstallProcess = spawn(command, args, {
          detached: false,
          stdio: 'ignore'
        });
        
        const timeout = setTimeout(() => {
          if (!uninstallProcess.killed) uninstallProcess.kill();
          resolve(false);
        }, 60000); // Wait 1 minute
        
        uninstallProcess.on('close', (code) => {
          clearTimeout(timeout);
          resolve(code === 0 || code === null); // Some installers return null on success
        });
        
        uninstallProcess.on('error', (err) => {
          console.error('Uninstall process error:', err);
          clearTimeout(timeout);
          resolve(false);
        });
      } catch (err) {
        console.error('Error starting uninstall:', err);
        resolve(false);
      }
    });
    
    silentSuccess = await uninstallPromise;
    
    if (silentSuccess) {
      sendStatus({ step: 5, totalSteps: 5, text: 'Desinstalação concluída com sucesso!', status: 'success' });
    } else {
      sendStatus({ step: 5, totalSteps: 5, text: 'Desinstalação silenciosa falhou, abrindo desinstalador normal...', status: 'warning' });
      
      // Try to open the uninstaller directly
      try {
        let uninstallerPath = uninstallString;
        
        // Extract path if it has quotes or arguments
        if (uninstallString.includes('"')) {
          const match = uninstallString.match(/^"([^"]+)"/);
          uninstallerPath = match ? match[1] : uninstallString;
        } else {
          // Get first part before any arguments
          const parts = uninstallString.split(' ');
          uninstallerPath = parts[0];
        }
        
        console.log('Opening uninstaller:', uninstallerPath);
        
        // Check if it's msiexec or a regular exe
        if (uninstallString.toLowerCase().includes('msiexec')) {
          // For MSI, we need to execute the full command
          const { exec } = require('child_process');
          exec(uninstallString, (err) => {
            if (err) {
              console.error('Error executing msiexec:', err);
            }
          });
        } else {
          // For regular exe, try to open it
          await shell.openPath(uninstallerPath);
        }
      } catch (err) {
        console.error('Error opening uninstaller:', err);
        // Last resort: try to execute the full string
        try {
          const { exec } = require('child_process');
          exec(uninstallString, (error) => {
            if (error) {
              console.error('Error executing uninstall string:', error);
            }
          });
        } catch (e) {
          console.error('Fatal error trying to open uninstaller:', e);
        }
      }
      
      if (mainWindow) {
        mainWindow.webContents.send('uninstaller:needs-manual');
      }
    }
    
  } catch (err) {
    sendStatus({ step: 0, totalSteps: 5, text: `Erro: ${err.message}`, status: 'error' });
    console.error('Uninstallation error:', err);
  }
};

// Helper function to extract GUID from uninstall string
const extractGUID = (str) => {
  const guidMatch = str.match(/\{[A-F0-9\-]{36}\}/i);
  return guidMatch ? guidMatch[0] : null;
};

// --- Uninstaller Magic IPC ---
// --- Uninstaller Magic IPC ---
ipcMain.handle('uninstaller:detect', async (event, softwareName) => {
  if (!softwareName) {
    throw new Error('Nome do software não informado');
  }

  try {
    // Step 1: Get installed programs
    if (mainWindow) {
      mainWindow.webContents.send('uninstaller:status', {
        step: 1,
        totalSteps: 4,
        text: 'Obtendo lista de programas instalados...',
        status: 'in-progress'
      });
    }

    const installedPrograms = await getInstalledPrograms();
    console.log(`Found ${installedPrograms.length} installed programs`);

    if (mainWindow) {
      mainWindow.webContents.send('uninstaller:status', {
        step: 1,
        totalSteps: 4,
        text: `${installedPrograms.length} programas encontrados`,
        status: 'success'
      });
    }

    // Step 2: Use IA to detect which program matches
    const programList = installedPrograms.map(p => p.name).join('\n');

    const systemPromptForIA = 'Você é um assistente que identifica programas instalados no Windows. Responda APENAS com o nome exato do programa encontrado na lista, sem nenhum texto adicional.';
    const userPrompt = `Programa procurado: "${softwareName}"\n\nProgramas disponíveis:\n${programList}`;

    if (mainWindow) {
      mainWindow.webContents.send('uninstaller:status', {
        step: 2,
        totalSteps: 4,
        text: '→ Enviando prompt para IA...',
        status: 'in-progress',
        type: 'prompt-sent',
        content: {
          system: systemPromptForIA,
          user: userPrompt
        }
      });
    }

    const detected = await callOpenRouter(systemPromptForIA, userPrompt);
    
    if (mainWindow) {
      mainWindow.webContents.send('uninstaller:status', {
        step: 2,
        totalSteps: 4,
        text: '← Resposta da IA recebida',
        status: 'success',
        type: 'ai-response',
        content: detected
      });
    }

    console.log('Detected software:', detected);

    // Step 3: Validate that the detected software is in the list
    if (mainWindow) {
      mainWindow.webContents.send('uninstaller:status', {
        step: 3,
        totalSteps: 4,
        text: `Validando: ${detected}`,
        status: 'in-progress'
      });
    }

    const isValid = installedPrograms.some(p => p.name.toLowerCase() === detected.toLowerCase());
    
    if (!isValid) {
      throw new Error('Programa não encontrado na lista de programas instalados');
    }

    if (mainWindow) {
      mainWindow.webContents.send('uninstaller:status', {
        step: 3,
        totalSteps: 4,
        text: `Programa validado: ${detected}`,
        status: 'success'
      });
    }

    // Step 4: Send detection result
    if (mainWindow) {
      mainWindow.webContents.send('uninstaller:status', {
        step: 4,
        totalSteps: 4,
        text: `Pronto para desinstalar: ${detected}`,
        status: 'success'
      });

      mainWindow.webContents.send('uninstaller:detected', detected);
    }

    // Also return the value
    return detected;
  } catch (err) {
    console.error('Detect error:', err);
    if (mainWindow) {
      mainWindow.webContents.send('uninstaller:status', {
        step: 0,
        totalSteps: 4,
        text: `Erro: ${err.message}`,
        status: 'error'
      });
    }
    throw err;
  }
});

ipcMain.handle('uninstaller:start', async (event, softwareName) => {
  if (!softwareName) {
    throw new Error('Nome do software não informado');
  }

  // We'll use IPC events to send status updates
  startUninstallation(softwareName, (status) => {
    if (mainWindow) {
      mainWindow.webContents.send('uninstaller:status', status);
    }
  });
});

// IPC to confirm manual uninstallation is complete
ipcMain.handle('uninstaller:confirmComplete', async () => {
  return true;
});
