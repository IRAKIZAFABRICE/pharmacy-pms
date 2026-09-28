// packages/frontend/src/pages/Collaborators.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../services/api';

const COLLABORATOR_TYPES = ['PHARMACY', 'DOCTOR', 'HOSPITAL', 'CLINIC', 'HEALTHCARE_INSTITUTION', 'OTHER'];

export default function Collaborators() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    name: '', type: 'DOCTOR', phone: '', email: '', address: '',
    licenseNumber: '', specialization: '', institutionName: '', notes: ''
  });

  const { data: collaborators } = useQuery({
    queryKey: ['collaborators', search],
    queryFn: async () => {
      const response = await api.get(`/collaborators?search=${search}`);
      return response.data;
    },
  });

  const createCollaborator = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/collaborators', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('✅ Collaborator added');
      queryClient.invalidateQueries({ queryKey: ['collaborators'] });
      setShowAddModal(false);
      setForm({ name: '', type: 'DOCTOR', phone: '', email: '', address: '', licenseNumber: '', specialization: '', institutionName: '', notes: '' });
    },
    onError: (error: any) => toast.error(error.response?.data?.error || 'Failed to add collaborator'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCollaborator.mutate(form);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">🤝 Collaborators</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          + Add Collaborator
        </button>
      </div>

      <div className="max-w-md">
        <input
          type="text"
          placeholder="Search collaborators..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Specialization</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Institution</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {collaborators?.map((c: any) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-500">{c.code}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{c.name}</td>
                <td className="px-6 py-4 text-sm">
                  <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">{c.type}</span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{c.phone}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{c.specialization || '-'}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{c.institutionName || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!collaborators || collaborators.length === 0) && (
          <div className="text-center py-8 text-gray-500">No collaborators found.</div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Add Collaborator</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="text" placeholder="Name *" required className="w-full px-3 py-2 border rounded-lg" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <select className="w-full px-3 py-2 border rounded-lg" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {COLLABORATOR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input type="tel" placeholder="Phone *" required className="w-full px-3 py-2 border rounded-lg" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <input type="email" placeholder="Email" className="w-full px-3 py-2 border rounded-lg" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <input type="text" placeholder="Address" className="w-full px-3 py-2 border rounded-lg" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              <input type="text" placeholder="License Number" className="w-full px-3 py-2 border rounded-lg" value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} />
              <input type="text" placeholder="Specialization" className="w-full px-3 py-2 border rounded-lg" value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} />
              <input type="text" placeholder="Institution Name" className="w-full px-3 py-2 border rounded-lg" value={form.institutionName} onChange={(e) => setForm({ ...form, institutionName: e.target.value })} />
              <textarea placeholder="Notes" className="w-full px-3 py-2 border rounded-lg" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              <div className="flex space-x-3">
                <button type="submit" className="flex-1 py-2 bg-primary-600 text-white rounded-lg">Add</button>
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2 bg-gray-200 rounded-lg">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}