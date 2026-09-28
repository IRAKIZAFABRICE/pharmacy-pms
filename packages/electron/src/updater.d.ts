import { BrowserWindow } from 'electron';
export declare class AppUpdater {
    private mainWindow;
    private isChecking;
    constructor(window: BrowserWindow);
    private setupEventListeners;
    private sendStatusToWindow;
    private promptUserForDownload;
    private promptUserToRestart;
    checkForUpdates(): void;
    startScheduledChecks(intervalMinutes?: number): void;
}
//# sourceMappingURL=updater.d.ts.map