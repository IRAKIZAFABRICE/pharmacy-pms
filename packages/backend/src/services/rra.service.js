"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RRAService = void 0;
// packages/backend/src/services/rra.service.ts
const axios_1 = __importDefault(require("axios"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class RRAService {
    client;
    isEnabled;
    constructor() {
        this.isEnabled = process.env.RRA_ENABLED === 'true';
        this.client = axios_1.default.create({
            baseURL: process.env.RRA_API_URL || 'https://api.rra.gov.rw/fiscalization',
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': process.env.RRA_API_KEY || '',
                'X-TIN': process.env.RRA_TIN || '',
            },
        });
    }
    // Send invoice to RRA
    async sendInvoice(data) {
        if (!this.isEnabled) {
            console.log('🔄 RRA is disabled (development mode) - simulating response');
            return this.simulateResponse(data);
        }
        try {
            const response = await this.client.post('/invoice', data);
            return {
                status: 'SUCCESS',
                receiptNumber: response.data.receiptNumber,
                qrCode: response.data.qrCode,
                message: 'Invoice sent successfully',
            };
        }
        catch (error) {
            console.error('❌ RRA API error:', error.response?.data || error.message);
            if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
                await this.queueInvoice(data);
                return {
                    status: 'ERROR',
                    message: 'Network error - invoice queued for retry',
                };
            }
            return {
                status: 'ERROR',
                message: error.response?.data?.message || 'Failed to send invoice',
                errors: error.response?.data?.errors,
            };
        }
    }
    // Cancel invoice in RRA
    async cancelInvoice(invoiceNumber, reason) {
        if (!this.isEnabled) {
            console.log('🔄 RRA is disabled (development mode) - simulating cancellation');
            return {
                status: 'SUCCESS',
                message: 'Invoice cancelled successfully',
                receiptNumber: `CANCEL-${invoiceNumber}`,
            };
        }
        try {
            const response = await this.client.post('/invoice/cancel', {
                invoiceNumber,
                reason,
            });
            return {
                status: 'SUCCESS',
                message: 'Invoice cancelled successfully',
                receiptNumber: response.data.receiptNumber,
            };
        }
        catch (error) {
            console.error('❌ RRA cancellation error:', error.response?.data || error.message);
            return {
                status: 'ERROR',
                message: 'Failed to cancel invoice',
                errors: error.response?.data?.errors,
            };
        }
    }
    // Get invoice status from RRA
    async getInvoiceStatus(receiptNumber) {
        if (!this.isEnabled) {
            return {
                status: 'SUCCESS',
                receiptNumber,
                message: 'Invoice is valid (simulated)',
            };
        }
        try {
            const response = await this.client.get(`/invoice/${receiptNumber}`);
            return {
                status: 'SUCCESS',
                receiptNumber: response.data.receiptNumber,
                qrCode: response.data.qrCode,
                message: 'Invoice found',
            };
        }
        catch (error) {
            console.error('❌ RRA status check error:', error.response?.data || error.message);
            return {
                status: 'ERROR',
                message: 'Failed to check invoice status',
                errors: error.response?.data?.errors,
            };
        }
    }
    // Queue invoice for retry - FIXED: use stringified JSON
    async queueInvoice(data) {
        await prisma.auditLog.create({
            data: {
                action: 'RRA_INVOICE_QUEUED',
                entity: 'RRA',
                details: {
                    invoiceNumber: data.invoiceNumber,
                    data: JSON.stringify(data), // Convert to string to match JsonValue
                    queuedAt: new Date().toISOString(),
                },
            },
        });
        console.log(`📦 Invoice ${data.invoiceNumber} queued for retry`);
    }
    // Simulate RRA response (development)
    simulateResponse(data) {
        const receiptNumber = `RRA-${Date.now()}`;
        const qrCode = this.generateQRCode(data);
        return {
            status: 'SUCCESS',
            receiptNumber,
            qrCode,
            message: 'Invoice sent successfully (simulated)',
        };
    }
    // Generate QR code data (simulated)
    generateQRCode(data) {
        const payload = {
            invoiceNumber: data.invoiceNumber,
            receiptNumber: `RRA-${Date.now()}`,
            amount: data.totalAmount,
            date: data.date,
            tin: data.tin,
        };
        return Buffer.from(JSON.stringify(payload)).toString('base64');
    }
}
exports.RRAService = RRAService;
exports.default = new RRAService();
//# sourceMappingURL=rra.service.js.map