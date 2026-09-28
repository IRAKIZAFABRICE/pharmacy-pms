// packages/frontend/src/types/purchase.ts

export interface SupplierProduct {
  id: string;
  supplierId: string;
  productId: string;
  lastCostPrice: number | null;
  lastSellingPrice: number | null;
  lastMarkup: number | null;
  lastPurchaseDate: string | null;
  product: {
    id: string;
    name: string;
    sku: string;
    barcode: string | null;
    packSize: string;
    category: string;
  };
}

export interface PurchaseInvoiceItem {
  id?: string;
  productId: string;
  productName: string;
  batchNo: string;
  quantity: number;
  expiryDate: string;
  costPrice: number;
  sellingPrice: number | null;
  packSize?: string;
  sku?: string;
  isNewProduct?: boolean;
}

export interface PurchaseInvoice {
  id?: string;
  invoiceNo: string;
  supplierId: string;
  date: string;
  items: PurchaseInvoiceItem[];
  totalAmount?: number;
  status?: string;
}