import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { ArrowRightOnRectangleIcon, ArrowPathIcon, CheckCircleIcon, SparklesIcon, CalculatorIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../../services/api';
import NotificationBadge from '../NotificationBadge';
import ThemeToggle from '../ThemeToggle';
import SyncIndicator from '../SyncIndicator';
import { useState, useEffect, useCallback } from 'react';

export default function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'downloaded'>('idle');
  const [newVersion, setNewVersion] = useState('');

  // Listen for update status changes
  useEffect(() => {
    const electron = window.electron;
    if (!electron) return;

    electron.onUpdateStatus((data) => {
      const { status, data: statusData } = data;
      switch (status) {
        case 'checking':
        case 'manual-check':
          setUpdateStatus('checking');
          break;
        case 'update-available':
          setUpdateStatus('available');
          setNewVersion(statusData?.version || '');
          break;
        case 'update-not-available':
          setUpdateStatus('idle');
          break;
        case 'download-progress':
          // Progress is shown in Settings page
          break;
        case 'update-downloaded':
          setUpdateStatus('downloaded');
          break;
        case 'update-error':
        case 'update-postponed':
        case 'restart-postponed':
          setUpdateStatus('idle');
          break;
        default:
          break;
      }
    });

    return () => {
      electron.removeAllListeners('update-status');
    };
  }, []);

  const handleCheckUpdates = useCallback(async () => {
    const electron = window.electron;
    if (!electron) {
      toast('Updates are only available in the desktop app', { icon: 'ℹ️' });
      return;
    }
    setUpdateStatus('checking');
    const result = await electron.checkForUpdates();
    if (!result.success) {
      toast.error(result.message);
      setUpdateStatus('idle');
    }
  }, []);

  const handleInstallUpdate = useCallback(async () => {
    const electron = window.electron;
    if (!electron) return;
    toast.loading('Installing update... This will restart the application.');
    await electron.installUpdate();
  }, []);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      // Ignore
    }
    logout();
    toast.success('Logged out');
    navigate('/login');
  };

  const handleOpenCalculator = useCallback(() => {
    const electron = window.electron;
    if (!electron) {
      toast('The calculator window is only available in the desktop app', { icon: 'ℹ️' });
      return;
    }
    electron.openCalculator();
  }, []);

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 transition-colors">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
          Welcome back, {user?.firstName} {user?.lastName}
        </h2>
        <div className="flex items-center space-x-4">
          <SyncIndicator />
          <ThemeToggle />
          <button
            onClick={handleOpenCalculator}
            title="Scientific Calculator"
            className="flex items-center justify-center p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <CalculatorIcon className="h-5 w-5" />
          </button>
          <NotificationBadge />
          <span className="text-sm text-gray-600 dark:text-gray-300">
            <span className="font-medium">{user?.role}</span>
          </span>

          {/* Update Button */}
          {updateStatus === 'checking' ? (
            <span className="flex items-center px-3 py-1.5 text-xs text-blue-600 dark:text-blue-400">
              <ArrowPathIcon className="h-4 w-4 mr-1.5 animate-spin" />
              Checking...
            </span>
          ) : updateStatus === 'available' ? (
            <button
              onClick={handleInstallUpdate}
              title={`Update to v${newVersion}`}
              className="flex items-center px-3 py-1.5 text-xs font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-full transition-colors"
            >
              <SparklesIcon className="h-4 w-4 mr-1.5" />
              Update v{newVersion}
            </button>
          ) : updateStatus === 'downloaded' ? (
            <button
              onClick={handleInstallUpdate}
              className="flex items-center px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-full transition-colors"
            >
              <CheckCircleIcon className="h-4 w-4 mr-1.5" />
              Restart to Update
            </button>
          ) : (
            <button
              onClick={handleCheckUpdates}
              title="Check for updates"
              className="flex items-center px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <ArrowPathIcon className="h-4 w-4 mr-1.5" />
              Check Update
            </button>
          )}

          <button onClick={handleLogout} className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <ArrowRightOnRectangleIcon className="h-5 w-5 mr-2" />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
