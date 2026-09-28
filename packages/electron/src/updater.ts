// packages/electron/src/updater.ts
import { autoUpdater } from 'electron-updater';
import { BrowserWindow, app, dialog } from 'electron';
import fs from 'fs';
import path from 'path';

export class AppUpdater {
  private mainWindow: BrowserWindow | null = null;
  private isChecking: boolean = false;

  constructor(window: BrowserWindow) {
    this.mainWindow = window;
    
    // Configure autoUpdater - it will use GitHub releases
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;
    
    // Set up event listeners
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    autoUpdater.on('checking-for-update', () => {
      console.log('[Updater] Checking for updates on GitHub...');
      this.sendStatusToWindow('checking');
    });

    autoUpdater.on('update-available', (info) => {
      console.log('[Updater] Update available on GitHub:', info);
      this.sendStatusToWindow('update-available', info);
      this.promptUserForDownload(info);
    });

    autoUpdater.on('update-not-available', () => {
      console.log('[Updater] No updates available on GitHub');
      this.sendStatusToWindow('update-not-available');
    });

    autoUpdater.on('download-progress', (progressObj) => {
      console.log(`[Updater] Download progress: ${progressObj.percent}%`);
      this.sendStatusToWindow('download-progress', progressObj);
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('[Updater] Update downloaded from GitHub:', info);
      this.sendStatusToWindow('update-downloaded', info);
      this.promptUserToRestart();
    });

    autoUpdater.on('error', (err) => {
      const errStr = String(err);
      // Suppress expected errors: 404 (no releases), connection reset, network errors
      if (errStr.includes('404') || errStr.includes('ERR_CONNECTION') || errStr.includes('ERR_NETWORK') || errStr.includes('ENOTFOUND')) {
        console.log('[Updater] No updates available (repository not accessible or no releases published)');
      } else {
        console.error('[Updater] Error:', err);
      }
      this.sendStatusToWindow('update-not-available', { message: 'No updates available' });
    });
  }

  private sendStatusToWindow(status: string, data?: any): void {
    if (this.mainWindow) {
      this.mainWindow.webContents.send('update-status', { status, data });
    }
  }

  private promptUserForDownload(info: any): void {
    if (!this.mainWindow) return;

    const version = info.version;

    dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `A new version (${version}) is available!`,
      detail: 'Would you like to download it now? This may take a few minutes.',
      buttons: ['Download Now', 'Remind Later'],
      defaultId: 0,
      cancelId: 1,
    }).then((result) => {
      if (result.response === 0) {
        console.log('[Updater] User approved download');
        this.sendStatusToWindow('download-start');
        autoUpdater.downloadUpdate();
      } else {
        console.log('[Updater] User postponed update');
        this.sendStatusToWindow('update-postponed');
      }
    });
  }

  private promptUserToRestart(): void {
    if (!this.mainWindow) return;

    dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: 'The update has been downloaded and is ready to install.',
      detail: 'The application will restart to apply the update.',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1,
    }).then((result) => {
      if (result.response === 0) {
        console.log('[Updater] User approved restart');
        autoUpdater.quitAndInstall();
      } else {
        console.log('[Updater] User postponed restart');
        this.sendStatusToWindow('restart-postponed');
      }
    });
  }

  public checkForUpdates(): void {
    if (this.isChecking) return;

    if (!app.isPackaged) {
      console.log('[Updater] Skipping update check in development mode (not packaged)');
      this.sendStatusToWindow('update-not-available', {
        message: 'Updates are only available in the installed application.',
      });
      return;
    }

    // Check if app-update.yml exists (it's not generated in --dir builds)
    const updateConfigPath = path.join(process.resourcesPath, 'app-update.yml');
    if (!fs.existsSync(updateConfigPath)) {
      console.log('[Updater] app-update.yml not found — skipping update check (likely a dev/dir build)');
      this.sendStatusToWindow('update-not-available', {
        message: 'Update configuration not found. This is normal for development builds.',
      });
      return;
    }

    this.isChecking = true;
    console.log('[Updater] Checking for updates on GitHub...');
    this.sendStatusToWindow('checking');
    autoUpdater.checkForUpdatesAndNotify()
      .catch((err) => {
        const errStr = String(err.message || err);
        if (errStr.includes('404') || errStr.includes('ERR_CONNECTION') || errStr.includes('ERR_NETWORK') || errStr.includes('ENOTFOUND')) {
          console.log('[Updater] No updates available (repository not accessible or no releases published)');
        } else {
          console.error('[Updater] Check failed:', err.message);
        }
      })
      .finally(() => {
        this.isChecking = false;
      });
  }

  public getVersion(): string {
    return app.getVersion();
  }

  public startScheduledChecks(intervalMinutes: number = 60): void {
    // Don't check immediately - the caller (main.ts) handles the first
    // check via setTimeout so the app has time to load first.
    setInterval(() => {
      this.checkForUpdates();
    }, intervalMinutes * 60 * 1000);
  }
}