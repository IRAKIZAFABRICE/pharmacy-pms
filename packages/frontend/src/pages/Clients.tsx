// packages/frontend/src/pages/Clients.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../services/api';
const CUSTOMER_TYPES = ['REGULAR', 'SPECIAL', 'WHOLESALE', 'INSTITUTIONAL'];

export default function Clients() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('customers');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Form states
  const [form, setForm] = useState({
    name: '', phone: '', email: '', address: '', customerType: 'REGULAR', notes: ''
  });
  const [deliveryForm, setDeliveryForm] = useState({
    productId: '', deliveryDate: '', quantity: 1, address: '', notes: ''
  });
  const [paymentForm, setPaymentForm] = useState({
    type: 'PAYMENT', amount: 0, reference: '', description: ''
  });

  // Fetch customers
  const { data: customers } = useQuery({
    queryKey: ['customers', search],
    queryFn: async () => {
      const response = await api.get(`/customers?search=${search}`);
      return response.data;
    },
  });

  // Fetch products for delivery
  const { data: products } = useQuery({
    queryKey: ['products-delivery'],
    queryFn: async () => {
      const response = await api.get('/products');
      return response.data;
    },
  });

  // Create customer
  const createCustomer = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/customers', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('✅ Customer created');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setShowAddModal(false);
      setForm({ name: '', phone: '', email: '', address: '', customerType: 'REGULAR', notes: '' });
    },
    onError: (error: any) => toast.error(error.response?.data?.error || 'Failed to create customer'),
  });

  // Add transaction (payment/debit/credit)
  const addTransaction = useMutation({
    mutationFn: async ({ customerId, data }: { customerId: string; data: any }) => {
      const response = await api.post(`/customers/${customerId}/transactions`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('✅ Transaction recorded');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setShowPaymentModal(false);
      setPaymentForm({ type: 'PAYMENT', amount: 0, reference: '', description: '' });
    },
    onError: (error: any) => toast.error(error.response?.data?.error || 'Failed to record transaction'),
  });

  // Create delivery
  const createDelivery = useMutation({
    mutationFn: async ({ customerId, data }: { customerId: string; data: any }) => {
      const response = await api.post(`/customers/${customerId}/deliveries`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('✅ Delivery scheduled');
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setShowDeliveryModal(false);
      setDeliveryForm({ productId: '', deliveryDate: '', quantity: 1, address: '', notes: '' });
    },
    onError: (error: any) => toast.error(error.response?.data?.error || 'Failed to schedule delivery'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createCustomer.mutate(form);
  };

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    addTransaction.mutate({ customerId: selectedCustomer.id, data: paymentForm });
  };

  const handleDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    createDelivery.mutate({ customerId: selectedCustomer.id, data: deliveryForm });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">👥 Clients</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          + Add Customer
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-1">
        <button onClick={() => setActiveTab('customers')} className={`px-4 py-2 rounded-lg ${activeTab === 'customers' ? 'bg-primary-600 text-white' : 'bg-gray-100'}`}>
          👤 Customers
        </button>
        <button onClick={() => setActiveTab('deliveries')} className={`px-4 py-2 rounded-lg ${activeTab === 'deliveries' ? 'bg-primary-600 text-white' : 'bg-gray-100'}`}>
          🚚 Deliveries
        </button>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <input
          type="text"
          placeholder="Search customers..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {activeTab === 'customers' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customers?.map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-500">{c.code}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{c.name}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">{c.customerType}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{c.phone}</td>
                  <td className="px-6 py-4 text-sm font-semibold">
                    <span className={c.account?.balance > 0 ? 'text-red-600' : 'text-green-600'}>
                      RWF {c.account?.balance?.toLocaleString() || 0}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    <button
                      onClick={() => { setSelectedCustomer(c); setShowPaymentModal(true); }}
                      className="text-green-600 hover:text-green-900"
                    >
                      💰 Pay
                    </button>
                    <button
                      onClick={() => { setSelectedCustomer(c); setShowDeliveryModal(true); }}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      🚚 Deliver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!customers || customers.length === 0) && (
            <div className="text-center py-8 text-gray-500">No customers found.</div>
          )}
        </div>
      )}

      {activeTab === 'deliveries' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customers?.flatMap((c: any) => c.deliveries || []).map((d: any) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{d.customer?.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{d.product?.name || 'N/A'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{d.quantity}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{new Date(d.deliveryDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${d.status === 'DELIVERED' ? 'bg-green-100 text-green-800' : d.status === 'SCHEDULED' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                      {d.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Add Customer</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input type="text" placeholder="Name *" required className="w-full px-3 py-2 border rounded-lg" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input type="tel" placeholder="Phone *" required className="w-full px-3 py-2 border rounded-lg" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <input type="email" placeholder="Email" className="w-full px-3 py-2 border rounded-lg" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <input type="text" placeholder="Address" className="w-full px-3 py-2 border rounded-lg" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              <select className="w-full px-3 py-2 border rounded-lg" value={form.customerType} onChange={(e) => setForm({ ...form, customerType: e.target.value })}>
                {CUSTOMER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <textarea placeholder="Notes" className="w-full px-3 py-2 border rounded-lg" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              <div className="flex space-x-3">
                <button type="submit" className="flex-1 py-2 bg-primary-600 text-white rounded-lg">Create</button>
                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-2 bg-gray-200 rounded-lg">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-2">💰 {selectedCustomer.name}</h2>
            <p className="text-sm text-gray-600 mb-4">Current Balance: <strong>RWF {selectedCustomer.account?.balance?.toLocaleString() || 0}</strong></p>
            <form onSubmit={handlePayment} className="space-y-4">
              <select className="w-full px-3 py-2 border rounded-lg" value={paymentForm.type} onChange={(e) => setPaymentForm({ ...paymentForm, type: e.target.value })}>
                <option value="PAYMENT">Payment</option>
                <option value="DEBIT">Debit (Add to balance)</option>
                <option value="CREDIT">Credit (Reduce balance)</option>
              </select>
              <input type="number" placeholder="Amount *" required className="w-full px-3 py-2 border rounded-lg" value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) })} />
              <input type="text" placeholder="Reference (invoice #)" className="w-full px-3 py-2 border rounded-lg" value={paymentForm.reference} onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })} />
              <input type="text" placeholder="Description" className="w-full px-3 py-2 border rounded-lg" value={paymentForm.description} onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })} />
              <div className="flex space-x-3">
                <button type="submit" className="flex-1 py-2 bg-green-600 text-white rounded-lg">Record</button>
                <button type="button" onClick={() => setShowPaymentModal(false)} className="flex-1 py-2 bg-gray-200 rounded-lg">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delivery Modal */}
      {showDeliveryModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">🚚 Schedule Delivery for {selectedCustomer.name}</h2>
            <form onSubmit={handleDelivery} className="space-y-4">
              <select className="w-full px-3 py-2 border rounded-lg" value={deliveryForm.productId} onChange={(e) => setDeliveryForm({ ...deliveryForm, productId: e.target.value })}>
                <option value="">Select Product</option>
                {products?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input type="date" required className="w-full px-3 py-2 border rounded-lg" value={deliveryForm.deliveryDate} onChange={(e) => setDeliveryForm({ ...deliveryForm, deliveryDate: e.target.value })} />
              <input type="number" placeholder="Quantity" required className="w-full px-3 py-2 border rounded-lg" value={deliveryForm.quantity} onChange={(e) => setDeliveryForm({ ...deliveryForm, quantity: parseInt(e.target.value) })} />
              <input type="text" placeholder="Delivery Address" className="w-full px-3 py-2 border rounded-lg" value={deliveryForm.address} onChange={(e) => setDeliveryForm({ ...deliveryForm, address: e.target.value })} />
              <textarea placeholder="Notes" className="w-full px-3 py-2 border rounded-lg" value={deliveryForm.notes} onChange={(e) => setDeliveryForm({ ...deliveryForm, notes: e.target.value })} />
              <div className="flex space-x-3">
                <button type="submit" className="flex-1 py-2 bg-blue-600 text-white rounded-lg">Schedule</button>
                <button type="button" onClick={() => setShowDeliveryModal(false)} className="flex-1 py-2 bg-gray-200 rounded-lg">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}