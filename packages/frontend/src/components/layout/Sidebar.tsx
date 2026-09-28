import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  ShoppingCartIcon,
  BeakerIcon,
  CubeIcon,
  CurrencyDollarIcon,
  TruckIcon,
  UsersIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  ChevronLeftIcon,
  UserGroupIcon,
  HeartIcon,
  CalculatorIcon,
} from '@heroicons/react/24/outline';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'POS', href: '/pos', icon: ShoppingCartIcon },
  { name: 'Products', href: '/products', icon: BeakerIcon },
  { name: 'Inventory', href: '/inventory', icon: CubeIcon },
  { name: 'Sales', href: '/sales', icon: CurrencyDollarIcon },
  { name: 'Purchases', href: '/purchases', icon: TruckIcon },
  { name: 'Suppliers', href: '/suppliers', icon: UsersIcon },
  { name: 'Clients', href: '/clients', icon: UserGroupIcon },
  { name: 'Collaborators', href: '/collaborators', icon: HeartIcon },
  { name: 'Calculator', href: '/calculator', icon: CalculatorIcon },
  { name: 'Insurance', href: '/insurance', icon: ShieldCheckIcon },
  { name: 'Reports', href: '/reports', icon: ChartBarIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
];

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <div className={`bg-gray-900 text-white flex flex-col transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`}>
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        {!collapsed && (
          <div>
            <h1 className="text-xl font-bold">Pharmacy PMS</h1>
            <p className="text-sm text-gray-400">v1.0.0</p>
          </div>
        )}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
        >
          <ChevronLeftIcon className={`h-5 w-5 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center px-3 py-2.5 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              } ${collapsed ? 'justify-center' : ''}`
            }
            title={collapsed ? item.name : undefined}
          >
            <item.icon className="h-5 w-5 min-w-[20px]" />
            {!collapsed && <span className="ml-3 whitespace-nowrap">{item.name}</span>}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
