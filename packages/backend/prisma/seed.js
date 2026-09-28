"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// packages/backend/prisma/seed.ts
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Seeding database...');
    // ==================== USERS ====================
    console.log('📝 Creating users...');
    const users = [
        {
            email: 'admin@pharmacy.com',
            password: 'Admin@2024',
            firstName: 'System',
            lastName: 'Administrator',
            role: 'ADMIN',
            phone: '+250788000000'
        },
        {
            email: 'owner@pharmacy.com',
            password: 'Owner@2024',
            firstName: 'Pharmacy',
            lastName: 'Owner',
            role: 'OWNER',
            phone: '+250788111111'
        },
        {
            email: 'pharmacist@pharmacy.com',
            password: 'Pharma@2024',
            firstName: 'John',
            lastName: 'Pharmacist',
            role: 'PHARMACIST',
            phone: '+250788222222'
        },
        {
            email: 'nurse@pharmacy.com',
            password: 'Nurse@2024',
            firstName: 'Jane',
            lastName: 'Nurse',
            role: 'NURSE',
            phone: '+250788333333'
        },
        {
            email: 'accountant@pharmacy.com',
            password: 'Account@2024',
            firstName: 'Robert',
            lastName: 'Accountant',
            role: 'ACCOUNTANT',
            phone: '+250788444444'
        },
    ];
    for (const userData of users) {
        const hashedPassword = await bcryptjs_1.default.hash(userData.password, 10);
        await prisma.user.upsert({
            where: { email: userData.email },
            update: {},
            create: {
                email: userData.email,
                passwordHash: hashedPassword,
                firstName: userData.firstName,
                lastName: userData.lastName,
                phone: userData.phone,
                role: userData.role,
                isActive: true,
            },
        });
    }
    console.log('✅ 5 users created');
    // ==================== SUPPLIERS ====================
    console.log('📝 Creating suppliers...');
    const supplier1 = await prisma.supplier.upsert({
        where: { code: 'SUP001' },
        update: {},
        create: {
            code: 'SUP001',
            name: 'Rwanda Medical Supply',
            tin: '1000123456',
            phone: '+250788111111',
            email: 'info@rms.rw',
            address: 'KG 123 St, Kigali',
            contactPerson: 'Jean Pierre',
            isActive: true,
        },
    });
    const supplier2 = await prisma.supplier.upsert({
        where: { code: 'SUP002' },
        update: {},
        create: {
            code: 'SUP002',
            name: 'East African Pharmaceuticals',
            tin: '1000789012',
            phone: '+250788222222',
            email: 'info@eap.rw',
            address: 'KN 456 Ave, Kigali',
            contactPerson: 'Marie Claire',
            isActive: true,
        },
    });
    console.log('✅ 2 suppliers created');
    // ==================== INSURANCE COMPANIES ====================
    console.log('📝 Creating insurance companies...');
    const rssb = await prisma.insuranceCompany.upsert({
        where: { code: 'RSSB' },
        update: {},
        create: {
            code: 'RSSB',
            name: 'Rwanda Social Security Board',
            description: 'Government health insurance scheme',
            coveragePercentage: 80.0,
            isActive: true,
        },
    });
    await prisma.insuranceCompany.upsert({
        where: { code: 'SORAS' },
        update: {},
        create: {
            code: 'SORAS',
            name: 'SORAS Insurance',
            description: 'Private health insurance',
            coveragePercentage: 75.0,
            maxCoverageAmount: 500000,
            isActive: true,
        },
    });
    console.log('✅ 2 insurance companies created');
    // ==================== PRODUCTS ====================
    console.log('📝 Creating products...');
    const product1 = await prisma.product.upsert({
        where: { code: 'PARA-500' },
        update: {},
        create: {
            code: 'PARA-500',
            name: 'Paracetamol 500mg',
            category: 'Analgesics',
            subCategory: 'Pain Relief',
            description: 'Pain reliever and fever reducer',
            isPrescription: false,
            isControlled: false,
            unitOfMeasure: 'Tablet',
            reorderLevel: 50,
            taxRate: 0,
            isActive: true,
        },
    });
    const product2 = await prisma.product.upsert({
        where: { code: 'AMOX-500' },
        update: {},
        create: {
            code: 'AMOX-500',
            name: 'Amoxicillin 500mg',
            category: 'Antibiotics',
            subCategory: 'Penicillins',
            description: 'Broad-spectrum antibiotic',
            isPrescription: true,
            isControlled: false,
            unitOfMeasure: 'Capsule',
            reorderLevel: 30,
            taxRate: 0,
            isActive: true,
        },
    });
    const product3 = await prisma.product.upsert({
        where: { code: 'ART-20' },
        update: {},
        create: {
            code: 'ART-20',
            name: 'Artemether 20mg',
            category: 'Antimalarials',
            subCategory: 'Artemisinin derivatives',
            description: 'Antimalarial medication',
            isPrescription: true,
            isControlled: true,
            unitOfMeasure: 'Tablet',
            reorderLevel: 40,
            taxRate: 0,
            isActive: true,
        },
    });
    const product4 = await prisma.product.upsert({
        where: { code: 'IBU-400' },
        update: {},
        create: {
            code: 'IBU-400',
            name: 'Ibuprofen 400mg',
            category: 'NSAIDs',
            subCategory: 'Pain Relief',
            description: 'Anti-inflammatory pain reliever',
            isPrescription: false,
            isControlled: false,
            unitOfMeasure: 'Tablet',
            reorderLevel: 60,
            taxRate: 0,
            isActive: true,
        },
    });
    const product5 = await prisma.product.upsert({
        where: { code: 'MET-500' },
        update: {},
        create: {
            code: 'MET-500',
            name: 'Metformin 500mg',
            category: 'Antidiabetics',
            subCategory: 'Biguanides',
            description: 'Blood sugar control medication',
            isPrescription: true,
            isControlled: false,
            unitOfMeasure: 'Tablet',
            reorderLevel: 45,
            taxRate: 0,
            isActive: true,
        },
    });
    console.log('✅ 5 products created');
    // ==================== BATCHES ====================
    console.log('📝 Creating inventory batches...');
    // ✅ Use upsert for batches to avoid unique constraint errors
    await prisma.batch.upsert({
        where: {
            batchNumber_productId: {
                batchNumber: 'PARA-2024-001',
                productId: product1.id,
            },
        },
        update: {},
        create: {
            batchNumber: 'PARA-2024-001',
            productId: product1.id,
            supplierId: supplier1.id,
            quantity: 200,
            initialQuantity: 200,
            costPrice: 50,
            sellingPrice: 75,
            containerSize: 1,
            expiryDate: new Date('2025-12-31'),
            dateReceived: new Date('2024-01-15'),
            isConfirmed: true,
        },
    });
    await prisma.batch.upsert({
        where: {
            batchNumber_productId: {
                batchNumber: 'AMOX-2024-001',
                productId: product2.id,
            },
        },
        update: {},
        create: {
            batchNumber: 'AMOX-2024-001',
            productId: product2.id,
            supplierId: supplier1.id,
            quantity: 150,
            initialQuantity: 150,
            costPrice: 200,
            sellingPrice: 300,
            containerSize: 1,
            expiryDate: new Date('2025-06-30'),
            dateReceived: new Date('2024-02-01'),
            isConfirmed: true,
        },
    });
    await prisma.batch.upsert({
        where: {
            batchNumber_productId: {
                batchNumber: 'ART-2024-001',
                productId: product3.id,
            },
        },
        update: {},
        create: {
            batchNumber: 'ART-2024-001',
            productId: product3.id,
            supplierId: supplier2.id,
            quantity: 100,
            initialQuantity: 100,
            costPrice: 300,
            sellingPrice: 450,
            containerSize: 1,
            expiryDate: new Date('2025-03-15'),
            dateReceived: new Date('2024-01-20'),
            isConfirmed: true,
        },
    });
    await prisma.batch.upsert({
        where: {
            batchNumber_productId: {
                batchNumber: 'IBU-2024-001',
                productId: product4.id,
            },
        },
        update: {},
        create: {
            batchNumber: 'IBU-2024-001',
            productId: product4.id,
            supplierId: supplier2.id,
            quantity: 180,
            initialQuantity: 180,
            costPrice: 80,
            sellingPrice: 120,
            containerSize: 1,
            expiryDate: new Date('2025-08-20'),
            dateReceived: new Date('2024-01-25'),
            isConfirmed: true,
        },
    });
    await prisma.batch.upsert({
        where: {
            batchNumber_productId: {
                batchNumber: 'MET-2024-001',
                productId: product5.id,
            },
        },
        update: {},
        create: {
            batchNumber: 'MET-2024-001',
            productId: product5.id,
            supplierId: supplier1.id,
            quantity: 120,
            initialQuantity: 120,
            costPrice: 150,
            sellingPrice: 225,
            containerSize: 1,
            expiryDate: new Date('2025-09-10'),
            dateReceived: new Date('2024-02-05'),
            isConfirmed: true,
        },
    });
    console.log('✅ 5 inventory batches created');
    // ==================== INSURANCE COVERAGE ====================
    console.log('📝 Creating insurance coverage rules...');
    await prisma.insuranceCoverageRule.create({
        data: {
            insuranceCompanyId: rssb.id,
            coveragePercentage: 80.0,
            isActive: true,
        },
    });
    console.log('✅ Insurance coverage rules created');
    console.log('🎉 Seeding completed successfully!');
    console.log('📋 Default login credentials:');
    console.log('   👑 Admin: admin@pharmacy.com / Admin@2024');
    console.log('   ⭐ Owner: owner@pharmacy.com / Owner@2024');
    console.log('   💊 Pharmacist: pharmacist@pharmacy.com / Pharma@2024');
    console.log('   🩺 Nurse: nurse@pharmacy.com / Nurse@2024');
    console.log('   💰 Accountant: accountant@pharmacy.com / Account@2024');
}
main()
    .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map