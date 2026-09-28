// packages/electron/src/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  // Printer functions
  printReceipt: (data: any) => ipcRenderer.invoke('print-receipt', data),

  // Open the always-on-top scientific calculator window
  openCalculator: () => ipcRenderer.invoke('open-calculator'),
  
  // IPC event listeners
  onNewSale: (callback: () => void) => {
    ipcRenderer.on('new-sale', callback);
  },
  onShowAbout: (callback: () => void) => {
    ipcRenderer.on('show-about', callback);
  },
  onPrintReceipt: (callback: () => void) => {
    ipcRenderer.on('print-receipt', callback);
  },
  onStartupError: (callback: (error: string) => void) => {
    ipcRenderer.on('startup-error', (_event, error) => callback(error));
  },
  
  // Sync APIs
  syncNow: () => ipcRenderer.invoke('sync-now'),
  getSyncConfig: () => ipcRenderer.invoke('sync-get-config'),
  getPendingCount: () => ipcRenderer.invoke('sync-get-pending-count'),
  onSyncResult: (callback: (result: any) => void) => {
    ipcRenderer.on('sync-result', (_event, result) => callback(result));
  },
  onSyncStatus: (callback: (status: string) => void) => {
    ipcRenderer.on('sync-status', (_event, status) => callback(status));
  },
  
  // Auto-Updater APIs
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getUpdateStatus: () => ipcRenderer.invoke('get-update-status'),
  onUpdateStatus: (callback: (data: any) => void) => {
    ipcRenderer.on('update-status', (_event, data) => callback(data));
  },
  onUpdateProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('update-progress', (_event, progress) => callback(progress));
  },
  
  // Remove listeners
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
});