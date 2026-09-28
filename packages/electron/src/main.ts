// packages/electron/src/main.ts
import { app, BrowserWindow, Menu, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import { pgManager } from './pg-manager';
import { backendManager } from './backend-manager';
import { SyncService } from './sync-service';
import { AppUpdater } from './updater';

// ========== CHANGE 1: SINGLE INSTANCE LOCK ==========
// Add this right at the top, before any other code
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('⚠️ Another instance is already running. Quitting...');
  app.quit();
  process.exit(0);
}
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});
// ====================================================

let mainWindow: BrowserWindow | null = null;
let calculatorWindow: BrowserWindow | null = null;
let syncService: SyncService | null = null;
let appUpdater: AppUpdater | null = null;
let isShuttingDown = false;

// ========== ROBUST CLEANUP: KILL ALL BACKGROUND PROCESSES ==========
/**
 * Force-kill all background processes synchronously using Windows taskkill.
 * This MUST be synchronous so it completes before the process exits.
 */
function forceKillAllProcesses(): void {
  const commands = [
    // Kill the backend (runs as Pharmacy PMS.exe with ELECTRON_RUN_AS_NODE)
    'taskkill /F /IM "Pharmacy PMS.exe" /T 2>nul',
    // Kill any orphaned node processes from the backend
    'taskkill /F /IM node.exe /T 2>nul',
    // Kill PostgreSQL server (postgres.exe and its children)
    'taskkill /F /IM postgres.exe /T 2>nul',
    // Kill any lingering electron processes
    'taskkill /F /IM electron.exe /T 2>nul',
  ];
  for (const cmd of commands) {
    try {
      execSync(cmd, { stdio: 'ignore', timeout: 3000 });
    } catch {
      // Process already dead — ignore
    }
  }
}

/**
 * Synchronous cleanup that stops all services and kills all child processes.
 * Uses execSync internally so it completes before Electron exits.
 */
function cleanupAndExit(): void {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log('🛑 Shutting down all services...');

  // 1. Stop sync service
  if (syncService) {
    try {
      syncService.stop();
      syncService = null;
    } catch (err) {
      console.error('Error stopping sync service:', err);
    }
  }

  // 2. Stop backend (graceful first, then force)
  try {
    backendManager.stop();
  } catch (err) {
    console.error('Error stopping backend:', err);
  }

  // 3. Stop PostgreSQL (graceful first, then force)
  try {
    pgManager.stop();
  } catch (err) {
    console.error('Error stopping PostgreSQL:', err);
  }

  // 4. Force-kill anything still lingering
  forceKillAllProcesses();

  console.log('✅ Cleanup complete');
}
// ================================================================

/**
 * Initialize and start the sync service after backend is ready.
 */
function startSyncService(): void {
  const serverUrl = process.env.SYNC_SERVER_URL || 'http://localhost:3001';

  syncService = new SyncService({
    serverUrl,
    syncIntervalMs: 60000, // sync every 60 seconds
  });

  syncService.onSync((result) => {
    console.log(`[Main] Sync result: ${result.message}`);
    mainWindow?.webContents.send('sync-result', result);
  });

  syncService.onNetworkStatusChange((status) => {
    console.log(`[Main] Sync status: ${status}`);
    mainWindow?.webContents.send('sync-status', status);
  });

  syncService.start();
  console.log(`[Main] Sync service started — server: ${serverUrl}`);
}

/**
 * Startup sequence with background database initialization:
 * 1. Initialize PostgreSQL data directory (if first run)
 * 2. Start PostgreSQL in the BACKGROUND (app opens immediately)
 * 3. Show the frontend UI immediately
 * 4. Start backend server when PostgreSQL is ready
 */
async function startBackendServer(): Promise<void> {
  if (!app.isPackaged) {
    console.log('⚡ Dev mode: Backend should be started manually (npm run dev --workspace=backend)');
    return;
  }

  try {
    console.log('🔧 [1/4] Initializing PostgreSQL 18.4...');
    await pgManager.init();

    console.log('🔧 [2/4] Starting PostgreSQL server in background...');
    // Start PostgreSQL in background - this returns immediately
    await pgManager.startBackground();
    console.log(`✅ PostgreSQL starting in background on port ${pgManager.getConfig().port}`);

    // Give PostgreSQL a moment to start before we check
    // The backend will wait for PostgreSQL to be ready via pgManager.waitForReady()
    console.log('🔧 [3/4] Waiting for PostgreSQL to be ready...');
    await pgManager.waitForReady();
    console.log('✅ PostgreSQL is ready');

    console.log('🔧 [4/4] Starting backend server...');
    await backendManager.start();
    console.log('✅ Backend server running on http://localhost:3001');

  } catch (err) {
    console.error(`❌ Startup sequence failed: ${err}`);
    if (mainWindow) {
      mainWindow.webContents.send('startup-error', String(err));
    }
  }
}

/**
 * Start the backend server in the background after the app loads
 */
async function startBackendInBackground(): Promise<void> {
  // Wait a moment for the app to fully load, then start the backend
  setTimeout(async () => {
    try {
      await startBackendServer();
    } catch (err) {
      console.error('[Main] Background backend startup failed:', err);
      mainWindow?.webContents.send('startup-error', String(err));
    }
  }, 1000);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
  });
  // Example: Check if a file exists
const configPath = path.join(app.getPath('userData'), 'config.json');
if (fs.existsSync(configPath)) {
    const config = fs.readFileSync(configPath, 'utf-8');
    // do something with config
}

// Example: Create a directory
const logsPath = path.join(app.getPath('userData'), 'logs');
if (!fs.existsSync(logsPath)) {
    fs.mkdirSync(logsPath, { recursive: true });
}

  let frontendPath: string;
  const isDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';

  if (isDev) {
    frontendPath = path.join(__dirname, '../../frontend/dist/index.html');
    mainWindow.setIcon(path.join(__dirname, '../build/icon.ico'));
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    frontendPath = path.join(process.resourcesPath, 'frontend-dist', 'index.html');
  }

  mainWindow.loadFile(frontendPath);

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error(`❌ Failed to load frontend (error ${errorCode}): ${errorDescription}`);
    console.error(` Attempted path: ${frontendPath}`);
    mainWindow?.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
      <html>
      <head><title>Pharmacy PMS - Error</title>
      <style>
        body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f5; }
       .error { text-align: center; padding: 40px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #e53e3e; }
        p { color: #4a5568; line-height: 1.6; }
        code { background: #edf2f7; padding: 2px 6px; border-radius: 4px; font-size: 14px; }
      </style>
      </head>
      <body>
        <div class="error">
          <h1>🚫 Frontend Not Found</h1>
          <p>Could not load the application UI.</p>
          <p><strong>Path tried:</strong><br/><code>${frontendPath}</code></p>
          <p style="margin-top: 20px; font-size: 14px;">
            ${isDev? 'Make sure you have built the frontend:<br/><code>npm run build --workspace=frontend</code>' : 'Please reinstall the application.'}
          </p>
        </div>
      </body>
      </html>
    `)}`);
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    console.log('✅ Application window loaded!');

    // Initialize auto-updater for production
    if (app.isPackaged) {
      console.log('🔄 Initializing auto-updater...');
      appUpdater = new AppUpdater(mainWindow!);

      // Check for updates after a delay (let the app load first)
      setTimeout(() => {
        console.log('🔍 Checking for updates...');
        appUpdater?.checkForUpdates();
      }, 10000); // Wait 10 seconds after app loads

      // Start scheduled checks (every 6 hours)
      appUpdater.startScheduledChecks(360);
    }

    // Start the backend in the background
    if (app.isPackaged) {
      console.log('🔄 Starting backend in background...');
      startBackendInBackground();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menu = Menu.buildFromTemplate(getMenuTemplate());
  Menu.setApplicationMenu(menu);
}

/**
 * Open a small scientific calculator window that stays always on top
 * of the main application window.
 */
function openCalculatorWindow(): void {
  if (calculatorWindow) {
    calculatorWindow.focus();
    return;
  }
  const win = new BrowserWindow({
    width: 400,
    height: 600,
    minWidth: 360,
    minHeight: 520,
    alwaysOnTop: true,
    title: 'Scientific Calculator',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  win.removeMenu();

  const isDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';
  if (isDev) {
    win.loadURL('http://localhost:3000/calc.html');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(process.resourcesPath, 'frontend-dist', 'calc.html'));
  }

  win.once('ready-to-show', () => win.show());
  win.on('closed', () => { calculatorWindow = null; });
  calculatorWindow = win;
}

function getMenuTemplate(): any[] {
  return [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Sale',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow?.webContents.send('new-sale');
          },
        },
        { type: 'separator' },
        {
          label: 'Print Receipt',
          accelerator: 'CmdOrCtrl+P',
          click: () => {
            mainWindow?.webContents.send('print-receipt');
          },
        },
        { type: 'separator' },
        {
          label: 'Check for Updates',
          click: () => {
            if (appUpdater) {
              console.log('[Menu] Manual update check triggered');
              appUpdater.checkForUpdates();
              mainWindow?.webContents.send('update-status', {
                status: 'manual-check',
                data: 'Checking for updates...'
              });
            } else {
              dialog.showMessageBox(mainWindow!, {
                type: 'info',
                title: 'Update Check',
                message: 'Update system is not available in development mode.',
                buttons: ['OK']
              });
            }
          },
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'close' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            mainWindow?.webContents.send('show-about');
          },
        },
      ],
    },
  ];
}

// ==================== SYNC IPC HANDLERS ====================

/**
 * Trigger an immediate sync.
 */
ipcMain.handle('sync-now', async () => {
  if (!syncService) return { success: false, message: 'Sync service not initialized' };
  try {
    const result = await syncService.syncNow();
    return result;
  } catch (err: any) {
    return { success: false, message: err.message };
  }
});

/**
 * Get the current sync configuration.
 */
ipcMain.handle('sync-get-config', () => {
  if (!syncService) return null;
  return syncService.getConfig();
});

/**
 * Get the number of pending changes in the queue.
 */
ipcMain.handle('sync-get-pending-count', () => {
  if (!syncService) return 0;
  return syncService.getPendingCount();
});
// Add these to your existing IPC handlers in main.ts

// ==================== UPDATE IPC HANDLERS ====================

/**
 * Check for updates manually from the renderer
 */
ipcMain.handle('check-for-updates', async () => {
  if (!appUpdater) {
    return { success: false, message: 'Updater not initialized (development mode)' };
  }
  console.log('[IPC] Manual update check triggered from renderer');
  appUpdater.checkForUpdates();
  return { success: true, message: 'Update check started' };
});

/**
 * Get current app version
 */
ipcMain.handle('get-app-version', async () => {
  return app.getVersion();
});

/**
 * Get update status
 */
ipcMain.handle('get-update-status', async () => {
  return {
    isChecking: false,
    version: app.getVersion(),
    isPackaged: app.isPackaged,
    channel: 'latest'
  };
});

/**
 * Download the available update (called from the UI)
 */
ipcMain.handle('download-update', async () => {
  if (!appUpdater) {
    return { success: false, message: 'Updater not initialized (development mode)' };
  }
  console.log('[IPC] Download update triggered from renderer');
  try {
    const { autoUpdater } = await import('electron-updater');
    autoUpdater.downloadUpdate();
    return { success: true, message: 'Update download started' };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
});

/**
 * Quit and install the downloaded update
 */
ipcMain.handle('install-update', async () => {
  if (!appUpdater) {
    return { success: false, message: 'Updater not initialized (development mode)' };
  }
  console.log('[IPC] Install update triggered from renderer');
  try {
    const { autoUpdater } = await import('electron-updater');
    autoUpdater.quitAndInstall();
    return { success: true, message: 'Installing update...' };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
});
// ==================== CALCULATOR IPC HANDLER ====================

ipcMain.handle('open-calculator', () => {
  openCalculatorWindow();
  return { success: true };
});

// ==================== PRINTER IPC HANDLER ====================

ipcMain.handle('print-receipt', async (_event, data) => {
  try {
    const focusedWindow = BrowserWindow.getFocusedWindow();

    if (!focusedWindow) {
      throw new Error('No window found');
    }

    const receiptHtml = generateReceiptHTML(data);

    const printWindow = new BrowserWindow({
      show: false,
      width: 400,
      height: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(receiptHtml)}`);
    await new Promise((resolve) => setTimeout(resolve, 500));

    const result = await printWindow.webContents.print({
      silent: false,
      printBackground: true,
      deviceName: '',
    });

    printWindow.close();
    return { success: true, result };
  } catch (error) {
    console.error('Print error:', error);
    return { success: false, error: String(error) };
  }
});

function generateReceiptHTML(data: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Receipt - ${data.invoiceNumber}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Courier New', Courier, monospace;
          font-size: 11px;
          width: 80mm;
          margin: 0 auto;
          padding: 8px 5px;
          background: #fff;
        }
       .header { text-align: center; border-bottom: 1px dashed #333; padding-bottom: 8px; margin-bottom: 8px; }
       .header h1 { font-size: 16px; letter-spacing: 2px; margin: 0; }
       .header p { font-size: 10px; margin: 2px 0; color: #555; }
       .items { width: 100%; margin: 8px 0; }
       .items th { text-align: left; font-size: 10px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
       .items td { padding: 3px 0; }
       .items.qty { text-align: center; width: 30px; }
       .items.price { text-align: right; width: 60px; }
       .items.total { text-align: right; width: 70px; }
       .totals { border-top: 1px dashed #333; padding-top: 8px; margin-top: 8px; }
       .totals p { display: flex; justify-content: space-between; padding: 2px 0; }
       .totals.grand-total { font-size: 14px; font-weight: bold; border-top: 1px solid #333; padding-top: 4px; margin-top: 4px; }
       .footer { text-align: center; border-top: 1px dashed #333; padding-top: 8px; margin-top: 8px; }
       .thankyou { font-size: 14px; font-weight: bold; text-align: center; margin: 8px 0; color: #1a73e8; }
        @media print { body { margin: 0; padding: 4px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🏥 PHARMACY PMS</h1>
        <p>Rwanda Pharmacy Management System</p>
        <p>--------------------------------</p>
        <p><strong>INVOICE #${data.invoiceNumber}</strong></p>
        <p>${new Date(data.date).toLocaleString()}</p>
        ${data.cashier? `<p>Cashier: ${data.cashier}</p>` : ''}
        ${data.customerName? `<p>Customer: ${data.customerName}</p>` : ''}
        ${data.customerPhone? `<p>Phone: ${data.customerPhone}</p>` : ''}
      </div>
      <table class="items">
        <thead>
          <tr>
            <th>Item</th>
            <th class="qty">Qty</th>
            <th class="price">Price</th>
            <th class="total">Total</th>
          </tr>
        </thead>
        <tbody>
          ${data.items.map((item: any) => `
            <tr>
              <td>${item.name}</td>
              <td class="qty">${item.quantity}</td>
              <td class="price">${item.price.toFixed(2)}</td>
              <td class="total">${item.total.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="totals">
        <p><span>Subtotal:</span><span>RWF ${data.subtotal.toFixed(2)}</span></p>
        <p><span>Tax (18%):</span><span>RWF ${data.tax.toFixed(2)}</span></p>
        <p><span>Payment:</span><span>${data.paymentMethod}</span></p>
        <p class="grand-total"><span>TOTAL:</span><span>RWF ${data.total.toFixed(2)}</span></p>
      </div>
      <div class="thankyou">🙏 Thank You! 🙏</div>
      <div class="footer">
        <p>Visit us again!</p>
        <p>--------------------------------</p>
        <p>${new Date().toLocaleString()}</p>
      </div>
    </body>
    </html>
  `;
}

// ==================== APP LIFECYCLE ====================

app.whenReady().then(async () => {
  // CHANGE 2: REMOVED duplicate single instance lock from here. It's now at the top.

  // Initialize PostgreSQL in the background (doesn't block app loading)
  try {
    console.log('🔧 Initializing PostgreSQL...');
    await pgManager.init();

    // Start PostgreSQL in background - this returns immediately
    console.log('🔧 Starting PostgreSQL in background...');
    await pgManager.startBackground();
    console.log('✅ PostgreSQL is starting in the background');
  } catch (err) {
    console.error('❌ PostgreSQL initialization failed:', err);
    // Continue anyway - the app will show an error if needed
  }

  // Create and show the window immediately!
  createWindow();

  // Start sync service after a delay (backend will start in background)
  setTimeout(async () => { // <-- CHANGE 3: made async
    // Only start sync if backend is running
    const isRunning = await backendManager.isRunning(); // <-- now works because we made it public
    if (isRunning) {
      startSyncService();
    } else {
      console.log('[Main] Backend not ready yet, sync will start later');
      // Try again in 10 seconds
      setTimeout(async () => { // <-- made async
        if (await backendManager.isRunning()) { // <-- now works
          startSyncService();
        } else {
          console.log('[Main] Backend still not ready, sync will not start');
        }
      }, 10000);
    }
  }, 5000);
});

app.on('window-all-closed', () => {
  // Stop ALL background processes when the window is closed
  cleanupAndExit();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
// Cleanup PostgreSQL, sync service, and backend on app quit
// NOTE: This MUST be synchronous — Electron does NOT wait for async before-quit handlers
app.on('before-quit', () => {
  cleanupAndExit();
});

// Safety net: force-kill on will-quit
app.on('will-quit', () => {
  cleanupAndExit();
});

// Catch abrupt process terminations (CTRL+C, SIGTERM, etc.)
process.on('SIGINT', () => {
  console.log('⚠️ Received SIGINT — cleaning up...');
  cleanupAndExit();
  process.exit(0);
});
process.on('SIGTERM', () => {
  console.log('⚠️ Received SIGTERM — cleaning up...');
  cleanupAndExit();
  process.exit(0);
});

// Final safety net: force-kill anything still running when the process exits
process.on('exit', () => {
  forceKillAllProcesses();
});

app.setName('Pharmacy PMS');