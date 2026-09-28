// packages/frontend/src/pages/Users.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

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

export default function Users() {
  const { user } = useAuthStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<UserForm>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      role: 'PHARMACIST',
    },
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ['users', searchQuery],
    queryFn: async () => {
      const response = await api.get('/users');
      return response.data;
    },
  });

  const createUser = useMutation({
    mutationFn: async (data: UserForm) => {
      const response = await api.post('/users', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('✅ User created successfully');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsModalOpen(false);
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
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsModalOpen(false);
      setEditingId(null);
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
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete user');
    },
  });

  const onSubmit = (data: UserForm) => {
    if (editingId) {
      updateUser.mutate({ id: editingId, data });
    } else {
      createUser.mutate(data);
    }
  };

  const openEditModal = (user: any) => {
    setEditingId(user.id);
    setValue('email', user.email);
    setValue('firstName', user.firstName);
    setValue('lastName', user.lastName);
    setValue('phone', user.phone || '');
    setValue('role', user.role);
    setValue('password', '');
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">👤 User Management</h1>
        {(user?.role === 'ADMIN' || user?.role === 'OWNER') && (
          <button
            onClick={() => {
              setEditingId(null);
              reset({
                email: '',
                password: '',
                firstName: '',
                lastName: '',
                phone: '',
                role: 'PHARMACIST',
              });
              setIsModalOpen(true);
            }}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add User
          </button>
        )}
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users?.map((u: any) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">
                  {u.firstName} {u.lastName}
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
                  {(user?.role === 'ADMIN' || user?.role === 'OWNER') && u.id !== user?.id && (
                    <>
                      <button
                        onClick={() => openEditModal(u)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
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
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingId ? 'Edit User' : 'Add User'}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email *</label>
                <input {...register('email')} type="email" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
                {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Password {editingId && '(Leave blank to keep current)'}</label>
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
                  {isSubmitting ? 'Saving...' : editingId ? 'Update User' : 'Create User'}
                </button>
                <button type="button" onClick={() => { setIsModalOpen(false); reset(); }} className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
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
