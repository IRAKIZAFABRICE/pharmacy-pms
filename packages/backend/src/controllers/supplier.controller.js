"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupplierController = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class SupplierController {
    async getAll(req, res) {
        try {
            const suppliers = await prisma.supplier.findMany({
                where: { isActive: true },
                orderBy: { name: 'asc' },
            });
            res.json({ data: suppliers });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch suppliers' });
        }
    }
    async getById(req, res) {
        try {
            const { id } = req.params;
            const supplier = await prisma.supplier.findUnique({ where: { id } });
            if (!supplier) {
                return res.status(404).json({ error: 'Supplier not found' });
            }
            res.json(supplier);
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to fetch supplier' });
        }
    }
    async create(req, res) {
        try {
            const { code, name, tin, email, phone, address, contactPerson } = req.body;
            const supplier = await prisma.supplier.create({
                data: { code, name, tin, email, phone, address, contactPerson },
            });
            res.status(201).json({ message: 'Supplier created', data: supplier });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to create supplier' });
        }
    }
    async update(req, res) {
        try {
            const { id } = req.params;
            const supplier = await prisma.supplier.update({
                where: { id },
                data: req.body,
            });
            res.json({ message: 'Supplier updated', data: supplier });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to update supplier' });
        }
    }
    async delete(req, res) {
        try {
            const { id } = req.params;
            await prisma.supplier.update({
                where: { id },
                data: { isActive: false },
            });
            res.json({ message: 'Supplier deactivated' });
        }
        catch (error) {
            res.status(500).json({ error: 'Failed to delete supplier' });
        }
    }
}
exports.SupplierController = SupplierController;
//# sourceMappingURL=supplier.controller.js.map