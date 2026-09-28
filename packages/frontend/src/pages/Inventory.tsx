// packages/frontend/src/pages/Inventory.tsx
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  PencilIcon,
  MinusCircleIcon,
  EyeIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';

const batchSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  batchNumber: z.string().min(1, 'Batch number is required'),
  expiryDate: z.string().min(1, 'Expiry date is required'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  containerSize: z.coerce.number().min(1, 'Container size is required'),
  costPrice: z.coerce.number().min(0, 'Cost price must be positive'),
  sellingPrice: z.coerce.number().min(0, 'Selling price must be positive'),
  supplierId: z.string().optional(),
});

type BatchForm = z.infer<typeof batchSchema>;

interface Product {
  id: string;
  code: string;
  name: string;
  category: string | null;
  unitOfMeasure: string;
  batches: any[];
}

export default function Inventory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const productIdFilter = searchParams.get('productId');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch single product for header display when filtered by productId
  const { data: filteredProduct } = useQuery({
    queryKey: ['product', productIdFilter],
    queryFn: async () => {
      if (!productIdFilter) return null;
      const response = await api.get(`/products/${productIdFilter}`);
      return response;
    },
    enabled: !!productIdFilter,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [selectedBatchDetails, setSelectedBatchDetails] = useState<any>(null);
  const [editableBatch, setEditableBatch] = useState<any>(null);
  const [adjustmentQty, setAdjustmentQty] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [markup, setMarkup] = useState(1.5);
  const [invoiceAmount, setInvoiceAmount] = useState<number>(0);
  const [calculatedTotal, setCalculatedTotal] = useState<number>(0);
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<BatchForm>({
    resolver: zodResolver(batchSchema),
    defaultValues: {
      quantity: 0,
      containerSize: 0,
      costPrice: 0,
      sellingPrice: 0,
      batchNumber: '',
    },
  });

  const watchedProductId = watch('productId');

  const costPrice = watch('costPrice');
  const sellingPrice = watch('sellingPrice');

  useEffect(() => {
    if (editableBatch) {
      const total = (editableBatch.quantity || 0) * (editableBatch.costPrice || 0);
      setCalculatedTotal(total);
    }
  }, [editableBatch]);

  const calculateSellingPrice = (cost: number) => {
    return Math.round(cost * markup);
  };

  const onCostPriceChange = (value: number) => {
    if (value > 0) {
      const calculated = calculateSellingPrice(value);
      setValue('sellingPrice', calculated);
    }
  };

  const onMarkupChange = (value: number) => {
    setMarkup(value);
    if (costPrice > 0) {
      const calculated = Math.round(costPrice * value);
      setValue('sellingPrice', calculated);
    }
  };

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products-with-stock'],
    queryFn: async () => {
      const response = await api.get('/products', { params: { limit: 100 } });
      return response.data;
    },
  });

  const { data: batches, isLoading: batchesLoading } = useQuery({
    queryKey: ['batches', searchQuery, productIdFilter],
    queryFn: async () => {
      const response = await api.get('/batches', {
        params: { 
          search: searchQuery || undefined, 
          limit: 100,
          productId: productIdFilter || undefined,
        },
      });
      return response.data;
    },
  });

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const response = await api.get('/suppliers');
      return response.data;
    },
  });

  const { data: expiring } = useQuery({
    queryKey: ['expiring-batches'],
    queryFn: async () => {
      const response = await api.get('/batches/expiring', {
        params: { days: 30 },
      });
      return response.data;
    },
  });

  const { data: lowStock } = useQuery({
    queryKey: ['low-stock'],
    queryFn: async () => {
      const response = await api.get('/batches/low-stock');
      return response.data;
    },
  });

  const saveBatch = useMutation({
    mutationFn: async (data: BatchForm) => {
      if (editingBatchId) {
        const response = await api.patch(`/batches/${editingBatchId}/adjust`, {
          quantity: data.quantity,
          reason: 'Stock adjustment',
          notes: 'Updated via inventory',
        });
        return response;
      } else {
        const response = await api.post('/batches/receive', {
          ...data,
          isConfirmed: false,
        });
        return response;
      }
    },
    onSuccess: (data: any) => {
      if (!editingBatchId && data?.existing === true) {
        toast.success('📦 Batch already exists — stock quantity incremented!');
      } else {
        toast.success(editingBatchId ? '✅ Stock updated successfully!' : '✅ Stock added successfully!');
      }
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-with-stock'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock'] });
      setIsModalOpen(false);
      setEditingBatchId(null);
      reset();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to save stock');
    },
  });

  const confirmBatch = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.patch(`/batches/${id}/confirm`, data);
      return response;
    },
    onSuccess: () => {
      toast.success('✅ Batch confirmed and added to stock!');
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-with-stock'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock'] });
      setIsConfirmModalOpen(false);
      setSelectedBatchId(null);
      setInvoiceAmount(0);
      setCalculatedTotal(0);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to confirm batch');
    },
  });

  const adjustStock = useMutation({
    mutationFn: async ({ id, quantity, reason }: { id: string; quantity: number; reason: string }) => {
      const response = await api.patch(`/batches/${id}/adjust`, { quantity, reason });
      return response;
    },
    onSuccess: () => {
      toast.success('✅ Stock adjusted successfully');
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-with-stock'] });
      queryClient.invalidateQueries({ queryKey: ['low-stock'] });
      setIsAdjustModalOpen(false);
      setAdjustmentQty(0);
      setAdjustmentReason('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to adjust stock');
    },
  });

  const onSubmit = (data: BatchForm) => {
    saveBatch.mutate(data);
  };

  const openAddModal = () => {
    setEditingBatchId(null);
    reset({
      productId: '',
      batchNumber: '',
      expiryDate: '',
      quantity: 0,
      containerSize: 0,
      costPrice: 0,
      sellingPrice: 0,
      supplierId: '',
    });
    setIsModalOpen(true);
  };

  // ✅ DUPLICATE LAST BATCH
  const duplicateLastBatch = () => {
    if (!watchedProductId) {
      toast.error('Please select a product first');
      return;
    }
    const productBatches = (batches || [])
      .filter((b: any) => b.productId === watchedProductId)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const lastBatch = productBatches[0];
    if (!lastBatch) {
      toast.error('No previous batch found for this product');
      return;
    }

    const nextBatchNumber = `BATCH-${String(productBatches.length + 1).padStart(3, '0')}`;
    
    setValue('batchNumber', nextBatchNumber);
    setValue('expiryDate', lastBatch.expiryDate ? new Date(new Date(lastBatch.expiryDate).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : '');
    setValue('containerSize', lastBatch.containerSize || lastBatch.quantity || 0);
    setValue('quantity', lastBatch.quantity || 0);
    setValue('costPrice', lastBatch.costPrice || 0);
    setValue('sellingPrice', lastBatch.sellingPrice || 0);
    setValue('supplierId', lastBatch.supplierId || '');
    
    toast.success(`📋 Duplicated last batch: ${lastBatch.batchNumber}`);
  };

  const openEditModal = (batch: any) => {
    setEditingBatchId(batch.id);
    setValue('productId', batch.productId);
    setValue('batchNumber', batch.batchNumber);
    setValue('expiryDate', batch.expiryDate.split('T')[0]);
    setValue('quantity', batch.quantity);
    setValue('containerSize', batch.containerSize || batch.quantity);
    setValue('costPrice', batch.costPrice);
    setValue('sellingPrice', batch.sellingPrice);
    setValue('supplierId', batch.supplierId || '');
    setIsModalOpen(true);
  };

  const openConfirmModal = (batch: any) => {
    setSelectedBatchId(batch.id);
    setEditableBatch({
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate.split('T')[0],
      containerSize: batch.containerSize || batch.quantity,
      quantity: batch.quantity,
      costPrice: batch.costPrice,
      sellingPrice: batch.sellingPrice,
      supplierId: batch.supplierId || '',
    });
    setInvoiceAmount(0);
    setCalculatedTotal((batch.quantity || 0) * (batch.costPrice || 0));
    setIsConfirmModalOpen(true);
  };

  const openDetailsModal = (batch: any) => {
    setSelectedBatchDetails(batch);
    setIsDetailsModalOpen(true);
  };

  const openAdjustModal = (batch: any) => {
    setSelectedBatchId(batch.id);
    setSelectedBatchDetails(batch);
    setAdjustmentQty(0);
    setAdjustmentReason('');
    setIsAdjustModalOpen(true);
  };

  const handleConfirm = () => {
    if (!selectedBatchId || !editableBatch) return;
    
    if (invoiceAmount > 0) {
      const total = (editableBatch.quantity || 0) * (editableBatch.costPrice || 0);
      if (Math.abs(total - invoiceAmount) >= 1) {
        toast.error(`❌ Invoice mismatch! Difference: RWF ${(total - invoiceAmount).toLocaleString()}`);
        return;
      }
    }
    
    confirmBatch.mutate({ id: selectedBatchId, data: editableBatch });
  };

  const handleAdjust = () => {
    if (!selectedBatchId) return;
    if (adjustmentQty === 0) {
      toast.error('Adjustment quantity must be non-zero');
      return;
    }
    if (!adjustmentReason) {
      toast.error('Please provide a reason for the adjustment');
      return;
    }
    adjustStock.mutate({ id: selectedBatchId, quantity: adjustmentQty, reason: adjustmentReason });
  };

  const getProductsWithStock = () => {
    if (!products) return [];
    return products.map((product: Product) => {
      const totalStock = product.batches?.reduce((sum: number, b: any) => sum + b.quantity, 0) || 0;
      return {
        ...product,
        totalStock,
        hasStock: totalStock > 0,
        batchCount: product.batches?.length || 0,
      };
    });
  };

  const productsWithStock = getProductsWithStock();
  const pendingBatches = batches?.filter((b: any) => b.isConfirmed === false || b.isConfirmed === undefined) || [];
  const confirmedBatches = batches?.filter((b: any) => b.isConfirmed === true) || [];

  if (productsLoading || batchesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {productIdFilter && (
            <button
              onClick={() => setSearchParams({})}
              className="text-gray-500 hover:text-gray-700"
              title="Back to all inventory"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {productIdFilter && filteredProduct ? `Inventory: ${filteredProduct.name}` : 'Inventory'}
            </h1>
            {productIdFilter && filteredProduct && (
              <p className="text-sm text-gray-500">Code: {filteredProduct.code} | {filteredProduct.category || 'General'} | {filteredProduct.unitOfMeasure || 'Tablet'}</p>
            )}
          </div>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Stock
        </button>
      </div>

      {pendingBatches.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-yellow-800">Pending Confirmation</p>
              <p className="text-sm text-yellow-700">
                {pendingBatches.length} batches need to be confirmed before they can be sold
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {expiring && expiring.data?.length > 0 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-2" />
              <p className="text-sm text-yellow-700">
                {expiring.data.length} batches expiring in 30 days
              </p>
            </div>
          </div>
        )}
        {lowStock && lowStock.data?.length > 0 && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-sm text-red-700">
                {lowStock.data.length} products below reorder level
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search inventory by batch, product, or supplier..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {pendingBatches.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">⏳ Pending Confirmation</h2>
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Composition</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Selling</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingBatches.map((batch: any) => (
                  <tr key={batch.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{batch.batchNumber}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{batch.product?.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{batch.product?.subCategory || batch.product?.category || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{batch.quantity}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">RWF {batch.costPrice}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">RWF {batch.sellingPrice}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(batch.expiryDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm space-x-2">
                      <button onClick={() => openConfirmModal(batch)} className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700">
                        Confirm
                      </button>
                      <button onClick={() => openEditModal(batch)} className="text-primary-600 hover:text-primary-900">
                        <PencilIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {confirmedBatches.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">✅ Confirmed Stock</h2>
          <div className="bg-white rounded-lg shadow overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Composition</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Selling</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expiry</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {confirmedBatches.map((batch: any) => (
                  <tr key={batch.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{batch.batchNumber}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{batch.product?.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{batch.product?.subCategory || batch.product?.category || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{batch.quantity}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">RWF {batch.sellingPrice}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(batch.expiryDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{batch.supplier?.name || '-'}</td>
                    <td className="px-6 py-4 text-sm space-x-2">
                      <button
                        onClick={() => openDetailsModal(batch)}
                        className="text-blue-600 hover:text-blue-900"
                        title="View details"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openAdjustModal(batch)}
                        className="text-orange-600 hover:text-orange-900"
                        title="Adjust stock"
                      >
                        <MinusCircleIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {pendingBatches.length === 0 && confirmedBatches.length === 0 && productsWithStock.length === 0 && (
        <div className="text-center py-8 text-gray-500">No inventory found.</div>
      )}

      {pendingBatches.length === 0 && confirmedBatches.length === 0 && productsWithStock.length > 0 && (
        <div className="text-center py-8 text-gray-500">Products exist but no stock added yet.</div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingBatchId ? 'Edit Stock' : 'Add Stock'}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Product *</label>
                <select {...register('productId')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" disabled={!!editingBatchId}>
                  <option value="">Select product...</option>
                  {products?.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                  ))}
                </select>
                {errors.productId && <p className="text-sm text-red-600">{errors.productId.message}</p>}
                {!editingBatchId && watchedProductId && (
                  <button
                    type="button"
                    onClick={duplicateLastBatch}
                    className="mt-2 text-xs text-primary-600 hover:text-primary-800 flex items-center"
                  >
                    <PlusIcon className="h-3 w-3 mr-1" />
                    Duplicate Last Batch
                  </button>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Batch Number *</label>
                <input {...register('batchNumber')} type="text" placeholder="e.g., BATCH-001" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
                {errors.batchNumber && <p className="text-sm text-red-600">{errors.batchNumber.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Expiry Date *</label>
                <input {...register('expiryDate')} type="date" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
                {errors.expiryDate && <p className="text-sm text-red-600">{errors.expiryDate.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Container Size *</label>
                <input {...register('containerSize')} type="number" placeholder="100" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
                {errors.containerSize && <p className="text-sm text-red-600">{errors.containerSize.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Total Quantity *</label>
                <input {...register('quantity')} type="number" placeholder="100" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
                {errors.quantity && <p className="text-sm text-red-600">{errors.quantity.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Cost Price (per unit)</label>
                <input {...register('costPrice')} type="number" placeholder="50" onChange={(e) => { const val = parseFloat(e.target.value) || 0; onCostPriceChange(val); }} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
                {errors.costPrice && <p className="text-sm text-red-600">{errors.costPrice.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Markup (×)</label>
                <div className="flex items-center gap-2">
                  <input type="range" min="1.0" max="3.0" step="0.1" value={markup} onChange={(e) => onMarkupChange(parseFloat(e.target.value))} className="flex-1" />
                  <span className="w-16 text-center font-bold text-primary-600">{markup.toFixed(1)}×</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Selling Price (per unit) *</label>
                <input {...register('sellingPrice')} type="number" placeholder="100" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Cost: RWF {costPrice || 0}</span>
                  <span>Markup: {markup}×</span>
                  <span className="font-bold text-primary-600">Profit: RWF {(sellingPrice || 0) - (costPrice || 0)}</span>
                </div>
                {errors.sellingPrice && <p className="text-sm text-red-600">{errors.sellingPrice.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Supplier</label>
                <select {...register('supplierId')} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500">
                  <option value="">Select supplier...</option>
                  {suppliers?.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex space-x-3 pt-4">
                <button type="submit" disabled={saveBatch.isPending} className="flex-1 py-2 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50">
                  {saveBatch.isPending ? 'Saving...' : editingBatchId ? 'Update Stock' : 'Add Stock'}
                </button>
                <button type="button" onClick={() => { setIsModalOpen(false); setEditingBatchId(null); reset(); }} className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Confirm Stock</h2>
            <p className="text-sm text-gray-500 mb-4">Review and confirm before adding to stock.</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Batch Number</label>
                <input value={editableBatch?.batchNumber} onChange={(e) => setEditableBatch({ ...editableBatch, batchNumber: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Expiry Date</label>
                <input type="date" value={editableBatch?.expiryDate} onChange={(e) => setEditableBatch({ ...editableBatch, expiryDate: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Container Size</label>
                <input type="number" value={editableBatch?.containerSize} onChange={(e) => setEditableBatch({ ...editableBatch, containerSize: parseInt(e.target.value) || 0 })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Quantity</label>
                <input type="number" value={editableBatch?.quantity} onChange={(e) => setEditableBatch({ ...editableBatch, quantity: parseInt(e.target.value) || 0 })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Cost Price</label>
                <input type="number" value={editableBatch?.costPrice} onChange={(e) => setEditableBatch({ ...editableBatch, costPrice: parseFloat(e.target.value) || 0 })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Selling Price</label>
                <input type="number" value={editableBatch?.sellingPrice} onChange={(e) => setEditableBatch({ ...editableBatch, sellingPrice: parseFloat(e.target.value) || 0 })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Supplier</label>
                <select value={editableBatch?.supplierId} onChange={(e) => setEditableBatch({ ...editableBatch, supplierId: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500">
                  <option value="">Select supplier...</option>
                  {suppliers?.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Invoice Verification */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-4">
                <h4 className="font-medium text-gray-700 text-sm mb-2">🧾 Invoice Verification</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Calculated Total</label>
                    <p className="text-sm font-bold text-primary-600">RWF {calculatedTotal.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600">Supplier Invoice Amount</label>
                    <input type="number" value={invoiceAmount} onChange={(e) => setInvoiceAmount(parseFloat(e.target.value) || 0)} placeholder="Enter invoice amount" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm" />
                  </div>
                </div>
                {invoiceAmount > 0 && (
                  <div className={`mt-2 p-2 rounded text-sm ${Math.abs(calculatedTotal - invoiceAmount) < 1 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {Math.abs(calculatedTotal - invoiceAmount) < 1 ? (
                      <div className="flex items-center"><span className="text-lg mr-2">✅</span><span>Invoice matches! Total: RWF {calculatedTotal.toLocaleString()}</span></div>
                    ) : (
                      <div className="flex items-center"><span className="text-lg mr-2">❌</span><span>Mismatch! Diff: RWF {(calculatedTotal - invoiceAmount).toLocaleString()}</span></div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex space-x-3 pt-4 mt-4 border-t border-gray-200">
              <button onClick={handleConfirm} disabled={confirmBatch.isPending} className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50">
                {confirmBatch.isPending ? 'Confirming...' : '✅ Confirm Stock'}
              </button>
              <button onClick={() => { setIsConfirmModalOpen(false); setSelectedBatchId(null); setEditableBatch(null); setInvoiceAmount(0); setCalculatedTotal(0); }} className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal - Shows all product details */}
      {isDetailsModalOpen && selectedBatchDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">📋 Batch Details</h2>
              <button onClick={() => setIsDetailsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Product Info */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-medium text-blue-800 text-sm mb-2">Product Information</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500">Name:</span><span className="ml-2 font-medium">{selectedBatchDetails.product?.name}</span></div>
                  <div><span className="text-gray-500">Code:</span><span className="ml-2 font-medium">{selectedBatchDetails.product?.code}</span></div>
                  <div><span className="text-gray-500">Category:</span><span className="ml-2">{selectedBatchDetails.product?.category || '-'}</span></div>
                  <div><span className="text-gray-500">Unit:</span><span className="ml-2">{selectedBatchDetails.product?.unitOfMeasure || '-'}</span></div>
                </div>
              </div>

              {/* Batch Info */}
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 className="font-medium text-green-800 text-sm mb-2">Batch Information</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500">Batch No:</span><span className="ml-2 font-medium">{selectedBatchDetails.batchNumber}</span></div>
                  <div><span className="text-gray-500">Quantity:</span><span className="ml-2 font-bold">{selectedBatchDetails.quantity}</span></div>
                  <div><span className="text-gray-500">Cost Price:</span><span className="ml-2">RWF {selectedBatchDetails.costPrice}</span></div>
                  <div><span className="text-gray-500">Selling Price:</span><span className="ml-2 font-medium text-green-700">RWF {selectedBatchDetails.sellingPrice}</span></div>
                  <div><span className="text-gray-500">Expiry Date:</span><span className="ml-2">{new Date(selectedBatchDetails.expiryDate).toLocaleDateString()}</span></div>
                  <div><span className="text-gray-500">Date Received:</span><span className="ml-2">{new Date(selectedBatchDetails.dateReceived).toLocaleDateString()}</span></div>
                </div>
              </div>

              {/* Supplier Info */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-700 text-sm mb-2">Supplier Information</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500">Supplier:</span><span className="ml-2 font-medium">{selectedBatchDetails.supplier?.name || '-'}</span></div>
                  <div><span className="text-gray-500">Status:</span>
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${selectedBatchDetails.isConfirmed ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {selectedBatchDetails.isConfirmed ? 'Confirmed' : 'Pending'}
                    </span>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  Profit per unit: RWF {(selectedBatchDetails.sellingPrice - selectedBatchDetails.costPrice).toLocaleString()} |
                  Margin: {selectedBatchDetails.costPrice > 0 ? `${Math.round((selectedBatchDetails.sellingPrice - selectedBatchDetails.costPrice) / selectedBatchDetails.costPrice * 100)}%` : 'N/A'}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-200 mt-4">
              <button onClick={() => { setIsDetailsModalOpen(false); openAdjustModal(selectedBatchDetails); }} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors mr-2">
                Adjust Stock
              </button>
              <button onClick={() => setIsDetailsModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {isAdjustModalOpen && selectedBatchDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Adjust Stock</h2>
            <p className="text-sm text-gray-500 mb-4">
              {selectedBatchDetails.product?.name} - {selectedBatchDetails.batchNumber}
              <br />
              Current quantity: <span className="font-bold">{selectedBatchDetails.quantity}</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adjustment Quantity
                </label>
                <input
                  type="number"
                  value={adjustmentQty}
                  onChange={(e) => setAdjustmentQty(parseInt(e.target.value) || 0)}
                  placeholder="e.g., -5 to remove, 10 to add"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Use negative value (-5) to remove stock, positive (10) to add stock
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason *
                </label>
                <select
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                >
                  <option value="">Select reason...</option>
                  <option value="DAMAGED">Damaged goods</option>
                  <option value="EXPIRED">Expired</option>
                  <option value="LOST">Lost / Missing</option>
                  <option value="RETURN">Customer return</option>
                  <option value="CORRECTION">Stock correction</option>
                  <option value="SALE_NOT_RECORDED">Sale not recorded</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {adjustmentQty > selectedBatchDetails.quantity && (
                <div className="bg-red-50 p-3 rounded-lg border border-red-200 text-sm text-red-700">
                  ❌ Cannot remove {adjustmentQty} units — only {selectedBatchDetails.quantity} available
                </div>
              )}
            </div>

            <div className="flex space-x-3 pt-4 mt-4 border-t border-gray-200">
              <button
                onClick={handleAdjust}
                disabled={adjustStock.isPending || adjustmentQty === 0 || !adjustmentReason || (adjustmentQty < 0 && Math.abs(adjustmentQty) > selectedBatchDetails.quantity)}
                className="flex-1 py-2 px-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
              >
                {adjustStock.isPending ? 'Adjusting...' : 'Apply Adjustment'}
              </button>
              <button onClick={() => { setIsAdjustModalOpen(false); setAdjustmentQty(0); setAdjustmentReason(''); }} className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
