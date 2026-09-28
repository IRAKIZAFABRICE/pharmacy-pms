"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RSSBService = void 0;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class RSSBService {
    client;
    isEnabled;
    config;
    constructor() {
        this.isEnabled = process.env.RSSB_ENABLED === 'true';
        this.config = {
            providerCode: process.env.RSSB_PROVIDER_CODE || 'PHARM-001',
            providerName: process.env.RSSB_PROVIDER_NAME || 'Pharmacy PMS',
            apiUrl: process.env.RSSB_API_URL || 'https://api.rssb.gov.rw/vcdc/v1',
            apiKey: process.env.RSSB_API_KEY || '',
            timeout: parseInt(process.env.RSSB_TIMEOUT || '30000'),
            retryAttempts: parseInt(process.env.RSSB_RETRY_ATTEMPTS || '3'),
        };
        this.client = axios_1.default.create({
            baseURL: this.config.apiUrl,
            timeout: this.config.timeout,
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': this.config.apiKey,
                'X-Provider-Code': this.config.providerCode,
                'X-Request-ID': this.generateRequestId(),
            },
        });
    }
    /**
     * Verify patient eligibility with RSSB
     * Used before processing an insurance sale to confirm coverage
     */
    async verifyPatientEligibility(patientId, policyNumber, insuranceCode) {
        if (!this.isEnabled) {
            console.log('🔄 RSSB is disabled (development mode) - simulating eligibility');
            return {
                patientId,
                patientName: 'Simulated Patient',
                policyNumber,
                insuranceCode,
                isEligible: true,
                coveragePercentage: 80,
                annualLimitRemaining: 500000,
                annualLimitTotal: 1000000,
                message: 'Patient is eligible (simulated)',
            };
        }
        try {
            const response = await this.client.post('/patient/eligibility', {
                patientId,
                policyNumber,
                insuranceCode,
                providerCode: this.config.providerCode,
                timestamp: new Date().toISOString(),
            });
            return {
                patientId: response.data.patientId,
                patientName: response.data.patientName,
                policyNumber: response.data.policyNumber,
                insuranceCode: response.data.insuranceCode,
                isEligible: response.data.isEligible,
                coveragePercentage: response.data.coveragePercentage || 0,
                annualLimitRemaining: response.data.annualLimitRemaining || 0,
                annualLimitTotal: response.data.annualLimitTotal || 0,
                message: response.data.message,
            };
        }
        catch (error) {
            console.error('❌ RSSB eligibility check error:', error.response?.data || error.message);
            // If network error, allow the transaction with warning
            if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
                return {
                    patientId,
                    patientName: '',
                    policyNumber,
                    insuranceCode,
                    isEligible: true, // Allow transaction, verify later
                    coveragePercentage: 80,
                    annualLimitRemaining: 0,
                    annualLimitTotal: 0,
                    message: 'Eligibility check failed - transaction allowed with offline mode',
                };
            }
            return {
                patientId,
                patientName: '',
                policyNumber,
                insuranceCode,
                isEligible: false,
                coveragePercentage: 0,
                annualLimitRemaining: 0,
                annualLimitTotal: 0,
                message: error.response?.data?.message || 'Failed to verify patient eligibility',
            };
        }
    }
    /**
     * Submit insurance claim to RSSB VCDC
     */
    async submitClaim(data) {
        if (!this.isEnabled) {
            console.log('🔄 RSSB is disabled (development mode) - simulating claim submission');
            return {
                status: 'SUCCESS',
                rssbClaimNumber: `RSSB-${Date.now()}`,
                authorizationCode: `AUTH-${crypto_1.default.randomBytes(8).toString('hex').toUpperCase()}`,
                approvedAmount: data.coverageAmount,
                message: 'Claim submitted successfully (simulated)',
            };
        }
        try {
            const claimPayload = {
                ...data,
                providerCode: this.config.providerCode,
                timestamp: new Date().toISOString(),
                signature: this.generateClaimSignature(data),
            };
            const response = await this.client.post('/claims', claimPayload);
            // Update local claim status
            if (response.data.status === 'SUCCESS' && response.data.rssbClaimNumber) {
                await this.updateClaimStatus(data.claimNumber, 'SUBMITTED', response.data);
            }
            return {
                status: response.data.status || 'ERROR',
                rssbClaimNumber: response.data.rssbClaimNumber,
                authorizationCode: response.data.authorizationCode,
                approvedAmount: response.data.approvedAmount,
                rejectionReason: response.data.rejectionReason,
                message: response.data.message,
                rawResponse: response.data,
            };
        }
        catch (error) {
            console.error('❌ RSSB claim submission error:', error.response?.data || error.message);
            if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
                // Queue claim for later submission
                await this.queueClaim(data);
                return {
                    status: 'PENDING',
                    message: 'Claim queued for submission due to network error',
                };
            }
            return {
                status: 'ERROR',
                message: error.response?.data?.message || 'Failed to submit claim',
                errors: error.response?.data?.errors || [error.message],
            };
        }
    }
    /**
     * Check claim status with RSSB
     */
    async checkClaimStatus(rssbClaimNumber) {
        if (!this.isEnabled) {
            return {
                status: 'SUCCESS',
                rssbClaimNumber,
                message: 'Claim is being processed (simulated)',
            };
        }
        try {
            const response = await this.client.get(`/claims/${rssbClaimNumber}`);
            return {
                status: response.data.status,
                rssbClaimNumber: response.data.rssbClaimNumber,
                authorizationCode: response.data.authorizationCode,
                approvedAmount: response.data.approvedAmount,
                rejectionReason: response.data.rejectionReason,
                message: response.data.message,
                rawResponse: response.data,
            };
        }
        catch (error) {
            return {
                status: 'ERROR',
                message: 'Failed to check claim status',
                errors: [error.message],
            };
        }
    }
    /**
     * Process Mutuelle de Santé co-pay verification
     */
    async verifyMutuelleCoPay(patientId, policyNumber, prescriptionAmount) {
        const eligibility = await this.verifyPatientEligibility(patientId, policyNumber, 'MUTUELLE');
        if (!eligibility.isEligible) {
            return {
                patientShare: prescriptionAmount,
                insuranceShare: 0,
                isEligible: false,
                message: eligibility.message || 'Patient is not eligible for Mutuelle coverage',
            };
        }
        const insuranceShare = Math.min(prescriptionAmount * (eligibility.coveragePercentage / 100), eligibility.annualLimitRemaining);
        const patientShare = prescriptionAmount - insuranceShare;
        return {
            patientShare: Math.round(patientShare * 100) / 100,
            insuranceShare: Math.round(insuranceShare * 100) / 100,
            isEligible: true,
            message: `Mutuelle coverage: ${eligibility.coveragePercentage}% | Annual limit remaining: RWF ${eligibility.annualLimitRemaining}`,
        };
    }
    /**
     * Generate HMAC signature for claim verification
     */
    generateClaimSignature(data) {
        const canonicalString = [
            data.claimNumber,
            data.patientId,
            data.policyNumber,
            data.totalAmount.toFixed(2),
            data.invoiceDate,
            this.config.providerCode,
        ].join('|');
        const hmac = crypto_1.default.createHmac('sha256', this.config.apiKey);
        hmac.update(canonicalString);
        return hmac.digest('hex');
    }
    /**
     * Generate unique request ID for tracing
     */
    generateRequestId() {
        return `RSSB-REQ-${Date.now()}-${crypto_1.default.randomBytes(4).toString('hex')}`;
    }
    /**
     * Update local claim status based on RSSB response
     */
    async updateClaimStatus(claimNumber, status, rssbResponse) {
        try {
            const prismaStatus = this.mapRSSBStatus(status);
            await prisma.insuranceClaim.update({
                where: { claimNumber },
                data: {
                    status: prismaStatus,
                    ...(rssbResponse.approvedAmount ? {
                        coverageAmount: rssbResponse.approvedAmount,
                        copayAmount: claimNumber ? undefined : undefined,
                    } : {}),
                    ...(status === 'SUBMITTED' ? { submittedAt: new Date() } : {}),
                    ...(status === 'APPROVED' ? { approvedAt: new Date() } : {}),
                    ...(status === 'PAID' ? { paidAt: new Date() } : {}),
                },
            });
            // Audit log
            await prisma.auditLog.create({
                data: {
                    action: `RSSB_CLAIM_${status}`,
                    entity: 'RSSB_CLAIM',
                    entityId: claimNumber,
                    details: {
                        claimNumber,
                        rssbResponse: JSON.stringify(rssbResponse),
                        timestamp: new Date().toISOString(),
                    },
                },
            });
        }
        catch (error) {
            console.error('❌ Failed to update claim status:', error);
        }
    }
    /**
     * Map RSSB status to local ClaimStatus enum
     */
    mapRSSBStatus(rssbStatus) {
        const statusMap = {
            'SUBMITTED': 'SUBMITTED',
            'UNDER_REVIEW': 'UNDER_REVIEW',
            'APPROVED': 'APPROVED',
            'REJECTED': 'REJECTED',
            'PAID': 'PAID',
            'CANCELLED': 'DRAFT',
        };
        return statusMap[rssbStatus] || 'DRAFT';
    }
    /**
     * Queue claim for offline/retry submission
     */
    async queueClaim(data) {
        await prisma.auditLog.create({
            data: {
                action: 'RSSB_CLAIM_QUEUED',
                entity: 'RSSB_CLAIM',
                entityId: data.claimNumber,
                details: {
                    claimNumber: data.claimNumber,
                    data: JSON.stringify(data),
                    queuedAt: new Date().toISOString(),
                    retryCount: 0,
                    maxRetries: this.config.retryAttempts,
                },
            },
        });
        console.log(`📦 RSSB claim ${data.claimNumber} queued for retry`);
    }
    /**
     * Get RSSB configuration status
     */
    getConfig() {
        return {
            enabled: this.isEnabled,
            providerCode: this.config.providerCode,
            apiUrl: this.config.apiUrl,
            environment: process.env.NODE_ENV || 'development',
            isConfigured: !!(this.config.apiKey && this.config.apiUrl),
        };
    }
}
exports.RSSBService = RSSBService;
exports.default = new RSSBService();
//# sourceMappingURL=rssb.service.js.map