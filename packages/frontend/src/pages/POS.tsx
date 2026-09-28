// packages/frontend/src/pages/POS.tsx
import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  MinusIcon,
  TrashIcon,
  PrinterIcon,
  DocumentArrowDownIcon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon as ExternalLinkIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import printerService from '../services/printer.service';
import type { ReceiptData } from '../services/printer.service';

interface Product {
  id: string;
  name: string;
  code: string;
  subCategory?: string;
  sellingPrice?: number;
  quantity: number;
  containerSize: number;
  costPrice: number;
  expiryDate: string;
  batchId: string;
  batches?: any[];
}

interface SaleItem {
  batchId: string;
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  batchQuantity: number;
  containerSize: number;
  costPrice: number;
}

interface CompletedSale {
  invoiceNumber: string;
  saleDate: string;
  items: {
    name: string;
    quantity: number;
    price: number;
    total: number;
  }[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  customerName: string;
  cashier: string;
}

interface InsuranceCompany {
  id: string;
  code: string;
  name: string;
  description?: string;
  coveragePercentage: number;
  maxCoverageAmount?: number;
  websiteUrl?: string;
  isActive: boolean;
}

const saleSchema = z.object({
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  paymentMethod: z.enum(['CASH', 'MOBILE_MONEY', 'CARD', 'INSURANCE']),
});

type SaleForm = z.infer<typeof saleSchema>;

export default function POS() {
  const queryClient = useQueryClient();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [quantityInput, setQuantityInput] = useState<{ [key: string]: string }>({});
  const [isPrinting, setIsPrinting] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(true);
  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(null);

  // ============= INSURANCE STATE =============
  const [insuranceModal, setInsuranceModal] = useState<{
    companyId: string;
    companyName: string;
    coveragePercentage: number;
    websiteUrl: string;
    visitedWebsite: boolean;
    paidByInsurance: number;
    paidByPatient: number;
    totalAmount: number;
  } | null>(null);

  // ============= CARD PAYMENT STATE =============
  const [cardModal, setCardModal] = useState<{
    show: boolean;
    amount: number;
  }>({ show: false, amount: 0 });

  const { register, handleSubmit } = useForm<SaleForm>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      paymentMethod: 'CASH',
    },
  });

  // Barcode Scanner
  useBarcodeScanner((barcode) => {
    setSearchQuery(barcode);
    setShowSearchResults(true);
  });

  // Fetch insurance companies
  const { data: insuranceCompanies } = useQuery({
    queryKey: ['insurance-companies-pos'],
    queryFn: async () => {
      const response = await api.get('/insurance/companies');
      return response.data || [];
    },
  });

  // Search products (by name OR composition/subCategory)
  const { isLoading: isSearching } = useQuery({
    queryKey: ['product-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      try {
        const response = await api.get('/products/search/composition', {
          params: { q: searchQuery, limit: 20 },
        });
        const products = response.data || [];

        const transformedProducts = products.map((product: any) => {
          const batchesWithStock = (product.batches || []).filter((b: any) => b.quantity > 0);
          const totalQuantity = batchesWithStock.reduce((sum: number, b: any) => sum + (b.quantity || 0), 0);
          
          // Pick the batch with the most stock as default, or earliest expiry if tied
          const defaultBatch = batchesWithStock.length > 0 
            ? batchesWithStock.reduce((best: any, b: any) => {
                if (!best) return b;
                if (b.quantity > best.quantity) return b;
                if (b.quantity === best.quantity && new Date(b.expiryDate) < new Date(best.expiryDate)) return b;
                return best;
              })
            : null;

          return {
            id: product.id,
            name: product.name,
            code: product.code,
            subCategory: product.subCategory || '',
            sellingPrice: defaultBatch?.sellingPrice || product.sellingPrice || 0,
            costPrice: defaultBatch?.costPrice || 0,
            containerSize: defaultBatch?.containerSize || product.quantity || 0,
            quantity: totalQuantity,
            expiryDate: defaultBatch?.expiryDate || '',
            batchId: defaultBatch?.id || '',
            batches: batchesWithStock,
          };
        });

        setSearchResults(transformedProducts);
        return transformedProducts;
      } catch (error) {
        console.error('Search error:', error);
        return [];
      }
    },
    enabled: searchQuery.length >= 2,
  });

  // ============= PROFORMA PREVIEW STATE =============
  const [proformaPreview, setProformaPreview] = useState<{
    customerName: string;
    customerPhone: string;
    paymentMethod: string;
  } | null>(null);

  // Create sale mutation
  const createSale = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post('/sales', data);
      return response;
    },
    onSuccess: (data: any) => {
      const sale = data.data?.sale;
      if (!sale) {
        toast.error('Sale response missing data');
        return;
      }

      const completed: CompletedSale = {
        invoiceNumber: sale.invoiceNumber,
        saleDate: sale.saleDate,
        items: sale.saleItems.map((item: any) => ({
          name: item.batch?.product?.name || 'Unknown',
          quantity: item.quantity,
          price: item.unitPrice || 0,
          total: item.totalPrice || 0,
        })),
        subtotal: sale.subtotal || 0,
        tax: sale.taxAmount || 0,
        total: sale.totalAmount || 0,
        paymentMethod: sale.paymentMethod || 'CASH',
        customerName: sale.customerName || 'Walk-in',
        cashier: (sale.user?.firstName || '') + ' ' + (sale.user?.lastName || 'Admin'),
      };

      setCompletedSale(completed);
      toast.success(`✅ Sale created! Invoice: ${sale.invoiceNumber}`);

      setCart([]);
      setSearchQuery('');
      setSearchResults([]);
      setQuantityInput({});
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to create sale');
    },
  });

  const printInvoice = (completed: CompletedSale, isProforma = false) => {
    setIsPrinting(true);
    try {
      const receiptData: ReceiptData = {
        invoiceNumber: completed.invoiceNumber,
        date: completed.saleDate,
        items: completed.items,
        subtotal: completed.subtotal,
        tax: completed.tax,
        total: completed.total,
        paymentMethod: isProforma ? 'PROFORMA' : completed.paymentMethod,
        customerName: completed.customerName,
        cashier: completed.cashier,
      };
      printerService.printReceiptWithPreview(receiptData);
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Print failed. Sale is already completed.');
    } finally {
      setIsPrinting(false);
    }
  };

  // ============= PROFORMA PREVIEW HANDLERS =============
  const showProformaPreview = (data: SaleForm) => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    setProformaPreview({
      customerName: data.customerName || 'Walk-in Customer',
      customerPhone: data.customerPhone || '',
      paymentMethod: data.paymentMethod,
    });
  };

  const confirmProformaAndCreateSale = () => {
    if (!proformaPreview) return;

    const saleData = {
      items: cart.map((item) => ({
        batchId: item.batchId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: 0,
      })),
      customerName: proformaPreview.customerName,
      customerPhone: proformaPreview.customerPhone || '',
      paymentMethod: proformaPreview.paymentMethod,
    };

    setProformaPreview(null);
    createSale.mutate(saleData);
  };

  const cancelProforma = () => {
    setProformaPreview(null);
  };

  const addToCart = (product: Product, qty?: number) => {
    if (!product.batchId) {
      toast.error('No active batch found. Please add stock first.');
      return;
    }

    if (product.quantity <= 0) {
      toast.error('❌ Out of stock!');
      return;
    }

    const requestedQty = qty || parseInt(quantityInput[product.id] || '') || 1;

    if (requestedQty <= 0) {
      toast.error('Invalid quantity');
      return;
    }

    // Find the best batch for this quantity (FIFO: earliest expiry with enough stock)
    const bestBatch = product.batches?.find((b: any) => b.quantity >= requestedQty) 
      || product.batches?.reduce((best: any, b: any) => {
          if (!best) return b;
          if (b.quantity > best.quantity) return b;
          return best;
        }, null);

    if (!bestBatch) {
      toast.error(`Only ${product.quantity} total units available across all batches`);
      return;
    }

    // Use the best batch for this sale
    const effectiveBatchId = bestBatch.id;
    const effectiveBatchQty = bestBatch.quantity;

    if (requestedQty > effectiveBatchQty) {
      toast.error(`Only ${effectiveBatchQty} units available in selected batch`);
      return;
    }

    const existingItem = cart.find((item) => item.batchId === effectiveBatchId);

    if (existingItem) {
      if (existingItem.quantity + requestedQty > effectiveBatchQty) {
        toast.error(`Not enough stock in this batch. Available: ${effectiveBatchQty}`);
        return;
      }
      setCart(
        cart.map((item) =>
          item.batchId === effectiveBatchId
            ? {
                ...item,
                quantity: item.quantity + requestedQty,
                totalPrice: (item.quantity + requestedQty) * item.unitPrice,
              }
            : item
        )
      );
    } else {
      const price = product.sellingPrice || 0;
      setCart([
        ...cart,
        {
          batchId: effectiveBatchId,
          productId: product.id,
          productName: product.name || 'Unknown',
          productCode: product.code || '',
          quantity: requestedQty,
          unitPrice: price,
          totalPrice: requestedQty * price,
          batchQuantity: effectiveBatchQty,
          containerSize: product.containerSize || 0,
          costPrice: product.costPrice || 0,
        },
      ]);
    }

    setSearchQuery('');
    setSearchResults([]);
    setQuantityInput({});
    setShowSearchResults(false);
    searchInputRef.current?.focus();
  };

  const removeFromCart = (batchId: string) => {
    setCart(cart.filter((item) => item.batchId !== batchId));
  };

  const updateQuantity = (batchId: string, delta: number) => {
    setCart(
      cart.map((item) => {
        if (item.batchId === batchId) {
          const newQuantity = item.quantity + delta;
          if (newQuantity < 1) return item;
          if (newQuantity > item.batchQuantity) {
            toast.error('Not enough stock');
            return item;
          }
          return {
            ...item,
            quantity: newQuantity,
            totalPrice: newQuantity * item.unitPrice,
          };
        }
        return item;
      })
    );
  };

  const getTotal = () => {
    return cart.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
  };

  // ============= INSURANCE PAYMENT HANDLER =============
  const handleInsurancePayment = (companyId: string) => {
    const company = (insuranceCompanies || []).find((c: InsuranceCompany) => c.id === companyId);
    if (!company) {
      toast.error('Please select an insurance company');
      return;
    }

    const totalAmount = getTotal();
    const coverageAmount = totalAmount * (company.coveragePercentage / 100);
    const patientAmount = totalAmount - coverageAmount;

    setInsuranceModal({
      companyId: company.id,
      companyName: company.name,
      coveragePercentage: company.coveragePercentage,
      websiteUrl: company.websiteUrl || '',
      visitedWebsite: false,
      paidByInsurance: coverageAmount,
      paidByPatient: patientAmount,
      totalAmount,
    });
  };

  const confirmInsuranceAndCreateSale = () => {
    if (!insuranceModal) return;
    if (!insuranceModal.visitedWebsite) {
      toast.error('Please visit the insurance website first and confirm follow-up');
      return;
    }

    const saleData = {
      items: cart.map((item) => ({
        batchId: item.batchId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: 0,
      })),
      customerName: proformaPreview?.customerName || 'Insurance Patient',
      customerPhone: proformaPreview?.customerPhone || '',
      paymentMethod: 'INSURANCE',
      insuranceCompanyId: insuranceModal.companyId,
      patientName: proformaPreview?.customerName || 'Insurance Patient',
      patientId: '',
      policyNumber: '',
    };

    setInsuranceModal(null);
    setProformaPreview(null);
    createSale.mutate(saleData);
  };

  // ============= CARD PAYMENT HANDLER =============
  const handleCardPayment = () => {
    setCardModal({ show: true, amount: getTotal() });
  };

  // Handle "Complete Sale" -> show proforma preview first
  const onSubmit = (data: SaleForm) => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    // If INSURANCE, show insurance modal instead of proforma
    if (data.paymentMethod === 'INSURANCE') {
      showProformaPreview(data);
      // The insurance modal is triggered from the proforma
      return;
    }

    // If CARD, show card modal
    if (data.paymentMethod === 'CARD') {
      handleCardPayment();
      return;
    }

    showProformaPreview(data);
  };

  const printProforma = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    const proformaData: ReceiptData = {
      invoiceNumber: `PROFORMA-${Date.now()}`,
      date: new Date().toISOString(),
      items: cart.map((item) => ({
        name: item.productName,
        quantity: item.quantity,
        price: item.unitPrice,
        total: item.totalPrice,
      })),
      subtotal: getTotal(),
      tax: 0,
      total: getTotal(),
      paymentMethod: 'PROFORMA',
      customerName: 'Proforma Invoice',
    };

    printerService.printReceiptWithPreview(proformaData);
    toast.success('📄 Proforma invoice sent to printer');
  };

  // Determine if subCategory/composition is being searched
  const isSearchingComposition = searchQuery.length >= 2 && searchResults.some(p =>
    p.subCategory?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Main POS screen
  return (
    <div className="h-full flex">
      {/* Left Panel - Search (Compact) */}
      <div className="w-[220px] min-w-[200px] bg-white border-r border-gray-200 flex flex-col">
        <div className="p-2 border-b border-gray-200">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search name or composition..."
              className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              autoFocus
            />
          </div>
          {isSearchingComposition && (
            <div className="text-[10px] text-blue-600 mt-0.5 italic">
              Searching by composition...
            </div>
          )}
          <div className="text-[10px] text-gray-400 mt-0.5">
            Cart: <span className="font-medium text-gray-600">{cart.length}</span>
          </div>
        </div>

        {/* Search Results */}
        <div className="flex-1 overflow-y-auto p-1.5">
          {isSearching ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
            </div>
          ) : showSearchResults && searchResults.length === 0 && searchQuery.length >= 2 ? (
            <div className="text-center py-4 text-gray-400 text-xs">No products found</div>
          ) : showSearchResults ? (
            <div className="space-y-1">
              {searchResults.map((product) => {
                const price = product.sellingPrice || 0;
                const totalStock = product.quantity || 0;
                const batchCount = product.batches?.length || 0;
                const hasStock = totalStock > 0;
                const qty = quantityInput[product.id] ?? '';

                return (
                  <div
                    key={product.batchId || product.id}
                    className={`p-1.5 border rounded ${
                      hasStock
                        ? 'border-gray-200 hover:border-primary-400 hover:shadow-sm cursor-pointer'
                        : 'border-gray-100 opacity-50'
                    }`}
                    onClick={() => hasStock && addToCart(product)}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">{product.name || 'Unknown'}</p>
                        <p className="text-[10px] text-gray-400">{product.code || ''}</p>
                        {product.subCategory && (
                          <p className="text-[9px] text-gray-400 italic">{product.subCategory}</p>
                        )}
                        {batchCount > 1 && (
                          <p className="text-[9px] text-blue-500 font-medium">
                            {batchCount} batches • Total: {totalStock}
                          </p>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-bold text-primary-600">{price.toLocaleString()}</p>
                        <p className={`text-[10px] ${hasStock ? 'text-green-600' : 'text-red-400'}`}>
                          {hasStock ? `Stock: ${totalStock}` : 'Out of stock'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="number"
                        min="1"
                        max={totalStock || 1}
                        placeholder="Qty"
                        value={qty}
                        onChange={(e) => {
                          setQuantityInput(prev => ({
                            ...prev,
                            [product.id]: e.target.value,
                          }));
                        }}
                        className="w-12 px-1 py-0.5 border rounded text-[10px]"
                        disabled={!hasStock}
                      />
                      <button
                        onClick={() => addToCart(product)}
                        disabled={!hasStock}
                        className="flex-1 py-0.5 bg-primary-600 text-white rounded text-[10px] hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-400 text-xs">
              <p>Search products</p>
              <p className="text-[9px]">by name or composition</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Cart */}
      <div className="flex-1 flex flex-col bg-gray-50 min-w-0">
        {/* Cart Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">🛒 Cart ({cart.length})</h2>
          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <>
                <button
                  onClick={printProforma}
                  className="text-xs text-primary-600 hover:text-primary-800 flex items-center px-2 py-1 rounded hover:bg-primary-50"
                >
                  <DocumentArrowDownIcon className="h-3.5 w-3.5 mr-1" />
                  Proforma
                </button>
                <button
                  onClick={() => {
                    const receiptData: ReceiptData = {
                      invoiceNumber: `TEMP-${Date.now()}`,
                      date: new Date().toISOString(),
                      items: cart.map((item) => ({
                        name: item.productName,
                        quantity: item.quantity,
                        price: item.unitPrice,
                        total: item.totalPrice,
                      })),
                      subtotal: getTotal(),
                      tax: getTotal() * 0.18,
                      total: getTotal() * 1.18,
                      paymentMethod: 'Preview',
                      customerName: 'Preview',
                    };
                    printerService.printReceiptWithPreview(receiptData);
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700 flex items-center px-2 py-1 rounded hover:bg-gray-100"
                >
                  <PrinterIcon className="h-3.5 w-3.5 mr-1" />
                  Preview
                </button>
              </>
            )}
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <p className="text-4xl mb-2">🛒</p>
              <p className="text-sm font-medium">Cart is empty</p>
              <p className="text-xs mt-1">Search products on the left to add items</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {cart.map((item) => (
                <div
                  key={item.batchId}
                  className="bg-white rounded-lg border border-gray-200 px-3 py-2 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{item.productName}</p>
                    <p className="text-xs text-gray-400">{item.productCode}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs">
                      <span className="text-gray-500">RWF {item.unitPrice.toLocaleString()}</span>
                      <span className="text-primary-600 font-medium">
                        = RWF {item.totalPrice.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => updateQuantity(item.batchId, -1)}
                      className="w-6 h-6 flex items-center justify-center rounded border border-gray-200 hover:bg-gray-100 text-gray-500"
                    >
                      <MinusIcon className="h-3 w-3" />
                    </button>
                    <span className="w-6 text-center font-medium text-sm">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.batchId, 1)}
                      className="w-6 h-6 flex items-center justify-center rounded border border-gray-200 hover:bg-gray-100 text-gray-500"
                    >
                      <PlusIcon className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.batchId)}
                      className="w-6 h-6 flex items-center justify-center rounded border border-red-200 hover:bg-red-50 text-red-400 ml-1"
                    >
                      <TrashIcon className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Checkout Bar */}
        <div className="bg-white border-t border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Total</span>
            <span className="text-lg font-bold text-primary-600">
              RWF {getTotal().toLocaleString()}
            </span>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
            <div className="flex gap-2">
              <input
                {...register('customerName')}
                type="text"
                placeholder="Customer Name"
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-xs py-1.5"
              />
              <input
                {...register('customerPhone')}
                type="text"
                placeholder="Phone"
                className="w-32 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-xs py-1.5"
              />
            </div>

            {/* Payment Method */}
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <select
                  {...register('paymentMethod')}
                  id="payment-method-select"
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-xs bg-white py-1.5"
                >
                  <option value="CASH">💵 Cash</option>
                  <option value="MOBILE_MONEY">📱 Mobile Money</option>
                  <option value="CARD">💳 Card</option>
                  <option value="INSURANCE">🛡️ Insurance</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={createSale.isPending || cart.length === 0}
                className="flex-1 py-1.5 px-3 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs"
              >
                {createSale.isPending ? 'Processing...' : 'Complete Sale'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ============= PROFORMA PREVIEW MODAL ============= */}
      {proformaPreview && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
            <div className="bg-primary-600 px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold text-lg">📄 Proforma Invoice</h3>
                <p className="text-primary-100 text-xs mt-0.5">Review before confirming sale</p>
              </div>
              <button onClick={cancelProforma} className="text-white/80 hover:text-white">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div>
                  <span className="text-gray-500">Customer:</span>
                  <span className="ml-2 font-medium">{proformaPreview.customerName}</span>
                </div>
                <div>
                  <span className="text-gray-500">Payment:</span>
                  <span className="ml-2 font-medium">{proformaPreview.paymentMethod}</span>
                </div>
                {proformaPreview.customerPhone && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Phone:</span>
                    <span className="ml-2 font-medium">{proformaPreview.customerPhone}</span>
                  </div>
                )}
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Item</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Qty</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Price</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {cart.map((item) => (
                      <tr key={item.batchId}>
                        <td className="px-3 py-2 text-gray-900">{item.productName}</td>
                        <td className="px-3 py-2 text-right">{item.quantity}</td>
                        <td className="px-3 py-2 text-right">RWF {item.unitPrice.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right font-medium">
                          RWF {item.totalPrice.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 space-y-1 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span>RWF {getTotal().toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Tax (0%)</span>
                  <span>RWF 0</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-primary-600 border-t pt-2 mt-2">
                  <span>Total</span>
                  <span>RWF {getTotal().toLocaleString()}</span>
                </div>
              </div>

              {/* INSURANCE: Show company selection in proforma */}
              {proformaPreview.paymentMethod === 'INSURANCE' && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-800 text-sm mb-2">🛡️ Insurance Details</h4>
                  <InsuranceCompanySelector
                    companies={insuranceCompanies || []}
                    onSelect={handleInsurancePayment}
                  />
                </div>
              )}
            </div>

            <div className="px-5 py-4 bg-gray-50 border-t border-gray-200 flex gap-3 rounded-b-xl">
              <button
                onClick={cancelProforma}
                disabled={createSale.isPending}
                className="flex-1 py-2.5 px-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const proformaData: ReceiptData = {
                    invoiceNumber: `PROFORMA-${Date.now()}`,
                    date: new Date().toISOString(),
                    items: cart.map((item) => ({
                      name: item.productName,
                      quantity: item.quantity,
                      price: item.unitPrice,
                      total: item.totalPrice,
                    })),
                    subtotal: getTotal(),
                    tax: 0,
                    total: getTotal(),
                    paymentMethod: 'PROFORMA',
                    customerName: proformaPreview.customerName,
                  };
                  printerService.printReceiptWithPreview(proformaData);
                  confirmProformaAndCreateSale();
                }}
                disabled={createSale.isPending || proformaPreview.paymentMethod === 'INSURANCE'}
                className="flex-1 py-2.5 px-4 border-2 border-primary-600 text-primary-700 font-semibold rounded-lg hover:bg-primary-50 disabled:opacity-50 transition-colors text-sm"
              >
                <PrinterIcon className="h-4 w-4 inline mr-1.5 -mt-0.5" />
                {createSale.isPending ? 'Processing...' : 'Confirm & Print'}
              </button>
              <button
                onClick={() => {
                  if (proformaPreview.paymentMethod === 'INSURANCE') {
                    // Insurance flow: will be handled by insurance modal
                    toast('Select an insurance company first');
                    return;
                  }
                  confirmProformaAndCreateSale();
                }}
                disabled={createSale.isPending || proformaPreview.paymentMethod === 'INSURANCE'}
                className="flex-1 py-2.5 px-4 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors text-sm"
              >
                {createSale.isPending ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ============= INSURANCE MODAL ============= */}
      {insuranceModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="bg-blue-600 px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold text-lg">🛡️ Insurance Processing</h3>
                <p className="text-blue-100 text-xs mt-0.5">{insuranceModal.companyName}</p>
              </div>
              <button onClick={() => setInsuranceModal(null)} className="text-white/80 hover:text-white">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Step 1: Visit Insurance Website */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-700 text-sm mb-2">Step 1: Complete Follow-up on Insurance Website</h4>
                {!insuranceModal.visitedWebsite ? (
                  <a
                    href={insuranceModal.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary-600 hover:text-primary-800 font-medium"
                  >
                    <ExternalLinkIcon className="h-5 w-5" />
                    Open {insuranceModal.companyName} Portal
                  </a>
                ) : (
                  <div className="flex items-center gap-2 text-green-600 font-medium">
                    <CheckCircleIcon className="h-5 w-5" />
                    Website visited — transaction follow-up completed
                  </div>
                )}
              </div>

              {/* Step 2: Confirm Follow-up */}
              <div className="bg-white border rounded-lg p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={insuranceModal.visitedWebsite}
                    onChange={(e) => setInsuranceModal({
                      ...insuranceModal,
                      visitedWebsite: e.target.checked,
                    })}
                    className="h-5 w-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">
                    I have completed all transaction follow-up on the insurance website
                  </span>
                </label>
              </div>

              {/* Step 3: Calculation Breakdown */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-800 text-sm mb-3">💰 Payment Breakdown</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Amount</span>
                    <span className="font-bold">RWF {insuranceModal.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Insurance Coverage ({insuranceModal.coveragePercentage}%)</span>
                    <span className="font-bold text-green-600">RWF {insuranceModal.paidByInsurance.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Patient Pays ({100 - insuranceModal.coveragePercentage}%)</span>
                    <span className="font-bold text-orange-600">RWF {insuranceModal.paidByPatient.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-blue-200 pt-2 mt-2">
                    <div className="flex justify-between font-bold">
                      <span>Claimable Amount</span>
                      <span className="text-primary-600">RWF {insuranceModal.paidByInsurance.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Patient pays input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount Paid by Patient
                </label>
                <input
                  type="number"
                  value={insuranceModal.paidByPatient}
                  onChange={(e) => {
                    const patientAmount = parseFloat(e.target.value) || 0;
                    setInsuranceModal({
                      ...insuranceModal,
                      paidByPatient: patientAmount,
                      paidByInsurance: insuranceModal.totalAmount - patientAmount,
                    });
                  }}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Insurance coverage: RWF {insuranceModal.paidByInsurance.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="px-5 py-4 bg-gray-50 border-t border-gray-200 flex gap-3 rounded-b-xl">
              <button
                onClick={() => {
                  setInsuranceModal(null);
                  setProformaPreview(null);
                }}
                className="flex-1 py-2.5 px-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmInsuranceAndCreateSale}
                disabled={createSale.isPending || !insuranceModal.visitedWebsite}
                className="flex-1 py-2.5 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
              >
                {createSale.isPending ? 'Processing...' : 'Confirm Insurance Payment'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ============= CARD PAYMENT MODAL ============= */}
      {cardModal.show && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
            <div className="bg-purple-600 px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold text-lg">💳 Card Payment</h3>
                <p className="text-purple-100 text-xs mt-0.5">
                  Amount: RWF {cardModal.amount.toLocaleString()}
                </p>
              </div>
              <button onClick={() => setCardModal({ show: false, amount: 0 })} className="text-white/80 hover:text-white">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="px-5 py-6 space-y-4">
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 text-center">
                <p className="text-sm text-gray-600 mb-2">Process payment via Stripe</p>
                <a
                  href="https://dashboard.stripe.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <ExternalLinkIcon className="h-5 w-5" />
                  Open Stripe Dashboard
                </a>
                <p className="text-xs text-gray-400 mt-2">
                  Enter payment reference from Stripe below
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Reference
                </label>
                <input
                  type="text"
                  id="card-payment-ref"
                  placeholder="e.g., pi_3ABC123..."
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="px-5 py-4 bg-gray-50 border-t border-gray-200 flex gap-3 rounded-b-xl">
              <button
                onClick={() => setCardModal({ show: false, amount: 0 })}
                className="flex-1 py-2.5 px-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const ref = (document.getElementById('card-payment-ref') as HTMLInputElement)?.value;
                  if (!ref) {
                    toast.error('Please enter a payment reference from Stripe');
                    return;
                  }

                  // Proceed with sale
                  const saleData = {
                    items: cart.map((item) => ({
                      batchId: item.batchId,
                      quantity: item.quantity,
                      unitPrice: item.unitPrice,
                      discount: 0,
                    })),
                    customerName: proformaPreview?.customerName || 'Walk-in Customer',
                    customerPhone: proformaPreview?.customerPhone || '',
                    paymentMethod: 'CARD',
                    paymentReference: ref,
                  };

                  setCardModal({ show: false, amount: 0 });
                  createSale.mutate(saleData);
                }}
                disabled={createSale.isPending}
                className="flex-1 py-2.5 px-4 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors text-sm"
              >
                {createSale.isPending ? 'Processing...' : 'Confirm Card Payment'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ============= SALE COMPLETED MODAL ============= */}
      {completedSale && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-green-600 px-5 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold text-lg">✅ Sale Completed</h3>
                <p className="text-green-100 text-xs mt-0.5">
                  Invoice: {completedSale.invoiceNumber}
                </p>
              </div>
              <button onClick={() => setCompletedSale(null)} className="text-white/80 hover:text-white">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="px-5 py-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">Customer</span>
                <span className="font-medium">{completedSale.customerName}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">Payment</span>
                <span className="font-medium">{completedSale.paymentMethod}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">Items</span>
                <span className="font-medium">{completedSale.items.length}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 mt-2">
                <div className="flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span className="text-primary-600">
                    RWF {completedSale.total.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 bg-gray-50 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => { printInvoice(completedSale, true); setCompletedSale(null); }}
                disabled={isPrinting}
                className="flex-1 py-2.5 px-4 border-2 border-primary-600 text-primary-700 font-semibold rounded-lg hover:bg-primary-50 disabled:opacity-50 transition-colors text-sm"
              >
                <PrinterIcon className="h-4 w-4 inline mr-1.5 -mt-0.5" />
                {isPrinting ? 'Printing...' : 'Print Proforma'}
              </button>
              <button
                onClick={() => { printInvoice(completedSale); setCompletedSale(null); }}
                disabled={isPrinting}
                className="flex-1 py-2.5 px-4 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors text-sm"
              >
                <PrinterIcon className="h-4 w-4 inline mr-1.5 -mt-0.5" />
                {isPrinting ? 'Printing...' : 'Print & Close'}
              </button>
              <button
                onClick={() => setCompletedSale(null)}
                disabled={isPrinting}
                className="py-2.5 px-4 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ============= INSURANCE COMPANY SELECTOR COMPONENT =============
function InsuranceCompanySelector({
  companies,
  onSelect,
}: {
  companies: InsuranceCompany[];
  onSelect: (companyId: string) => void;
}) {
  const [selected, setSelected] = useState('');

  if (companies.length === 0) {
    return (
      <div className="text-sm text-gray-500">
        No insurance companies configured. Please add them in Insurance settings.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
      >
        <option value="">Select insurance company...</option>
        {companies.map((company: InsuranceCompany) => (
          <option key={company.id} value={company.id}>
            {company.name} ({company.coveragePercentage}% coverage)
          </option>
        ))}
      </select>
      <button
        onClick={() => {
          if (!selected) {
            toast.error('Please select an insurance company');
            return;
          }
          onSelect(selected);
        }}
        className="w-full py-2 px-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
      >
        Proceed with Insurance
      </button>
    </div>
  );
}
