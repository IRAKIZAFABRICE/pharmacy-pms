// packages/frontend/src/pages/Reports.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  BellIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FF6B6B'];

export default function Reports() {
  const [activeTab, setActiveTab] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPeriod, setSelectedPeriod] = useState('weekly');
  const [notificationCount, setNotificationCount] = useState(0);

  // Daily Sales Report
  const { data: dailyReport, isLoading: dailyLoading, refetch: refetchDaily } = useQuery({
    queryKey: ['daily-report', selectedDate],
    queryFn: async () => {
      const response = await api.get('/reports/sales/daily', {
        params: { date: selectedDate },
      });
      return response;
    },
    enabled: activeTab === 'daily',
  });

  // Weekly Sales Report
  const { data: weeklyReport, isLoading: weeklyLoading, refetch: refetchWeekly } = useQuery({
    queryKey: ['weekly-report'],
    queryFn: async () => {
      const response = await api.get('/reports/sales/weekly');
      return response;
    },
    enabled: activeTab === 'weekly',
  });

  // Monthly Sales Report
  const { data: monthlyReport, isLoading: monthlyLoading, refetch: refetchMonthly } = useQuery({
    queryKey: ['monthly-report'],
    queryFn: async () => {
      const response = await api.get('/reports/sales/monthly');
      return response;
    },
    enabled: activeTab === 'monthly',
  });

  // Profit/Loss Report
  const { data: profitLoss, isLoading: plLoading, refetch: refetchPL } = useQuery({
    queryKey: ['profit-loss', selectedPeriod],
    queryFn: async () => {
      const response = await api.get('/reports/profit-loss', {
        params: { period: selectedPeriod },
      });
      return response;
    },
    enabled: activeTab === 'profit-loss',
  });

  // Expiring Products Report
  const { data: expiring, isLoading: expiringLoading, refetch: refetchExpiring } = useQuery({
    queryKey: ['expiring-products'],
    queryFn: async () => {
      const response = await api.get('/reports/expiring', {
        params: { months: 2 },
      });
      return response;
    },
    enabled: activeTab === 'expiring',
  });

  // Out of Stock Report
  const { data: outOfStock, isLoading: oosLoading, refetch: refetchOOS } = useQuery({
    queryKey: ['out-of-stock'],
    queryFn: async () => {
      const response = await api.get('/reports/out-of-stock');
      return response;
    },
    enabled: activeTab === 'out-of-stock',
  });

  // Notifications from real notification service (NOT from report controller)
  const { data: notifications } = useQuery({
    queryKey: ['notifications-report'],
    queryFn: async () => {
      const response = await api.get('/notifications');
      setNotificationCount(response.unreadCount || 0);
      return response;
    },
  });

  const isLoading = dailyLoading || weeklyLoading || monthlyLoading || plLoading || expiringLoading || oosLoading;

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
        <h1 className="text-2xl font-bold text-gray-900">📊 Reports & Analytics</h1>
        <div className="flex items-center gap-3">
          {/* Notification Badge */}
          {notificationCount > 0 && (
            <button
              onClick={() => setActiveTab('notifications')}
              className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <BellIcon className="h-6 w-6 text-gray-600" />
              <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full min-w-[20px]">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            </button>
          )}
          <button
            onClick={() => {
              const refetchMap: any = {
                daily: refetchDaily,
                weekly: refetchWeekly,
                monthly: refetchMonthly,
                'profit-loss': refetchPL,
                expiring: refetchExpiring,
                'out-of-stock': refetchOOS,
              };
              if (refetchMap[activeTab]) refetchMap[activeTab]();
              toast.success('Reports refreshed');
            }}
            className="flex items-center px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            🔄 Refresh
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            🖨️ Print
          </button>
        </div>
      </div>

      {/* Notifications Banner */}
      {notifications && notifications.notifications?.length > 0 && (
        <div className={`mb-6 p-4 rounded-lg flex items-center justify-between ${
          notificationCount > 0 ? 'bg-red-50 border-l-4 border-red-400' : 'bg-yellow-50 border-l-4 border-yellow-400'
        }`}>
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-yellow-400" />
            <span className="text-sm">
              <span className="font-bold">{notificationCount}</span> unread
              {notifications.total > 0 && ` (${notifications.total} total)`}
            </span>
          </div>
          <button
            onClick={() => setActiveTab('notifications')}
            className="text-sm text-primary-600 hover:text-primary-800 font-medium"
          >
            View All
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-2">
        {[
          { id: 'daily', label: '📅 Daily Sales' },
          { id: 'weekly', label: '📊 Weekly Sales' },
          { id: 'monthly', label: '📈 Monthly Sales' },
          { id: 'profit-loss', label: '💰 Profit/Loss' },
          { id: 'expiring', label: '⚠️ Expiring' },
          { id: 'out-of-stock', label: '🔴 Out of Stock' },
          { id: 'notifications', label: `🔔 Notifications${notificationCount > 0 ? ` (${notificationCount})` : ''}` },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Render Active Tab */}
      <div className="bg-white rounded-lg shadow p-6">
        {activeTab === 'daily' && dailyReport && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Daily Sales Report</h2>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-lg"
              />
            </div>
            <SalesSummary summary={dailyReport.summary} />
            <PaymentBreakdown data={dailyReport.paymentBreakdown} />
            <TopProducts products={dailyReport.topProducts} />
          </div>
        )}

        {activeTab === 'weekly' && weeklyReport && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Weekly Sales Report</h2>
            <SalesSummary summary={weeklyReport.summary} />
            <DailySalesChart data={weeklyReport.dailyData} />
          </div>
        )}

        {activeTab === 'monthly' && monthlyReport && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Monthly Sales Report</h2>
            <SalesSummary summary={monthlyReport.summary} />
            <DailySalesChart data={monthlyReport.dailyData} />
            <TopProducts products={monthlyReport.topProducts} />
          </div>
        )}

        {activeTab === 'profit-loss' && profitLoss && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Profit/Loss Report</h2>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-lg"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <ProfitLossSummary data={profitLoss} />
            <ProfitLossChart data={profitLoss.dailyBreakdown} />
          </div>
        )}

        {activeTab === 'expiring' && expiring && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Expiring Products</h2>
            <ExpiringSummary summary={expiring.summary} />
            <ExpiringTable products={expiring.expiringProducts} />
          </div>
        )}

        {activeTab === 'out-of-stock' && outOfStock && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Out of Stock Products</h2>
            <OutOfStockSummary summary={outOfStock.summary} />
            <OutOfStockTable products={outOfStock.products} />
          </div>
        )}

        {activeTab === 'notifications' && notifications && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Notifications</h2>
            <NotificationsList notifications={notifications.notifications} />
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== COMPONENTS ====================

function SalesSummary({ summary }: { summary: any }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-sm text-gray-600">Total Sales</p>
        <p className="text-xl font-bold text-blue-600">RWF {summary.totalSales?.toLocaleString()}</p>
      </div>
      <div className="bg-green-50 p-4 rounded-lg">
        <p className="text-sm text-gray-600">Profit</p>
        <p className="text-xl font-bold text-green-600">RWF {summary.totalProfit?.toLocaleString()}</p>
      </div>
      <div className="bg-purple-50 p-4 rounded-lg">
        <p className="text-sm text-gray-600">Transactions</p>
        <p className="text-xl font-bold text-purple-600">{summary.transactionCount}</p>
      </div>
      <div className="bg-orange-50 p-4 rounded-lg">
        <p className="text-sm text-gray-600">Profit Margin</p>
        <p className="text-xl font-bold text-orange-600">{summary.profitMargin?.toFixed(1)}%</p>
      </div>
    </div>
  );
}

function PaymentBreakdown({ data }: { data: any }) {
  const chartData = Object.entries(data).map(([name, value]) => ({ name, value }));
  return (
    <div className="mb-6">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Payment Methods</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: any) => `RWF ${value.toLocaleString()}`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function TopProducts({ products }: { products: any[] }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-gray-700 mb-3">Top Products</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty Sold</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Revenue</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Profit</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products?.map((p: any, i: number) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-sm text-gray-900">{p.name}</td>
                <td className="px-4 py-2 text-sm text-right text-gray-500">{p.quantity}</td>
                <td className="px-4 py-2 text-sm text-right text-gray-900">RWF {p.revenue?.toLocaleString()}</td>
                <td className="px-4 py-2 text-sm text-right text-green-600">RWF {p.profit?.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DailySalesChart({ data }: { data: any[] }) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Daily Sales Trend</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" />
          <YAxis />
          <Tooltip formatter={(value: any) => `RWF ${value.toLocaleString()}`} />
          <Legend />
          <Bar dataKey="total" fill="#0ea5e9" name="Sales" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ProfitLossSummary({ data }: { data: any }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-green-50 p-4 rounded-lg">
        <p className="text-sm text-gray-600">Revenue</p>
        <p className="text-xl font-bold text-green-600">RWF {data.summary.totalRevenue?.toLocaleString()}</p>
      </div>
      <div className="bg-red-50 p-4 rounded-lg">
        <p className="text-sm text-gray-600">Cost</p>
        <p className="text-xl font-bold text-red-600">RWF {data.summary.totalCost?.toLocaleString()}</p>
      </div>
      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-sm text-gray-600">Profit/Loss</p>
        <p className={`text-xl font-bold ${data.summary.totalProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
          RWF {data.summary.totalProfit?.toLocaleString()}
        </p>
      </div>
      <div className="bg-purple-50 p-4 rounded-lg">
        <p className="text-sm text-gray-600">Margin</p>
        <p className="text-xl font-bold text-purple-600">{data.summary.profitMargin?.toFixed(1)}%</p>
      </div>
    </div>
  );
}

function ProfitLossChart({ data }: { data: any[] }) {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Daily Profit/Loss</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip formatter={(value: any) => `RWF ${value.toLocaleString()}`} />
          <Legend />
          <Area type="monotone" dataKey="profit" stackId="1" stroke="#0ea5e9" fill="#0ea5e9" name="Profit" />
          <Area type="monotone" dataKey="cost" stackId="1" stroke="#ef4444" fill="#ef4444" name="Cost" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ExpiringSummary({ summary }: { summary: any }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-red-50 p-4 rounded-lg">
        <p className="text-sm text-gray-600">Expiring Soon</p>
        <p className="text-xl font-bold text-red-600">{summary.totalExpiringBatches}</p>
      </div>
      <div className="bg-orange-50 p-4 rounded-lg">
        <p className="text-sm text-gray-600">Critical (30 days)</p>
        <p className="text-xl font-bold text-orange-600">{summary.criticalCount}</p>
      </div>
      <div className="bg-yellow-50 p-4 rounded-lg">
        <p className="text-sm text-gray-600">Warning (60 days)</p>
        <p className="text-xl font-bold text-yellow-600">{summary.warningCount}</p>
      </div>
      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-sm text-gray-600">Total Value</p>
        <p className="text-xl font-bold text-blue-600">RWF {summary.totalValue?.toLocaleString()}</p>
      </div>
    </div>
  );
}

function ExpiringTable({ products }: { products: any[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Batch</th>
            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Expiry Date</th>
            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Days Left</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {products?.map((p: any) => (
            <tr key={p.id} className="hover:bg-gray-50">
              <td className="px-4 py-2 text-sm text-gray-900">{p.product?.name}</td>
              <td className="px-4 py-2 text-sm text-gray-500">{p.batchNumber}</td>
              <td className="px-4 py-2 text-sm text-right text-gray-500">{p.quantity}</td>
              <td className="px-4 py-2 text-sm text-gray-500">{new Date(p.expiryDate).toLocaleDateString()}</td>
              <td className="px-4 py-2 text-sm text-right font-medium">
                <span className={p.daysUntilExpiry <= 30 ? 'text-red-600' : 'text-orange-600'}>
                  {p.daysUntilExpiry} days
                </span>
              </td>
              <td className="px-4 py-2 text-sm">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  p.urgency === 'critical' ? 'bg-red-100 text-red-800' :
                  p.urgency === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {p.urgency === 'critical' ? '🔴 Critical' :
                   p.urgency === 'warning' ? '🟡 Warning' : 'ℹ️ Info'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OutOfStockSummary({ summary }: { summary: any }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-red-50 p-4 rounded-lg">
        <p className="text-sm text-gray-600">Out of Stock</p>
        <p className="text-xl font-bold text-red-600">{summary.totalOutOfStock}</p>
      </div>
      <div className="bg-yellow-50 p-4 rounded-lg">
        <p className="text-sm text-gray-600">Low Stock</p>
        <p className="text-xl font-bold text-yellow-600">{summary.totalLowStock}</p>
      </div>
      <div className="bg-blue-50 p-4 rounded-lg">
        <p className="text-sm text-gray-600">Total Products</p>
        <p className="text-xl font-bold text-blue-600">{summary.totalProducts}</p>
      </div>
    </div>
  );
}

function OutOfStockTable({ products }: { products: any[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Stock</th>
            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Reorder Level</th>
            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {products?.map((p: any) => (
            <tr key={p.id} className="hover:bg-gray-50">
              <td className="px-4 py-2 text-sm text-gray-900">{p.name}</td>
              <td className="px-4 py-2 text-sm text-gray-500">{p.code}</td>
              <td className="px-4 py-2 text-sm text-right font-medium">
                <span className={p.totalStock === 0 ? 'text-red-600' : 'text-orange-600'}>
                  {p.totalStock}
                </span>
              </td>
              <td className="px-4 py-2 text-sm text-right text-gray-500">{p.reorderLevel}</td>
              <td className="px-4 py-2 text-sm">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  p.totalStock === 0 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {p.totalStock === 0 ? '🔴 Out of Stock' : '🟡 Low Stock'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NotificationsList({ notifications }: { notifications: any[] }) {
  return (
    <div className="space-y-3">
      {notifications?.map((n: any) => (
        <div
          key={n.id}
          className={`p-4 rounded-lg border-l-4 ${
            n.severity === 'high' ? 'border-red-400 bg-red-50' :
            n.severity === 'medium' ? 'border-yellow-400 bg-yellow-50' :
            'border-blue-400 bg-blue-50'
          } ${n.read ? 'opacity-60' : ''}`}
        >
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-medium text-gray-900">{n.title}</h4>
              <p className="text-sm text-gray-600 mt-1">{n.message}</p>
              <p className="text-xs text-gray-400 mt-1">{new Date(n.createdAt || n.date).toLocaleString()}</p>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              n.severity === 'high' ? 'bg-red-200 text-red-800' :
              n.severity === 'medium' ? 'bg-yellow-200 text-yellow-800' :
              'bg-blue-200 text-blue-800'
            }`}>
              {n.type}
            </span>
          </div>
        </div>
      ))}
      {(!notifications || notifications.length === 0) && (
        <div className="text-center py-8 text-gray-500">
          <CheckCircleIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
          <p>No notifications</p>
          <p className="text-sm">All systems are running smoothly</p>
        </div>
      )}
    </div>
  );
}
