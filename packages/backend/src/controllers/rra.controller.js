"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RRAController = void 0;
const client_1 = require("@prisma/client");
const rra_service_1 = __importDefault(require("../services/rra.service"));
const prisma = new client_1.PrismaClient();
class RRAController {
    // Send sale to RRA
    async sendInvoice(req, res) {
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
                return res.status(400).json({ error: 'Invoice already sent to RRA' });
            }
            const rraData = {
                invoiceNumber: sale.invoiceNumber,
                date: sale.saleDate.toISOString(),
                tin: process.env.RRA_TIN || '1000000000',
                customerName: sale.customerName || undefined,
                customerTin: sale.customerPhone || undefined,
                totalAmount: sale.totalAmount,
                taxAmount: sale.taxAmount,
                netAmount: sale.subtotal - sale.discount,
                items: sale.saleItems.map(item => ({
                    productCode: item.batch.product.code,
                    productName: item.batch.product.name,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    totalPrice: item.totalPrice,
                    taxRate: item.batch.product.taxRate,
                    taxAmount: item.totalPrice * (item.batch.product.taxRate / 100),
                })),
            };
            const response = await rra_service_1.default.sendInvoice(rraData);
            // FIX: Convert response to plain object for Prisma
            const rraResponsePlain = JSON.parse(JSON.stringify(response));
            const updatedSale = await prisma.sale.update({
                where: { id: saleId },
                data: {
                    rraStatus: response.status === 'SUCCESS' ? client_1.RRAStatus.APPROVED : client_1.RRAStatus.REJECTED,
                    rraReceiptNumber: response.receiptNumber || null,
                    rraQRCode: response.qrCode || null,
                    rraSubmittedAt: new Date(),
                    rraResponse: rraResponsePlain, // FIXED: Use plain object
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
            await prisma.auditLog.create({
                data: {
                    userId: req.user?.id,
                    action: 'RRA_INVOICE_SENT',
                    entity: 'SALE',
                    entityId: sale.id,
                    details: {
                        invoiceNumber: sale.invoiceNumber,
                        status: response.status,
                        receiptNumber: response.receiptNumber,
                    },
                },
            });
            return res.json({
                message: response.status === 'SUCCESS' ? 'Invoice sent to RRA successfully' : 'Failed to send invoice',
                data: {
                    sale: updatedSale,
                    rraResponse: response,
                },
            });
        }
        catch (error) {
            console.error('Error sending invoice to RRA:', error);
            return res.status(500).json({ error: 'Failed to send invoice to RRA' });
        }
    }
    // Check invoice status
    async checkInvoiceStatus(req, res) {
        try {
            const { receiptNumber } = req.params;
            if (!receiptNumber) {
                return res.status(400).json({ error: 'Receipt number is required' });
            }
            const response = await rra_service_1.default.getInvoiceStatus(receiptNumber);
            if (response.status === 'SUCCESS' && response.receiptNumber) {
                await prisma.sale.updateMany({
                    where: { rraReceiptNumber: receiptNumber },
                    data: {
                        rraStatus: client_1.RRAStatus.APPROVED,
                    },
                });
            }
            return res.json({
                data: response,
            });
        }
        catch (error) {
            console.error('Error checking invoice status:', error);
            return res.status(500).json({ error: 'Failed to check invoice status' });
        }
    }
    // Cancel invoice
    async cancelInvoice(req, res) {
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
                return res.status(400).json({ error: 'No RRA receipt found for this sale' });
            }
            const response = await rra_service_1.default.cancelInvoice(sale.rraReceiptNumber, reason || 'Cancelled by user');
            const updatedSale = await prisma.sale.update({
                where: { id: saleId },
                data: {
                    rraStatus: client_1.RRAStatus.CANCELLED,
                    isCancelled: true,
                    cancellationReason: reason || 'Cancelled by user',
                    cancelledAt: new Date(),
                },
            });
            await prisma.auditLog.create({
                data: {
                    userId: req.user?.id,
                    action: 'RRA_INVOICE_CANCELLED',
                    entity: 'SALE',
                    entityId: sale.id,
                    details: {
                        invoiceNumber: sale.invoiceNumber,
                        receiptNumber: sale.rraReceiptNumber,
                        reason: reason || 'Cancelled by user',
                    },
                },
            });
            return res.json({
                message: 'Invoice cancelled successfully',
                data: {
                    sale: updatedSale,
                    rraResponse: response,
                },
            });
        }
        catch (error) {
            console.error('Error cancelling invoice:', error);
            return res.status(500).json({ error: 'Failed to cancel invoice' });
        }
    }
    // Get RRA configuration status
    async getConfig(req, res) {
        return res.json({
            enabled: process.env.RRA_ENABLED === 'true',
            apiUrl: process.env.RRA_API_URL || 'Not configured',
            tin: process.env.RRA_TIN || 'Not configured',
            environment: process.env.NODE_ENV || 'development',
        });
    }
    // Get pending invoices to send
    async getPendingInvoices(req, res) {
        try {
            const pendingSales = await prisma.sale.findMany({
                where: {
                    rraStatus: client_1.RRAStatus.PENDING,
                    isCancelled: false,
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
                orderBy: { saleDate: 'asc' },
                take: 50,
            });
            return res.json({
                data: pendingSales,
                count: pendingSales.length,
            });
        }
        catch (error) {
            console.error('Error fetching pending invoices:', error);
            return res.status(500).json({ error: 'Failed to fetch pending invoices' });
        }
    }
    // Retry failed invoices
    async retryFailedInvoices(req, res) {
        try {
            const failedSales = await prisma.sale.findMany({
                where: {
                    rraStatus: client_1.RRAStatus.REJECTED,
                    isCancelled: false,
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
                take: 20,
            });
            const results = [];
            for (const sale of failedSales) {
                const rraData = {
                    invoiceNumber: sale.invoiceNumber,
                    date: sale.saleDate.toISOString(),
                    tin: process.env.RRA_TIN || '1000000000',
                    totalAmount: sale.totalAmount,
                    taxAmount: sale.taxAmount,
                    netAmount: sale.subtotal - sale.discount,
                    items: sale.saleItems.map(item => ({
                        productCode: item.batch.product.code,
                        productName: item.batch.product.name,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        totalPrice: item.totalPrice,
                        taxRate: item.batch.product.taxRate,
                        taxAmount: item.totalPrice * (item.batch.product.taxRate / 100),
                    })),
                };
                const response = await rra_service_1.default.sendInvoice(rraData);
                // FIX: Convert response to plain object for Prisma
                const rraResponsePlain = JSON.parse(JSON.stringify(response));
                await prisma.sale.update({
                    where: { id: sale.id },
                    data: {
                        rraStatus: response.status === 'SUCCESS' ? client_1.RRAStatus.APPROVED : client_1.RRAStatus.REJECTED,
                        rraReceiptNumber: response.receiptNumber || sale.rraReceiptNumber,
                        rraQRCode: response.qrCode || sale.rraQRCode,
                        rraSubmittedAt: new Date(),
                        rraResponse: rraResponsePlain, // FIXED: Use plain object
                    },
                });
                results.push({
                    saleId: sale.id,
                    invoiceNumber: sale.invoiceNumber,
                    status: response.status,
                    message: response.message,
                });
            }
            return res.json({
                message: `Processed ${results.length} failed invoices`,
                data: results,
            });
        }
        catch (error) {
            console.error('Error retrying failed invoices:', error);
            return res.status(500).json({ error: 'Failed to retry invoices' });
        }
    }
}
exports.RRAController = RRAController;
//# sourceMappingURL=rra.controller.js.map