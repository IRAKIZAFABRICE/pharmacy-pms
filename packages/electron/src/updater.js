"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppUpdater = void 0;
// packages/electron/src/updater.ts
const electron_updater_1 = require("electron-updater");
const electron_1 = require("electron");
class AppUpdater {
    mainWindow = null;
    isChecking = false;
    constructor(window) {
        this.mainWindow = window;
        // Configure autoUpdater - it will use GitHub releases
        electron_updater_1.autoUpdater.autoDownload = false;
        electron_updater_1.autoUpdater.autoInstallOnAppQuit = true;
        // Set up event listeners
        this.setupEventListeners();
    }
    setupEventListeners() {
        electron_updater_1.autoUpdater.on('checking-for-update', () => {
            console.log('[Updater] Checking for updates on GitHub...');
            this.sendStatusToWindow('checking');
        });
        electron_updater_1.autoUpdater.on('update-available', (info) => {
            console.log('[Updater] Update available on GitHub:', info);
            this.sendStatusToWindow('update-available', info);
            this.promptUserForDownload(info);
        });
        electron_updater_1.autoUpdater.on('update-not-available', () => {
            console.log('[Updater] No updates available on GitHub');
            this.sendStatusToWindow('update-not-available');
        });
        electron_updater_1.autoUpdater.on('download-progress', (progressObj) => {
            console.log(`[Updater] Download progress: ${progressObj.percent}%`);
            this.sendStatusToWindow('download-progress', progressObj);
        });
        electron_updater_1.autoUpdater.on('update-downloaded', (info) => {
            console.log('[Updater] Update downloaded from GitHub:', info);
            this.sendStatusToWindow('update-downloaded', info);
            this.promptUserToRestart();
        });
        electron_updater_1.autoUpdater.on('error', (err) => {
            console.error('[Updater] Error:', err);
            this.sendStatusToWindow('update-error', err.message);
        });
    }
    sendStatusToWindow(status, data) {
        if (this.mainWindow) {
            this.mainWindow.webContents.send('update-status', { status, data });
        }
    }
    promptUserForDownload(info) {
        if (!this.mainWindow)
            return;
        const version = info.version;
        electron_1.dialog.showMessageBox(this.mainWindow, {
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
                electron_updater_1.autoUpdater.downloadUpdate();
            }
            else {
                console.log('[Updater] User postponed update');
                this.sendStatusToWindow('update-postponed');
            }
        });
    }
    promptUserToRestart() {
        if (!this.mainWindow)
            return;
        electron_1.dialog.showMessageBox(this.mainWindow, {
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
                electron_updater_1.autoUpdater.quitAndInstall();
            }
            else {
                console.log('[Updater] User postponed restart');
                this.sendStatusToWindow('restart-postponed');
            }
        });
    }
    checkForUpdates() {
        if (this.isChecking)
            return;
        if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
            console.log('[Updater] Skipping update check in development mode');
            return;
        }
        this.isChecking = true;
        console.log('[Updater] Checking for updates on GitHub...');
        electron_updater_1.autoUpdater.checkForUpdatesAndNotify().finally(() => {
            this.isChecking = false;
        });
    }
    startScheduledChecks(intervalMinutes = 60) {
        this.checkForUpdates();
        setInterval(() => {
            this.checkForUpdates();
        }, intervalMinutes * 60 * 1000);
    }
}
exports.AppUpdater = AppUpdater;
//# sourceMappingURL=updater.js.map