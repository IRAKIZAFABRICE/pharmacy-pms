"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RRAFiscalController = void 0;
const client_1 = require("@prisma/client");
const rra_fiscal_service_1 = __importDefault(require("../services/rra.fiscal.service"));
const prisma = new client_1.PrismaClient();
class RRAFiscalController {
    /**
     * Send fiscal invoice to RRA via VSDC/OSDC
     */
    async sendFiscalInvoice(req, res) {
        try {
            const { saleId } = req.body;
            if (!saleId) {
                return res.status(400).json({ error: 'Sale ID is required' });
            }
            const sale = await prisma.sale.findUnique({
                where: { id: saleId },
                include: {
                    saleItems: {
                        include: {
                            batch: {
                                include: {
                                    product: true,
                                },
                            },
                        },
                    },
                    user: true,
                },
            });
            if (!sale) {
                return res.status(404).json({ error: 'Sale not found' });
            }
            if (sale.rraStatus === 'APPROVED') {
                return res.status(400).json({ error: 'Fiscal invoice already submitted' });
            }
            // Build fiscal invoice payload
            const fiscalData = {
                invoiceNumber: sale.invoiceNumber,
                date: sale.saleDate.toISOString(),
                tin: process.env.RRA_TIN || '1000000000',
                customerTin: sale.customerPhone || undefined,
                customerName: sale.customerName || undefined,
                customerPhone: sale.customerPhone || undefined,
                totalAmount: sale.totalAmount,
                taxAmount: sale.taxAmount,
                netAmount: sale.subtotal - sale.discount,
                discountAmount: sale.discount,
                paymentMethod: sale.paymentMethod,
                items: sale.saleItems.map(item => ({
                    productCode: item.batch.product.code,
                    productName: item.batch.product.name,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    totalPrice: item.totalPrice,
                    taxRate: item.batch.product.taxRate,
                    taxAmount: item.totalPrice * (item.batch.product.taxRate / 100),
                    isExempt: item.batch.product.taxRate === 0,
                })),
            };
            const response = await rra_fiscal_service_1.default.sendFiscalInvoice(fiscalData);
            // Update sale with fiscal response
            const rraResponsePlain = JSON.parse(JSON.stringify(response));
            const updatedSale = await prisma.sale.update({
                where: { id: saleId },
                data: {
                    rraStatus: response.status === 'SUCCESS' ? client_1.RRAStatus.APPROVED : client_1.RRAStatus.REJECTED,
                    rraReceiptNumber: response.fiscalReceiptNumber || null,
                    rraQRCode: response.fiscalQRCode || null,
                    rraSubmittedAt: new Date(),
                    rraResponse: rraResponsePlain,
                },
                include: {
                    saleItems: {
                        include: {
                            batch: {
                                include: {
                                    product: true,
                                },
                            },
                        },
                    },
                },
            });
            // Audit log
            await prisma.auditLog.create({
                data: {
                    userId: req.user?.id,
                    action: 'RRA_FISCAL_INVOICE_SENT',
                    entity: 'SALE',
                    entityId: sale.id,
                    details: {
                        invoiceNumber: sale.invoiceNumber,
                        fiscalReceiptNumber: response.fiscalReceiptNumber,
                        fiscalSignature: response.fiscalSignature,
                        status: response.status,
                    },
                },
            });
            return res.json({
                message: response.status === 'SUCCESS'
                    ? 'Fiscal invoice submitted to RRA successfully'
                    : 'Failed to submit fiscal invoice',
                data: {
                    sale: updatedSale,
                    fiscalResponse: response,
                },
            });
        }
        catch (error) {
            console.error('Error sending fiscal invoice:', error);
            return res.status(500).json({ error: 'Failed to send fiscal invoice to RRA' });
        }
    }
    /**
     * Verify fiscal invoice with RRA
     */
    async verifyFiscalInvoice(req, res) {
        try {
            const { fiscalReceiptNumber } = req.params;
            if (!fiscalReceiptNumber) {
                return res.status(400).json({ error: 'Fiscal receipt number is required' });
            }
            const response = await rra_fiscal_service_1.default.verifyFiscalInvoice(fiscalReceiptNumber);
            if (response.status === 'SUCCESS' && response.fiscalReceiptNumber) {
                await prisma.sale.updateMany({
                    where: { rraReceiptNumber: fiscalReceiptNumber },
                    data: { rraStatus: client_1.RRAStatus.APPROVED },
                });
            }
            return res.json({ data: response });
        }
        catch (error) {
            console.error('Error verifying fiscal invoice:', error);
            return res.status(500).json({ error: 'Failed to verify fiscal invoice' });
        }
    }
    /**
     * Cancel fiscal invoice
     */
    async cancelFiscalInvoice(req, res) {
        try {
            const { saleId, reason } = req.body;
            if (!saleId) {
                return res.status(400).json({ error: 'Sale ID is required' });
            }
            const sale = await prisma.sale.findUnique({
                where: { id: saleId },
            });
            if (!sale) {
                return res.status(404).json({ error: 'Sale not found' });
            }
            if (!sale.rraReceiptNumber) {
                return res.status(400).json({ error: 'No fiscal receipt found for this sale' });
            }
            const response = await rra_fiscal_service_1.default.cancelFiscalInvoice(sale.rraReceiptNumber, reason || 'Cancelled by user', sale.invoiceNumber);
            const updatedSale = await prisma.sale.update({
                where: { id: saleId },
                data: {
                    rraStatus: client_1.RRAStatus.CANCELLED,
                    isCancelled: true,
                    cancellationReason: reason || 'Cancelled by user',
                    cancelledAt: new Date(),
                },
            });
            // Audit log
            await prisma.auditLog.create({
                data: {
                    userId: req.user?.id,
                    action: 'RRA_FISCAL_INVOICE_CANCELLED',
                    entity: 'SALE',
                    entityId: sale.id,
                    details: {
                        invoiceNumber: sale.invoiceNumber,
                        fiscalReceiptNumber: sale.rraReceiptNumber,
                        reason: reason || 'Cancelled by user',
                    },
                },
            });
            return res.json({
                message: 'Fiscal invoice cancelled successfully',
                data: { sale: updatedSale, fiscalResponse: response },
            });
        }
        catch (error) {
            console.error('Error cancelling fiscal invoice:', error);
            return res.status(500).json({ error: 'Failed to cancel fiscal invoice' });
        }
    }
    /**
     * Get RRA Fiscal configuration
     */
    async getConfig(req, res) {
        return res.json({
            data: {
                enabled: process.env.RRA_ENABLED === 'true',
                vsdcUrl: process.env.RRA_VSDC_URL || 'Not configured',
                vsdcDeviceId: process.env.RRA_VSDC_DEVICE_ID || 'Not configured',
                tin: process.env.RRA_TIN || 'Not configured',
                environment: process.env.NODE_ENV || 'development',
                isFullyConfigured: !!(process.env.RRA_ENABLED === 'true' &&
                    process.env.RRA_API_KEY &&
                    process.env.RRA_TIN),
            },
        });
    }
}
exports.RRAFiscalController = RRAFiscalController;
//# sourceMappingURL=rra.fiscal.controller.js.map