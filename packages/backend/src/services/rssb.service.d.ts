/**
 * RSSB VCDC Insurance Integration Service
 *
 * Handles integration with Rwanda Social Security Board (RSSB)
 * Virtual Claims Data Controller (VCDC) for insurance claims processing.
 *
 * Supports:
 * - Mutuelle de Santé co-pay verification in real-time
 * - RSSB-approved private insurance claims
 * - VCDC claim submission protocol
 * - Patient eligibility verification
 * - Claim status tracking and reconciliation
 */
export interface VCDCPatientEligibility {
    patientId: string;
    patientName: string;
    policyNumber: string;
    insuranceCode: string;
    isEligible: boolean;
    coveragePercentage: number;
    annualLimitRemaining: number;
    annualLimitTotal: number;
    message?: string;
}
export interface VCDCClaimSubmission {
    claimNumber: string;
    patientId: string;
    patientName: string;
    policyNumber: string;
    insuranceCode: string;
    providerCode: string;
    invoiceNumber: string;
    invoiceDate: string;
    totalAmount: number;
    coverageAmount: number;
    copayAmount: number;
    items: VCDCClaimItem[];
}
export interface VCDCClaimItem {
    productCode: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    isPrescription: boolean;
    isControlled: boolean;
}
export interface VCDCResponse {
    status: 'SUCCESS' | 'ERROR' | 'PENDING';
    rssbClaimNumber?: string;
    authorizationCode?: string;
    approvedAmount?: number;
    rejectionReason?: string;
    message?: string;
    errors?: string[];
    rawResponse?: any;
}
export interface RSSBConfig {
    providerCode: string;
    providerName: string;
    apiUrl: string;
    apiKey: string;
    timeout: number;
    retryAttempts: number;
}
export declare class RSSBService {
    private client;
    private isEnabled;
    private config;
    constructor();
    /**
     * Verify patient eligibility with RSSB
     * Used before processing an insurance sale to confirm coverage
     */
    verifyPatientEligibility(patientId: string, policyNumber: string, insuranceCode: string): Promise<VCDCPatientEligibility>;
    /**
     * Submit insurance claim to RSSB VCDC
     */
    submitClaim(data: VCDCClaimSubmission): Promise<VCDCResponse>;
    /**
     * Check claim status with RSSB
     */
    checkClaimStatus(rssbClaimNumber: string): Promise<VCDCResponse>;
    /**
     * Process Mutuelle de Santé co-pay verification
     */
    verifyMutuelleCoPay(patientId: string, policyNumber: string, prescriptionAmount: number): Promise<{
        patientShare: number;
        insuranceShare: number;
        isEligible: boolean;
        message: string;
    }>;
    /**
     * Generate HMAC signature for claim verification
     */
    private generateClaimSignature;
    /**
     * Generate unique request ID for tracing
     */
    private generateRequestId;
    /**
     * Update local claim status based on RSSB response
     */
    private updateClaimStatus;
    /**
     * Map RSSB status to local ClaimStatus enum
     */
    private mapRSSBStatus;
    /**
     * Queue claim for offline/retry submission
     */
    private queueClaim;
    /**
     * Get RSSB configuration status
     */
    getConfig(): {
        enabled: boolean;
        providerCode: string;
        apiUrl: string;
        environment: string;
        isConfigured: boolean;
    };
}
declare const _default: RSSBService;
export default _default;
//# sourceMappingURL=rssb.service.d.ts.map