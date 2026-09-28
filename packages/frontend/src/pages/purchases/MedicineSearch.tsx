import { useState, useEffect, useRef } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { searchMedicines } from './PurchaseService';
import type { Medicine } from './PurchaseTypes';

interface MedicineSearchProps {
  onSelect: (medicine: Medicine) => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

export default function MedicineSearch({
  onSelect,
  placeholder = 'Search medicine by name, generic name, SKU, or product code...',
  autoFocus = false,
  disabled = false,
}: MedicineSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Medicine[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    if (debouncerRef.current) clearTimeout(debouncerRef.current);
    debouncerRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await searchMedicines(query);
        setResults(data || []);
        setIsOpen(true);
        setHighlightIdx(-1);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (debouncerRef.current) clearTimeout(debouncerRef.current);
    };
  }, [query]);

  function handleSelect(medicine: Medicine) {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    onSelect(medicine);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && highlightIdx >= 0 && results[highlightIdx]) {
      e.preventDefault();
      handleSelect(results[highlightIdx]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0) setIsOpen(true); }}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-colors text-base"
        />
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-5 w-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-lg shadow-xl border border-gray-200 max-h-80 overflow-y-auto">
          {results.map((med, idx) => (
            <button
              key={med.id}
              type="button"
              onClick={() => handleSelect(med)}
              className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors ${
                idx === highlightIdx ? 'bg-primary-50 border-l-4 border-l-primary-500' : ''
              }`}
            >
              <div className="flex-1">
                <p className="font-medium text-gray-900">{med.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  <span className="mr-3">SKU: {med.code}</span>
                  {med.category && <span>Category: {med.category}</span>}
                </p>
              </div>
              <div className="text-right ml-4">
                <p className="text-sm font-medium text-primary-600">
                  {med.costPrice ? `Cost: ${med.costPrice.toLocaleString()}` : '—'}
                </p>
                <p className="text-xs text-gray-500">Stock: {med.stockQuantity ?? '—'}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && query.length >= 2 && results.length === 0 && !isLoading && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-lg shadow-xl border border-gray-200 p-6 text-center">
          <p className="text-gray-500 text-sm">No medicines found for "{query}"</p>
          <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
        </div>
      )}
    </div>
  );
}
