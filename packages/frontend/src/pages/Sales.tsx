import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function Sales() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const { data: sales, isLoading } = useQuery({
    queryKey: ['sales', searchQuery, filterDate],
    queryFn: async () => {
      const params: any = { limit: 100 };
      if (searchQuery) params.search = searchQuery;
      if (filterDate) params.startDate = filterDate;
      const response = await api.get('/sales', { params });
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sales History</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by invoice number..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <input
          type="date"
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sales?.map((sale: any) => (
              <tr key={sale.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-primary-600">{sale.invoiceNumber}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(sale.saleDate).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">{sale.customerName || 'Walk-in'}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{sale.saleItems?.length || 0}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  RWF {sale.totalAmount?.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{sale.paymentMethod}</td>
                <td className="px-6 py-4 text-sm">
                  {sale.isCancelled ? (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Cancelled</span>
                  ) : (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Completed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sales?.length === 0 && (
          <div className="text-center py-8 text-gray-500">No sales found</div>
        )}
      </div>
    </div>
  );
}
