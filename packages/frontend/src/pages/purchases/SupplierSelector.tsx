import { useState, useEffect } from 'react';
import { BuildingStorefrontIcon, CreditCardIcon } from '@heroicons/react/24/outline';
import { fetchSuppliers } from './PurchaseService';
import type { Supplier } from './PurchaseTypes';

interface SupplierSelectorProps {
  value: string;
  onChange: (supplierId: string, supplier: Supplier) => void;
  error?: string;
  disabled?: boolean;
}

export default function SupplierSelector({ value, onChange, error, disabled }: SupplierSelectorProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selected, setSelected] = useState<Supplier | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSuppliers()
      .then((data) => {
        setSuppliers(data || []);
        if (value) {
          const found = (data || []).find((s: Supplier) => s.id === value);
          if (found) setSelected(found);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    const supplier = suppliers.find((s) => s.id === id) || null;
    setSelected(supplier);
    onChange(id, supplier as Supplier);
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Supplier <span className="text-red-500">*</span>
      </label>
      <select
        value={value}
        onChange={handleChange}
        disabled={disabled || isLoading}
        className={`mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 ${
          error ? 'border-red-300' : ''
        }`}
      >
        <option value="">— Select supplier —</option>
        {suppliers.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} {s.tin ? `(${s.tin})` : ''}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}

      {selected && (
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
          <div className="flex items-center gap-1">
            <BuildingStorefrontIcon className="h-3 w-3" />
            {selected.contactPerson || 'N/A'}
          </div>
          <div className="flex items-center gap-1">
            <CreditCardIcon className="h-3 w-3" />
            TIN: {selected.tin || 'N/A'}
          </div>
          <div>Phone: {selected.phone}</div>
          <div>Code: {selected.code}</div>
        </div>
      )}
    </div>
  );
}

