// packages/frontend/src/pages/Dashboard.tsx
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  CurrencyDollarIcon,
  ShoppingBagIcon,
  CubeIcon,
  UsersIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const userSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phone: z.string().optional(),
  role: z.enum(['ADMIN', 'OWNER', 'PHARMACIST', 'NURSE', 'ACCOUNTANT']),
});

type UserForm = z.infer<typeof userSchema>;

const ROLE_LABELS: Record<string, string> = {
  ADMIN: '👑 Admin',
  OWNER: '⭐ Owner',
  PHARMACIST: '💊 Pharmacist',
  NURSE: '🩺 Nurse',
  ACCOUNTANT: '💰 Accountant',
};

interface DashboardStats {
  totalSales: number;
  totalTransactions: number;
  totalItemsSold: number;
  salesByPaymentMethod: Array<{ paymentMethod: string; _sum: { totalAmount: number }; _count: number }>;
  topProducts: Array<{ productId: string; _sum: { quantity: number }; product: { name: string } }>;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const { isAuthenticated, token, user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      role: 'PHARMACIST',
    },
  });

  // Dashboard Stats
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      if (!isAuthenticated || !token) return null;
      const response = await api.get('/sales/summary');
      return response;
    },
    enabled: !!isAuthenticated && !!token,
  });

  useEffect(() => {
    if (data) {
      setStats(data);
    }
  }, [data]);

  // Users data
  const { data: users } = useQuery({
    queryKey: ['users-dashboard', searchQuery],
    queryFn: async () => {
      const response = await api.get('/users');
      return response.data;
    },
    enabled: !!isAuthenticated && !!token,
  });

  const createUser = useMutation({
    mutationFn: async (data: UserForm) => {
      const response = await api.post('/users', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('✅ User created successfully');
      queryClient.invalidateQueries({ queryKey: ['users-dashboard'] });
      setIsUserModalOpen(false);
      reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create user');
    },
  });

  const updateUser = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.put(`/users/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('✅ User updated successfully');
      queryClient.invalidateQueries({ queryKey: ['users-dashboard'] });
      setIsUserModalOpen(false);
      setEditingUserId(null);
      reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update user');
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/users/${id}`);
    },
    onSuccess: () => {
      toast.success('✅ User deactivated');
      queryClient.invalidateQueries({ queryKey: ['users-dashboard'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete user');
    },
  });

  const onSubmit = (data: UserForm) => {
    if (editingUserId) {
      updateUser.mutate({ id: editingUserId, data });
    } else {
      createUser.mutate(data);
    }
  };

  const openEditModal = (user: any) => {
    setEditingUserId(user.id);
    setValue('email', user.email);
    setValue('firstName', user.firstName);
    setValue('lastName', user.lastName);
    setValue('phone', user.phone || '');
    setValue('role', user.role);
    setValue('password', '');
    setIsUserModalOpen(true);
  };

  const openAddModal = () => {
    setEditingUserId(null);
    reset({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phone: '',
      role: 'PHARMACIST',
    });
    setIsUserModalOpen(true);
  };

  // User Switch (change current user)
  const switchUser = (targetUser: any) => {
    if (targetUser.id === user?.id) return;
    toast.success(`Switched view to ${targetUser.firstName} ${targetUser.lastName}`);
    // In a real auth system, this would re-login. Here we just show info.
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    console.error('Dashboard error:', error);
  }

  const statsCards = [
    {
      name: 'Total Sales',
      value: `RWF ${stats?.totalSales?.toLocaleString() || 0}`,
      icon: CurrencyDollarIcon,
      color: 'bg-blue-500',
    },
    {
      name: 'Transactions',
      value: stats?.totalTransactions || 0,
      icon: ShoppingBagIcon,
      color: 'bg-green-500',
    },
    {
      name: 'Items Sold',
      value: stats?.totalItemsSold || 0,
      icon: CubeIcon,
      color: 'bg-purple-500',
    },
    {
      name: 'Payment Methods',
      value: stats?.salesByPaymentMethod?.length || 0,
      icon: UsersIcon,
      color: 'bg-orange-500',
    },
  ];

  const paymentData = stats?.salesByPaymentMethod?.map((p) => ({
    name: p.paymentMethod,
    value: p._sum.totalAmount || 0,
  })) || [];

  const productData = stats?.topProducts?.map((p) => ({
    name: p.product?.name || 'Unknown',
    quantity: p._sum.quantity || 0,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Tabs for Dashboard Sections */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex gap-2 border-b border-gray-200 pb-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'overview'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            📊 Overview
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'users'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            👤 Users
          </button>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statsCards.map((stat) => (
              <div key={stat.name} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className={`${stat.color} rounded-lg p-3`}>
                    <stat.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                    <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {stats && stats.totalSales > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Methods</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={paymentData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {paymentData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Top Products</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={productData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="quantity" fill="#0ea5e9" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
            {(user?.role === 'ADMIN' || user?.role === 'OWNER') && (
              <button
                onClick={openAddModal}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add User
              </button>
            )}
          </div>

          <div className="mb-4">
            <div className="relative max-w-md">
              <input
                type="text"
                placeholder="Search users..."
                className="w-full pl-3 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users?.map((u: any) => (
                  <tr key={u.id} className={`hover:bg-gray-50 ${u.id === user?.id ? 'bg-primary-50' : ''}`}>
                    <td className="px-6 py-4 text-sm text-gray-900 flex items-center gap-2">
                      {u.firstName} {u.lastName}
                      {u.id === user?.id && (
                        <span className="px-2 py-0.5 text-xs bg-primary-100 text-primary-800 rounded-full">You</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{u.email}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {u.isActive ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">✅ Active</span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">❌ Inactive</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm space-x-2">
                      {u.id !== user?.id && (
                        <button
                          onClick={() => switchUser(u)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Switch to this user"
                        >
                          <ArrowRightOnRectangleIcon className="h-5 w-5" />
                        </button>
                      )}
                      {(user?.role === 'ADMIN' || user?.role === 'OWNER') && (
                        <>
                          <button onClick={() => openEditModal(u)} className="text-primary-600 hover:text-primary-900">
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          {u.id !== user?.id && (
                            <button
                              onClick={() => {
                                if (window.confirm(`Deactivate ${u.firstName} ${u.lastName}?`)) {
                                  deleteUser.mutate(u.id);
                                }
                              }}
                              className="text-red-600 hover:text-red-900"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(!users || users.length === 0) && (
              <div className="text-center py-8 text-gray-500">No users found.</div>
            )}
          </div>
        </div>
      )}

      {/* User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingUserId ? 'Edit User' : 'Add User'}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email *</label>
                <input {...register('email')} type="email" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
                {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password {editingUserId && '(Leave blank to keep current)'}</label>
                <input {...register('password')} type="password" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
                {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name *</label>
                  <input {...register('firstName')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
                  {errors.firstName && <p className="text-sm text-red-600">{errors.firstName.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name *</label>
                  <input {...register('lastName')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
                  {errors.lastName && <p className="text-sm text-red-600">{errors.lastName.message}</p>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input {...register('phone')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Role *</label>
                <select {...register('role')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500">
                  <option value="ADMIN">👑 Admin</option>
                  <option value="OWNER">⭐ Owner</option>
                  <option value="PHARMACIST">💊 Pharmacist</option>
                  <option value="NURSE">🩺 Nurse</option>
                  <option value="ACCOUNTANT">💰 Accountant</option>
                </select>
                {errors.role && <p className="text-sm text-red-600">{errors.role.message}</p>}
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="submit" disabled={isSubmitting} className="flex-1 py-2 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50">
                  {isSubmitting ? 'Saving...' : editingUserId ? 'Update User' : 'Create User'}
                </button>
                <button type="button" onClick={() => { setIsUserModalOpen(false); reset(); }} className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
