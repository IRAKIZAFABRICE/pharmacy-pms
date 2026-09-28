// packages/frontend/src/components/SyncIndicator.tsx
// Sync status indicator for offline-first multi-user support

import { useState, useEffect, useCallback } from 'react';
import { ArrowPathIcon, CloudIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

type SyncStatus = 'online' | 'offline' | 'syncing';

interface SyncState {
  status: SyncStatus;
  pendingCount: number;
  lastSyncMessage: string;
  lastSyncSuccess: boolean;
}

export default function SyncIndicator() {
  const [syncState, setSyncState] = useState<SyncState>({
    status: 'online',
    pendingCount: 0,
    lastSyncMessage: '',
    lastSyncSuccess: true,
  });
  const [showTooltip, setShowTooltip] = useState(false);

  // Listen for sync status changes from Electron main process
  useEffect(() => {
    const electron = window.electron;
    if (!electron) return;

    electron.onSyncStatus((status: SyncStatus) => {
      setSyncState((prev) => ({ ...prev, status }));
    });

    electron.onSyncResult((result) => {
      setSyncState((prev) => ({
        ...prev,
        lastSyncMessage: result.message || (result.success ? 'Sync complete' : 'Sync failed'),
        lastSyncSuccess: result.success,
      }));
    });

    // Check pending count periodically
    const interval = setInterval(async () => {
      try {
        const count = await electron.getPendingCount();
        setSyncState((prev) => ({ ...prev, pendingCount: count }));
      } catch {
        // ignore
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleSyncNow = useCallback(async () => {
    const electron = window.electron;
    if (!electron) return;

    setSyncState((prev) => ({ ...prev, status: 'syncing' }));
    try {
      const result = await electron.syncNow();
      setSyncState((prev) => ({
        ...prev,
        lastSyncMessage: result.message || (result.success ? 'Sync complete' : 'Sync failed'),
        lastSyncSuccess: result.success,
        status: result.success ? 'online' : 'offline',
      }));
    } catch {
      setSyncState((prev) => ({
        ...prev,
        status: 'offline',
        lastSyncMessage: 'Sync failed',
        lastSyncSuccess: false,
      }));
    }
  }, []);

  // If not in Electron, show nothing
  if (!window.electron) {
    return null;
  }

  const statusColor = {
    online: 'text-green-500',
    offline: 'text-red-500',
    syncing: 'text-blue-500',
  };

  const statusBg = {
    online: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    offline: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    syncing: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  };

  const StatusIcon = syncState.status === 'syncing'
    ? ArrowPathIcon
    : syncState.status === 'offline'
    ? ExclamationTriangleIcon
    : CloudIcon;

  return (
    <div className="relative">
      <button
        onClick={handleSyncNow}
        disabled={syncState.status === 'syncing'}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`flex items-center px-3 py-1.5 text-xs rounded-full border transition-all ${
          statusBg[syncState.status]
        } ${statusColor[syncState.status]} ${
          syncState.status === 'syncing' ? 'cursor-wait' : 'cursor-pointer hover:opacity-80'
        }`}
      >
        <StatusIcon
          className={`h-4 w-4 mr-1.5 ${
            syncState.status === 'syncing' ? 'animate-spin' : ''
          }`}
        />
        <span className="font-medium">
          {syncState.status === 'syncing'
            ? 'Syncing...'
            : syncState.status === 'offline'
            ? 'Offline'
            : 'Online'}
        </span>
        {syncState.pendingCount > 0 && (
          <span className="ml-1.5 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full text-xs font-bold">
            {syncState.pendingCount}
          </span>
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 z-50 text-xs">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Status:</span>
              <span className={`font-medium capitalize ${statusColor[syncState.status]}`}>
                {syncState.status}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Pending:</span>
              <span className="font-medium text-gray-700 dark:text-gray-200">
                {syncState.pendingCount} changes
              </span>
            </div>
            {syncState.lastSyncMessage && (
              <div className="flex items-center justify-between">
                <span className="text-gray-500 dark:text-gray-400">Last sync:</span>
                <span className={`font-medium ${syncState.lastSyncSuccess ? 'text-green-600' : 'text-red-600'}`}>
                  {syncState.lastSyncMessage}
                </span>
              </div>
            )}
            <div className="pt-1.5 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={handleSyncNow}
                disabled={syncState.status === 'syncing'}
                className="w-full text-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium py-1"
              >
                {syncState.status === 'syncing' ? 'Syncing...' : 'Sync now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

