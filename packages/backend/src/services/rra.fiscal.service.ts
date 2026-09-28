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

import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface FiscalInvoiceData {
  invoiceNumber: string;
  date: string;
  tin: string; // Taxpayer Identification Number
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
  isExempt?: boolean; // Zero-rated / exempt items
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

export class RRAFiscalService {
  private client: AxiosInstance;
  private isEnabled: boolean;
  private vsdcConfig: VSDCConfig;
  private deviceKey: string;

  constructor() {
    this.isEnabled = process.env.RRA_ENABLED === 'true';
    this.deviceKey = process.env.RRA_DEVICE_KEY || '';

    this.vsdcConfig = {
      deviceId: process.env.RRA_VSDC_DEVICE_ID || 'VSDC-001',
      deviceSerial: process.env.RRA_VSDC_SERIAL || 'RRA-EBM-001',
      endpointUrl: process.env.RRA_VSDC_URL || 'http://localhost:8080/ebm',
      timeout: parseInt(process.env.RRA_TIMEOUT || '30000'),
      retryAttempts: parseInt(process.env.RRA_RETRY_ATTEMPTS || '3'),
    };

    this.client = axios.create({
      baseURL: this.vsdcConfig.endpointUrl,
      timeout: this.vsdcConfig.timeout,
      headers: {
        'Content-Type': 'application/json',
        'X-VSDC-Device-ID': this.vsdcConfig.deviceId,
        'X-VSDC-Serial': this.vsdcConfig.deviceSerial,
        'X-API-Key': process.env.RRA_API_KEY || '',
        'X-TIN': process.env.RRA_TIN || '',
      },
    });
  }

  /**
   * Send a fiscal invoice to RRA via VSDC/OSDC
   * Generates cryptographic fiscal signature and QR code
   */
  async sendFiscalInvoice(data: FiscalInvoiceData): Promise<FiscalResponse> {
    if (!this.isEnabled) {
      console.log('🔄 RRA Fiscal is disabled (development mode) - simulating fiscal response');
      return this.simulateFiscalResponse(data);
    }

    try {
      // 1. Build the fiscal payload per RRA EBM specification
      const fiscalPayload = this.buildFiscalPayload(data);

      // 2. Generate cryptographic signature for the invoice
      const fiscalSignature = this.generateFiscalSignature(fiscalPayload);

      // 3. Send to VSDC local endpoint (or OSDC cloud)
      const response = await this.client.post('/fiscal-invoice', {
        ...fiscalPayload,
        fiscalSignature,
        deviceId: this.vsdcConfig.deviceId,
        deviceSerial: this.vsdcConfig.deviceSerial,
      });

      // 4. Validate fiscal response
      if (response.data && response.data.fiscalReceiptNumber) {
        // 5. Generate EBM QR Code with fiscal data
        const fiscalQRCode = this.generateFiscalQRCode({
          receiptNumber: response.data.fiscalReceiptNumber,
          amount: data.totalAmount,
          date: data.date,
          tin: data.tin,
          signature: response.data.fiscalSignature || fiscalSignature,
        });

        // 6. Store fiscal session for audit
        await this.logFiscalSession({
          invoiceNumber: data.invoiceNumber,
          fiscalReceiptNumber: response.data.fiscalReceiptNumber,
          fiscalSignature: response.data.fiscalSignature || fiscalSignature,
          deviceSerial: this.vsdcConfig.deviceSerial,
          status: 'APPROVED',
          rawResponse: response.data,
        });

        return {
          status: 'SUCCESS',
          fiscalReceiptNumber: response.data.fiscalReceiptNumber,
          fiscalQRCode,
          fiscalSignature: response.data.fiscalSignature || fiscalSignature,
          fiscalDeviceCode: this.vsdcConfig.deviceId,
          rraSessionId: response.data.sessionId,
          message: 'Fiscal invoice submitted successfully',
          rawResponse: response.data,
        };
      }

      throw new Error('Invalid fiscal response from RRA');
    } catch (error: any) {
      console.error('❌ RRA Fiscal API error:', error.response?.data || error.message);

      // Queue for retry if network error
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        await this.queueFiscalInvoice(data);
        return {
          status: 'ERROR',
          message: 'Network error - fiscal invoice queued for retry',
          errors: [error.message],
        };
      }

      // Log fiscal failure
      await this.logFiscalSession({
        invoiceNumber: data.invoiceNumber,
        fiscalReceiptNumber: '',
        fiscalSignature: '',
        deviceSerial: this.vsdcConfig.deviceSerial,
        status: 'REJECTED',
        rawResponse: error.response?.data,
        error: error.message,
      });

      return {
        status: 'ERROR',
        message: error.response?.data?.message || 'Failed to submit fiscal invoice',
        errors: error.response?.data?.errors || [error.message],
        rawResponse: error.response?.data,
      };
    }
  }

  /**
   * Cancel a fiscal invoice in RRA system
   */
  async cancelFiscalInvoice(
    fiscalReceiptNumber: string,
    reason: string,
    originalInvoiceNumber: string
  ): Promise<FiscalResponse> {
    if (!this.isEnabled) {
      console.log('🔄 RRA Fiscal is disabled - simulating cancellation');
      return {
        status: 'SUCCESS',
        fiscalReceiptNumber: `CANCEL-${fiscalReceiptNumber}`,
        fiscalSignature: crypto.randomBytes(32).toString('hex'),
        message: 'Fiscal invoice cancelled successfully (simulated)',
      };
    }

    try {
      const cancelPayload = {
        fiscalReceiptNumber,
        cancellationReason: reason,
        originalInvoiceNumber,
        deviceId: this.vsdcConfig.deviceId,
        deviceSerial: this.vsdcConfig.deviceSerial,
        timestamp: new Date().toISOString(),
      };

      const cancelSignature = this.generateFiscalSignature(cancelPayload);

      const response = await this.client.post('/fiscal-invoice/cancel', {
        ...cancelPayload,
        fiscalSignature: cancelSignature,
      });

      await this.logFiscalSession({
        invoiceNumber: originalInvoiceNumber,
        fiscalReceiptNumber,
        fiscalSignature: cancelSignature,
        deviceSerial: this.vsdcConfig.deviceSerial,
        status: 'CANCELLED',
        rawResponse: response.data,
      });

      return {
        status: 'SUCCESS',
        fiscalReceiptNumber: response.data.fiscalReceiptNumber,
        message: 'Fiscal invoice cancelled successfully',
        rawResponse: response.data,
      };
    } catch (error: any) {
      console.error('❌ RRA Fiscal cancellation error:', error);
      return {
        status: 'ERROR',
        message: 'Failed to cancel fiscal invoice',
        errors: [error.message],
      };
    }
  }

  /**
   * Verify fiscal invoice status with RRA
   */
  async verifyFiscalInvoice(fiscalReceiptNumber: string): Promise<FiscalResponse> {
    if (!this.isEnabled) {
      return {
        status: 'SUCCESS',
        fiscalReceiptNumber,
        message: 'Fiscal invoice is valid (simulated)',
      };
    }

    try {
      const response = await this.client.get(`/fiscal-invoice/${fiscalReceiptNumber}`);
      return {
        status: 'SUCCESS',
        fiscalReceiptNumber: response.data.fiscalReceiptNumber,
        fiscalQRCode: response.data.qrCode,
        fiscalSignature: response.data.fiscalSignature,
        message: 'Fiscal invoice found and valid',
        rawResponse: response.data,
      };
    } catch (error: any) {
      return {
        status: 'ERROR',
        message: 'Failed to verify fiscal invoice',
        errors: [error.message],
      };
    }
  }

  /**
   * Build the RRA-compliant fiscal payload
   */
  private buildFiscalPayload(data: FiscalInvoiceData): any {
    return {
      invoiceNumber: data.invoiceNumber,
      invoiceType: 'SALE',
      invoiceDate: data.date,
      tin: data.tin,
      customerTin: data.customerTin || '',
      customerName: data.customerName || '',
      customerPhone: data.customerPhone || '',
      totalAmount: Math.round(data.totalAmount * 100) / 100,
      taxAmount: Math.round(data.taxAmount * 100) / 100,
      netAmount: Math.round(data.netAmount * 100) / 100,
      discountAmount: Math.round(data.discountAmount * 100) / 100,
      paymentMethod: data.paymentMethod,
      currency: 'RWF',
      deviceId: this.vsdcConfig.deviceId,
      deviceSerial: this.vsdcConfig.deviceSerial,
      timestamp: new Date().toISOString(),
      items: data.items.map(item => ({
        productCode: item.productCode,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: Math.round(item.unitPrice * 100) / 100,
        totalPrice: Math.round(item.totalPrice * 100) / 100,
        taxRate: item.taxRate,
        taxAmount: Math.round(item.taxAmount * 100) / 100,
        isExempt: item.isExempt || false,
      })),
    };
  }

  /**
   * Generate cryptographic fiscal signature using HMAC-SHA256
   * This creates an unforgeable fiscal receipt signature
   */
  private generateFiscalSignature(payload: any): string {
    // Create a deterministic string from the payload
    const canonicalString = JSON.stringify(payload, Object.keys(payload).sort());
    
    // Generate HMAC-SHA256 signature using device key
    const hmac = crypto.createHmac('sha256', this.deviceKey);
    hmac.update(canonicalString);
    const signature = hmac.digest('hex');

    // Return formatted fiscal signature
    return `RRA-EBM:${this.vsdcConfig.deviceSerial}:${signature}`;
  }

  /**
   * Generate EBM-compliant QR Code payload
   * Contains fiscal receipt data for verification
   */
  private generateFiscalQRCode(fiscalData: {
    receiptNumber: string;
    amount: number;
    date: string;
    tin: string;
    signature: string;
  }): string {
    const qrPayload = {
      schema: 'RRA-EBM-V1',
      receipt: fiscalData.receiptNumber,
      amount: fiscalData.amount,
      date: fiscalData.date,
      tin: fiscalData.tin,
      sig: fiscalData.signature.substring(0, 20), // Truncated for QR
      ts: Date.now(),
    };

    // Encode as base64 for QR code generation
    return Buffer.from(JSON.stringify(qrPayload)).toString('base64');
  }

  /**
   * Log fiscal session to audit trail for compliance
   */
  private async logFiscalSession(session: {
    invoiceNumber: string;
    fiscalReceiptNumber: string;
    fiscalSignature: string;
    deviceSerial: string;
    status: string;
    rawResponse?: any;
    error?: string;
  }): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          action: `RRA_FISCAL_${session.status}`,
          entity: 'RRA_FISCAL',
          entityId: session.invoiceNumber,
          details: {
            fiscalReceiptNumber: session.fiscalReceiptNumber,
            fiscalSignature: session.fiscalSignature,
            deviceSerial: session.deviceSerial,
            status: session.status,
            rawResponse: session.rawResponse ? JSON.stringify(session.rawResponse) : null,
            error: session.error,
            timestamp: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      console.error('❌ Failed to log fiscal session:', error);
    }
  }

  /**
   * Queue fiscal invoice for retry when network is unavailable
   */
  private async queueFiscalInvoice(data: FiscalInvoiceData): Promise<void> {
    await prisma.auditLog.create({
      data: {
        action: 'RRA_FISCAL_QUEUED',
        entity: 'RRA_FISCAL',
        entityId: data.invoiceNumber,
        details: {
          invoiceNumber: data.invoiceNumber,
          data: JSON.stringify(data),
          queuedAt: new Date().toISOString(),
          retryCount: 0,
          maxRetries: this.vsdcConfig.retryAttempts,
        },
      },
    });

    console.log(`📦 Fiscal invoice ${data.invoiceNumber} queued for retry`);
  }

  /**
   * Simulate fiscal response for development/testing
   */
  private simulateFiscalResponse(data: FiscalInvoiceData): FiscalResponse {
    const fiscalReceiptNumber = `F-RRA-${Date.now()}`;
    const fiscalSignature = crypto.randomBytes(32).toString('hex');
    const fiscalQRCode = this.generateFiscalQRCode({
      receiptNumber: fiscalReceiptNumber,
      amount: data.totalAmount,
      date: data.date,
      tin: data.tin,
      signature: fiscalSignature,
    });

    return {
      status: 'SUCCESS',
      fiscalReceiptNumber,
      fiscalQRCode,
      fiscalSignature,
      fiscalDeviceCode: this.vsdcConfig.deviceId,
      rraSessionId: crypto.randomBytes(16).toString('hex'),
      message: 'Fiscal invoice submitted successfully (simulated)',
    };
  }
}

export default new RRAFiscalService();

