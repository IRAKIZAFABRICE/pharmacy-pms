/**
 * RRA Fiscal Integration Service (VSDC/OSDC)
 *
 * Handles real fiscal receipt generation and cryptographic signing
 * compliant with Rwanda Revenue Authority Electronic Billing Machine (EBM) standards.
 *
 * Supports:
 * - VSDC (Virtual Sales Data Controller) - local fiscal device endpoints
 * - OSDC (Online Sales Data Controller) - cloud-based fiscal API
 * - EBM QR Code generation with cryptographic payload
 * - Fiscal receipt numbering with RRA sequence validation
 */
export interface FiscalInvoiceData {
    invoiceNumber: string;
    date: string;
    tin: string;
    customerTin?: string;
    customerName?: string;
    customerPhone?: string;
    totalAmount: number;
    taxAmount: number;
    netAmount: number;
    discountAmount: number;
    paymentMethod: string;
    items: FiscalInvoiceItem[];
}
export interface FiscalInvoiceItem {
    productCode: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    taxRate: number;
    taxAmount: number;
    isExempt?: boolean;
}
export interface FiscalResponse {
    status: 'SUCCESS' | 'ERROR';
    fiscalReceiptNumber?: string;
    fiscalQRCode?: string;
    fiscalSignature?: string;
    fiscalDeviceCode?: string;
    rraSessionId?: string;
    message?: string;
    errors?: string[];
    rawResponse?: any;
}
export interface VSDCConfig {
    deviceId: string;
    deviceSerial: string;
    endpointUrl: string;
    timeout: number;
    retryAttempts: number;
}
export declare class RRAFiscalService {
    private client;
    private isEnabled;
    private vsdcConfig;
    private deviceKey;
    constructor();
    /**
     * Send a fiscal invoice to RRA via VSDC/OSDC
     * Generates cryptographic fiscal signature and QR code
     */
    sendFiscalInvoice(data: FiscalInvoiceData): Promise<FiscalResponse>;
    /**
     * Cancel a fiscal invoice in RRA system
     */
    cancelFiscalInvoice(fiscalReceiptNumber: string, reason: string, originalInvoiceNumber: string): Promise<FiscalResponse>;
    /**
     * Verify fiscal invoice status with RRA
     */
    verifyFiscalInvoice(fiscalReceiptNumber: string): Promise<FiscalResponse>;
    /**
     * Build the RRA-compliant fiscal payload
     */
    private buildFiscalPayload;
    /**
     * Generate cryptographic fiscal signature using HMAC-SHA256
     * This creates an unforgeable fiscal receipt signature
     */
    private generateFiscalSignature;
    /**
     * Generate EBM-compliant QR Code payload
     * Contains fiscal receipt data for verification
     */
    private generateFiscalQRCode;
    /**
     * Log fiscal session to audit trail for compliance
     */
    private logFiscalSession;
    /**
     * Queue fiscal invoice for retry when network is unavailable
     */
    private queueFiscalInvoice;
    /**
     * Simulate fiscal response for development/testing
     */
    private simulateFiscalResponse;
}
declare const _default: RRAFiscalService;
export default _default;
//# sourceMappingURL=rra.fiscal.service.d.ts.map