import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
export declare class PurchaseController {
    /**
     * Create a quick purchase invoice with auto-fill from supplier
     * Users only need: Batch No, Quantity, Expiry Date
     * Everything else is auto-filled from supplier product catalog
     */
    createQuickPurchaseInvoice(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Get last invoice for a supplier with all items
     * Used for "Load Last Invoice" feature
     */
    getLastInvoice(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Duplicate last invoice for quick re-ordering
     */
    duplicateLastInvoice(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Get supplier product catalog with last prices
     */
    getSupplierCatalog(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Get product with supplier-specific pricing
     */
    getProductWithSupplierPrice(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Compare prices for price change detection
     */
    comparePrices(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Update supplier product pricing
     */
    updateSupplierProduct(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    generateInvoiceNumber(): Promise<string>;
    createPurchaseOrder(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    generateOrderNumber(): Promise<string>;
    getAllPurchaseOrders(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getPurchaseOrderById(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    receivePurchaseOrder(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    cancelPurchaseOrder(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
    getPurchaseSummary(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Get all purchase invoices with filters
     */
    getAllPurchaseInvoices(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Get single purchase invoice by ID
     */
    getPurchaseInvoiceById(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    /**
     * Cancel a purchase invoice
     */
    cancelPurchaseInvoice(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=purchase.controller.d.ts.map