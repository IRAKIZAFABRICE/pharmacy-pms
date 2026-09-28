import { Request, Response } from 'express';
import { PrismaClient, ClaimStatus } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';
import rssbService from '../services/rssb.service';

const prisma = new PrismaClient();

export class RSSBController {
  /**
   * Verify patient eligibility with RSSB
   */
  async verifyEligibility(req: AuthRequest, res: Response) {
    try {
      const { patientId, policyNumber, insuranceCode } = req.body;

      if (!patientId || !policyNumber || !insuranceCode) {
        return res.status(400).json({
          error: 'patientId, policyNumber, and insuranceCode are required',
        });
      }

      const eligibility = await rssbService.verifyPatientEligibility(
        patientId,
        policyNumber,
        insuranceCode
      );

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
    } catch (error) {
      console.error('Error verifying RSSB eligibility:', error);
      return res.status(500).json({ error: 'Failed to verify patient eligibility' });
    }
  }

  /**
   * Verify Mutuelle de Santé co-pay
   */
  async verifyMutuelleCoPay(req: AuthRequest, res: Response) {
    try {
      const { patientId, policyNumber, prescriptionAmount } = req.body;

      if (!patientId || !policyNumber || !prescriptionAmount) {
        return res.status(400).json({
          error: 'patientId, policyNumber, and prescriptionAmount are required',
        });
      }

      const coPayResult = await rssbService.verifyMutuelleCoPay(
        patientId,
        policyNumber,
        prescriptionAmount
      );

      return res.json({ data: coPayResult });
    } catch (error) {
      console.error('Error verifying Mutuelle co-pay:', error);
      return res.status(500).json({ error: 'Failed to verify Mutuelle co-pay' });
    }
  }

  /**
   * Submit insurance claim to RSSB
   */
  async submitClaim(req: AuthRequest, res: Response) {
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

      const response = await rssbService.submitClaim(claimData);

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
    } catch (error) {
      console.error('Error submitting claim to RSSB:', error);
      return res.status(500).json({ error: 'Failed to submit claim to RSSB' });
    }
  }

  /**
   * Check claim status with RSSB
   */
  async checkClaimStatus(req: Request, res: Response) {
    try {
      const { rssbClaimNumber } = req.params;

      if (!rssbClaimNumber) {
        return res.status(400).json({ error: 'rssbClaimNumber is required' });
      }

      const response = await rssbService.checkClaimStatus(rssbClaimNumber);

      return res.json({ data: response });
    } catch (error) {
      console.error('Error checking RSSB claim status:', error);
      return res.status(500).json({ error: 'Failed to check RSSB claim status' });
    }
  }

  /**
   * Get RSSB configuration
   */
  async getConfig(req: Request, res: Response) {
    return res.json({ data: rssbService.getConfig() });
  }

  /**
   * Get RSSB claims summary
   */
  async getRSSBClaimsSummary(req: AuthRequest, res: Response) {
    try {
      const { startDate, endDate, status } = req.query;

      const where: any = {
        insuranceCompany: {
          code: {
            in: ['RSSB', 'MUTUELLE', 'RAMA', 'MMI'],
          },
        },
      };

      if (startDate) {
        where.submittedAt = { gte: new Date(startDate as string) };
      }
      if (endDate) {
        const end = new Date(endDate as string);
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
    } catch (error) {
      console.error('Error fetching RSSB claims summary:', error);
      return res.status(500).json({ error: 'Failed to fetch RSSB claims summary' });
    }
  }
}

