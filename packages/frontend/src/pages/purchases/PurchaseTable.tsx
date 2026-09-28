import { useRef, useCallback } from 'react';
import { TrashIcon, PlusIcon } from '@heroicons/react/24/outline';
import type { PurchaseItem } from './PurchaseTypes';

interface PurchaseTableProps {
  items: PurchaseItem[];
  onChange: (items: PurchaseItem[]) => void;
  onPriceCheck?: (productId: string, newPrice: number) => void;
  readOnly?: boolean;
}

export default function PurchaseTable({ items, onChange, onPriceCheck, readOnly = false }: PurchaseTableProps) {
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const updateItem = useCallback((index: number, field: keyof PurchaseItem, value: any) => {
    const updated = items.map((item, i) => {
      if (i !== index) return item;
      const newItem = { ...item, [field]: value };

      // Auto-calculate total
      const qty = field === 'quantity' ? Number(value) : item.quantity;
      const cost = field === 'costPrice' ? Number(value) : item.costPrice;
      const disc = field === 'discount' ? Number(value) : item.discount;
      const taxRate = field === 'taxRate' ? Number(value) : item.taxRate;

      const lineTotal = (qty || 0) * (cost || 0);
      const discountAmt = (disc || 0);
      const taxableAmt = lineTotal - discountAmt;
      const taxAmt = taxableAmt * ((taxRate || 0) / 100);
      const total = taxableAmt + taxAmt;

      newItem.total = total;

      // Auto-calculate selling price with markup
      if (field === 'costPrice' && newItem.sellingPriceAuto !== false) {
        const markup = 1.3; // 30% default markup
        newItem.sellingPrice = Math.round(Number(value) * markup);
      }

      // Trigger price check
      if (field === 'costPrice' && onPriceCheck && item.productId) {
        onPriceCheck(item.productId, Number(value));
      }

      return newItem;
    });
    onChange(updated);
  }, [items, onChange, onPriceCheck]);

  const addRow = useCallback(() => {
    onChange([
      ...items,
      {
        productId: '',
        productName: '',
        sku: '',
        packSize: '',
        quantity: 0,
        batchNo: '',
        expiryDate: '',
        costPrice: 0,
        sellingPrice: 0,
        discount: 0,
        taxRate: 18,
        taxAmount: 0,
        total: 0,
        sellingPriceAuto: true,
      },
    ]);
  }, [items, onChange]);

  const removeRow = useCallback((index: number) => {
    if (items.length <= 1) return;
    onChange(items.filter((_, i) => i !== index));
  }, [items, onChange]);

  const setInputRef = useCallback((id: string, el: HTMLInputElement | null) => {
    if (el) inputRefs.current.set(id, el);
    else inputRefs.current.delete(id);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, rowIndex: number, fieldName: string) => {
    if (e.key === 'Tab' || e.key === 'Enter') {
      e.preventDefault();
      const fieldOrder = ['batchNo', 'quantity', 'costPrice', 'sellingPrice', 'discount', 'expiryDate'];
      const currentIdx = fieldOrder.indexOf(fieldName);

      let nextField: string;
      let nextRow = rowIndex;

      if (currentIdx < fieldOrder.length - 1) {
        nextField = fieldOrder[currentIdx + 1];
      } else {
        nextField = 'batchNo';
        nextRow = rowIndex + 1;
      }

      if (nextRow >= items.length) return;
      const nextId = `${nextRow}-${nextField}`;
      const nextInput = inputRefs.current.get(nextId);
      if (nextInput) nextInput.focus();
    }
  }, [items.length]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Scrollable table wrapper */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-8">#</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[200px]">Medicine</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Pack</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Qty</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-36">Batch</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-36">Expiry</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Buy Price</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Sell Price</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Disc</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">VAT%</th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Total</th>
              {!readOnly && <th className="px-3 py-2.5 text-center w-10"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-3 py-2 text-sm text-gray-400 font-mono">{idx + 1}</td>
                <td className="px-3 py-2">
                  {readOnly ? (
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.productName}</p>
                      <p className="text-xs text-gray-400">{item.sku} | {item.packSize}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.productName || '—'}</p>
                      <p className="text-xs text-gray-400">{item.sku}</p>
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-sm text-gray-600">{item.packSize || '—'}</td>
                <td className="px-3 py-2">
                  {readOnly ? (
                    <span className="text-sm font-medium">{item.quantity}</span>
                  ) : (
                    <input
                      ref={(el) => setInputRef(`${idx}-quantity`, el)}
                      type="number"
                      min="0"
                      value={item.quantity || ''}
                      onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, idx, 'quantity')}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm text-center"
                      placeholder="0"
                    />
                  )}
                </td>
                <td className="px-3 py-2">
                  {readOnly ? (
                    <span className="text-sm font-mono text-gray-700">{item.batchNo}</span>
                  ) : (
                    <input
                      ref={(el) => setInputRef(`${idx}-batchNo`, el)}
                      type="text"
                      value={item.batchNo}
                      onChange={(e) => updateItem(idx, 'batchNo', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, idx, 'batchNo')}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm font-mono"
                      placeholder="BATCH-001"
                    />
                  )}
                </td>
                <td className="px-3 py-2">
                  {readOnly ? (
                    <span className="text-sm">{item.expiryDate}</span>
                  ) : (
                    <input
                      ref={(el) => setInputRef(`${idx}-expiryDate`, el)}
                      type="date"
                      value={item.expiryDate}
                      onChange={(e) => updateItem(idx, 'expiryDate', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, idx, 'expiryDate')}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm"
                    />
                  )}
                </td>
                <td className="px-3 py-2">
                  {readOnly ? (
                    <span className="text-sm font-medium text-right block">{item.costPrice.toLocaleString()}</span>
                  ) : (
                    <input
                      ref={(el) => setInputRef(`${idx}-costPrice`, el)}
                      type="number"
                      min="0"
                      step="1"
                      value={item.costPrice || ''}
                      onChange={(e) => updateItem(idx, 'costPrice', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, idx, 'costPrice')}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm text-right"
                      placeholder="0"
                    />
                  )}
                </td>
                <td className="px-3 py-2">
                  {readOnly ? (
                    <span className="text-sm font-medium text-right block">{item.sellingPrice.toLocaleString()}</span>
                  ) : (
                    <input
                      ref={(el) => setInputRef(`${idx}-sellingPrice`, el)}
                      type="number"
                      min="0"
                      step="1"
                      value={item.sellingPrice || ''}
                      onChange={(e) => {
                        updateItem(idx, 'sellingPrice', e.target.value);
                        updateItem(idx, 'sellingPriceAuto', false);
                      }}
                      onKeyDown={(e) => handleKeyDown(e, idx, 'sellingPrice')}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm text-right"
                      placeholder="Auto"
                    />
                  )}
                </td>
                <td className="px-3 py-2">
                  {readOnly ? (
                    <span className="text-sm text-right block">{item.discount.toLocaleString()}</span>
                  ) : (
                    <input
                      ref={(el) => setInputRef(`${idx}-discount`, el)}
                      type="number"
                      min="0"
                      step="1"
                      value={item.discount || ''}
                      onChange={(e) => updateItem(idx, 'discount', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, idx, 'discount')}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm text-right"
                      placeholder="0"
                    />
                  )}
                </td>
                <td className="px-3 py-2 text-sm text-right">{item.taxRate}%</td>
                <td className="px-3 py-2 text-sm font-semibold text-right">
                  {item.total > 0 ? `${item.total.toLocaleString()}` : '—'}
                </td>
                {!readOnly && (
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      disabled={items.length <= 1}
                      className="text-gray-300 hover:text-red-500 disabled:opacity-30 transition-colors"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!readOnly && (
        <div className="px-4 py-3 border-t border-gray-100">
          <button
            type="button"
            onClick={addRow}
            className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            Add Medicine Row
          </button>
        </div>
      )}

      {items.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">No items added yet</p>
          <p className="text-xs mt-1">Search and select medicines above</p>
        </div>
      )}
    </div>
  );
}

