interface UpdateStatusData {
  status:
    | 'checking'
    | 'update-available'
    | 'update-not-available'
    | 'download-progress'
    | 'update-downloaded'
    | 'update-error'
    | 'download-start'
    | 'update-postponed'
    | 'restart-postponed'
    | 'manual-check';
  data?: any;
}

interface ElectronAPI {
  // Printer functions
  printReceipt: (data: any) => Promise<any>;

  // Open the always-on-top scientific calculator window
  openCalculator: () => Promise<{ success: boolean }>;

  // IPC event listeners
  onNewSale: (callback: () => void) => void;
  onShowAbout: (callback: () => void) => void;
  onPrintReceipt: (callback: () => void) => void;
  onStartupError: (callback: (error: string) => void) => void;

  // Sync APIs
  syncNow: () => Promise<any>;
  getSyncConfig: () => Promise<any>;
  getPendingCount: () => Promise<number>;
  onSyncResult: (callback: (result: any) => void) => void;
  onSyncStatus: (callback: (status: 'online' | 'offline' | 'syncing') => void) => void;

  // Auto-Updater APIs
  checkForUpdates: () => Promise<{ success: boolean; message: string }>;
  downloadUpdate: () => Promise<{ success: boolean; message: string }>;
  installUpdate: () => Promise<{ success: boolean; message: string }>;
  getAppVersion: () => Promise<string>;
  getUpdateStatus: () => Promise<{
    isChecking: boolean;
    version: string;
    isPackaged: boolean;
    channel: string;
  }>;
  onUpdateStatus: (callback: (data: UpdateStatusData) => void) => void;
  onUpdateProgress: (callback: (progress: any) => void) => void;

  // Remove listeners
  removeAllListeners: (channel: string) => void;
}

interface Window {
  electron?: ElectronAPI;
}
