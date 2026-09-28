import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  DocumentTextIcon,
  EyeIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

const companySchema = z.object({
  code: z.string().min(1, 'Code is required'),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  coveragePercentage: z.coerce.number().min(0, 'Must be 0-100').max(100, 'Must be 0-100'),
  maxCoverageAmount: z.coerce.number().optional(),
  websiteUrl: z.string().optional(),
});

type CompanyForm = z.infer<typeof companySchema>;

export default function Insurance() {
  const [activeTab, setActiveTab] = useState('companies');
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);
  const [showClaimDetails, setShowClaimDetails] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<CompanyForm>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      coveragePercentage: 80,
    },
  });

  const { data: companies, isLoading: loadingCompanies } = useQuery({
    queryKey: ['insurance-companies'],
    queryFn: async () => {
      const response = await api.get('/insurance/companies');
      return response.data;
    },
  });

  const { data: claims, isLoading: loadingClaims, refetch: refetchClaims } = useQuery({
    queryKey: ['insurance-claims-insurance'],
    queryFn: async () => {
      const response = await api.get('/insurance/claims');
      return response;
    },
  });

  const { data: claimDetails, isLoading: loadingDetails } = useQuery({
    queryKey: ['insurance-claim-detail', selectedClaimId],
    queryFn: async () => {
      if (!selectedClaimId) return null;
      const response = await api.get(`/insurance/claims/${selectedClaimId}`);
      return response;
    },
    enabled: !!selectedClaimId && showClaimDetails,
  });

  // Filter claims by company when dropdown changes
  void useQuery({
    queryKey: ['insurance-claims-by-company', selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return claims;
      const response = await api.get('/insurance/claims', {
        params: { companyId: selectedCompanyId },
      });
      return response;
    },
    enabled: activeTab === 'claims',
  });

  const createCompany = useMutation({
    mutationFn: async (data: CompanyForm) => {
      const response = await api.post('/insurance/companies', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Insurance company created successfully');
      queryClient.invalidateQueries({ queryKey: ['insurance-companies'] });
      setIsCompanyModalOpen(false);
      reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create company');
    },
  });

  const updateCompany = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CompanyForm }) => {
      const response = await api.put(`/insurance/companies/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Insurance company updated');
      queryClient.invalidateQueries({ queryKey: ['insurance-companies'] });
      setIsCompanyModalOpen(false);
      setEditingCompanyId(null);
      reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update company');
    },
  });

  const deleteCompany = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/insurance/companies/${id}`);
    },
    onSuccess: () => {
      toast.success('Company deactivated');
      queryClient.invalidateQueries({ queryKey: ['insurance-companies'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to deactivate');
    },
  });

  const onSubmit = (data: CompanyForm) => {
    if (editingCompanyId) {
      updateCompany.mutate({ id: editingCompanyId, data });
    } else {
      createCompany.mutate(data);
    }
  };

  const openAddModal = () => {
    setEditingCompanyId(null);
    reset({
      code: '',
      name: '',
      description: '',
      coveragePercentage: 80,
      maxCoverageAmount: undefined,
      websiteUrl: '',
    });
    setIsCompanyModalOpen(true);
  };

  const openEditModal = (company: any) => {
    setEditingCompanyId(company.id);
    setValue('code', company.code);
    setValue('name', company.name);
    setValue('description', company.description || '');
    setValue('coveragePercentage', company.coveragePercentage);
    setValue('maxCoverageAmount', company.maxCoverageAmount || undefined);
    setValue('websiteUrl', company.websiteUrl || '');
    setIsCompanyModalOpen(true);
  };

  if (loadingCompanies || loadingClaims) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const pendingClaims = claims?.data?.filter((c: any) => c.status === 'SUBMITTED') || [];
  const canEdit = user?.role === 'ADMIN' || user?.role === 'OWNER' || user?.role === 'MANAGER';

  const viewClaimDetails = (claimId: string) => {
    setSelectedClaimId(claimId);
    setShowClaimDetails(true);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Insurance Management</h1>

      {/* Claimable Amount Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-primary-500">
          <p className="text-sm text-gray-500">Total Claimable</p>
          <p className="text-2xl font-bold text-primary-600">
            RWF {(claims?.summary?.totalCoverageAmount || 0).toLocaleString()}
          </p>
          <p className="text-xs text-gray-400">Total insurance coverage to claim</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <p className="text-sm text-gray-500">Total Claim Amount</p>
          <p className="text-2xl font-bold text-green-600">
            RWF {(claims?.summary?.totalClaimAmount || 0).toLocaleString()}
          </p>
          <p className="text-xs text-gray-400">Total invoice amounts</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
          <p className="text-sm text-gray-500">Pending Claims</p>
          <p className="text-2xl font-bold text-yellow-600">{pendingClaims.length}</p>
          <p className="text-xs text-gray-400">Awaiting approval</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
          <p className="text-sm text-gray-500">Total Copay (Patient)</p>
          <p className="text-2xl font-bold text-orange-600">
            RWF {(claims?.summary?.totalCopayAmount || 0).toLocaleString()}
          </p>
          <p className="text-xs text-gray-400">Patient out-of-pocket amounts</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('companies')}
          className={`pb-2 px-4 ${
            activeTab === 'companies'
              ? 'border-b-2 border-primary-500 text-primary-600 font-medium'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Insurance Companies
        </button>
        <button
          onClick={() => { setActiveTab('claims'); setShowClaimDetails(false); }}
          className={`pb-2 px-4 ${
            activeTab === 'claims'
              ? 'border-b-2 border-primary-500 text-primary-600 font-medium'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Claims & Invoice Details
        </button>
      </div>

      {activeTab === 'companies' && (
        <div>
          <div className="flex justify-end mb-4">
            {canEdit && (
              <button
                onClick={openAddModal}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Insurance Company
              </button>
            )}
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Coverage</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Max Coverage</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Website</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Claims</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  {canEdit && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {companies?.map((company: any) => (
                  <tr key={company.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{company.code}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{company.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{company.coveragePercentage}%</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {company.maxCoverageAmount ? `RWF ${company.maxCoverageAmount.toLocaleString()}` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {company.websiteUrl ? (
                        <a
                          href={company.websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-800 flex items-center gap-1"
                        >
                          <GlobeAltIcon className="h-4 w-4" />
                          <span className="text-xs truncate max-w-[120px]">{company.websiteUrl}</span>
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {company.claims?.length || 0}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        company.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {company.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="px-6 py-4 text-sm space-x-2">
                        <button onClick={() => openEditModal(company)} className="text-primary-600 hover:text-primary-900">
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Deactivate ${company.name}?`)) {
                              deleteCompany.mutate(company.id);
                            }
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'claims' && (
        // ... (claims section unchanged, same as before) ...
        <div>
          <div className="mb-4">
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Companies</option>
              {companies?.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button
              onClick={() => refetchClaims()}
              className="ml-2 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              🔄 Refresh
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Total Claims</p>
              <p className="text-2xl font-bold text-gray-900">{claims?.summary?.totalClaims || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Approved</p>
              <p className="text-2xl font-bold text-green-600">{claims?.summary?.approvedClaims || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{claims?.summary?.pendingClaims || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-sm text-gray-500">Total Coverage</p>
              <p className="text-2xl font-bold text-primary-600">
                RWF {(claims?.summary?.totalCoveragePaid || 0).toLocaleString()}
              </p>
            </div>
          </div>

          {!showClaimDetails ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Claim #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Patient</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Coverage</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Copay</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {claims?.data?.map((claim: any) => (
                    <tr key={claim.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-primary-600">{claim.claimNumber}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{claim.patientName}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{claim.insuranceCompany?.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{claim.sale?.invoiceNumber || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900">RWF {claim.claimAmount?.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-right text-green-600 font-medium">RWF {claim.coverageAmount?.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-right text-orange-600">RWF {claim.copayAmount?.toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          claim.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                          claim.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                          claim.status === 'PAID' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>{claim.status}</span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button onClick={() => viewClaimDetails(claim.id)} className="text-blue-600 hover:text-blue-900">
                          <EyeIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!claims?.data || claims.data.length === 0) && (
                <div className="text-center py-8 text-gray-500">No claims found.</div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">📋 Claim Details</h3>
                <button onClick={() => { setShowClaimDetails(false); setSelectedClaimId(null); }} className="text-sm text-primary-600 hover:text-primary-800">
                  ← Back to Claims
                </button>
              </div>
              {loadingDetails ? (
                <div className="flex justify-center py-4"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
              ) : claimDetails ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-3 rounded-lg"><p className="text-xs text-gray-500">Claim Number</p><p className="font-bold text-gray-900">{claimDetails.claimNumber}</p></div>
                    <div className="bg-green-50 p-3 rounded-lg"><p className="text-xs text-gray-500">Patient</p><p className="font-bold">{claimDetails.patientName}</p></div>
                    <div className="bg-purple-50 p-3 rounded-lg"><p className="text-xs text-gray-500">Insurance</p><p className="font-bold">{claimDetails.insuranceCompany?.name}</p></div>
                    <div className="bg-yellow-50 p-3 rounded-lg"><p className="text-xs text-gray-500">Status</p><span className={`px-2 py-1 rounded-full text-xs font-medium ${claimDetails.status === 'APPROVED' ? 'bg-green-100 text-green-800' : claimDetails.status === 'REJECTED' ? 'bg-red-100 text-red-800' : claimDetails.status === 'PAID' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>{claimDetails.status}</span></div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h4 className="font-medium text-gray-700 mb-3"><DocumentTextIcon className="h-5 w-5 inline mr-1" /> Invoice Details</h4>
                    {claimDetails.sale ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div><span className="text-gray-500">Invoice:</span><span className="ml-2 font-medium">{claimDetails.sale.invoiceNumber}</span></div>
                          <div><span className="text-gray-500">Date:</span><span className="ml-2 font-medium">{new Date(claimDetails.sale.saleDate).toLocaleDateString()}</span></div>
                          <div><span className="text-gray-500">Customer:</span><span className="ml-2">{claimDetails.sale.customerName}</span></div>
                          <div><span className="text-gray-500">Total:</span><span className="ml-2 font-bold text-primary-600">RWF {claimDetails.sale.totalAmount?.toLocaleString()}</span></div>
                        </div>
                        <div className="border rounded-lg overflow-hidden mt-3">
                          <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-100"><tr><th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Product</th><th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Qty</th><th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Price</th><th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Total</th></tr></thead>
                            <tbody className="divide-y divide-gray-200">
                              {claimDetails.sale.saleItems?.map((item: any) => (
                                <tr key={item.id}><td className="px-3 py-2">{item.batch?.product?.name || 'Unknown'}</td><td className="px-3 py-2 text-right">{item.quantity}</td><td className="px-3 py-2 text-right">RWF {item.unitPrice?.toLocaleString()}</td><td className="px-3 py-2 text-right font-medium">RWF {item.totalPrice?.toLocaleString()}</td></tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-gray-200 space-y-1 text-sm">
                          <div className="flex justify-between"><span className="text-gray-500">Claim Amount</span><span className="font-medium">RWF {claimDetails.claimAmount?.toLocaleString()}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Coverage ({claimDetails.insuranceCompany?.coveragePercentage}%)</span><span className="font-medium text-green-600">RWF {claimDetails.coverageAmount?.toLocaleString()}</span></div>
                          <div className="flex justify-between pt-1 border-t border-gray-200"><span className="font-medium">Patient Copay</span><span className="font-medium text-orange-600">RWF {claimDetails.copayAmount?.toLocaleString()}</span></div>
                        </div>
                      </div>
                    ) : (<p className="text-sm text-gray-500">No invoice details available</p>)}
                  </div>
                </div>
              ) : (<div className="text-center py-8 text-gray-500">Claim not found.</div>)}
            </div>
          )}
        </div>
      )}

      {/* Company Add/Edit Modal */}
      {isCompanyModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingCompanyId ? 'Edit Insurance Company' : 'Add Insurance Company'}
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
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea {...register('description')} rows={2} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Coverage % *</label>
                  <input {...register('coveragePercentage')} type="number" min="0" max="100" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
                  {errors.coveragePercentage && <p className="text-sm text-red-600">{errors.coveragePercentage.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Max Coverage Amount</label>
                  <input {...register('maxCoverageAmount')} type="number" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" placeholder="Optional" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  <GlobeAltIcon className="h-4 w-4 inline mr-1" />
                  Website URL (for POS insurance navigation)
                </label>
                <input {...register('websiteUrl')} type="url" placeholder="https://example.com" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
                <p className="text-xs text-gray-400 mt-1">This URL will be used in POS when processing insurance payments</p>
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="submit" className="flex-1 py-2 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                  {editingCompanyId ? 'Update' : 'Create'}
                </button>
                <button type="button" onClick={() => { setIsCompanyModalOpen(false); setEditingCompanyId(null); reset(); }} className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
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
