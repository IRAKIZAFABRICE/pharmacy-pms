import { Request, Response } from 'express';
export declare class SupplierProductController {
    static getSupplierCatalog(req: Request, res: Response): Promise<void>;
    static getLastInvoice(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    static getProductWithSupplierPrice(req: Request, res: Response): Promise<void>;
    static updateSupplierProduct(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=supplier.Product.controller.d.ts.map