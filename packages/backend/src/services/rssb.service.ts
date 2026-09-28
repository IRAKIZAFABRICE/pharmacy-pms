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

import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { PrismaClient, ClaimStatus } from '@prisma/client';

const prisma = new PrismaClient();

export interface VCDCPatientEligibility {
  patientId: string;
  patientName: string;
  policyNumber: string;
  insuranceCode: string; // RSSB provider code
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

export class RSSBService {
  private client: AxiosInstance;
  private isEnabled: boolean;
  private config: RSSBConfig;

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

    this.client = axios.create({
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
  async verifyPatientEligibility(
    patientId: string,
    policyNumber: string,
    insuranceCode: string
  ): Promise<VCDCPatientEligibility> {
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
    } catch (error: any) {
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
  async submitClaim(data: VCDCClaimSubmission): Promise<VCDCResponse> {
    if (!this.isEnabled) {
      console.log('🔄 RSSB is disabled (development mode) - simulating claim submission');
      return {
        status: 'SUCCESS',
        rssbClaimNumber: `RSSB-${Date.now()}`,
        authorizationCode: `AUTH-${crypto.randomBytes(8).toString('hex').toUpperCase()}`,
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
        await this.updateClaimStatus(
          data.claimNumber,
          'SUBMITTED',
          response.data
        );
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
    } catch (error: any) {
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
  async checkClaimStatus(rssbClaimNumber: string): Promise<VCDCResponse> {
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
    } catch (error: any) {
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
  async verifyMutuelleCoPay(
    patientId: string,
    policyNumber: string,
    prescriptionAmount: number
  ): Promise<{
    patientShare: number;
    insuranceShare: number;
    isEligible: boolean;
    message: string;
  }> {
    const eligibility = await this.verifyPatientEligibility(
      patientId,
      policyNumber,
      'MUTUELLE'
    );

    if (!eligibility.isEligible) {
      return {
        patientShare: prescriptionAmount,
        insuranceShare: 0,
        isEligible: false,
        message: eligibility.message || 'Patient is not eligible for Mutuelle coverage',
      };
    }

    const insuranceShare = Math.min(
      prescriptionAmount * (eligibility.coveragePercentage / 100),
      eligibility.annualLimitRemaining
    );
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
  private generateClaimSignature(data: VCDCClaimSubmission): string {
    const canonicalString = [
      data.claimNumber,
      data.patientId,
      data.policyNumber,
      data.totalAmount.toFixed(2),
      data.invoiceDate,
      this.config.providerCode,
    ].join('|');

    const hmac = crypto.createHmac('sha256', this.config.apiKey);
    hmac.update(canonicalString);
    return hmac.digest('hex');
  }

  /**
   * Generate unique request ID for tracing
   */
  private generateRequestId(): string {
    return `RSSB-REQ-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * Update local claim status based on RSSB response
   */
  private async updateClaimStatus(
    claimNumber: string,
    status: string,
    rssbResponse: any
  ): Promise<void> {
    try {
      const prismaStatus = this.mapRSSBStatus(status);
      
      await prisma.insuranceClaim.update({
        where: { claimNumber },
        data: {
          status: prismaStatus as ClaimStatus,
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
    } catch (error) {
      console.error('❌ Failed to update claim status:', error);
    }
  }

  /**
   * Map RSSB status to local ClaimStatus enum
   */
  private mapRSSBStatus(rssbStatus: string): string {
    const statusMap: Record<string, string> = {
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
  private async queueClaim(data: VCDCClaimSubmission): Promise<void> {
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

export default new RSSBService();

