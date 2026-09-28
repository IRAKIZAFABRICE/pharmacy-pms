import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, TrashIcon, CheckCircleIcon, XMarkIcon, ArrowPathIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { fetchPurchaseOrders, createPurchaseOrder, receivePurchaseOrder, fetchSuppliers } from './PurchaseService';
import type { PurchaseOrder as PurchaseOrderType } from './PurchaseTypes';

export default function PurchaseOrder() {
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<{ productId: string; productName: string; quantity: number; unitCost: number }[]>([]);
  const [newProductId, setNewProductId] = useState('');
  const [newQty, setNewQty] = useState(1);
  const [newCost, setNewCost] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');

  // Receive Modal state
  const [receiveModalOrder, setReceiveModalOrder] = useState<PurchaseOrderType | null>(null);
  const [receiveItems, setReceiveItems] = useState<{ productId: string; batchNumber: string; quantityReceived: number; expiryDate: string; unitCost: number }[]>([]);

  const queryClient = useQueryClient();

  const { data: ordersData } = useQuery({
    queryKey: ['purchase-orders', statusFilter],
    queryFn: () => fetchPurchaseOrders({ status: statusFilter || undefined }),
  });

  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: fetchSuppliers,
  });

  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const r = await (await import('./PurchaseService')).searchMedicines('');
      return r || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => createPurchaseOrder(data),
    onSuccess: () => {
      toast.success('Purchase order created');
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      resetForm();
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to create order'),
  });

  const receiveMutation = useMutation({
    mutationFn: ({ id, receivedItems }: { id: string; receivedItems: any[] }) =>
      receivePurchaseOrder(id, receivedItems),
    onSuccess: () => {
      toast.success('Order received — stock updated!');
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      setReceiveModalOrder(null);
      setReceiveItems([]);
    },
    onError: (err: any) => toast.error(err.response?.data?.error || 'Failed to receive order'),
  });

  const orders: PurchaseOrderType[] = ordersData?.data || [];

  function resetForm() {
    setShowNewOrder(false);
    setSupplierId('');
    setExpectedDate('');
    setNotes('');
    setItems([]);
    setNewProductId('');
    setNewQty(1);
    setNewCost(0);
  }

  function handleCreate() {
    if (!supplierId) { toast.error('Supplier is required'); return; }
    if (items.length === 0) { toast.error('At least one item is required'); return; }
    createMutation.mutate({ supplierId, expectedDate: expectedDate || undefined, notes: notes || undefined, items });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">Purchase Orders</h3>
        <button
          onClick={() => setShowNewOrder(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          New Order
        </button>
      </div>

      <div className="mb-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border-gray-300 text-sm"
        >
          <option value="">All Orders</option>
          <option value="PENDING">Pending</option>
          <option value="RECEIVED">Received</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-8 text-gray-400 bg-white rounded-lg border border-gray-200">
          <BuildingStorefrontIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No purchase orders</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Order #</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Supplier</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Expected</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2.5 text-sm font-medium text-primary-600">{order.orderNumber}</td>
                  <td className="px-3 py-2.5 text-sm text-gray-900">{order.supplierName}</td>
                  <td className="px-3 py-2.5 text-sm text-gray-500">
                    {new Date(order.orderDate).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2.5 text-sm text-gray-500">
                    {order.expectedDate ? new Date(order.expectedDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-sm font-medium text-right">
                    {order.totalAmount.toLocaleString()} RWF
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      order.status === 'RECEIVED' ? 'bg-green-100 text-green-700' :
                      order.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {order.status === 'PENDING' && (
                      <button
                        onClick={() => {
                          // Open receive modal with pre-filled items from order
                          setReceiveModalOrder(order);
                          setReceiveItems(
                            (order.purchaseItems || order.items || []).map((item: any) => ({
                              productId: item.productId || item.product?.id || '',
                              batchNumber: '',
                              quantityReceived: item.quantity || 0,
                              expiryDate: '',
                              unitCost: item.unitCost || 0,
                            }))
                          );
                        }}
                        disabled={receiveMutation.isPending}
                        className="text-xs px-2.5 py-1.5 bg-green-100 text-green-700 rounded-md hover:bg-green-200 disabled:opacity-50 font-medium transition-colors"
                      >
                        Receive
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Order Modal */}
      {showNewOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto pt-10 pb-10">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">New Purchase Order</h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full rounded-lg border-gray-300"
                  >
                    <option value="">Select...</option>
                    {(suppliers || []).map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expected Date</label>
                  <input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} className="w-full rounded-lg border-gray-300" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className="w-full rounded-lg border-gray-300" />
                </div>
              </div>

              {/* Items */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Items</h4>
                {items.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 mb-3 overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-xs font-semibold text-gray-500 text-left">Product</th>
                          <th className="px-3 py-2 text-xs font-semibold text-gray-500 text-right">Qty</th>
                          <th className="px-3 py-2 text-xs font-semibold text-gray-500 text-right">Unit Cost</th>
                          <th className="px-3 py-2 text-xs font-semibold text-gray-500 text-right">Total</th>
                          <th className="w-10"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2 text-sm">{item.productName}</td>
                            <td className="px-3 py-2 text-sm text-right">{item.quantity}</td>
                            <td className="px-3 py-2 text-sm text-right">{item.unitCost.toLocaleString()}</td>
                            <td className="px-3 py-2 text-sm font-medium text-right">{(item.quantity * item.unitCost).toLocaleString()}</td>
                            <td className="px-3 py-2">
                              <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600">
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex items-end gap-2 bg-gray-50 p-3 rounded-lg">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Product</label>
                    <select
                      value={newProductId}
                      onChange={(e) => setNewProductId(e.target.value)}
                      className="w-full rounded-md border-gray-300 text-sm"
                    >
                      <option value="">Select...</option>
                      {(products || []).map((p: any) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-20">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Qty</label>
                    <input type="number" min="1" value={newQty} onChange={(e) => setNewQty(parseInt(e.target.value) || 0)} className="w-full rounded-md border-gray-300 text-sm" />
                  </div>
                  <div className="w-28">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Unit Cost</label>
                    <input type="number" min="0" value={newCost} onChange={(e) => setNewCost(parseFloat(e.target.value) || 0)} className="w-full rounded-md border-gray-300 text-sm" />
                  </div>
                  <button
                    onClick={() => {
                      if (!newProductId || newQty <= 0 || newCost < 0) { toast.error('Fill all fields'); return; }
                      const p = (products || []).find((p: any) => p.id === newProductId);
                      setItems([...items, { productId: newProductId, productName: p?.name || '', quantity: newQty, unitCost: newCost }]);
                      setNewProductId('');
                      setNewQty(1);
                      setNewCost(0);
                    }}
                    className="px-3 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button onClick={resetForm} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
                <button
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                  className="px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
                >
                  {createMutation.isPending ? <><ArrowPathIcon className="h-4 w-4 animate-spin" /> Creating...</> : <><CheckCircleIcon className="h-4 w-4" /> Create Order</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Receive Modal */}
      {receiveModalOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 overflow-y-auto pt-10 pb-10">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Receive Purchase Order</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Order #{receiveModalOrder.orderNumber} — {receiveModalOrder.supplierName}
                </p>
              </div>
              <button onClick={() => { setReceiveModalOrder(null); setReceiveItems([]); }} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              {receiveItems.length === 0 ? (
                <p className="text-center text-gray-400 py-8">No items in this order</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Product</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase w-28">Qty Ordered</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase w-28">Qty Received</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase w-32">Batch No</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase w-32">Expiry Date</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase w-28">Unit Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {receiveItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-sm text-gray-900">
                            {receiveModalOrder.items?.[idx]?.productName || `Item ${idx + 1}`}
                          </td>
                          <td className="px-3 py-2 text-sm text-center font-medium">{item.quantityReceived}</td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              value={item.quantityReceived}
                              onChange={(e) => {
                                const updated = [...receiveItems];
                                updated[idx] = { ...updated[idx], quantityReceived: parseInt(e.target.value) || 0 };
                                setReceiveItems(updated);
                              }}
                              className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm text-center"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={item.batchNumber}
                              onChange={(e) => {
                                const updated = [...receiveItems];
                                updated[idx] = { ...updated[idx], batchNumber: e.target.value };
                                setReceiveItems(updated);
                              }}
                              className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm font-mono"
                              placeholder="BATCH-001"
                              required
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="date"
                              value={item.expiryDate}
                              onChange={(e) => {
                                const updated = [...receiveItems];
                                updated[idx] = { ...updated[idx], expiryDate: e.target.value };
                                setReceiveItems(updated);
                              }}
                              className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm"
                              required
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={item.unitCost}
                              onChange={(e) => {
                                const updated = [...receiveItems];
                                updated[idx] = { ...updated[idx], unitCost: parseFloat(e.target.value) || 0 };
                                setReceiveItems(updated);
                              }}
                              className="w-full px-2 py-1.5 border border-gray-200 rounded-md text-sm text-right"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => { setReceiveModalOrder(null); setReceiveItems([]); }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Validate required fields
                    const invalidItems = receiveItems.filter(
                      (item) => !item.batchNumber || !item.expiryDate || item.quantityReceived <= 0
                    );
                    if (invalidItems.length > 0) {
                      toast.error(`${invalidItems.length} item(s) missing batch number, expiry date, or quantity`);
                      return;
                    }
                    receiveMutation.mutate({
                      id: receiveModalOrder.id,
                      receivedItems: receiveItems.map((item) => ({
                        productId: item.productId,
                        batchNumber: item.batchNumber,
                        quantityReceived: item.quantityReceived,
                        expiryDate: item.expiryDate,
                        unitCost: item.unitCost,
                        sellingPrice: item.unitCost * 1.3,
                      })),
                    });
                  }}
                  disabled={receiveMutation.isPending || receiveItems.length === 0}
                  className="px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
                >
                  {receiveMutation.isPending ? (
                    <><ArrowPathIcon className="h-4 w-4 animate-spin" /> Receiving...</>
                  ) : (
                    <><CheckCircleIcon className="h-4 w-4" /> Confirm Receive</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

