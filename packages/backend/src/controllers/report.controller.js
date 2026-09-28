"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportController = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class ReportController {
    // ==================== DAILY SALES REPORT ====================
    async getDailySales(req, res) {
        try {
            const { date } = req.query;
            const reportDate = date ? new Date(date) : new Date();
            const startOfDay = new Date(reportDate);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(reportDate);
            endOfDay.setHours(23, 59, 59, 999);
            const sales = await prisma.sale.findMany({
                where: {
                    saleDate: {
                        gte: startOfDay,
                        lte: endOfDay,
                    },
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
                    user: true,
                },
                orderBy: { saleDate: 'desc' },
            });
            // Calculate totals
            let totalSales = 0;
            let totalCost = 0;
            let totalProfit = 0;
            const paymentBreakdown = { CASH: 0, MOBILE_MONEY: 0, CARD: 0, INSURANCE: 0 };
            const productSales = {};
            for (const sale of sales) {
                totalSales += sale.totalAmount;
                paymentBreakdown[sale.paymentMethod] = (paymentBreakdown[sale.paymentMethod] || 0) + sale.totalAmount;
                for (const item of sale.saleItems) {
                    const productName = item.batch.product.name;
                    if (!productSales[productName]) {
                        productSales[productName] = {
                            name: productName,
                            quantity: 0,
                            revenue: 0,
                            cost: 0,
                            profit: 0,
                        };
                    }
                    const cost = item.batch.costPrice * item.quantity;
                    productSales[productName].quantity += item.quantity;
                    productSales[productName].revenue += item.totalPrice;
                    productSales[productName].cost += cost;
                    productSales[productName].profit += item.totalPrice - cost;
                    totalCost += cost;
                }
            }
            totalProfit = totalSales - totalCost;
            return res.json({
                date: reportDate.toISOString().split('T')[0],
                summary: {
                    totalSales,
                    totalCost,
                    totalProfit,
                    profitMargin: totalSales > 0 ? (totalProfit / totalSales) * 100 : 0,
                    transactionCount: sales.length,
                    totalItems: sales.reduce((sum, s) => sum + s.saleItems.reduce((acc, i) => acc + i.quantity, 0), 0),
                },
                paymentBreakdown,
                topProducts: Object.values(productSales)
                    .sort((a, b) => b.revenue - a.revenue)
                    .slice(0, 10),
                sales,
            });
        }
        catch (error) {
            console.error('Error generating daily sales report:', error);
            return res.status(500).json({ error: 'Failed to generate daily sales report' });
        }
    }
    // ==================== WEEKLY SALES REPORT ====================
    async getWeeklySales(req, res) {
        try {
            const { week, year } = req.query;
            const today = new Date();
            const currentYear = year ? parseInt(year) : today.getFullYear();
            const currentWeek = week ? parseInt(week) : this.getWeekNumber(today);
            const startDate = this.getStartOfWeek(currentYear, currentWeek);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);
            const sales = await prisma.sale.findMany({
                where: {
                    saleDate: {
                        gte: startDate,
                        lte: endDate,
                    },
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
                    user: true,
                },
                orderBy: { saleDate: 'asc' },
            });
            // Calculate daily breakdown
            const dailyData = {};
            let totalSales = 0;
            let totalCost = 0;
            let totalProfit = 0;
            for (const sale of sales) {
                totalSales += sale.totalAmount;
                const day = sale.saleDate.getDate();
                if (!dailyData[day]) {
                    dailyData[day] = { day, total: 0, count: 0 };
                }
                dailyData[day].total += sale.totalAmount;
                dailyData[day].count += 1;
                for (const item of sale.saleItems) {
                    totalCost += item.batch.costPrice * item.quantity;
                }
            }
            totalProfit = totalSales - totalCost;
            const dailyDataArray = Object.values(dailyData);
            return res.json({
                week: currentWeek,
                year: currentYear,
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
                summary: {
                    totalSales,
                    totalCost,
                    totalProfit,
                    profitMargin: totalSales > 0 ? (totalProfit / totalSales) * 100 : 0,
                    transactionCount: sales.length,
                    averageDailySales: sales.length > 0 ? totalSales / 7 : 0,
                },
                dailyData: dailyDataArray,
                sales,
            });
        }
        catch (error) {
            console.error('Error generating weekly sales report:', error);
            return res.status(500).json({ error: 'Failed to generate weekly sales report' });
        }
    }
    // ==================== MONTHLY SALES REPORT ====================
    async getMonthlySales(req, res) {
        try {
            const { month, year } = req.query;
            const today = new Date();
            const reportMonth = month ? parseInt(month) : today.getMonth() + 1;
            const reportYear = year ? parseInt(year) : today.getFullYear();
            const startDate = new Date(reportYear, reportMonth - 1, 1);
            const endDate = new Date(reportYear, reportMonth, 0);
            endDate.setHours(23, 59, 59, 999);
            const sales = await prisma.sale.findMany({
                where: {
                    saleDate: {
                        gte: startDate,
                        lte: endDate,
                    },
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
                    user: true,
                },
                orderBy: { saleDate: 'asc' },
            });
            // Calculate daily breakdown
            const dailyData = {};
            let totalSales = 0;
            let totalCost = 0;
            let totalProfit = 0;
            const productSales = {};
            for (const sale of sales) {
                totalSales += sale.totalAmount;
                const day = sale.saleDate.getDate();
                if (!dailyData[day]) {
                    dailyData[day] = { day, total: 0, count: 0 };
                }
                dailyData[day].total += sale.totalAmount;
                dailyData[day].count += 1;
                for (const item of sale.saleItems) {
                    const productName = item.batch.product.name;
                    if (!productSales[productName]) {
                        productSales[productName] = {
                            name: productName,
                            quantity: 0,
                            revenue: 0,
                            cost: 0,
                            profit: 0,
                        };
                    }
                    const cost = item.batch.costPrice * item.quantity;
                    productSales[productName].quantity += item.quantity;
                    productSales[productName].revenue += item.totalPrice;
                    productSales[productName].cost += cost;
                    productSales[productName].profit += item.totalPrice - cost;
                    totalCost += cost;
                }
            }
            totalProfit = totalSales - totalCost;
            const dailyDataArray = Object.values(dailyData);
            return res.json({
                month: reportMonth,
                year: reportYear,
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0],
                summary: {
                    totalSales,
                    totalCost,
                    totalProfit,
                    profitMargin: totalSales > 0 ? (totalProfit / totalSales) * 100 : 0,
                    transactionCount: sales.length,
                    averageDailySales: sales.length > 0 ? totalSales / new Date(reportYear, reportMonth, 0).getDate() : 0,
                    averageTransactionValue: sales.length > 0 ? totalSales / sales.length : 0,
                },
                dailyData: dailyDataArray,
                topProducts: Object.values(productSales)
                    .sort((a, b) => b.revenue - a.revenue)
                    .slice(0, 10),
                sales,
            });
        }
        catch (error) {
            console.error('Error generating monthly sales report:', error);
            return res.status(500).json({ error: 'Failed to generate monthly sales report' });
        }
    }
    // ==================== PROFIT/LOSS REPORT ====================
    async getProfitLoss(req, res) {
        try {
            const { startDate, endDate, period } = req.query;
            let start;
            let end;
            if (period === 'weekly') {
                const today = new Date();
                start = this.getStartOfWeek(today.getFullYear(), this.getWeekNumber(today));
                end = new Date(start);
                end.setDate(end.getDate() + 6);
                end.setHours(23, 59, 59, 999);
            }
            else if (period === 'monthly') {
                const today = new Date();
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                end.setHours(23, 59, 59, 999);
            }
            else if (startDate && endDate) {
                start = new Date(startDate);
                end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
            }
            else {
                const today = new Date();
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                end.setHours(23, 59, 59, 999);
            }
            const sales = await prisma.sale.findMany({
                where: {
                    saleDate: {
                        gte: start,
                        lte: end,
                    },
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
            });
            let totalRevenue = 0;
            let totalCost = 0;
            let totalProfit = 0;
            const dailyBreakdown = {};
            for (const sale of sales) {
                totalRevenue += sale.totalAmount;
                const dateKey = sale.saleDate.toISOString().split('T')[0];
                if (!dailyBreakdown[dateKey]) {
                    dailyBreakdown[dateKey] = { date: dateKey, revenue: 0, cost: 0, profit: 0 };
                }
                dailyBreakdown[dateKey].revenue += sale.totalAmount;
                for (const item of sale.saleItems) {
                    const cost = item.batch.costPrice * item.quantity;
                    totalCost += cost;
                    dailyBreakdown[dateKey].cost += cost;
                }
            }
            totalProfit = totalRevenue - totalCost;
            const dailyData = Object.values(dailyBreakdown);
            dailyData.forEach((d) => {
                d.profit = d.revenue - d.cost;
                d.margin = d.revenue > 0 ? (d.profit / d.revenue) * 100 : 0;
            });
            return res.json({
                period: period || 'custom',
                startDate: start.toISOString().split('T')[0],
                endDate: end.toISOString().split('T')[0],
                summary: {
                    totalRevenue,
                    totalCost,
                    totalProfit,
                    profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
                    transactionCount: sales.length,
                    averageProfitPerTransaction: sales.length > 0 ? totalProfit / sales.length : 0,
                },
                dailyBreakdown: dailyData,
            });
        }
        catch (error) {
            console.error('Error generating profit/loss report:', error);
            return res.status(500).json({ error: 'Failed to generate profit/loss report' });
        }
    }
    // ==================== EXPIRING PRODUCTS ====================
    async getExpiringProducts(req, res) {
        try {
            const { months = 2 } = req.query;
            const today = new Date();
            const expiryThreshold = new Date();
            expiryThreshold.setMonth(expiryThreshold.getMonth() + Number(months));
            const expiringBatches = await prisma.batch.findMany({
                where: {
                    isActive: true,
                    quantity: { gt: 0 },
                    expiryDate: {
                        lte: expiryThreshold,
                        gte: today,
                    },
                },
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                            category: true,
                            unitOfMeasure: true,
                        },
                    },
                    supplier: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
                orderBy: { expiryDate: 'asc' },
            });
            // Group by urgency
            const expiringData = expiringBatches.map(batch => {
                const daysUntilExpiry = Math.ceil((new Date(batch.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                let urgency = 'info';
                if (daysUntilExpiry <= 30)
                    urgency = 'critical';
                else if (daysUntilExpiry <= 60)
                    urgency = 'warning';
                return {
                    ...batch,
                    daysUntilExpiry,
                    urgency,
                    totalValue: batch.quantity * batch.costPrice,
                    expiryDate: batch.expiryDate,
                };
            });
            return res.json({
                summary: {
                    totalExpiringBatches: expiringData.length,
                    totalValue: expiringData.reduce((sum, b) => sum + b.totalValue, 0),
                    totalQuantity: expiringData.reduce((sum, b) => sum + b.quantity, 0),
                    criticalCount: expiringData.filter(b => b.urgency === 'critical').length,
                    warningCount: expiringData.filter(b => b.urgency === 'warning').length,
                },
                expiringProducts: expiringData,
                months: Number(months),
            });
        }
        catch (error) {
            console.error('Error fetching expiring products:', error);
            return res.status(500).json({ error: 'Failed to fetch expiring products' });
        }
    }
    // ==================== OUT OF STOCK PRODUCTS ====================
    async getOutOfStockProducts(req, res) {
        try {
            // Get all products
            const products = await prisma.product.findMany({
                where: { isActive: true },
                include: {
                    batches: {
                        where: {
                            isActive: true,
                            quantity: { gt: 0 },
                        },
                        select: {
                            quantity: true,
                            batchNumber: true,
                            expiryDate: true,
                        },
                    },
                },
            });
            // Filter products with zero stock
            const outOfStock = products
                .map(product => {
                const totalStock = product.batches.reduce((sum, b) => sum + b.quantity, 0);
                return {
                    ...product,
                    totalStock,
                    batches: product.batches,
                    reorderLevel: product.reorderLevel || 0,
                    isOutOfStock: totalStock === 0,
                    isLowStock: totalStock > 0 && totalStock <= (product.reorderLevel || 0),
                };
            })
                .filter(p => p.isOutOfStock || p.isLowStock)
                .sort((a, b) => a.totalStock - b.totalStock);
            return res.json({
                summary: {
                    totalOutOfStock: outOfStock.filter(p => p.isOutOfStock).length,
                    totalLowStock: outOfStock.filter(p => p.isLowStock && !p.isOutOfStock).length,
                    totalProducts: products.length,
                },
                products: outOfStock,
            });
        }
        catch (error) {
            console.error('Error fetching out of stock products:', error);
            return res.status(500).json({ error: 'Failed to fetch out of stock products' });
        }
    }
    // ==================== NOTIFICATIONS ====================
    async getNotifications(req, res) {
        try {
            const notifications = [];
            // 1. Check expiring products (within 2 months)
            const expiring = await this.getExpiringProductsData();
            for (const item of expiring) {
                notifications.push({
                    id: `exp-${item.id}`,
                    type: item.daysUntilExpiry <= 30 ? 'critical' : 'warning',
                    title: `⚠️ Product Expiring Soon: ${item.product.name}`,
                    message: `Batch ${item.batchNumber} (${item.quantity} units) expires on ${new Date(item.expiryDate).toLocaleDateString()} (${item.daysUntilExpiry} days)`,
                    date: new Date(),
                    read: false,
                    action: '/inventory',
                    severity: item.daysUntilExpiry <= 30 ? 'high' : 'medium',
                });
            }
            // 2. Check out of stock products
            const outOfStock = await this.getOutOfStockProductsData();
            for (const product of outOfStock) {
                notifications.push({
                    id: `oos-${product.id}`,
                    type: 'critical',
                    title: `🔴 Out of Stock: ${product.name}`,
                    message: `${product.name} is completely out of stock. Reorder level: ${product.reorderLevel || 0}.`,
                    date: new Date(),
                    read: false,
                    action: '/products',
                    severity: 'high',
                });
            }
            // 3. Check low stock products (below reorder level but not zero)
            const lowStock = await this.getLowStockProductsData();
            for (const product of lowStock) {
                notifications.push({
                    id: `low-${product.id}`,
                    type: 'warning',
                    title: `⚠️ Low Stock: ${product.name}`,
                    message: `${product.name} has only ${product.totalStock} units remaining. Reorder level: ${product.reorderLevel || 0}.`,
                    date: new Date(),
                    read: false,
                    action: '/inventory',
                    severity: 'medium',
                });
            }
            // Sort by date (newest first)
            notifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            return res.json({
                total: notifications.length,
                unread: notifications.filter(n => !n.read).length,
                notifications: notifications.slice(0, 50), // Limit to 50
            });
        }
        catch (error) {
            console.error('Error fetching notifications:', error);
            return res.status(500).json({ error: 'Failed to fetch notifications' });
        }
    }
    // ==================== HELPER METHODS ====================
    getWeekNumber(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
        const week1 = new Date(d.getFullYear(), 0, 4);
        return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    }
    getStartOfWeek(year, week) {
        const d = new Date(year, 0, 1);
        d.setDate(d.getDate() + (week - 1) * 7);
        d.setDate(d.getDate() + (1 - d.getDay()));
        d.setHours(0, 0, 0, 0);
        return d;
    }
    async getExpiringProductsData() {
        const today = new Date();
        const expiryThreshold = new Date();
        expiryThreshold.setMonth(expiryThreshold.getMonth() + 2);
        const batches = await prisma.batch.findMany({
            where: {
                isActive: true,
                quantity: { gt: 0 },
                expiryDate: {
                    lte: expiryThreshold,
                    gte: today,
                },
            },
            include: {
                product: {
                    select: { id: true, name: true, code: true },
                },
            },
            orderBy: { expiryDate: 'asc' },
        });
        return batches.map(batch => ({
            ...batch,
            daysUntilExpiry: Math.ceil((new Date(batch.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
        }));
    }
    async getOutOfStockProductsData() {
        const products = await prisma.product.findMany({
            where: { isActive: true },
            include: {
                batches: {
                    where: { isActive: true, quantity: { gt: 0 } },
                    select: { quantity: true },
                },
            },
        });
        return products
            .map(product => ({
            ...product,
            totalStock: product.batches.reduce((sum, b) => sum + b.quantity, 0),
        }))
            .filter(p => p.totalStock === 0);
    }
    async getLowStockProductsData() {
        const products = await prisma.product.findMany({
            where: { isActive: true },
            include: {
                batches: {
                    where: { isActive: true, quantity: { gt: 0 } },
                    select: { quantity: true },
                },
            },
        });
        return products
            .map(product => ({
            ...product,
            totalStock: product.batches.reduce((sum, b) => sum + b.quantity, 0),
            reorderLevel: product.reorderLevel || 0,
        }))
            .filter(p => p.totalStock > 0 && p.totalStock <= p.reorderLevel);
    }
}
exports.ReportController = ReportController;
//# sourceMappingURL=report.controller.js.map