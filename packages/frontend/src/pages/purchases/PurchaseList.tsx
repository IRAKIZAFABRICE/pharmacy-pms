import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EyeIcon, DocumentDuplicateIcon, ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { fetchPurchases, cancelPurchase } from './PurchaseService';
import PurchaseDetails from './PurchaseDetails';
import type { Purchase } from './PurchaseTypes';

interface PurchaseListProps {
  onNewPurchase: () => void;
  onDuplicate?: (purchase: Purchase) => void;
  refreshKey?: number;
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  RECEIVED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
  PENDING: 'bg-yellow-100 text-yellow-700',
};

export default function PurchaseList({ onNewPurchase, onDuplicate, refreshKey }: PurchaseListProps) {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['purchases', page, statusFilter, refreshKey],
    queryFn: () => fetchPurchases({ page, limit: 20, status: statusFilter || undefined }),
  });

  const purchases: Purchase[] = (data?.data || []).map((p: any) => ({
    ...p,
    // Normalize backend response: backend returns supplier as object, not supplierName string
    supplierName: p.supplierName || p.supplier?.name || 'Unknown',
    grandTotal: p.grandTotal ?? p.totalAmount ?? 0,
  }));
  const pagination = data?.pagination || { page: 1, total: 0, totalPages: 1 };

  async function handleCancel(purchase: Purchase) {
    if (!window.confirm(`Cancel purchase ${purchase.invoiceNo}? This action cannot be undone.`)) return;
    setCancellingId(purchase.id);
    try {
      await cancelPurchase(purchase.id);
      toast.success('Purchase cancelled');
      window.location.reload();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to cancel');
    } finally {
      setCancellingId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <ArrowPathIcon className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500">Failed to load purchases</p>
        <button onClick={() => window.location.reload()} className="text-primary-600 mt-2 text-sm">Retry</button>
      </div>
    );
  }

  return (
    <div>
      {/* Filters bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-lg border-gray-300 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
          >
            <option value="">All Status</option>
            <option value="RECEIVED">Received</option>
            <option value="DRAFT">Draft</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <span className="text-sm text-gray-500">
            {pagination.total} purchase{pagination.total !== 1 ? 'es' : ''}
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Invoice</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Supplier</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {purchases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    <p className="text-sm">No purchases yet</p>
                    <button onClick={onNewPurchase} className="text-primary-600 text-sm mt-1 font-medium hover:underline">
                      Create your first purchase
                    </button>
                  </td>
                </tr>
              ) : (
                purchases.map((purchase) => (
                  <tr key={purchase.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedPurchase(purchase)}
                        className="text-sm font-medium text-primary-600 hover:underline"
                      >
                        {purchase.invoiceNo}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{purchase.supplierName}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(purchase.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-right">
                    {purchase.grandTotal.toLocaleString()} RWF
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[purchase.status] || 'bg-gray-100 text-gray-600'}`}>
                        {purchase.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedPurchase(purchase)}
                          className="p-1.5 text-gray-400 hover:text-primary-600 rounded hover:bg-gray-100"
                          title="View"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        {onDuplicate && (
                          <button
                            onClick={() => onDuplicate(purchase)}
                            className="p-1.5 text-gray-400 hover:text-purple-600 rounded hover:bg-gray-100"
                            title="Duplicate"
                          >
                            <DocumentDuplicateIcon className="h-4 w-4" />
                          </button>
                        )}
                        {purchase.status !== 'CANCELLED' && (
                          <button
                            onClick={() => handleCancel(purchase)}
                            disabled={cancellingId === purchase.id}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-gray-100 disabled:opacity-50"
                            title="Cancel"
                          >
                            {cancellingId === purchase.id ? (
                              <ArrowPathIcon className="h-4 w-4 animate-spin" />
                            ) : (
                              <XMarkIcon className="h-4 w-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-500">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Details modal */}
      {selectedPurchase && (
        <PurchaseDetails
          purchaseId={selectedPurchase.id}
          onClose={() => setSelectedPurchase(null)}
        />
      )}
    </div>
  );
}

