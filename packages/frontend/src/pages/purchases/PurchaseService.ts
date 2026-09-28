import api from '../../services/api';
import type { PurchaseFormData, Purchase, PurchaseOrder, SupplierProduct, Supplier } from './PurchaseTypes';

// ==================== SUPPLIERS ====================
export async function fetchSuppliers(): Promise<Supplier[]> {
  const response = await api.get('/suppliers');
  return response.data || response || [];
}

export async function fetchSupplierCatalog(supplierId: string): Promise<SupplierProduct[]> {
  if (!supplierId) return [];
  const response = await api.get(`/purchases/supplier/${supplierId}/catalog`);
  return response.data || response || [];
}

export async function fetchSupplierCredit(supplierId: string): Promise<{ balance: number; totalPurchases: number }> {
  const response = await api.get(`/suppliers/${supplierId}/credit`);
  return response.data || { balance: 0, totalPurchases: 0 };
}

// ==================== PRODUCTS / MEDICINES ====================
export async function searchMedicines(search: string): Promise<any[]> {
  const response = await api.get(`/products?search=${encodeURIComponent(search)}&limit=10`);
  return response.data || response || [];
}

// ==================== PURCHASES ====================
export async function fetchPurchases(params?: {
  page?: number;
  limit?: number;
  status?: string;
  supplierId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<{ data: Purchase[]; pagination: any }> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.status) query.set('status', params.status);
  if (params?.supplierId) query.set('supplierId', params.supplierId);
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);

  const response = await api.get(`/purchases/invoices?${query.toString()}`);
  return response;
}

export async function fetchPurchaseById(id: string): Promise<Purchase> {
  const response = await api.get(`/purchases/invoice/${id}`);
  return response.data || response;
}

export async function createPurchaseInvoice(data: PurchaseFormData): Promise<Purchase> {
  const response = await api.post('/purchases/quick-invoice', data);
  return response.data || response;
}

export async function saveDraftPurchase(data: PurchaseFormData): Promise<Purchase> {
  const response = await api.post('/purchases/draft', data);
  return response.data || response;
}

export async function cancelPurchase(id: string, reason?: string): Promise<void> {
  await api.patch(`/purchases/invoice/${id}/cancel`, { reason });
}

export async function returnPurchase(id: string, items: { productId: string; quantity: number; reason: string }[]): Promise<void> {
  await api.post(`/purchases/${id}/return`, { items });
}

// ==================== LAST INVOICE ====================
export async function fetchLastInvoice(supplierId: string): Promise<{ hasInvoice: boolean; items: any[]; invoiceNo?: string }> {
  const response = await api.get(`/purchases/supplier/${supplierId}/last-invoice`);
  return response;
}

export async function duplicateLastPurchase(supplierId: string): Promise<{ success: boolean; items: any[]; invoiceNo: string }> {
  const response = await api.get(`/purchases/duplicate/${supplierId}`);
  return response;
}

// ==================== PURCHASE ORDERS ====================
export async function fetchPurchaseOrders(params?: {
  page?: number;
  status?: string;
}): Promise<{ data: PurchaseOrder[]; pagination: any }> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.status) query.set('status', params.status);
  const response = await api.get(`/purchases?${query.toString()}`);
  return response;
}

export async function createPurchaseOrder(data: {
  supplierId: string;
  expectedDate?: string;
  notes?: string;
  items: { productId: string; quantity: number; unitCost: number }[];
}): Promise<PurchaseOrder> {
  const response = await api.post('/purchases', data);
  return response.data || response;
}

export async function receivePurchaseOrder(id: string, receivedItems?: any[]): Promise<void> {
  await api.patch(`/purchases/${id}/receive`, { receivedItems: receivedItems || [] });
}

// ==================== PRICE CHECK ====================
export async function checkPriceChange(
  supplierId: string,
  productId: string,
  newPrice: number
): Promise<{ hasChanged: boolean; oldPrice: number; newPrice: number; percentageChange: number; productName: string } | null> {
  try {
    const response = await api.get(`/purchases/compare/${supplierId}/${productId}/${newPrice}`);
    return response;
  } catch {
    return null;
  }
}

