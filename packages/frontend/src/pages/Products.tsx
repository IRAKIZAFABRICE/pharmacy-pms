// packages/frontend/src/pages/Products.tsx
import { useState, useEffect } from 'react';
import {useSearchParams, useNavigate} from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  CubeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  QrCodeIcon,
} from '@heroicons/react/24/outline';
import api from '../services/api';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';

const MARKUP = 1.5;

// Schema for a single product in the invoice
const productEntrySchema = z.object({
  tradeName: z.string().min(1, 'Trade name is required'),
  composition: z.string().optional(),
  batchNumber: z.string().min(1, 'Batch number is required'),
  expiryDate: z.string().min(1, 'Expiry date is required'),
  numberOfContainers: z.coerce.number().min(1, 'Number of containers is required'),
  quantityPerContainer: z.coerce.number().min(1, 'Quantity per container is required'),
  containerCost: z.coerce.number().min(0, 'Container cost is required'),
  pricePerUnit: z.coerce.number().min(0, 'Price per unit must be positive'),
  sellingPricePerUnit: z.coerce.number().min(0, 'Selling price per unit must be positive'),
  sellingPricePerContainer: z.coerce.number().min(0, 'Selling price per container must be positive'),
  totalCost: z.coerce.number().min(0, 'Total cost must be positive'),
});

type ProductEntry = z.infer<typeof productEntrySchema>;

// Schema for the entire invoice
const invoiceSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  invoiceNumber: z.string().min(1, 'Invoice number is required'),
  invoiceAmount: z.coerce.number().min(0, 'Invoice amount is required'),
  products: z.array(productEntrySchema).min(1, 'At least one product is required'),
});

type InvoiceForm = z.infer<typeof invoiceSchema>;

interface ExistingProductInfo {
  id: string;
  name: string;
  code: string;
  category: string | null;
  subCategory: string | null;
  unitOfMeasure: string;
  existingBatch?: {
    batchNumber: string;
    expiryDate: string;
    quantity: number;
    containerSize: number;
    costPrice: number;
    sellingPrice: number;
    pricePerUnit: number;
    totalContainerSellingPrice: number;
    quantityPerContainer: number;
    containerCost: number;
  } | null;
}

interface Product {
  id: string;
  code: string;
  name: string;
  category: string | null;
  subCategory: string | null;
  description: string | null;
  isPrescription: boolean;
  isControlled: boolean;
  unitOfMeasure: string;
  reorderLevel: number;
  taxRate: number;
  isActive: boolean;
  costPrice: number;
  sellingPrice: number;
  stockQuantity: number;
  createdAt: string;
  updatedAt: string;
}

export default function Products() {
  const navigate = useNavigate();
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isActiveFilter, setIsActiveFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [invoiceProducts, setInvoiceProducts] = useState<ProductEntry[]>([
    { 
      tradeName: '', 
      composition: '', 
      batchNumber: '', 
      expiryDate: '',
      numberOfContainers: 0, 
      quantityPerContainer: 0,
      containerCost: 0,
      pricePerUnit: 0,
      sellingPricePerUnit: 0,
      sellingPricePerContainer: 0,
      totalCost: 0,
    }
  ]);
  const [searchParams, setSearchParams] = useSearchParams()
  const editId = searchParams.get('edit')
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  const [calculatedGrandTotal, setCalculatedGrandTotal] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const isScanningRef = { current: false };
  const [productSuggestions, setProductSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionRow, setActiveSuggestionRow] = useState<number | null>(null);
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [modalSearchResults, setModalSearchResults] = useState<any[]>([]);
  const [showModalSearch, setShowModalSearch] = useState(false);

  // Prefill metadata for quick-add from search
  const [prefillMeta, setPrefillMeta] = useState<{
    tradeName?: string;
    composition?: string;
  } | null>(null);

  // ✅ BARCODE SCANNER - Quick product lookup
  useBarcodeScanner(
    (barcode) => {
      if (!isScanningRef.current) return;
      const product = (existingProducts || []).find((p: any) =>
        p.code.toLowerCase() === barcode.toLowerCase() ||
        p.barcode?.toLowerCase() === barcode.toLowerCase()
      );
      if (product) {
        toast.success(`📦 Found: ${product.name}`);
        openInvoiceModal();
        setTimeout(() => {
          if (invoiceProducts.length > 0 && invoiceProducts[0].tradeName === '') {
            selectProduct(0, product);
          }
        }, 300);
      } else {
        toast.error(`❌ Product not found: ${barcode}`);
      }
      isScanningRef.current = false;
      setIsScanning(false);
    }
  );

  // ============= DUPLICATE DETECTION STATE (req 4) =============
  const [existingProductMap, setExistingProductMap] = useState<Record<string, ExistingProductInfo>>({});
  const [mergeDialog, setMergeDialog] = useState<{
    tradeName: string;
    existing: ExistingProductInfo;
    rowIndex: number;
  } | null>(null);

  const queryClient = useQueryClient();

  const {
    reset,
  } = useForm<InvoiceForm>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      supplierId: '',
      invoiceNumber: '',
      invoiceAmount: 0,
    },
  });


  // Get existing products
  const { data: existingProducts, isLoading } = useQuery({
    queryKey: ['products', searchQuery, isActiveFilter],
    queryFn: async () => {
      const response = await api.get('/products', {
        params: { 
          search: searchQuery || undefined, 
          limit: 100,
          isActive: isActiveFilter === 'all' ? undefined : isActiveFilter,
        },
      });
      return response.data;
    },
  });
  // Fetch product when editId changes
const { data: productToEdit } = useQuery({
  queryKey: ['product', editId],
  queryFn: async () => {
    if (!editId) return null;
    const response = await api.get(`/products/${editId}`);
    return response;
  },
  enabled: !!editId,
});

useEffect(() => {
  if (productToEdit) setEditingProduct(productToEdit)
}, [productToEdit])

// Close modal and clear URL
const handleCloseEdit = () => {
  setEditingProduct(null)
  setSearchParams({})
}


  // Get suppliers
  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const response = await api.get('/suppliers');
      return response.data;
    },
  });

  // Get batches to check status
  const { data: batches } = useQuery({
    queryKey: ['batches-status'],
    queryFn: async () => {
      const response = await api.get('/batches');
      return response.data;
    },
  });

  // ✅ CREATE PRODUCTS FROM INVOICE
  const createProductsFromInvoice = useMutation({
    mutationFn: async (data: InvoiceForm) => {
      console.log('📤 Creating products from invoice:', data);
      const results = [];
      for (const productData of data.products) {
        // Check for existing product by name (case-insensitive lookup from map)
        const existingInfo = existingProductMap[productData.tradeName.toLowerCase()];
        
        let productId: string;

        if (existingInfo) {
          // Reuse existing product — just create a new batch
          productId = existingInfo.id;
          toast.success(`📦 Found existing product "${existingInfo.name}", adding batch only`);
        } else {
          // Create new product
          const code = productData.tradeName.substring(0, 10).toUpperCase().replace(/\s/g, '-') || `PROD-${Date.now()}`;
          
          const productResponse = await api.post('/products', {
            code: code,
            name: productData.tradeName,
            category: 'General',
            subCategory: productData.composition || 'General',
            unitOfMeasure: 'Tablet',
            reorderLevel: 10,
            taxRate: 0,
            isPrescription: false,
            isControlled: false,
          });
          const product = productResponse.data?.data || productResponse.data;
          productId = product.id;
          results.push(product);
        }

        const totalQuantity = productData.numberOfContainers * productData.quantityPerContainer;

        const batchData = {
          productId,
          batchNumber: productData.batchNumber,
          expiryDate: productData.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          quantity: totalQuantity,
          containerSize: productData.numberOfContainers,
          quantityPerContainer: productData.quantityPerContainer || 1,
          containerCost: productData.containerCost || 0,
          costPrice: productData.pricePerUnit,
          sellingPrice: productData.sellingPricePerUnit,
          supplierId: data.supplierId,
          isConfirmed: false,
          invoiceNumber: data.invoiceNumber,
          invoiceAmount: data.invoiceAmount,
        };
        await api.post('/batches/receive', batchData);
        
        if (!existingInfo) {
          results.push({ id: productId, name: productData.tradeName });
        }
      }
      return results;
    },
    onSuccess: () => {
      toast.success(`✅ ${invoiceProducts.length} product(s) processed! Review in Inventory.`);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['batches-status'] });
      setIsInvoiceModalOpen(false);
      setIsSaving(false);
      reset();
      setExistingProductMap({});
      setInvoiceProducts([{ 
        tradeName: '', 
        composition: '', 
        batchNumber: '', 
        expiryDate: '',
        numberOfContainers: 0, 
        quantityPerContainer: 0,
        containerCost: 0,
        pricePerUnit: 0,
        sellingPricePerUnit: 0,
        sellingPricePerContainer: 0,
        totalCost: 0,
      }]);
      setCalculatedGrandTotal(0);
      setPrefillMeta(null);
    },
    onError: (error: any) => {
      console.error('❌ Create error:', error);
      toast.error(error.response?.data?.error || 'Failed to create products');
      setIsSaving(false);
    },
  });

  // ✅ Build existing product map from current product list
  const buildExistingProductMap = (products: any[], batchesData: any[]) => {
    const map: Record<string, ExistingProductInfo> = {};
    
    // Index batches by productId for quick lookup
    const batchesByProduct: Record<string, any[]> = {};
    if (batchesData) {
      for (const b of batchesData) {
        if (!batchesByProduct[b.productId]) batchesByProduct[b.productId] = [];
        batchesByProduct[b.productId].push(b);
      }
    }

    for (const p of products) {
      const key = p.name.toLowerCase();
      const productBatches = batchesByProduct[p.id] || [];
      const latestBatch = productBatches.length > 0 
        ? productBatches.reduce((latest, b) => 
            new Date(b.createdAt) > new Date(latest.createdAt) ? b : latest
          )
        : null;

      map[key] = {
        id: p.id,
        name: p.name,
        code: p.code,
        category: p.category,
        subCategory: p.subCategory,
        unitOfMeasure: p.unitOfMeasure,
        existingBatch: latestBatch ? {
          batchNumber: latestBatch.batchNumber,
          expiryDate: latestBatch.expiryDate,
          quantity: latestBatch.quantity,
          containerSize: latestBatch.containerSize,
          costPrice: latestBatch.costPrice,
          sellingPrice: latestBatch.sellingPrice,
          pricePerUnit: latestBatch.pricePerUnit || latestBatch.costPrice || 0,
          totalContainerSellingPrice: latestBatch.totalContainerSellingPrice || 0,
          quantityPerContainer: latestBatch.quantityPerContainer || latestBatch.containerSize || 1,
          containerCost: latestBatch.containerCost || latestBatch.costPrice || 0,
        } : null,
      };
    }
    return map;
  };

  // ✅ SAVE HANDLER - DIRECT (NO handleSubmit)
  const handleSave = () => {
    console.log('🖱️ Save button clicked');
    setIsSaving(true);
    
    // Build existing product map for duplicate detection
    if (existingProducts && batches) {
      const map = buildExistingProductMap(existingProducts, batches);
      setExistingProductMap(map);
    }
    
    // Get form values from DOM
    const supplierSelect = document.querySelector('select[name="supplierId"]') as HTMLSelectElement;
    const invoiceInput = document.querySelector('input[name="invoiceNumber"]') as HTMLInputElement;
    const amountInput = document.querySelector('input[name="invoiceAmount"]') as HTMLInputElement;
    
    const supplierId = supplierSelect?.value || '';
    const invoiceNumber = invoiceInput?.value || '';
    const invoiceAmount = parseFloat(amountInput?.value || '0');
    
    // Validate
    if (!supplierId) {
      toast.error('Please select a supplier');
      setIsSaving(false);
      return;
    }
    if (!invoiceNumber) {
      toast.error('Please enter invoice number');
      setIsSaving(false);
      return;
    }
    if (!invoiceAmount || invoiceAmount <= 0) {
      toast.error('Please enter invoice amount');
      setIsSaving(false);
      return;
    }
    
    // Get valid products
    const validProducts = invoiceProducts.filter(p => p.tradeName && p.batchNumber && p.numberOfContainers > 0);
    if (validProducts.length === 0) {
      toast.error('Please add at least one valid product');
      setIsSaving(false);
      return;
    }

    // Check for duplicates — if existingProductMap has any of these, warn the user
    const existingProductMap = buildExistingProductMap(existingProducts || [], batches || []);
    setExistingProductMap(existingProductMap);

    // Check each product for duplicate
    for (const product of validProducts) {
      const key = product.tradeName.trim().toLowerCase();
      const existing = existingProductMap[key];
      if (existing) {
        // Found a duplicate — show merge dialog
        setMergeDialog({
          tradeName: product.tradeName,
          existing,
          rowIndex: invoiceProducts.indexOf(product),
        });
        setIsSaving(false);
        return; // Stop — user must handle the merge first
      }
    }
    
    // Verify grand total
    if (Math.abs(calculatedGrandTotal - invoiceAmount) >= 0.01) {
      toast.error(`❌ Grand total (${calculatedGrandTotal.toFixed(2)}) doesn't match invoice amount (${invoiceAmount.toFixed(2)})`);
      setIsSaving(false);
      return;
    }
    
    const formData = {
      supplierId,
      invoiceNumber,
      invoiceAmount,
      products: validProducts,
    };
    
    createProductsFromInvoice.mutate(formData);
  };

  // Add a new product row
  const addProductRow = () => {
    setInvoiceProducts([...invoiceProducts, { 
      tradeName: prefillMeta?.tradeName || '', 
      composition: prefillMeta?.composition || '', 
      batchNumber: '', 
      expiryDate: '',
      numberOfContainers: 0, 
      quantityPerContainer: 0,
      containerCost: 0,
      pricePerUnit: 0,
      sellingPricePerUnit: 0,
      sellingPricePerContainer: 0,
      totalCost: 0,
    }]);
  };

  // Remove a product row
  const removeProductRow = (index: number) => {
    if (invoiceProducts.length > 1) {
      const newProducts = invoiceProducts.filter((_, i) => i !== index);
      setInvoiceProducts(newProducts);
      updateGrandTotal(newProducts);
    }
  };

  // ✅ Update product field and recalculate all values
  const updateProduct = (index: number, field: string, value: any) => {
    const newProducts = [...invoiceProducts];
    newProducts[index] = { ...newProducts[index], [field]: value };
    
    const containers = newProducts[index].numberOfContainers || 0;
    const qtyPerCont = newProducts[index].quantityPerContainer || 0;
    const containerCost = newProducts[index].containerCost || 0;
    
    if (qtyPerCont > 0 && containerCost > 0) {
      const pricePerUnit = containerCost / qtyPerCont;
      newProducts[index].pricePerUnit = Math.round(pricePerUnit * 100) / 100;
      newProducts[index].sellingPricePerUnit = Math.round(pricePerUnit * MARKUP * 100) / 100;
      newProducts[index].sellingPricePerContainer = Math.round(containerCost * MARKUP * 100) / 100;
    }
    
    newProducts[index].totalCost = Math.round(containers * containerCost * 100) / 100;
    
    setInvoiceProducts(newProducts);
    updateGrandTotal(newProducts);
  };

  // Calculate grand total
  const updateGrandTotal = (productList: ProductEntry[]) => {
    const total = productList.reduce((sum, p) => sum + (p.totalCost || 0), 0);
    setCalculatedGrandTotal(Math.round(total * 100) / 100);
  };

  // ✅ SMART PRODUCT AUTOCOMPLETE
  const handleTradeNameSearch = (index: number, query: string) => {
    setActiveSuggestionRow(index);
    if (!query || query.length < 2) {
      setProductSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const filtered = (existingProducts || []).filter((p: any) =>
      p.name.toLowerCase().includes(query.toLowerCase())
    ).map((p: any) => ({
      ...p,
      existingBatch: existingProductMap[p.name.toLowerCase()]?.existingBatch || null,
    }));
    setProductSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
  };

  const selectProduct = (index: number, product: any) => {
    const newProducts = [...invoiceProducts];
    const existing = product.existingBatch || {};
    const preservedBatch = {
      batchNumber: newProducts[index].batchNumber || '',
      expiryDate: newProducts[index].expiryDate || '',
      numberOfContainers: newProducts[index].numberOfContainers || existing.containerSize || 0,
      quantityPerContainer: newProducts[index].quantityPerContainer || existing.quantityPerContainer || 1,
      containerCost: newProducts[index].containerCost || existing.containerCost || 0,
    };
    newProducts[index] = {
      ...newProducts[index],
      tradeName: product.name,
      composition: product.subCategory || product.category || 'General',
      batchNumber: preservedBatch.batchNumber,
      expiryDate: preservedBatch.expiryDate,
      numberOfContainers: preservedBatch.numberOfContainers,
      quantityPerContainer: preservedBatch.quantityPerContainer,
      containerCost: preservedBatch.containerCost,
    };
    setInvoiceProducts(newProducts);
    setShowSuggestions(false);
    setProductSuggestions([]);
    setActiveSuggestionRow(null);
    updateGrandTotal(newProducts);
  };

  const openInvoiceModal = () => {
    setEditingId(null);
    reset({
      supplierId: '',
      invoiceNumber: '',
      invoiceAmount: 0,
    });
    setInvoiceProducts([{ 
      tradeName: '', 
      composition: '', 
      batchNumber: '', 
      expiryDate: '',
      numberOfContainers: 0, 
      quantityPerContainer: 0,
      containerCost: 0,
      pricePerUnit: 0,
      sellingPricePerUnit: 0,
      sellingPricePerContainer: 0,
      totalCost: 0,
    }]);
    setCalculatedGrandTotal(0);
    setExistingProductMap({});
    setMergeDialog(null);
    setModalSearchQuery('');
    setModalSearchResults([]);
    setShowModalSearch(false);
    setPrefillMeta(null);
    setIsInvoiceModalOpen(true);
  };

  // ✅ MODAL PRODUCT SEARCH - Search existing products to add quickly
  const handleModalProductSearch = (query: string) => {
    setModalSearchQuery(query);
    if (!query || query.length < 2) {
      setModalSearchResults([]);
      setShowModalSearch(false);
      return;
    }
    const filtered = (existingProducts || []).filter((p: any) => {
      const q = query.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.subCategory && p.subCategory.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))
      );
    }).map((p: any) => ({
      ...p,
      existingBatch: existingProductMap[p.name.toLowerCase()]?.existingBatch || null,
    }));
    setModalSearchResults(filtered);
    setShowModalSearch(filtered.length > 0);
  };

  const addExistingProductToInvoice = (product: any) => {
    const existing = product.existingBatch || {};
    const newRow: ProductEntry = {
      tradeName: product.name,
      composition: product.subCategory || product.category || 'General',
      batchNumber: '',
      expiryDate: '',
      numberOfContainers: existing.containerSize || 0,
      quantityPerContainer: existing.quantityPerContainer || 1,
      containerCost: existing.containerCost || 0,
      pricePerUnit: 0,
      sellingPricePerUnit: 0,
      sellingPricePerContainer: 0,
      totalCost: 0,
    };
    setInvoiceProducts([...invoiceProducts, newRow]);
    setPrefillMeta({ tradeName: product.name, composition: product.subCategory || product.category || 'General' });
    setModalSearchQuery('');
    setModalSearchResults([]);
    setShowModalSearch(false);
    toast.success(`➕ Added "${product.name}" — enter batch no and expiry date`);
  };

  // Get product status
  const getProductStatus = (productId: string) => {
    const productBatches = batches?.filter((b: any) => b.productId === productId);
    if (!productBatches || productBatches.length === 0) {
      return { status: 'draft', label: '📝 Draft', color: 'bg-gray-100 text-gray-800' };
    }
    const hasConfirmed = productBatches.some((b: any) => b.isConfirmed === true);
    if (hasConfirmed) {
      return { status: 'in-stock', label: '✅ In Stock', color: 'bg-green-100 text-green-800' };
    }
    return { status: 'pending', label: '⏳ Pending Confirmation', color: 'bg-yellow-100 text-yellow-800' };
  };

  const toggleBarcodeScan = () => {
    const newState = !isScanning;
    setIsScanning(newState);
    isScanningRef.current = newState;
    if (newState) {
      toast.success('📷 Barcode scanner active. Scan a product barcode...');
    }
  };

  // Delete product
  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/products/${id}`);
    },
    onSuccess: () => {
      toast.success('✅ Product deactivated successfully');
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to delete product');
    },
  });

  // Reactivate product
  const reactivateProduct = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/products/${id}/reactivate`);
    },
    onSuccess: () => {
      toast.success('✅ Product reactivated successfully');
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to reactivate product');
    },
  });

  // Update product
  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Product> }) => {
      const response = await api.put(`/products/${id}`, data);
      return response;
    },
    onSuccess: () => {
      toast.success('✅ Product updated successfully');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', editId] });
      setEditingProduct(null);
      setSearchParams({});
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Failed to update product');
    },
  });

  const [editForm, setEditForm] = useState<Partial<Product>>({});

  // Populate editForm when editingProduct changes
  useEffect(() => {
    if (editingProduct) {
      setEditForm({
        name: editingProduct.name,
        code: editingProduct.code,
        category: editingProduct.category,
        subCategory: editingProduct.subCategory,
        description: editingProduct.description,
        unitOfMeasure: editingProduct.unitOfMeasure,
        reorderLevel: editingProduct.reorderLevel,
        taxRate: editingProduct.taxRate,
        isPrescription: editingProduct.isPrescription,
        isControlled: editingProduct.isControlled,
      });
    }
  }, [editingProduct]);

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
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <div className="flex gap-2">
          <button
            onClick={toggleBarcodeScan}
            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
              isScanning
                ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            title={isScanning ? 'Stop scanning' : 'Scan barcode to find product'}
          >
            <QrCodeIcon className="h-5 w-5 mr-2" />
            {isScanning ? 'Stop Scan' : 'Scan Barcode'}
          </button>
          <button
            onClick={openInvoiceModal}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add from Invoice
          </button>
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSelectedStatus('all')}
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            selectedStatus === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setSelectedStatus('draft')}
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            selectedStatus === 'draft' ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          📝 Draft
        </button>
        <button
          onClick={() => setSelectedStatus('pending')}
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            selectedStatus === 'pending' ? 'bg-yellow-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          ⏳ Pending
        </button>
        <button
          onClick={() => setSelectedStatus('in-stock')}
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            selectedStatus === 'in-stock' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          ✅ In Stock
        </button>
        <div className="h-6 w-px bg-gray-300 mx-1"></div>
        <button
          onClick={() => setIsActiveFilter('active')}
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            isActiveFilter === 'active' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Active
        </button>
        <button
          onClick={() => setIsActiveFilter('inactive')}
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            isActiveFilter === 'inactive' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          🚫 Inactive
        </button>
        <button
          onClick={() => setIsActiveFilter('all')}
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            isActiveFilter === 'all' ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          All Status
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden"
      >
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Composition</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dosage Form</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {existingProducts?.map((product: any) => {
              const status = getProductStatus(product.id);
              
              // Apply batch status filter
              if (selectedStatus !== 'all' && status.status !== selectedStatus) return null;
              
              // Apply active/inactive filter
              if (isActiveFilter === 'active' && product.isActive === false) return null;
              if (isActiveFilter === 'inactive' && product.isActive !== false) return null;

              return (
                <tr key={product.id} className={`hover:bg-gray-50 ${product.isActive === false ? 'opacity-75 bg-gray-50' : ''}`}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{product.code}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{product.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{product.subCategory || product.category || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{product.unitOfMeasure || 'Tablet'}</td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex flex-col gap-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                      {product.isActive === false && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          🚫 Inactive
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    {status.status === 'pending' && product.isActive !== false && (
                      <button
                        onClick={() => navigate(`/inventory?productId=${product.id}`)}
                        className="text-green-600 hover:text-green-900"
                        title="Confirm in Inventory"
                      >
                        <CheckCircleIcon className="h-5 w-5" />
                      </button>
                    )}
                    {product.isActive !== false && (
                      <button
                        onClick={() => navigate(`/inventory?productId=${product.id}`)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Go to Inventory"
                      >
                        <CubeIcon className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      onClick={() => setSearchParams({ edit: product.id })}
                      className="text-primary-600 hover:text-primary-900"
                      title="Edit product"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    {product.isActive === false ? (
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to reactivate this product?')) {
                            reactivateProduct.mutate(product.id);
                          }
                        }}
                        className="text-green-600 hover:text-green-900"
                        title="Reactivate product"
                      >
                        <CheckCircleIcon className="h-5 w-5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to deactivate this product?')) {
                            deleteProduct.mutate(product.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-900"
                        title="Deactivate product"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {existingProducts?.length === 0 && (
          <div className="text-center py-8 text-gray-500">No products found.</div>
        )}
      </div>

      {/* ✅ DUPLICATE DETECTION DIALOG */}
      {mergeDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <ExclamationTriangleIcon className="h-8 w-8 text-amber-500" />
              <div>
                <h3 className="text-lg font-bold text-gray-900">Duplicate Product Found</h3>
                <p className="text-sm text-gray-500">
                  "{mergeDialog.tradeName}" already exists in the system
                </p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-amber-800 mb-2">Existing Product Details:</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Name:</span>
                  <span className="ml-2 font-medium">{mergeDialog.existing.name}</span>
                </div>
                <div>
                  <span className="text-gray-500">Code:</span>
                  <span className="ml-2 font-medium">{mergeDialog.existing.code}</span>
                </div>
                <div>
                  <span className="text-gray-500">Category:</span>
                  <span className="ml-2 font-medium">{mergeDialog.existing.category || '-'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Unit:</span>
                  <span className="ml-2 font-medium">{mergeDialog.existing.unitOfMeasure}</span>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              You can continue adding this as a new batch under the existing product, 
              or cancel and review the product details.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  // User wants to keep the duplicate — add to existing product map and skip check
                  const key = mergeDialog.tradeName.toLowerCase();
                  // Mark it known so subsequent save skips the check for this entry
                  setExistingProductMap(prev => ({
                    ...prev,
                    [key]: mergeDialog.existing,
                  }));
                  setMergeDialog(null);
                  // Continue with save
                  setIsSaving(true);
                  
                  // Re-run save logic without duplicate check
                  const supplierSelect = document.querySelector('select[name="supplierId"]') as HTMLSelectElement;
                  const invoiceInput = document.querySelector('input[name="invoiceNumber"]') as HTMLInputElement;
                  const amountInput = document.querySelector('input[name="invoiceAmount"]') as HTMLInputElement;
                  
                  const supplierId = supplierSelect?.value || '';
                  const invoiceNumber = invoiceInput?.value || '';
                  const invoiceAmount = parseFloat(amountInput?.value || '0');
                  
                  const validProducts = invoiceProducts.filter(p => p.tradeName && p.batchNumber && p.numberOfContainers > 0);
                  
                  if (Math.abs(calculatedGrandTotal - invoiceAmount) >= 0.01) {
                    toast.error(`❌ Grand total doesn't match invoice amount`);
                    setIsSaving(false);
                    return;
                  }
                  
                  createProductsFromInvoice.mutate({
                    supplierId,
                    invoiceNumber,
                    invoiceAmount,
                    products: validProducts,
                  });
                }}
                className="flex-1 py-2.5 px-4 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition-colors text-sm"
              >
                Add as New Batch
              </button>
              <button
                onClick={() => {
                  setMergeDialog(null);
                  setIsSaving(false);
                }}
                className="flex-1 py-2.5 px-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition-colors text-sm"
              >
                Cancel & Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ EDIT PRODUCT MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">✏️ Edit Product</h2>
              <button onClick={handleCloseEdit} className="text-gray-400 hover:text-gray-600">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Product Code</label>
                <input
                  type="text"
                  value={editForm.code || ''}
                  onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Product Name</label>
                <input
                  type="text"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <input
                  type="text"
                  value={editForm.category || ''}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Sub Category / Composition</label>
                <input
                  type="text"
                  value={editForm.subCategory || ''}
                  onChange={(e) => setEditForm({ ...editForm, subCategory: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Unit of Measure</label>
                <input
                  type="text"
                  value={editForm.unitOfMeasure || ''}
                  onChange={(e) => setEditForm({ ...editForm, unitOfMeasure: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Reorder Level</label>
                  <input
                    type="number"
                    value={editForm.reorderLevel || ''}
                    onChange={(e) => setEditForm({ ...editForm, reorderLevel: parseInt(e.target.value) || 0 })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tax Rate (%)</label>
                  <input
                    type="number"
                    value={editForm.taxRate || ''}
                    onChange={(e) => setEditForm({ ...editForm, taxRate: parseFloat(e.target.value) || 0 })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isPrescription"
                    checked={editForm.isPrescription || false}
                    onChange={(e) => setEditForm({ ...editForm, isPrescription: e.target.checked })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isPrescription" className="ml-2 block text-sm text-gray-700">Prescription Required</label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isControlled"
                    checked={editForm.isControlled || false}
                    onChange={(e) => setEditForm({ ...editForm, isControlled: e.target.checked })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isControlled" className="ml-2 block text-sm text-gray-700">Controlled Substance</label>
                </div>
              </div>
            </div>

            <div className="flex space-x-3 pt-4 mt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  if (editingProduct) {
                    updateProductMutation.mutate({ id: editingProduct.id, data: editForm });
                  }
                }}
                disabled={updateProductMutation.isPending}
                className="flex-1 py-2 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {updateProductMutation.isPending ? 'Saving...' : '💾 Save Changes'}
              </button>
              <button
                type="button"
                onClick={handleCloseEdit}
                className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ INVOICE MODAL - CORRECT CALCULATIONS */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-7xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">📋 Add Products from Invoice</h2>
            
            <div className="space-y-6">
              {/* Supplier & Invoice Info */}
              <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Supplier *</label>
                  <select 
                    name="supplierId"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option value="">Select supplier...</option>
                    {suppliers?.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Invoice Number *</label>
                  <input 
                    name="invoiceNumber"
                    type="text" 
                    placeholder="INV-001" 
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Invoice Amount *</label>
                  <input 
                    name="invoiceAmount"
                    type="number" 
                    placeholder="Total invoice amount" 
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500" 
                  />
                </div>
              </div>

              {/* ✅ QUICK PRODUCT SEARCH - Add existing products fast */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-800 mb-2">🔍 Quick Add Existing Product</h3>
                <p className="text-xs text-blue-600 mb-2">Search by trade name or composition to add an existing product without retyping details.</p>
                <div className="relative">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search existing products by name or composition..."
                      value={modalSearchQuery}
                      onChange={(e) => handleModalProductSearch(e.target.value)}
                      onFocus={() => modalSearchQuery.length >= 2 && setShowModalSearch(true)}
                      onBlur={() => setTimeout(() => setShowModalSearch(false), 150)}
                      className="w-full pl-9 pr-4 py-2 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                  </div>
                  {showModalSearch && modalSearchResults.length > 0 && (
                    <div className="absolute z-50 w-full bg-white border border-blue-200 rounded-md shadow-lg max-h-56 overflow-y-auto mt-1">
                      {modalSearchResults.map((p: any) => (
                        <div
                          key={p.id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            addExistingProductToInvoice(p);
                          }}
                          className="px-3 py-2.5 hover:bg-blue-50 cursor-pointer text-sm border-b border-blue-100 last:border-0"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-900">{p.name}</div>
                              <div className="text-xs text-gray-500">{p.code} • {p.category || 'General'} • {p.unitOfMeasure || 'Tablet'}</div>
                            </div>
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Add</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {showModalSearch && modalSearchQuery.length >= 2 && modalSearchResults.length === 0 && (
                    <div className="absolute z-50 w-full bg-white border border-blue-200 rounded-md shadow-lg mt-1 p-3 text-sm text-gray-500 text-center">
                      No products found. A new product will be created when you save.
                    </div>
                  )}
                </div>
              </div>

              {/* Products Table */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">#</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 min-w-[120px]">Trade Name *</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 min-w-[100px]">Composition</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 min-w-[100px]">Batch No *</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 min-w-[110px]">Expiry Date *</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 min-w-[70px]">Containers</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 min-w-[70px]">Qty/Cont</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 min-w-[100px]">Container Cost</th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 min-w-[90px]">Price/Unit <span className="text-gray-400">(Auto)</span></th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 min-w-[100px]">Sell/Unit <span className="text-gray-400">(Auto)</span></th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 min-w-[110px]">Sell/Container <span className="text-gray-400">(Auto)</span></th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 min-w-[90px]">Total Cost <span className="text-gray-400">(Auto)</span></th>
                        <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 min-w-[40px]"></th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {invoiceProducts.map((product, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-2 py-2 text-sm text-gray-500">{index + 1}</td>
                           <td className="px-3 py-2 relative">
                             <input
                               type="text"
                               value={product.tradeName}
                               onChange={(e) => {
                                 updateProduct(index, 'tradeName', e.target.value);
                                 handleTradeNameSearch(index, e.target.value);
                               }}
                               onFocus={() => handleTradeNameSearch(index, product.tradeName)}
                               onBlur={() => setTimeout(() => { setShowSuggestions(false); setActiveSuggestionRow(null); }, 150)}
                               placeholder="e.g., Paracetamol"
                               className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                               autoComplete="off"
                             />
                             {showSuggestions && activeSuggestionRow === index && productSuggestions.length > 0 && (
                               <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
                                 {productSuggestions.map((p: any) => (
                                   <div
                                     key={p.id}
                                     onMouseDown={(e) => {
                                       e.preventDefault();
                                       selectProduct(index, p);
                                     }}
                                     className="px-3 py-2 hover:bg-primary-50 cursor-pointer text-sm border-b border-gray-100 last:border-0"
                                   >
                                     <div className="font-medium text-gray-900">{p.name}</div>
                                     <div className="text-xs text-gray-500">{p.code} • {p.category || 'General'} • {p.unitOfMeasure || 'Tablet'}</div>
                                   </div>
                                 ))}
                               </div>
                             )}
                           </td>
                           <td className="px-2 py-2">
                             <input
                               type="text"
                               value={product.composition}
                               onChange={(e) => updateProduct(index, 'composition', e.target.value)}
                                onFocus={() => handleTradeNameSearch(index, product.composition || '')}
                               onBlur={() => setTimeout(() => { setShowSuggestions(false); setActiveSuggestionRow(null); }, 150)}
                               placeholder="Composition"
                               className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                               autoComplete="off"
                             />
                             {showSuggestions && activeSuggestionRow === index && productSuggestions.length > 0 && (
                               <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
                                 {productSuggestions.map((p: any) => (
                                   <div
                                     key={p.id}
                                     onMouseDown={(e) => {
                                       e.preventDefault();
                                       selectProduct(index, p);
                                     }}
                                     className="px-3 py-2 hover:bg-primary-50 cursor-pointer text-sm border-b border-gray-100 last:border-0"
                                   >
                                     <div className="font-medium text-gray-900">{p.name}</div>
                                     <div className="text-xs text-gray-500">{p.code} • {p.category || 'General'} • {p.unitOfMeasure || 'Tablet'}</div>
                                   </div>
                                 ))}
                               </div>
                             )}
                           </td>
                           <td className="px-2 py-2">
                             <input
                               type="text"
                               value={product.batchNumber}
                               onChange={(e) => updateProduct(index, 'batchNumber', e.target.value)}
                               placeholder="BATCH-001"
                               className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                             />
                           </td>
                           <td className="px-2 py-2">
                             <input
                               type="date"
                               value={product.expiryDate}
                               onChange={(e) => updateProduct(index, 'expiryDate', e.target.value)}
                               className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                             />
                           </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              value={product.numberOfContainers || ''}
                              onChange={(e) => updateProduct(index, 'numberOfContainers', parseFloat(e.target.value) || 0)}
                              placeholder="5"
                              className="w-20 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              value={product.quantityPerContainer || ''}
                              onChange={(e) => updateProduct(index, 'quantityPerContainer', parseFloat(e.target.value) || 0)}
                              placeholder="100"
                              className="w-20 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              value={product.containerCost || ''}
                              onChange={(e) => updateProduct(index, 'containerCost', parseFloat(e.target.value) || 0)}
                              placeholder="5000"
                              className="w-24 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                            />
                          </td>
                           <td className="px-2 py-2 text-sm font-medium text-primary-600 whitespace-nowrap bg-gray-50">
                            {product.pricePerUnit > 0 ? `RWF ${product.pricePerUnit.toFixed(2)}` : 'Auto'}
                          </td>
                          <td className="px-2 py-2 text-sm font-medium text-green-600 whitespace-nowrap bg-gray-50">
                            {product.sellingPricePerUnit > 0 ? `RWF ${product.sellingPricePerUnit.toFixed(2)}` : 'Auto'}
                          </td>
                          <td className="px-2 py-2 text-sm font-bold text-green-700 whitespace-nowrap bg-gray-50">
                            {product.sellingPricePerContainer > 0 ? `RWF ${product.sellingPricePerContainer.toFixed(2)}` : 'Auto'}
                          </td>
                          <td className="px-2 py-2 text-sm font-bold text-primary-600 whitespace-nowrap bg-gray-50">
                            RWF {product.totalCost.toFixed(2)}
                          </td>
                          <td className="px-2 py-2">
                            {invoiceProducts.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeProductRow(index)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Add Row Button */}
              <button
                type="button"
                onClick={addProductRow}
                className="text-sm text-primary-600 hover:text-primary-900 flex items-center"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Another Product
              </button>

              {/* ✅ GRAND TOTAL VERIFICATION */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Grand Total</label>
                    <p className="text-xl font-bold text-primary-600">
                      RWF {calculatedGrandTotal.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-400">Sum of Container Cost × Number of Containers</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Invoice Amount</label>
                    <p className="text-xl font-bold text-gray-900">
                      RWF {(document.querySelector('input[name="invoiceAmount"]') as HTMLInputElement)?.value || '0'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    {(() => {
                      const amount = parseFloat((document.querySelector('input[name="invoiceAmount"]') as HTMLInputElement)?.value || '0');
                      if (amount > 0) {
                        return (
                          <div className={`mt-1 p-2 rounded text-sm font-medium ${
                            Math.abs(calculatedGrandTotal - amount) < 0.01
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {Math.abs(calculatedGrandTotal - amount) < 0.01 ? (
                              '✅ MATCHES!'
                            ) : (
                              `❌ Difference: RWF ${(calculatedGrandTotal - amount).toFixed(2)}`
                            )}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              </div>

              {/* ✅ Expected Profit Summary */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-800 text-sm mb-2">📊 Expected Profit Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-blue-600">Total Cost:</span>
                    <span className="ml-2 font-bold text-gray-900">RWF {calculatedGrandTotal.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-blue-600">Expected Selling:</span>
                    <span className="ml-2 font-bold text-green-600">
                      RWF {invoiceProducts.reduce((sum, p) => sum + (p.sellingPricePerContainer * p.numberOfContainers || 0), 0).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-600">Expected Profit:</span>
                    <span className="ml-2 font-bold text-green-700">
                      RWF {(invoiceProducts.reduce((sum, p) => sum + (p.sellingPricePerContainer * p.numberOfContainers || 0), 0) - calculatedGrandTotal).toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-blue-600">Profit Margin:</span>
                    <span className="ml-2 font-bold text-green-700">
                      {calculatedGrandTotal > 0 
                        ? Math.round(((invoiceProducts.reduce((sum, p) => sum + (p.sellingPricePerContainer * p.numberOfContainers || 0), 0) - calculatedGrandTotal) / calculatedGrandTotal) * 100) 
                        : 0}%
                    </span>
                  </div>
                </div>
              </div>

              {/* ✅ BUTTONS - DIRECT onClick */}
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving...' : '💾 Save'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsInvoiceModalOpen(false);
                    reset();
                    setInvoiceProducts([{ 
                      tradeName: '', 
                      composition: '', 
                      batchNumber: '', 
                      expiryDate: '',
                      numberOfContainers: 0, 
                      quantityPerContainer: 0,
                      containerCost: 0,
                      pricePerUnit: 0,
                      sellingPricePerUnit: 0,
                      sellingPricePerContainer: 0,
                      totalCost: 0,
                    }]);
                    setCalculatedGrandTotal(0);
                    setExistingProductMap({});
                    setMergeDialog(null);
                    setPrefillMeta(null);
                  }}
                  className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
