import { useState, useCallback } from 'react';
import { PlusIcon, ClipboardDocumentListIcon, ClockIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline';
import PurchaseForm from './purchases/PurchaseForm';
import PurchaseList from './purchases/PurchaseList';
import PurchaseOrder from './purchases/PurchaseOrder';

type Tab = 'history' | 'orders';

export default function Purchases() {
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('history');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSaved = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchases</h1>
          <p className="text-sm text-gray-500 mt-1">Manage supplier purchases, invoices, and stock receiving</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors shadow-sm"
        >
          <PlusIcon className="h-5 w-5" />
          New Purchase
        </button>
      </div>

      {/* Dashboard quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 shadow-sm">
          <div className="bg-green-100 rounded-lg p-3">
            <ClipboardDocumentListIcon className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Create Purchase</p>
            <p className="text-lg font-bold text-gray-900">New Invoice</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 shadow-sm">
          <div className="bg-blue-100 rounded-lg p-3">
            <ClockIcon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Pending Orders</p>
            <p className="text-lg font-bold text-gray-900">Supplier Orders</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 shadow-sm">
          <div className="bg-purple-100 rounded-lg p-3">
            <BuildingStorefrontIcon className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Supplier Catalog</p>
            <p className="text-lg font-bold text-gray-900">Price History</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'history'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Purchase History
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'orders'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Purchase Orders
        </button>
      </div>

      {/* Content */}
      {activeTab === 'history' && (
        <PurchaseList
          onNewPurchase={() => setShowForm(true)}
          refreshKey={refreshKey}
        />
      )}

      {activeTab === 'orders' && (
        <PurchaseOrder />
      )}

      {/* New Purchase Form (full page modal) */}
      {showForm && (
        <PurchaseForm
          onClose={() => setShowForm(false)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

