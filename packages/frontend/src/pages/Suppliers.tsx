// packages/frontend/src/pages/Suppliers.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

const supplierSchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  tin: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().min(1, 'Phone is required'),
  address: z.string().optional(),
  contactPerson: z.string().optional(),
});

type SupplierForm = z.infer<typeof supplierSchema>;

export default function Suppliers() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<SupplierForm>({
    resolver: zodResolver(supplierSchema),
  });

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers', searchQuery],
    queryFn: async () => {
      const response = await api.get('/suppliers', {
        params: { search: searchQuery || undefined, limit: 100 },
      });
      return response.data;
    },
  });

  const createSupplier = useMutation({
    mutationFn: async (data: SupplierForm) => {
      const response = await api.post('/suppliers', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Supplier created successfully');
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setIsModalOpen(false);
      reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create supplier');
    },
  });

  const updateSupplier = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: SupplierForm }) => {
      const response = await api.put(`/suppliers/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Supplier updated successfully');
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setIsModalOpen(false);
      setEditingId(null);
      reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update supplier');
    },
  });

  const deleteSupplier = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/suppliers/${id}`);
    },
    onSuccess: () => {
      toast.success('Supplier deactivated');
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete supplier');
    },
  });

  const onSubmit = (data: SupplierForm) => {
    if (editingId) {
      updateSupplier.mutate({ id: editingId, data });
    } else {
      createSupplier.mutate(data);
    }
  };

  const openEditModal = (supplier: any) => {
    setEditingId(supplier.id);
    setValue('code', supplier.code);
    setValue('name', supplier.name);
    setValue('phone', supplier.phone);
    setValue('tin', supplier.tin || '');
    setValue('email', supplier.email || '');
    setValue('address', supplier.address || '');
    setValue('contactPerson', supplier.contactPerson || '');
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setEditingId(null);
    reset({
      code: '',
      name: '',
      phone: '',
      tin: '',
      email: '',
      address: '',
      contactPerson: '',
    });
    setIsModalOpen(true);
  };

  const canEdit = user?.role === 'ADMIN' || user?.role === 'OWNER' || user?.role === 'MANAGER';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
        {canEdit && (
          <button
            onClick={openAddModal}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            New Supplier
          </button>
        )}
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search suppliers..."
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {suppliers?.map((supplier: any) => (
              <tr key={supplier.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{supplier.code}</td>
                <td className="px-6 py-4 text-sm text-gray-900">{supplier.name}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{supplier.phone}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{supplier.contactPerson || '-'}</td>
                <td className="px-6 py-4 text-sm space-x-2">
                  <button
                    onClick={() => openEditModal(supplier)}
                    className="text-primary-600 hover:text-primary-900"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Deactivate this supplier?')) {
                        deleteSupplier.mutate(supplier.id);
                      }
                    }}
                    className="text-red-600 hover:text-red-900"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!suppliers || suppliers.length === 0) && (
          <div className="text-center py-8 text-gray-500">No suppliers found.</div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingId ? 'Edit Supplier' : 'New Supplier'}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Code *</label>
                <input {...register('code')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
                {errors.code && <p className="text-sm text-red-600">{errors.code.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Name *</label>
                <input {...register('name')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
                {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone *</label>
                <input {...register('phone')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
                {errors.phone && <p className="text-sm text-red-600">{errors.phone.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input {...register('email')} type="email" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
                {errors.email && <p className="text-sm text-red-600">{errors.email.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">TIN</label>
                <input {...register('tin')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Contact Person</label>
                <input {...register('contactPerson')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <input {...register('address')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="submit" className="flex-1 py-2 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                  {editingId ? 'Update' : 'Create'}
                </button>
                <button type="button" onClick={() => { setIsModalOpen(false); setEditingId(null); reset(); }} className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
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
