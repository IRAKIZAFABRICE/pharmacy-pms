import { useQuery } from '@tanstack/react-query';
import { XMarkIcon, PrinterIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { fetchPurchaseById } from './PurchaseService';
import PurchaseTable from './PurchaseTable';
import type { PurchaseItem } from './PurchaseTypes';
import { useMemo } from 'react';

interface PurchaseDetailsProps {
  purchaseId: string;
  onClose: () => void;
}

export default function PurchaseDetails({ purchaseId, onClose }: PurchaseDetailsProps) {
  const { data: purchase, isLoading, isError } = useQuery({
    queryKey: ['purchase', purchaseId],
    queryFn: () => fetchPurchaseById(purchaseId),
  });

  // Convert purchase items to PurchaseItem format for the table
  const items: PurchaseItem[] = useMemo(() => {
    if (!purchase?.items) return [];
    return purchase.items.map((item: any) => ({
      productId: item.productId || '',
      productName: item.productName || item.product?.name || '',
      sku: item.sku || item.product?.code || '',
      packSize: item.packSize || item.product?.unitOfMeasure || '',
      quantity: item.quantity || 0,
      batchNo: item.batchNo || '',
      expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().split('T')[0] : '',
      costPrice: item.costPrice || 0,
      sellingPrice: item.sellingPrice || 0,
      discount: item.discount || 0,
      taxRate: item.taxRate || 18,
      taxAmount: item.taxAmount || 0,
      total: item.total || (item.quantity || 0) * (item.costPrice || 0),
      sellingPriceAuto: false,
      manufactureDate: item.manufactureDate || '',
    }));
  }, [purchase]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <ArrowPathIcon className="h-10 w-10 animate-spin text-white" />
      </div>
    );
  }

  if (isError || !purchase) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8 text-center">
          <p className="text-red-500 font-medium">Failed to load purchase details</p>
          <button onClick={onClose} className="mt-3 text-primary-600 text-sm">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-start justify-center z-50 overflow-y-auto pt-10 pb-10">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Purchase Details</h2>
            <p className="text-sm text-gray-500 mt-0.5">Invoice #{purchase.invoiceNo}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <PrinterIcon className="h-4 w-4" />
              Print
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Supplier</p>
              <p className="font-medium text-gray-900 mt-0.5">{purchase.supplierName || '—'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Date</p>
              <p className="font-medium text-gray-900 mt-0.5">
                {new Date(purchase.date).toLocaleDateString()}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Payment</p>
              <p className="font-medium text-gray-900 mt-0.5">{purchase.paymentMethod || '—'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Status</p>
              <p className={`font-medium mt-0.5 ${
                purchase.status === 'RECEIVED' ? 'text-green-600' :
                purchase.status === 'CANCELLED' ? 'text-red-600' : 'text-gray-900'
              }`}>
                {purchase.status}
              </p>
            </div>
          </div>

          {/* Received by */}
          {purchase.createdBy && (
            <div className="text-sm text-gray-500">
              <span className="font-medium">Received by:</span> {purchase.createdBy}
            </div>
          )}

          {/* Items table */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Items ({items.length})</h3>
            <PurchaseTable items={items} onChange={() => {}} readOnly />
          </div>

          {/* Totals */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex justify-end">
              <div className="w-72 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium">{purchase.totalAmount?.toLocaleString() || '0'} RWF</span>
                </div>
                {purchase.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Discount</span>
                    <span className="font-medium text-green-600">-{purchase.discount.toLocaleString()} RWF</span>
                  </div>
                )}
                {purchase.taxAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">VAT</span>
                    <span className="font-medium">{purchase.taxAmount.toLocaleString()} RWF</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold border-t border-gray-300 pt-2">
                  <span>Grand Total</span>
                  <span className="text-primary-600">{purchase.grandTotal?.toLocaleString() || '0'} RWF</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {purchase.notes && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-500">Notes</p>
              <p className="text-sm text-gray-700 mt-1">{purchase.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

