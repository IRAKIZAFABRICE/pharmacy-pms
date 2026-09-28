import { useState, useMemo } from 'react';
import { ArrowPathIcon, CheckCircleIcon, DocumentArrowDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import SupplierSelector from './SupplierSelector';
import MedicineSearch from './MedicineSearch';
import PurchaseTable from './PurchaseTable';
import PurchaseTotals from './PurchaseTotals';
import { createPurchaseInvoice, saveDraftPurchase, fetchLastInvoice, duplicateLastPurchase, checkPriceChange } from './PurchaseService';
import type { PurchaseFormData, PurchaseItem, PurchaseSummary, Supplier, Medicine } from './PurchaseTypes';

interface PurchaseFormProps {
  onClose: () => void;
  onSaved: () => void;
  initialData?: Partial<PurchaseFormData>;
}

export default function PurchaseForm({ onClose, onSaved, initialData }: PurchaseFormProps) {
  const [supplierId, setSupplierId] = useState(initialData?.supplierId || '');
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [invoiceNo, setInvoiceNo] = useState(initialData?.invoiceNo || `INV-${Date.now().toString().slice(-6)}`);
  const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK' | 'CREDIT'>(initialData?.paymentMethod || 'CASH');
  const [dueDate, setDueDate] = useState(initialData?.dueDate || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [items, setItems] = useState<PurchaseItem[]>(initialData?.items || []);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);

  const summary = useMemo<PurchaseSummary>(() => {
    const totalItems = items.length;
    const subtotal = items.reduce((sum, item) => sum + (item.quantity || 0) * (item.costPrice || 0), 0);
    const discount = items.reduce((sum, item) => sum + (item.discount || 0), 0);
    const taxableAmt = subtotal - discount;
    const taxAmount = items.reduce((sum, item) => {
      const lineQty = item.quantity || 0;
      const lineCost = item.costPrice || 0;
      const lineDisc = item.discount || 0;
      const lineTotal = (lineQty * lineCost) - lineDisc;
      return sum + (lineTotal * (item.taxRate || 0) / 100);
    }, 0);
    const grandTotal = taxableAmt + taxAmount;

    return {
      items: totalItems,
      subtotal: Math.round(subtotal),
      discount: Math.round(discount),
      taxAmount: Math.round(taxAmount),
      grandTotal: Math.round(grandTotal),
    };
  }, [items]);

  // Validation
  const errors = useMemo(() => {
    const errs: string[] = [];
    if (!supplierId) errs.push('Supplier is required');
    if (!invoiceNo) errs.push('Invoice number is required');
    const invalidItems = items.filter(
      (item) => !item.quantity || item.quantity <= 0 || !item.batchNo || !item.expiryDate || !item.costPrice || item.costPrice <= 0
    );
    if (invalidItems.length > 0) errs.push(`${invalidItems.length} item(s) have missing or invalid fields (Qty, Batch, Expiry, Cost)`);
    return errs;
  }, [supplierId, invoiceNo, items]);

  function handleSelectMedicine(medicine: Medicine) {
    setItems((prev) => [
      ...prev,
      {
        productId: medicine.id,
        productName: medicine.name,
        sku: medicine.code || '',
        packSize: medicine.unitOfMeasure || '',
        quantity: 0,
        batchNo: '',
        expiryDate: '',
        costPrice: medicine.costPrice || 0,
        sellingPrice: (medicine.costPrice || 0) * 1.3,
        discount: 0,
        taxRate: medicine.category?.toLowerCase().includes('exempt') ? 0 : 18,
        taxAmount: 0,
        total: 0,
        sellingPriceAuto: true,
      },
    ]);
    toast.success(`Added ${medicine.name}`);
  }

  function handleItemsChange(newItems: PurchaseItem[]) {
    setItems(newItems);
  }

  async function handlePriceCheck(productId: string, newPrice: number) {
    if (!supplierId) return;
    try {
      await checkPriceChange(supplierId, productId, newPrice);
    } catch {
      // Silent fail for price checks
    }
  }

  async function handleLoadLastInvoice() {
    if (!supplierId) { toast.error('Select a supplier first'); return; }
    setIsLoadingInvoice(true);
    try {
      const result = await fetchLastInvoice(supplierId);
      if (!result.hasInvoice || !result.items?.length) {
        toast.error('No previous invoice found for this supplier');
        return;
      }
      const existingIds = new Set(items.map((i) => i.productId));
      let added = 0;
      result.items.forEach((item: any) => {
        if (existingIds.has(item.productId)) return;
        setItems((prev) => [
          ...prev,
          {
            productId: item.productId,
            productName: item.productName || item.product?.name || '',
            sku: item.product?.code || '',
            packSize: item.packSize || item.product?.unitOfMeasure || '',
            quantity: 0,
            batchNo: '',
            expiryDate: '',
            costPrice: item.costPrice || 0,
            sellingPrice: item.sellingPrice || (item.costPrice || 0) * 1.3,
            discount: 0,
            taxRate: 18,
            taxAmount: 0,
            total: 0,
            sellingPriceAuto: true,
          },
        ]);
        added++;
      });
      toast.success(`Added ${added} products from last invoice`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to load last invoice');
    } finally {
      setIsLoadingInvoice(false);
    }
  }

  async function handleDuplicate() {
    if (!supplierId) { toast.error('Select a supplier first'); return; }
    setIsDuplicating(true);
    try {
      const result = await duplicateLastPurchase(supplierId);
      if (!result.success || !result.items?.length) {
        toast.error('No previous invoice to duplicate');
        return;
      }
      setInvoiceNo(result.invoiceNo || invoiceNo);
      const existingIds = new Set(items.map((i) => i.productId));
      let added = 0;
      result.items.forEach((item: any) => {
        if (existingIds.has(item.productId)) return;
        setItems((prev) => [
          ...prev,
          {
            productId: item.productId,
            productName: item.productName || '',
            sku: item.sku || '',
            packSize: item.packSize || '',
            quantity: 0,
            batchNo: '',
            expiryDate: '',
            costPrice: item.costPrice || 0,
            sellingPrice: item.sellingPrice || (item.costPrice || 0) * 1.3,
            discount: 0,
            taxRate: 18,
            taxAmount: 0,
            total: 0,
            sellingPriceAuto: true,
          },
        ]);
        added++;
      });
      toast.success(`Duplicated ${added} products from last invoice`);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to duplicate invoice');
    } finally {
      setIsDuplicating(false);
    }
  }

  async function handleSave(e: React.MouseEvent, action: 'save' | 'draft' = 'save') {
    e.preventDefault();
    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }

    const payload: PurchaseFormData = {
      supplierId,
      invoiceNo,
      date,
      paymentMethod,
      dueDate: paymentMethod === 'CREDIT' ? dueDate : undefined,
      notes: notes || undefined,
      items: items.map((item) => ({
        ...item,
        quantity: Number(item.quantity),
        costPrice: Number(item.costPrice),
        sellingPrice: Number(item.sellingPrice),
        discount: Number(item.discount),
        taxRate: Number(item.taxRate),
      })),
    };

    setIsSaving(true);
    try {
      if (action === 'draft') {
        await saveDraftPurchase(payload);
        toast.success('Draft saved!');
      } else {
        await createPurchaseInvoice(payload);
        toast.success('Purchase saved! Stock has been updated.');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save purchase');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-40 overflow-y-auto pt-4 pb-8">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl mx-4 my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-xl z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900">New Purchase Invoice</h2>
            <p className="text-sm text-gray-500 mt-0.5">Enter supplier, search medicines, add quantities</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="flex flex-col lg:flex-row">
          {/* Main form area */}
          <div className="flex-1 p-6 space-y-5">
            {/* Header fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg">
              <SupplierSelector value={supplierId} onChange={(id, s) => { setSupplierId(id); setSupplier(s); }} />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={invoiceNo}
                  onChange={(e) => setInvoiceNo(e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  placeholder="INV-000001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK">Bank Transfer</option>
                  <option value="CREDIT">Credit</option>
                </select>
              </div>
            </div>

            {paymentMethod === 'CREDIT' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-3">
                <span className="text-sm text-yellow-800">Credit payment selected:</span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="rounded-md border-yellow-300 shadow-sm focus:border-yellow-500 focus:ring-yellow-500 text-sm"
                />
                <span className="text-xs text-yellow-600">Due date</span>
              </div>
            )}

            {/* Supplier credit info */}
            {supplier && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-2 text-sm text-blue-700 flex items-center gap-4">
                <span className="font-medium">{supplier.name}</span>
                <span>TIN: {supplier.tin || 'N/A'}</span>
              </div>
            )}

            {/* Medicine Search */}
<MedicineSearch onSelect={handleSelectMedicine} />

            {/* Quick actions */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleLoadLastInvoice}
                disabled={isLoadingInvoice || !supplierId}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50 text-sm font-medium transition-colors"
              >
                {isLoadingInvoice ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <ArrowPathIcon className="h-4 w-4" />}
                Load Last Invoice
              </button>
              <button
                type="button"
                onClick={handleDuplicate}
                disabled={isDuplicating || !supplierId}
                className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 disabled:opacity-50 text-sm font-medium transition-colors"
              >
                {isDuplicating ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <ArrowPathIcon className="h-4 w-4" />}
                Duplicate Previous
              </button>
            </div>

            {/* Items table */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Medicines</h3>
              <PurchaseTable
                items={items}
                onChange={handleItemsChange}
                onPriceCheck={handlePriceCheck}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                placeholder="Optional notes or comments..."
              />
            </div>
          </div>

          {/* Right sidebar - summary & actions */}
          <div className="w-full lg:w-80 xl:w-96 p-6 border-t lg:border-t-0 lg:border-l border-gray-200 bg-gray-50/50">
            <PurchaseTotals summary={summary} />

            {errors.length > 0 && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-red-700 mb-1">Please fix:</p>
                <ul className="list-disc list-inside text-xs text-red-600 space-y-0.5">
                  {errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 space-y-2">
              <button
                type="button"
                onClick={(e) => handleSave(e, 'save')}
                disabled={isSaving || errors.length > 0}
                className="w-full py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2 transition-colors"
              >
                {isSaving ? (
                  <><ArrowPathIcon className="h-5 w-5 animate-spin" /> Saving...</>
                ) : (
                  <><CheckCircleIcon className="h-5 w-5" /> Save & Receive Stock</>
                )}
              </button>
              <button
                type="button"
                onClick={(e) => handleSave(e, 'draft')}
                disabled={isSaving}
                className="w-full py-2.5 px-4 bg-white border-2 border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <DocumentArrowDownIcon className="h-5 w-5" />
                Save Draft
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 px-4 bg-white text-gray-500 rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

