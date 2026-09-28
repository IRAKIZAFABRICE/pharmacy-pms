"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductController = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class ProductController {
    async getAll(req, res) {
        try {
            const { search, limit, page, posSearch, isActive } = req.query;
            const where = {};
            // POS search: include inactive products if they still have stock in batches
            if (posSearch === 'true') {
                // Don't filter by isActive — include deactivated products with stock
                const searchStr = search;
                if (searchStr && searchStr.length > 0) {
                    where.OR = [
                        { name: { contains: searchStr, mode: 'insensitive' } },
                        { code: { contains: searchStr, mode: 'insensitive' } },
                        { category: { contains: searchStr, mode: 'insensitive' } },
                        { subCategory: { contains: searchStr, mode: 'insensitive' } },
                    ];
                }
            }
            else {
                // Normal product listing: filter by isActive if provided, otherwise active only
                if (isActive === 'false') {
                    where.isActive = false;
                }
                else {
                    where.isActive = true;
                }
                // Add search filter
                if (search && typeof search === 'string' && search.length > 0) {
                    where.OR = [
                        { name: { contains: search, mode: 'insensitive' } },
                        { code: { contains: search, mode: 'insensitive' } },
                        { category: { contains: search, mode: 'insensitive' } },
                        { subCategory: { contains: search, mode: 'insensitive' } },
                    ];
                }
            }
            // Include batches that have stock (>0) for POS context
            const batchWhere = { isActive: true };
            if (posSearch === 'true') {
                batchWhere.quantity = { gt: 0 };
            }
            // Pagination
            const pageSize = limit ? Number(limit) : 100;
            const currentPage = page ? Number(page) : 1;
            const skip = (currentPage - 1) * pageSize;
            // Get total count for pagination metadata
            const total = await prisma.product.count({ where });
            const products = await prisma.product.findMany({
                where,
                include: {
                    batches: {
                        where: batchWhere,
                        select: {
                            id: true,
                            batchNumber: true,
                            quantity: true,
                            sellingPrice: true,
                            expiryDate: true,
                            containerSize: true,
                            quantityPerContainer: true,
                            containerCost: true,
                            costPrice: true,
                        },
                        orderBy: { expiryDate: 'asc' },
                    },
                },
                orderBy: { name: 'asc' },
                skip,
                take: pageSize,
            });
            res.json({
                data: products,
                pagination: {
                    total,
                    page: currentPage,
                    pageSize,
                    totalPages: Math.ceil(total / pageSize),
                    hasNextPage: currentPage * pageSize < total,
                    hasPreviousPage: currentPage > 1,
                },
            });
        }
        catch (error) {
            console.error('Error fetching products:', error);
            res.status(500).json({ error: 'Failed to fetch products' });
        }
    }
    async getById(req, res) {
        try {
            const { id } = req.params;
            const product = await prisma.product.findUnique({
                where: { id },
                include: {
                    batches: {
                        where: { isActive: true },
                        orderBy: { expiryDate: 'asc' },
                    },
                },
            });
            if (!product) {
                return res.status(404).json({ error: 'Product not found' });
            }
            res.json(product);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch product' });
        }
    }
    async create(req, res) {
        try {
            const { code, name, category, subCategory, description, isPrescription, isControlled, unitOfMeasure, reorderLevel, taxRate } = req.body;
            const product = await prisma.product.create({
                data: {
                    code,
                    name,
                    category,
                    subCategory,
                    description,
                    isPrescription: isPrescription || false,
                    isControlled: isControlled || false,
                    unitOfMeasure: unitOfMeasure || 'Tablet',
                    reorderLevel: reorderLevel || 10,
                    taxRate: taxRate || 18.0,
                },
            });
            res.status(201).json({ message: 'Product created', data: product });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to create product' });
        }
    }
    async update(req, res) {
        try {
            const { id } = req.params;
            const product = await prisma.product.update({
                where: { id },
                data: req.body,
            });
            res.json({ message: 'Product updated', data: product });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to update product' });
        }
    }
    async delete(req, res) {
        try {
            const { id } = req.params;
            await prisma.product.update({
                where: { id },
                data: { isActive: false },
            });
            res.json({ message: 'Product deactivated' });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to delete product' });
        }
    }
    async reactivate(req, res) {
        try {
            const { id } = req.params;
            const product = await prisma.product.update({
                where: { id },
                data: { isActive: true },
            });
            res.json({ message: 'Product reactivated', data: product });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to reactivate product' });
        }
    }
    async getCategories(req, res) {
        try {
            const categories = await prisma.product.findMany({
                where: { isActive: true },
                select: { category: true },
                distinct: ['category'],
            });
            res.json(categories.map((c) => c.category).filter(Boolean));
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch categories' });
        }
    }
    // Search by trade name OR composition (subCategory)
    async searchByComposition(req, res) {
        try {
            const { q } = req.query;
            const searchStr = q || '';
            if (searchStr.length < 1) {
                return res.json({ data: [] });
            }
            const products = await prisma.product.findMany({
                where: {
                    isActive: true,
                    OR: [
                        { name: { contains: searchStr, mode: 'insensitive' } },
                        { subCategory: { contains: searchStr, mode: 'insensitive' } },
                    ],
                },
                include: {
                    batches: {
                        where: { isActive: true, quantity: { gt: 0 } },
                        select: {
                            id: true,
                            batchNumber: true,
                            quantity: true,
                            sellingPrice: true,
                            expiryDate: true,
                            costPrice: true,
                            containerSize: true,
                            quantityPerContainer: true,
                            containerCost: true,
                        },
                        orderBy: { expiryDate: 'asc' },
                    },
                },
                orderBy: { name: 'asc' },
                take: 20,
            });
            res.json({ data: products });
        }
        catch (error) {
            console.error('Error searching by composition:', error);
            res.status(500).json({ error: 'Failed to search products' });
        }
    }
}
exports.ProductController = ProductController;
//# sourceMappingURL=product.controller.js.map