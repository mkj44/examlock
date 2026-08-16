import { app, BrowserWindow, ipcMain, globalShortcut, screen, dialog, webContents } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { MongoClient } from 'mongodb';
import { ExamConfig, SecurityEvent, SessionReport, SystemInfo } from '../types/examlock';

let mainWindow: BrowserWindow | null = null;
let currentConfig: ExamConfig | null = null;
let activeSessionDir: string | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: 'ExamLock - Proctored Kiosk Environment',
    backgroundColor: '#0F1115',
    show: false,
    frame: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      sandbox: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Load renderer index.html or Vite dev server URL
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Window Focus / Blur tracking for security proctoring
  mainWindow.on('blur', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('on-window-blur');
    }
  });

  mainWindow.on('focus', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('on-window-focus');
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Prevent default devtools shortcut in main app window if kiosk active
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (currentConfig) {
      if (input.key === 'F12' || (input.control && input.shift && input.key.toUpperCase() === 'I') || (input.meta && input.alt && input.key.toUpperCase() === 'I')) {
        event.preventDefault();
        mainWindow?.webContents.send('on-shortcut-attempt', 'DevTools (F12/Ctrl+Shift+I)');
      }
    }
  });
}

// Global shortcut registration for kiosk lockdown
function registerKioskShortcuts() {
  const isMac = process.platform === 'darwin';

  const shortcutsToBlock = isMac ? [
    'Command+Tab',
    'Command+Alt+Esc',
    'Command+Q',
    'Command+W',
    'Command+N',
    'Command+T',
    'F12',
    'Command+Shift+3',
    'Command+Shift+4',
    'Command+Shift+4'
  ] : [
    'Alt+Tab',
    'Alt+F4',
    'Control+Alt+Delete',
    'Control+Shift+Escape',
    'Control+N',
    'Control+T',
    'Control+W',
    'F12',
    'Control+Shift+I'
  ];

  shortcutsToBlock.forEach(shortcut => {
    try {
      globalShortcut.register(shortcut, () => {
        mainWindow?.webContents.send('on-shortcut-attempt', shortcut);
      });
    } catch (e) {
      // Some system shortcuts cannot be overridden directly on OS level without root/accessibility, but registered attempts fire
    }
  });

  // Emergency Admin Exit Shortcut: Ctrl+Shift+Alt+E (Cmd+Shift+Option+E on Mac)
  const exitShortcut = isMac ? 'Command+Shift+Option+E' : 'Control+Shift+Alt+E';
  globalShortcut.register(exitShortcut, () => {
    if (mainWindow) {
      mainWindow.setKiosk(false);
      mainWindow.setFullScreen(false);
      mainWindow.setAlwaysOnTop(false);
      mainWindow.webContents.send('on-emergency-exit');
    }
  });
}

function unregisterKioskShortcuts() {
  globalShortcut.unregisterAll();
}


// Configure Webview Security Interception
app.on('web-contents-created', (event, contents) => {
  if (contents.getType() === 'webview') {
    // Prevent devtools opening in webview
    contents.on('devtools-opened', () => {
      contents.closeDevTools();
      mainWindow?.webContents.send('on-shortcut-attempt', 'Webview DevTools');
    });

    // Intercept popups / new window attempts
    contents.setWindowOpenHandler(({ url }) => {
      mainWindow?.webContents.send('on-shortcut-attempt', `Blocked Popup Window (${url})`);
      return { action: 'deny' };
    });

    // Intercept external navigation outside whitelisted domain
    contents.on('will-navigate', (navEvent, url) => {
      if (currentConfig?.allowedDomain) {
        try {
          const parsed = new URL(url);
          const domain = parsed.hostname.toLowerCase();
          const allowed = currentConfig.allowedDomain.toLowerCase();

          const isAllowed = domain === allowed || 
                            domain.endsWith('.' + allowed) || 
                            domain.includes('recaptcha') || 
                            domain.includes('gstatic') || 
                            domain.includes('cloudfront');

          if (!isAllowed) {
            navEvent.preventDefault();
            mainWindow?.webContents.send('on-shortcut-attempt', `Blocked Navigation to ${domain}`);
          }
        } catch (e) {
          navEvent.preventDefault();
        }
      }
    });

    // Suppress right-click context menu in webview
    contents.on('context-menu', (e) => {
      e.preventDefault();
      mainWindow?.webContents.send('on-shortcut-attempt', 'Right-Click Context Menu');
    });
  }
});

// Setup IPC Handlers
ipcMain.handle('start-kiosk', async (_event, config: ExamConfig) => {
  try {
    currentConfig = config;
    if (mainWindow) {
      mainWindow.setKiosk(true);
      mainWindow.setFullScreen(true);
      mainWindow.setAlwaysOnTop(true, 'screen-saver');
      registerKioskShortcuts();
    }

    // Create session storage dir
    const appData = app.getPath('userData');
    activeSessionDir = path.join(appData, 'sessions', `session_${Date.now()}`);
    fs.mkdirSync(activeSessionDir, { recursive: true });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to start kiosk mode' };
  }
});

ipcMain.handle('exit-kiosk', async () => {
  try {
    currentConfig = null;
    unregisterKioskShortcuts();
    if (mainWindow) {
      mainWindow.setKiosk(false);
      mainWindow.setFullScreen(false);
      mainWindow.setAlwaysOnTop(false);
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message };
  }
});

ipcMain.handle('get-system-info', async (): Promise<SystemInfo> => {
  const displays = screen.getAllDisplays();
  return {
    displaysCount: displays.length,
    os: `${os.type()} ${os.release()}`,
    hostname: os.hostname(),
    platform: process.platform,
    arch: os.arch(),
  };
});

ipcMain.handle('save-snapshot', async (_event, dataUrl: string) => {
  if (!activeSessionDir) return '';
  try {
    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    const filename = `snapshot_${Date.now()}.jpg`;
    const filePath = path.join(activeSessionDir, filename);
    fs.writeFileSync(filePath, base64Data, { encoding: 'base64' });
    return filePath;
  } catch (err) {
    return '';
  }
});

ipcMain.handle('export-report', async (_event, report: SessionReport, format: 'json' | 'pdf') => {
  if (!mainWindow) return { success: false, error: 'No main window' };

  try {
    const defaultFilename = `ExamLock_Report_${report.candidateId}_${Date.now()}.${format}`;
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Exam Proctoring Report',
      defaultPath: defaultFilename,
      filters: format === 'json' ? [{ name: 'JSON Document', extensions: ['json'] }] : [{ name: 'Text / Log File', extensions: ['txt', 'json'] }],
    });

    if (result.canceled || !result.filePath) {
      return { success: false, error: 'Export canceled' };
    }

    if (format === 'json') {
      fs.writeFileSync(result.filePath, JSON.stringify(report, null, 2), 'utf-8');
    }

    return { success: true, filePath: result.filePath };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Export failed' };
  }
});

// Auto-Save Session Report to Local Archive, MongoDB Atlas, & Webhook
ipcMain.handle('save-session-report', async (_event, report: SessionReport, webhookUrl?: string) => {
  try {
    const reportsDir = path.join(app.getPath('userData'), 'proctor_reports');
    fs.mkdirSync(reportsDir, { recursive: true });

    const filename = `report_${report.candidateId}_${report.sessionId}.json`;
    const filePath = path.join(reportsDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8');

    let webhookStatus = 'NOT_CONFIGURED';

    // 1. Post to HTTP Webhook if configured
    if (webhookUrl && webhookUrl.trim().startsWith('http')) {
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(report),
        });
        webhookStatus = response.ok ? 'SUCCESS' : `HTTP_${response.status}`;
      } catch (err: any) {
        webhookStatus = `FAILED: ${err?.message || 'Network error'}`;
      }
    }

    // 2. Insert into MongoDB Atlas Cloud Database if configured
    const mongoUri = currentConfig?.mongoDbUri || process.env.MONGODB_URI;
    if (mongoUri && mongoUri.trim().startsWith('mongodb')) {
      try {
        const client = new MongoClient(mongoUri);
        await client.connect();
        const db = client.db('examlock');
        const collection = db.collection('proctor_reports');

        await collection.updateOne(
          { sessionId: report.sessionId },
          { $set: report },
          { upsert: true }
        );

        await client.close();
        webhookStatus += ' (MONGODB_SYNCED)';
      } catch (mongoErr: any) {
        console.error('MongoDB sync failed:', mongoErr);
      }
    }

    return { success: true, savedPath: filePath, webhookStatus };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to save report' };
  }
});

// Retrieve All Past Proctoring Session Reports (from MongoDB Atlas or Local Filesystem)
ipcMain.handle('get-all-past-reports', async () => {
  try {
    const mongoUri = currentConfig?.mongoDbUri || process.env.MONGODB_URI;

    // If MongoDB Atlas URI is configured, fetch global candidate reports from MongoDB
    if (mongoUri && mongoUri.trim().startsWith('mongodb')) {
      try {
        const client = new MongoClient(mongoUri);
        await client.connect();
        const db = client.db('examlock');
        const collection = db.collection('proctor_reports');

        const docs = await collection.find({}).sort({ endTime: -1 }).toArray();
        await client.close();

        return docs.map((doc) => {
          const { _id, ...rest } = doc;
          return rest as SessionReport;
        });
      } catch (e) {
        console.error('Failed to fetch from MongoDB, falling back to local files:', e);
      }
    }

    // Local Filesystem Fallback
    const reportsDir = path.join(app.getPath('userData'), 'proctor_reports');
    if (!fs.existsSync(reportsDir)) return [];

    const files = fs.readdirSync(reportsDir).filter((f) => f.endsWith('.json'));
    const reports: SessionReport[] = [];

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(reportsDir, file), 'utf-8');
        const parsed = JSON.parse(content);
        reports.push(parsed);
      } catch (e) {}
    }

    // Sort newest first
    reports.sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime());
    return reports;
  } catch (err) {
    return [];
  }
});

app.whenReady().then(() => {
  createWindow();

  // Handle display configuration changes (multi-monitor detection)
  screen.on('display-added', () => {
    mainWindow?.webContents.send('on-display-change', screen.getAllDisplays().length);
  });

  screen.on('display-removed', () => {
    mainWindow?.webContents.send('on-display-change', screen.getAllDisplays().length);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  unregisterKioskShortcuts();
});
