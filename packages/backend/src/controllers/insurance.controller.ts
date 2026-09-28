// packages/backend/src/controllers/insurance.controller.ts
import { Request, Response } from 'express';
import { PrismaClient, ClaimStatus } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

export class InsuranceController {
  // ==================== INSURANCE COMPANIES ====================

  // Get all insurance companies
  async getCompanies(req: Request, res: Response) {
    try {
      const { isActive = 'true' } = req.query;

      const companies = await prisma.insuranceCompany.findMany({
        where: isActive === 'true' ? { isActive: true } : {},
        include: {
          coverageRules: true,
          claims: {
            select: {
              id: true,
              claimNumber: true,
              status: true,
              claimAmount: true,
              createdAt: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      });

      return res.json({ data: companies });
    } catch (error) {
      console.error('Error fetching insurance companies:', error);
      return res.status(500).json({ error: 'Failed to fetch insurance companies' });
    }
  }

  // Get insurance company by ID
  async getCompanyById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const company = await prisma.insuranceCompany.findUnique({
        where: { id },
        include: {
          coverageRules: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  category: true,
                },
              },
            },
          },
          claims: {
            include: {
              sale: {
                select: {
                  id: true,
                  invoiceNumber: true,
                  saleDate: true,
                  totalAmount: true,
                  customerName: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
          },
        },
      });

      if (!company) {
        return res.status(404).json({ error: 'Insurance company not found' });
      }

      return res.json(company);
    } catch (error) {
      console.error('Error fetching insurance company:', error);
      return res.status(500).json({ error: 'Failed to fetch insurance company' });
    }
  }

  // Create insurance company
  async createCompany(req: AuthRequest, res: Response) {
    try {
      const { code, name, description, coveragePercentage, maxCoverageAmount, websiteUrl } = req.body;

      if (!code || !name) {
        return res.status(400).json({ error: 'Code and name are required' });
      }

      const existing = await prisma.insuranceCompany.findUnique({
        where: { code },
      });

      if (existing) {
        return res.status(409).json({ error: 'Insurance company with this code already exists' });
      }

      const company = await prisma.insuranceCompany.create({
        data: {
          code,
          name,
          description,
          coveragePercentage: coveragePercentage || 80.0,
          maxCoverageAmount: maxCoverageAmount || null,
          websiteUrl: websiteUrl || null,
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'INSURANCE_COMPANY_CREATED',
          entity: 'INSURANCE_COMPANY',
          entityId: company.id,
          details: { code, name },
        },
      });

      return res.status(201).json({
        message: 'Insurance company created successfully',
        data: company,
      });
    } catch (error) {
      console.error('Error creating insurance company:', error);
      return res.status(500).json({ error: 'Failed to create insurance company' });
    }
  }

  // Update insurance company
  async updateCompany(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const company = await prisma.insuranceCompany.findUnique({
        where: { id },
      });

      if (!company) {
        return res.status(404).json({ error: 'Insurance company not found' });
      }

      const updated = await prisma.insuranceCompany.update({
        where: { id },
        data: updateData,
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'INSURANCE_COMPANY_UPDATED',
          entity: 'INSURANCE_COMPANY',
          entityId: updated.id,
          details: { updatedFields: Object.keys(updateData) },
        },
      });

      return res.json({
        message: 'Insurance company updated successfully',
        data: updated,
      });
    } catch (error) {
      console.error('Error updating insurance company:', error);
      return res.status(500).json({ error: 'Failed to update insurance company' });
    }
  }

  // Delete insurance company (soft delete)
  async deleteCompany(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const company = await prisma.insuranceCompany.findUnique({
        where: { id },
        include: {
          claims: {
            where: {
              status: { notIn: ['PAID', 'REJECTED'] },
            },
          },
        },
      });

      if (!company) {
        return res.status(404).json({ error: 'Insurance company not found' });
      }

      if (company.claims.length > 0) {
        return res.status(400).json({
          error: 'Cannot delete company with pending claims. Deactivate instead.',
        });
      }

      await prisma.insuranceCompany.update({
        where: { id },
        data: { isActive: false },
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'INSURANCE_COMPANY_DELETED',
          entity: 'INSURANCE_COMPANY',
          entityId: id,
          details: { name: company.name },
        },
      });

      return res.json({
        message: 'Insurance company deactivated successfully',
      });
    } catch (error) {
      console.error('Error deleting insurance company:', error);
      return res.status(500).json({ error: 'Failed to delete insurance company' });
    }
  }

  // ==================== COVERAGE RULES ====================

  // Create coverage rule
  async createCoverageRule(req: AuthRequest, res: Response) {
    try {
      const {
        insuranceCompanyId,
        productId,
        productCategory,
        coveragePercentage,
      } = req.body;

      if (!insuranceCompanyId || !coveragePercentage) {
        return res.status(400).json({
          error: 'Insurance company ID and coverage percentage are required',
        });
      }

      const rule = await prisma.insuranceCoverageRule.create({
        data: {
          insuranceCompanyId,
          productId: productId || null,
          productCategory: productCategory || null,
          coveragePercentage,
          isActive: true,
        },
        include: {
          insuranceCompany: true,
          product: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'INSURANCE_COVERAGE_RULE_CREATED',
          entity: 'INSURANCE_COVERAGE_RULE',
          entityId: rule.id,
          details: { insuranceCompanyId, coveragePercentage },
        },
      });

      return res.status(201).json({
        message: 'Coverage rule created successfully',
        data: rule,
      });
    } catch (error) {
      console.error('Error creating coverage rule:', error);
      return res.status(500).json({ error: 'Failed to create coverage rule' });
    }
  }

  // Update coverage rule
  async updateCoverageRule(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const rule = await prisma.insuranceCoverageRule.findUnique({
        where: { id },
      });

      if (!rule) {
        return res.status(404).json({ error: 'Coverage rule not found' });
      }

      const updated = await prisma.insuranceCoverageRule.update({
        where: { id },
        data: updateData,
        include: {
          insuranceCompany: true,
          product: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'INSURANCE_COVERAGE_RULE_UPDATED',
          entity: 'INSURANCE_COVERAGE_RULE',
          entityId: updated.id,
          details: { updatedFields: Object.keys(updateData) },
        },
      });

      return res.json({
        message: 'Coverage rule updated successfully',
        data: updated,
      });
    } catch (error) {
      console.error('Error updating coverage rule:', error);
      return res.status(500).json({ error: 'Failed to update coverage rule' });
    }
  }

  // Delete coverage rule
  async deleteCoverageRule(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const rule = await prisma.insuranceCoverageRule.findUnique({
        where: { id },
      });

      if (!rule) {
        return res.status(404).json({ error: 'Coverage rule not found' });
      }

      await prisma.insuranceCoverageRule.update({
        where: { id },
        data: { isActive: false },
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'INSURANCE_COVERAGE_RULE_DELETED',
          entity: 'INSURANCE_COVERAGE_RULE',
          entityId: id,
        },
      });

      return res.json({
        message: 'Coverage rule deactivated successfully',
      });
    } catch (error) {
      console.error('Error deleting coverage rule:', error);
      return res.status(500).json({ error: 'Failed to delete coverage rule' });
    }
  }

  // ==================== INSURANCE CLAIMS ====================

  // Get all claims
  async getClaims(req: Request, res: Response) {
    try {
      const {
        status,
        companyId,
        patientName,
        startDate,
        endDate,
        page = 1,
        limit = 20,
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      const where: any = {};

      if (status) {
        where.status = status;
      }

      if (companyId) {
        where.insuranceCompanyId = companyId;
      }

      if (patientName) {
        where.patientName = { contains: patientName as string, mode: 'insensitive' };
      }

      if (startDate) {
        where.submittedAt = { gte: new Date(startDate as string) };
      }

      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        where.submittedAt = { ...where.submittedAt, lte: end };
      }

      const [claims, total] = await Promise.all([
        prisma.insuranceClaim.findMany({
          where,
          include: {
            insuranceCompany: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
            sale: {
              select: {
                id: true,
                invoiceNumber: true,
                saleDate: true,
                totalAmount: true,
                customerName: true,
                customerPhone: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take,
        }),
        prisma.insuranceClaim.count({ where }),
      ]);

      // Calculate summary statistics
      const summary = await prisma.insuranceClaim.aggregate({
        where,
        _sum: {
          claimAmount: true,
          coverageAmount: true,
          copayAmount: true,
        },
        _count: true,
      });

      return res.json({
        data: claims,
        summary: {
          totalClaims: summary._count,
          totalClaimAmount: summary._sum.claimAmount || 0,
          totalCoverageAmount: summary._sum.coverageAmount || 0,
          totalCopayAmount: summary._sum.copayAmount || 0,
        },
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error('Error fetching claims:', error);
      return res.status(500).json({ error: 'Failed to fetch claims' });
    }
  }

  // Get claim by ID
  async getClaimById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const claim = await prisma.insuranceClaim.findUnique({
        where: { id },
        include: {
          insuranceCompany: true,
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
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!claim) {
        return res.status(404).json({ error: 'Claim not found' });
      }

      return res.json(claim);
    } catch (error) {
      console.error('Error fetching claim:', error);
      return res.status(500).json({ error: 'Failed to fetch claim' });
    }
  }

  // Get claim by claim number
  async getClaimByNumber(req: Request, res: Response) {
    try {
      const { claimNumber } = req.params;

      const claim = await prisma.insuranceClaim.findUnique({
        where: { claimNumber },
        include: {
          insuranceCompany: true,
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
            },
          },
        },
      });

      if (!claim) {
        return res.status(404).json({ error: 'Claim not found' });
      }

      return res.json(claim);
    } catch (error) {
      console.error('Error fetching claim:', error);
      return res.status(500).json({ error: 'Failed to fetch claim' });
    }
  }

  // Create claim from existing sale
  async createClaim(req: AuthRequest, res: Response) {
    try {
      const {
        saleId,
        insuranceCompanyId,
        patientName,
        patientId,
        patientPhone,
        policyNumber,
        notes,
      } = req.body;

      if (!saleId || !insuranceCompanyId) {
        return res.status(400).json({
          error: 'Sale ID and insurance company ID are required',
        });
      }

      // Check if sale exists
      const sale = await prisma.sale.findUnique({
        where: { id: saleId },
        include: {
          insuranceClaim: true,
        },
      });

      if (!sale) {
        return res.status(404).json({ error: 'Sale not found' });
      }

      // Check if claim already exists for this sale
      if (sale.insuranceClaim) {
        return res.status(409).json({
          error: 'A claim already exists for this sale',
          data: sale.insuranceClaim,
        });
      }

      // Get insurance company
      const company = await prisma.insuranceCompany.findUnique({
        where: { id: insuranceCompanyId },
        include: {
          coverageRules: {
            where: { isActive: true },
          },
        },
      });

      if (!company) {
        return res.status(404).json({ error: 'Insurance company not found' });
      }

      // Calculate coverage (apply rules)
      let coveragePercentage = company.coveragePercentage;
      let maxCoverage = company.maxCoverageAmount;

      // Check for specific coverage rules
      for (const rule of company.coverageRules) {
        // Product-specific rule overrides general
        if (rule.productId) {
          // Check if any sale item matches this product
          const saleItems = await prisma.saleItem.findMany({
            where: { saleId, productId: rule.productId },
          });
          if (saleItems.length > 0) {
            coveragePercentage = rule.coveragePercentage;
            break;
          }
        }
        // Category-specific rule
        if (rule.productCategory) {
          const saleItems = await prisma.saleItem.findMany({
            where: { saleId },
            include: {
              product: true,
            },
          });
          const matchingItems = saleItems.filter(
            item => item.product.category === rule.productCategory
          );
          if (matchingItems.length > 0) {
            coveragePercentage = rule.coveragePercentage;
            break;
          }
        }
      }

      const claimAmount = sale.totalAmount;
      let coverageAmount = claimAmount * (coveragePercentage / 100);

      // Apply max coverage limit if set
      if (maxCoverage && coverageAmount > maxCoverage) {
        coverageAmount = maxCoverage;
      }

      const copayAmount = claimAmount - coverageAmount;

      // Generate claim number
      const claimNumber = await this.generateClaimNumber();

      // Create claim
      const claim = await prisma.insuranceClaim.create({
        data: {
          claimNumber,
          saleId,
          insuranceCompanyId,
          patientName: patientName || sale.customerName || 'Unknown',
          patientId: patientId || null,
          patientPhone: patientPhone || sale.customerPhone || null,
          policyNumber: policyNumber || null,
          claimAmount,
          coverageAmount,
          copayAmount,
          status: 'SUBMITTED',
          submittedAt: new Date(),
          notes: notes || null,
        },
        include: {
          insuranceCompany: true,
          sale: {
            select: {
              id: true,
              invoiceNumber: true,
              saleDate: true,
              totalAmount: true,
              customerName: true,
            },
          },
        },
      });

      // Update sale with claim reference
      await prisma.sale.update({
        where: { id: saleId },
        data: {
          insuranceClaim: {
            connect: { id: claim.id },
          },
          paymentMethod: 'INSURANCE',
        },
      });

      // Audit log
      await prisma.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'INSURANCE_CLAIM_CREATED',
          entity: 'INSURANCE_CLAIM',
          entityId: claim.id,
          details: {
            claimNumber: claim.claimNumber,
            amount: claim.claimAmount,
            coverage: claim.coverageAmount,
            copay: claim.copayAmount,
          },
        },
      });

      return res.status(201).json({
        message: 'Insurance claim created successfully',
        data: claim,
      });
    } catch (error) {
      console.error('Error creating claim:', error);
      return res.status(500).json({ error: 'Failed to create claim' });
    }
  }

  // Generate claim number (sequential)
  async generateClaimNumber(): Promise<string> {
    const lastClaim = await prisma.insuranceClaim.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { claimNumber: true },
    });

    let sequence = 1;
    if (lastClaim && lastClaim.claimNumber) {
      const match = lastClaim.claimNumber.match(/CLM-(\d+)/);
      if (match) {
        sequence = parseInt(match[1]) + 1;
      }
    }

    return `CLM-${String(sequence).padStart(6, '0')}`;
  }

  // Approve claim
  async approveClaim(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const claim = await prisma.insuranceClaim.findUnique({
        where: { id },
        include: {
          insuranceCompany: true,
          sale: true,
        },
      });

      if (!claim) {
        return res.status(404).json({ error: 'Claim not found' });
      }

      if (claim.status === 'APPROVED') {
        return res.status(400).json({ error: 'Claim is already approved' });
      }

      if (claim.status === 'REJECTED') {
        return res.status(400).json({ error: 'Cannot approve a rejected claim' });
      }

      if (claim.status === 'PAID') {
        return res.status(400).json({ error: 'Claim is already paid' });
      }

      const updated = await prisma.insuranceClaim.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
          notes: notes ? `${claim.notes || ''}\nApproval notes: ${notes}` : claim.notes,
        },
        include: {
          insuranceCompany: true,
          sale: {
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true,
            },
          },
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'INSURANCE_CLAIM_APPROVED',
          entity: 'INSURANCE_CLAIM',
          entityId: claim.id,
          details: {
            claimNumber: claim.claimNumber,
            amount: claim.claimAmount,
            coverage: claim.coverageAmount,
          },
        },
      });

      return res.json({
        message: 'Claim approved successfully',
        data: updated,
      });
    } catch (error) {
      console.error('Error approving claim:', error);
      return res.status(500).json({ error: 'Failed to approve claim' });
    }
  }

  // Reject claim
  async rejectClaim(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { reason, notes } = req.body;

      if (!reason) {
        return res.status(400).json({ error: 'Rejection reason is required' });
      }

      const claim = await prisma.insuranceClaim.findUnique({
        where: { id },
        include: {
          sale: true,
        },
      });

      if (!claim) {
        return res.status(404).json({ error: 'Claim not found' });
      }

      if (claim.status === 'REJECTED') {
        return res.status(400).json({ error: 'Claim is already rejected' });
      }

      if (claim.status === 'PAID') {
        return res.status(400).json({ error: 'Cannot reject a paid claim' });
      }

      const updated = await prisma.insuranceClaim.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectionReason: reason,
          notes: notes ? `${claim.notes || ''}\nRejection notes: ${notes}` : claim.notes,
        },
        include: {
          insuranceCompany: true,
          sale: {
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true,
            },
          },
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'INSURANCE_CLAIM_REJECTED',
          entity: 'INSURANCE_CLAIM',
          entityId: claim.id,
          details: {
            claimNumber: claim.claimNumber,
            reason,
          },
        },
      });

      return res.json({
        message: 'Claim rejected',
        data: updated,
      });
    } catch (error) {
      console.error('Error rejecting claim:', error);
      return res.status(500).json({ error: 'Failed to reject claim' });
    }
  }

  // Mark claim as paid
  async markClaimAsPaid(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { paymentReference, notes } = req.body;

      const claim = await prisma.insuranceClaim.findUnique({
        where: { id },
      });

      if (!claim) {
        return res.status(404).json({ error: 'Claim not found' });
      }

      if (claim.status === 'PAID') {
        return res.status(400).json({ error: 'Claim is already paid' });
      }

      if (claim.status !== 'APPROVED') {
        return res.status(400).json({
          error: 'Claim must be approved before marking as paid',
        });
      }

      const updated = await prisma.insuranceClaim.update({
        where: { id },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          notes: notes ? `${claim.notes || ''}\nPayment notes: ${notes}` : claim.notes,
        },
        include: {
          insuranceCompany: true,
          sale: {
            select: {
              id: true,
              invoiceNumber: true,
              totalAmount: true,
            },
          },
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: req.user?.id,
          action: 'INSURANCE_CLAIM_PAID',
          entity: 'INSURANCE_CLAIM',
          entityId: claim.id,
          details: {
            claimNumber: claim.claimNumber,
            amount: claim.claimAmount,
            paymentReference: paymentReference || null,
          },
        },
      });

      return res.json({
        message: 'Claim marked as paid successfully',
        data: updated,
      });
    } catch (error) {
      console.error('Error marking claim as paid:', error);
      return res.status(500).json({ error: 'Failed to mark claim as paid' });
    }
  }

  // Get claims summary (dashboard)
  async getClaimsSummary(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;

      const where: any = {};
      if (startDate) {
        where.submittedAt = { gte: new Date(startDate as string) };
      }
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        where.submittedAt = { ...where.submittedAt, lte: end };
      }

      const [
        totalClaims,
        pendingClaims,
        approvedClaims,
        rejectedClaims,
        paidClaims,
        totalValue,
      ] = await Promise.all([
        prisma.insuranceClaim.count({ where }),
        prisma.insuranceClaim.count({ where: { ...where, status: 'SUBMITTED' } }),
        prisma.insuranceClaim.count({ where: { ...where, status: 'APPROVED' } }),
        prisma.insuranceClaim.count({ where: { ...where, status: 'REJECTED' } }),
        prisma.insuranceClaim.count({ where: { ...where, status: 'PAID' } }),
        prisma.insuranceClaim.aggregate({
          where: { ...where, status: { in: ['APPROVED', 'PAID'] } },
          _sum: { coverageAmount: true },
        }),
      ]);

      // Claims by company
      const claimsByCompany = await prisma.insuranceClaim.groupBy({
        by: ['insuranceCompanyId'],
        where,
        _count: true,
        _sum: { claimAmount: true, coverageAmount: true },
        orderBy: {
          _count: { insuranceCompanyId: 'desc' },
        },
        take: 10,
      });

      // Get company names
      const companyIds = claimsByCompany.map(c => c.insuranceCompanyId);
      const companies = await prisma.insuranceCompany.findMany({
        where: { id: { in: companyIds } },
        select: { id: true, name: true, code: true },
      });

      const claimsByCompanyWithNames = claimsByCompany.map(c => ({
        ...c,
        company: companies.find(comp => comp.id === c.insuranceCompanyId),
      }));

      return res.json({
        summary: {
          totalClaims,
          pendingClaims,
          approvedClaims,
          rejectedClaims,
          paidClaims,
          totalCoveragePaid: totalValue._sum.coverageAmount || 0,
        },
        claimsByCompany: claimsByCompanyWithNames,
      });
    } catch (error) {
      console.error('Error fetching claims summary:', error);
      return res.status(500).json({ error: 'Failed to fetch claims summary' });
    }
  }
}
