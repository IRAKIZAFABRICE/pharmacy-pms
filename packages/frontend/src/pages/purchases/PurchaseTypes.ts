export interface Supplier {
  id: string;
  code: string;
  name: string;
  tin: string;
  phone: string;
  email?: string;
  contactPerson?: string;
  isActive: boolean;
  totalPurchases?: number;
  balance?: number;
}

export interface Medicine {
  id: string;
  code: string;
  name: string;
  category?: string;
  unitOfMeasure: string;
  costPrice?: number;
  sellingPrice?: number;
  stockQuantity?: number;
  reorderLevel?: number;
  isPrescription?: boolean;
}

export interface SupplierProduct {
  id: string;
  productId: string;
  lastCostPrice: number | null;
  lastSellingPrice: number | null;
  lastMarkup: number | null;
  lastPurchaseDate: string | null;
  product: Medicine;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  sku: string;
  packSize: string;
  quantity: number;
  batchNo: string;
  expiryDate: string;
  manufactureDate?: string;
  costPrice: number;
  sellingPrice: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  sellingPriceAuto: boolean;
}

export interface PurchaseFormData {
  supplierId: string;
  invoiceNo: string;
  date: string;
  paymentMethod: 'CASH' | 'BANK' | 'CREDIT';
  dueDate?: string;
  notes?: string;
  items: PurchaseItem[];
}

export interface Purchase {
  id: string;
  invoiceNo: string;
  supplierId: string;
  supplierName?: string;
  supplier?: { id: string; name: string; code?: string; tin?: string };
  user?: { id: string; firstName: string; lastName: string; email?: string };
  date: string;
  totalAmount: number;
  discount: number;
  taxAmount: number;
  grandTotal: number;
  status: 'DRAFT' | 'RECEIVED' | 'CANCELLED';
  paymentMethod?: string;
  dueDate?: string;
  createdBy?: string;
  notes?: string;
  items?: PurchaseItem[];
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  orderDate: string;
  expectedDate?: string;
  status: 'PENDING' | 'RECEIVED' | 'CANCELLED';
  items: { productId?: string; productName: string; quantity: number; unitCost: number; total: number; sellingPrice?: number }[];
  totalAmount: number;
  notes?: string;
  purchaseItems?: { productId: string; productName: string; quantity: number; unitCost: number; totalCost: number; product?: { name: string; id: string } }[];
}

export interface PurchaseSummary {
  items: number;
  subtotal: number;
  discount: number;
  taxAmount: number;
  grandTotal: number;
}

