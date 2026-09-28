"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// packages/electron/src/preload.ts
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electron', {
    // Printer functions
    printReceipt: (data) => electron_1.ipcRenderer.invoke('print-receipt', data),
    // IPC event listeners
    onNewSale: (callback) => {
        electron_1.ipcRenderer.on('new-sale', callback);
    },
    onShowAbout: (callback) => {
        electron_1.ipcRenderer.on('show-about', callback);
    },
    onPrintReceipt: (callback) => {
        electron_1.ipcRenderer.on('print-receipt', callback);
    },
    onStartupError: (callback) => {
        electron_1.ipcRenderer.on('startup-error', (_event, error) => callback(error));
    },
    // Sync APIs
    syncNow: () => electron_1.ipcRenderer.invoke('sync-now'),
    getSyncConfig: () => electron_1.ipcRenderer.invoke('sync-get-config'),
    getPendingCount: () => electron_1.ipcRenderer.invoke('sync-get-pending-count'),
    onSyncResult: (callback) => {
        electron_1.ipcRenderer.on('sync-result', (_event, result) => callback(result));
    },
    onSyncStatus: (callback) => {
        electron_1.ipcRenderer.on('sync-status', (_event, status) => callback(status));
    },
    // Auto-Updater APIs
    checkForUpdates: () => electron_1.ipcRenderer.invoke('check-for-updates'),
    getAppVersion: () => electron_1.ipcRenderer.invoke('get-app-version'),
    onUpdateStatus: (callback) => {
        electron_1.ipcRenderer.on('update-status', (_event, data) => callback(data));
    },
    onUpdateProgress: (callback) => {
        electron_1.ipcRenderer.on('update-progress', (_event, progress) => callback(progress));
    },
    // Remove listeners
    removeAllListeners: (channel) => {
        electron_1.ipcRenderer.removeAllListeners(channel);
    },
});
//# sourceMappingURL=preload.js.map