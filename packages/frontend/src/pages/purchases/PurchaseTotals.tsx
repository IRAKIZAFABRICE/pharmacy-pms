import type { PurchaseSummary } from './PurchaseTypes';

interface PurchaseTotalsProps {
  summary: PurchaseSummary;
  className?: string;
}

export default function PurchaseTotals({ summary, className = '' }: PurchaseTotalsProps) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-5 ${className}`}>
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
        Purchase Summary
      </h3>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Items</span>
          <span className="font-medium text-gray-900">{summary.items}</span>
        </div>
        <div className="border-t border-gray-100" />

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Subtotal</span>
          <span className="font-medium text-gray-900">
            {summary.subtotal.toLocaleString()} RWF
          </span>
        </div>

        {summary.discount > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Discount</span>
            <span className="font-medium text-green-600">
              -{summary.discount.toLocaleString()} RWF
            </span>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">VAT (18%)</span>
          <span className="font-medium text-gray-900">
            {summary.taxAmount.toLocaleString()} RWF
          </span>
        </div>

        <div className="border-t-2 border-gray-300 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-gray-900">Grand Total</span>
            <span className="text-lg font-bold text-primary-600">
              {summary.grandTotal.toLocaleString()} RWF
            </span>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3">
        <div className="bg-green-50 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-green-600">{summary.items}</p>
          <p className="text-xs text-gray-500">Items</p>
        </div>
        <div className="bg-primary-50 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-primary-600">
            {(summary.grandTotal > 0 ? (summary.taxAmount / summary.grandTotal * 100).toFixed(1) : '0')}%
          </p>
          <p className="text-xs text-gray-500">Tax Rate</p>
        </div>
      </div>
    </div>
  );
}

