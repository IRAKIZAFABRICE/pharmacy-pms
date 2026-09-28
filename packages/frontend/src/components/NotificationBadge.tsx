// packages/frontend/src/components/NotificationBadge.tsx
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BellIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../services/api';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  read: boolean;
  createdAt: string;
  action?: string;
}

export default function NotificationBadge() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.get('/notifications');
      return response;
    },
    refetchInterval: 30000,
  });

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      await api.patch('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/notifications/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.notification-container')) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-400 text-red-700';
      case 'warning':
        return 'bg-yellow-50 border-yellow-400 text-yellow-700';
      default:
        return 'bg-blue-50 border-blue-400 text-blue-700';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'EXPIRY':
        return '⚠️';
      case 'STOCK_OUT':
        return '🔴';
      case 'LOW_STOCK':
        return '🟡';
      case 'SALE':
        return '💰';
      default:
        return '📢';
    }
  };

  const notifications = data?.notifications || [];
  const unreadCount = data?.unreadCount || 0;

  return (
    <div className="relative notification-container">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
      >
        <BellIcon className="h-6 w-6 text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-h-[500px] overflow-hidden bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead.mutate()}
                className="text-sm text-primary-600 hover:text-primary-800 flex items-center"
              >
                <CheckIcon className="h-4 w-4 mr-1" />
                Mark all read
              </button>
            )}
          </div>

          <div className="overflow-y-auto max-h-96">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <BellIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No notifications</p>
                <p className="text-sm">All systems are running smoothly</p>
              </div>
            ) : (
              notifications.map((notification: Notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${notification.read ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getIcon(notification.type)}</span>
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${notification.read ? 'text-gray-500' : 'text-gray-900'}`}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-600 mt-0.5">{notification.message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(notification.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead.mutate(notification.id)}
                          className="text-xs text-primary-500 hover:text-primary-700"
                        >
                          Mark read
                        </button>
                      )}
                      <button
                        onClick={() => {
                          if (window.confirm('Delete this notification?')) {
                            deleteNotification.mutate(notification.id);
                          }
                        }}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {notification.severity && (
                    <div className={`mt-2 text-xs px-2 py-1 rounded-full inline-block ${getSeverityStyles(notification.severity)}`}>
                      {notification.severity.toUpperCase()}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
