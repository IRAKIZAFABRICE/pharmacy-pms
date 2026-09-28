import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import UpdateChecker from '../components/UpdateChecker';

export default function Settings() {
  const { user } = useAuthStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

const { data: rraConfig } = useQuery({
    queryKey: ['rra-config'],
    queryFn: async () => {
      const response = await api.get('/rra/config');
      return response;
    },
  });

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to change password');
    }
  };

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <div className="space-y-6">
        {/* User Profile */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600">Name</label>
              <p className="font-medium text-gray-900">
                {user?.firstName} {user?.lastName}
              </p>
            </div>
            <div>
              <label className="block text-sm text-gray-600">Email</label>
              <p className="font-medium text-gray-900">{user?.email}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-600">Role</label>
              <p className="font-medium text-gray-900">{user?.role}</p>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                required
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Change Password
            </button>
          </form>
        </div>

        {/* RRA Configuration */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">RRA Configuration</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600">Status</label>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                rraConfig?.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {rraConfig?.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div>
              <label className="block text-sm text-gray-600">API URL</label>
              <p className="font-medium text-gray-900 text-sm">{rraConfig?.apiUrl || 'Not configured'}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-600">TIN</label>
              <p className="font-medium text-gray-900 text-sm">{rraConfig?.tin || 'Not configured'}</p>
            </div>
            <div>
              <label className="block text-sm text-gray-600">Environment</label>
              <p className="font-medium text-gray-900 text-sm">{rraConfig?.environment || 'development'}</p>
            </div>
          </div>
        </div>

        {/* Application Updates */}
        <UpdateChecker />

        {/* System Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">System Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600">Version</label>
              <p className="font-medium text-gray-900">1.0.0</p>
            </div>
            <div>
              <label className="block text-sm text-gray-600">Environment</label>
              <p className="font-medium text-gray-900">
                {import.meta.env.MODE || 'development'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
