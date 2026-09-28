import { useState, useEffect, useCallback } from 'react';
import {
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  CloudArrowDownIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error';

interface UpdateInfo {
  status: UpdateStatus;
  version?: string;
  progress?: number;
  message?: string;
}

export default function UpdateChecker() {
  const [appVersion, setAppVersion] = useState<string>('1.0.0');
  const [isElectron, setIsElectron] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({ status: 'idle' });

  // Check if running in Electron and get app version
  useEffect(() => {
    const electron = window.electron;
    if (!electron) return;

    setIsElectron(true);

    // Get current version
    electron.getAppVersion().then((version: string) => {
      setAppVersion(version);
    }).catch(() => {
      setAppVersion('1.0.0');
    });

    // Listen for update status events from main process
    electron.onUpdateStatus((data) => {
      const { status, data: statusData } = data;
      switch (status) {
        case 'checking':
        case 'manual-check':
          setUpdateInfo({ status: 'checking' });
          break;
        case 'update-available':
          setUpdateInfo({
            status: 'available',
            version: statusData?.version,
            message: `Version ${statusData?.version} is available`,
          });
          break;
        case 'update-not-available':
          setUpdateInfo({
            status: 'not-available',
            message: statusData?.message || 'You are on the latest version',
          });
          break;
        case 'download-start':
          setUpdateInfo({ status: 'downloading', progress: 0 });
          break;
        case 'download-progress':
          setUpdateInfo((prev) => ({
            ...prev,
            status: 'downloading',
            progress: Math.round(statusData?.percent || 0),
          }));
          break;
        case 'update-downloaded':
          setUpdateInfo({
            status: 'downloaded',
            version: statusData?.version,
            message: 'Update downloaded and ready to install',
          });
          break;
        case 'update-error':
          setUpdateInfo({
            status: 'error',
            message: statusData || 'Failed to check for updates',
          });
          break;
        case 'update-postponed':
        case 'restart-postponed':
          setUpdateInfo((prev) => ({ ...prev, status: 'idle' }));
          break;
        default:
          break;
      }
    });

    return () => {
      electron.removeAllListeners?.('update-status');
    };
  }, []);

  const handleCheckForUpdates = useCallback(async () => {
    const electron = window.electron;
    if (!electron) return;

    setUpdateInfo({ status: 'checking' });
    const result = await electron.checkForUpdates();
    if (!result.success) {
      toast.error(result.message);
      setUpdateInfo({ status: 'error', message: result.message });
    }
  }, []);

  const handleDownloadUpdate = useCallback(async () => {
    const electron = window.electron;
    if (!electron) return;

    setUpdateInfo({ status: 'downloading', progress: 0 });
    const result = await electron.downloadUpdate();
    if (!result.success) {
      toast.error(result.message);
      setUpdateInfo({ status: 'error', message: result.message });
    }
  }, []);

  const handleInstallUpdate = useCallback(async () => {
    const electron = window.electron;
    if (!electron) return;

    toast.loading('Installing update... This will restart the application.');
    const result = await electron.installUpdate();
    if (!result.success) {
      toast.error(result.message);
      setUpdateInfo({ status: 'error', message: result.message });
    }
  }, []);

  // If not in Electron, show a note
  if (!isElectron) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <SparklesIcon className="h-5 w-5 mr-2 text-primary-600" />
          Application Updates
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Update checking is only available in the desktop application.
        </p>
      </div>
    );
  }

  const getStatusUI = () => {
    switch (updateInfo.status) {
      case 'checking':
        return (
          <div className="flex items-center text-blue-600">
            <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
            <span className="text-sm font-medium">Checking for updates...</span>
          </div>
        );
      case 'available':
        return (
          <div className="flex items-center justify-between">
            <div className="flex items-center text-amber-600">
              <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
              <div>
                <p className="text-sm font-medium">Update available: v{updateInfo.version}</p>
                <p className="text-xs text-gray-500">{updateInfo.message}</p>
              </div>
            </div>
            <button
              onClick={handleDownloadUpdate}
              className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
            >
              <CloudArrowDownIcon className="h-4 w-4 mr-2" />
              Download Now
            </button>
          </div>
        );
      case 'downloading':
        return (
          <div>
            <div className="flex items-center text-blue-600 mb-2">
              <CloudArrowDownIcon className="h-5 w-5 mr-2" />
              <span className="text-sm font-medium">Downloading update... {updateInfo.progress || 0}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${updateInfo.progress || 0}%` }}
              />
            </div>
          </div>
        );
      case 'downloaded':
        return (
          <div className="flex items-center justify-between">
            <div className="flex items-center text-green-600">
              <CheckCircleIcon className="h-5 w-5 mr-2" />
              <div>
                <p className="text-sm font-medium">Update ready to install</p>
                <p className="text-xs text-gray-500">{updateInfo.message}</p>
              </div>
            </div>
            <button
              onClick={handleInstallUpdate}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              <SparklesIcon className="h-4 w-4 mr-2" />
              Restart & Install
            </button>
          </div>
        );
      case 'not-available':
        return (
          <div className="flex items-center text-green-600">
            <CheckCircleIcon className="h-5 w-5 mr-2" />
            <span className="text-sm font-medium">{updateInfo.message || 'You are on the latest version'}</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center text-red-600">
            <XCircleIcon className="h-5 w-5 mr-2" />
            <div>
              <p className="text-sm font-medium">Update check failed</p>
              <p className="text-xs text-gray-500">{updateInfo.message}</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
        <SparklesIcon className="h-5 w-5 mr-2 text-primary-600" />
        Application Updates
      </h2>

      <div className="space-y-4">
        {/* Current version */}
        <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Current Version
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Pharmacy PMS Desktop Application
            </p>
          </div>
          <span className="text-lg font-bold text-primary-600">v{appVersion}</span>
        </div>

        {/* Update status */}
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          {getStatusUI()}
        </div>

        {/* Check for updates button */}
        <button
          onClick={handleCheckForUpdates}
          disabled={updateInfo.status === 'checking' || updateInfo.status === 'downloading'}
          className="w-full flex items-center justify-center px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowPathIcon
            className={`h-4 w-4 mr-2 ${
              updateInfo.status === 'checking' ? 'animate-spin' : ''
            }`}
          />
          {updateInfo.status === 'checking' ? 'Checking...' : 'Check for Updates'}
        </button>
      </div>
    </div>
  );
}