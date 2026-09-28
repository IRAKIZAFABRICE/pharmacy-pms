"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RSSBController = void 0;
const client_1 = require("@prisma/client");
const rssb_service_1 = __importDefault(require("../services/rssb.service"));
const prisma = new client_1.PrismaClient();
class RSSBController {
    /**
     * Verify patient eligibility with RSSB
     */
    async verifyEligibility(req, res) {
        try {
            const { patientId, policyNumber, insuranceCode } = req.body;
            if (!patientId || !policyNumber || !insuranceCode) {
                return res.status(400).json({
                    error: 'patientId, policyNumber, and insuranceCode are required',
                });
            }
            const eligibility = await rssb_service_1.default.verifyPatientEligibility(patientId, policyNumber, insuranceCode);
            // Audit log
            await prisma.auditLog.create({
                data: {
                    userId: req.user?.id,
                    action: 'RSSB_ELIGIBILITY_CHECK',
                    entity: 'RSSB',
                    entityId: patientId,
                    details: {
                        patientId,
                        policyNumber,
                        insuranceCode,
                        isEligible: eligibility.isEligible,
                        coveragePercentage: eligibility.coveragePercentage,
                    },
                },
            });
            return res.json({ data: eligibility });
        }
        catch (error) {
            console.error('Error verifying RSSB eligibility:', error);
            return res.status(500).json({ error: 'Failed to verify patient eligibility' });
        }
    }
    /**
     * Verify Mutuelle de Santé co-pay
     */
    async verifyMutuelleCoPay(req, res) {
        try {
            const { patientId, policyNumber, prescriptionAmount } = req.body;
            if (!patientId || !policyNumber || !prescriptionAmount) {
                return res.status(400).json({
                    error: 'patientId, policyNumber, and prescriptionAmount are required',
                });
            }
            const coPayResult = await rssb_service_1.default.verifyMutuelleCoPay(patientId, policyNumber, prescriptionAmount);
            return res.json({ data: coPayResult });
        }
        catch (error) {
            console.error('Error verifying Mutuelle co-pay:', error);
            return res.status(500).json({ error: 'Failed to verify Mutuelle co-pay' });
        }
    }
    /**
     * Submit insurance claim to RSSB
     */
    async submitClaim(req, res) {
        try {
            const { claimId } = req.body;
            if (!claimId) {
                return res.status(400).json({ error: 'claimId is required' });
            }
            // Get the claim with full details
            const claim = await prisma.insuranceClaim.findUnique({
                where: { id: claimId },
                include: {
                    sale: {
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
                    },
                    insuranceCompany: true,
                },
            });
            if (!claim) {
                return res.status(404).json({ error: 'Claim not found' });
            }
            if (claim.status !== 'SUBMITTED') {
                return res.status(400).json({
                    error: `Claim must be in SUBMITTED status. Current status: ${claim.status}`,
                });
            }
            // Build VCDC submission payload
            const claimData = {
                claimNumber: claim.claimNumber,
                patientId: claim.patientId || claim.patientName,
                patientName: claim.patientName,
                policyNumber: claim.policyNumber || '',
                insuranceCode: claim.insuranceCompany.code,
                providerCode: process.env.RSSB_PROVIDER_CODE || 'PHARM-001',
                invoiceNumber: claim.sale.invoiceNumber,
                invoiceDate: claim.sale.saleDate.toISOString(),
                totalAmount: claim.claimAmount,
                coverageAmount: claim.coverageAmount,
                copayAmount: claim.copayAmount,
                items: claim.sale.saleItems.map(item => ({
                    productCode: item.batch.product.code,
                    productName: item.batch.product.name,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    totalPrice: item.totalPrice,
                    isPrescription: item.batch.product.isPrescription,
                    isControlled: item.batch.product.isControlled,
                })),
            };
            const response = await rssb_service_1.default.submitClaim(claimData);
            // Audit log
            await prisma.auditLog.create({
                data: {
                    userId: req.user?.id,
                    action: 'RSSB_CLAIM_SUBMITTED',
                    entity: 'RSSB_CLAIM',
                    entityId: claim.claimNumber,
                    details: {
                        claimNumber: claim.claimNumber,
                        rssbResponse: JSON.stringify(response),
                        status: response.status,
                    },
                },
            });
            return res.json({
                message: response.status === 'SUCCESS'
                    ? 'Claim submitted to RSSB successfully'
                    : 'Claim submission to RSSB is pending/queued',
                data: {
                    claim,
                    rssbResponse: response,
                },
            });
        }
        catch (error) {
            console.error('Error submitting claim to RSSB:', error);
            return res.status(500).json({ error: 'Failed to submit claim to RSSB' });
        }
    }
    /**
     * Check claim status with RSSB
     */
    async checkClaimStatus(req, res) {
        try {
            const { rssbClaimNumber } = req.params;
            if (!rssbClaimNumber) {
                return res.status(400).json({ error: 'rssbClaimNumber is required' });
            }
            const response = await rssb_service_1.default.checkClaimStatus(rssbClaimNumber);
            return res.json({ data: response });
        }
        catch (error) {
            console.error('Error checking RSSB claim status:', error);
            return res.status(500).json({ error: 'Failed to check RSSB claim status' });
        }
    }
    /**
     * Get RSSB configuration
     */
    async getConfig(req, res) {
        return res.json({ data: rssb_service_1.default.getConfig() });
    }
    /**
     * Get RSSB claims summary
     */
    async getRSSBClaimsSummary(req, res) {
        try {
            const { startDate, endDate, status } = req.query;
            const where = {
                insuranceCompany: {
                    code: {
                        in: ['RSSB', 'MUTUELLE', 'RAMA', 'MMI'],
                    },
                },
            };
            if (startDate) {
                where.submittedAt = { gte: new Date(startDate) };
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                where.submittedAt = { ...where.submittedAt, lte: end };
            }
            if (status) {
                where.status = status;
            }
            const [summary, byStatus] = await Promise.all([
                prisma.insuranceClaim.aggregate({
                    where,
                    _sum: {
                        claimAmount: true,
                        coverageAmount: true,
                        copayAmount: true,
                    },
                    _count: true,
                }),
                prisma.insuranceClaim.groupBy({
                    by: ['status'],
                    where,
                    _sum: {
                        claimAmount: true,
                        coverageAmount: true,
                    },
                    _count: true,
                }),
            ]);
            return res.json({
                data: {
                    totalClaims: summary._count,
                    totalClaimAmount: summary._sum.claimAmount || 0,
                    totalCoverageAmount: summary._sum.coverageAmount || 0,
                    totalCopayAmount: summary._sum.copayAmount || 0,
                    byStatus,
                },
            });
        }
        catch (error) {
            console.error('Error fetching RSSB claims summary:', error);
            return res.status(500).json({ error: 'Failed to fetch RSSB claims summary' });
        }
    }
}
exports.RSSBController = RSSBController;
//# sourceMappingURL=rssb.controller.js.map