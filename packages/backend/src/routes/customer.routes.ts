// packages/backend/src/routes/customer.routes.ts
import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller';
import { authorize } from '../middleware/auth.middleware';

const router = Router();
const controller = new CustomerController();

// Customers CRUD
router.get('/', controller.getAll.bind(controller));
router.get('/:id', controller.getById.bind(controller));
router.post('/', authorize('ADMIN', 'OWNER', 'PHARMACIST'), controller.create.bind(controller));
router.put('/:id', authorize('ADMIN', 'OWNER', 'PHARMACIST'), controller.update.bind(controller));
router.delete('/:id', authorize('ADMIN'), controller.delete.bind(controller));

// Customer Accounts (Debit/Credit)
router.get('/:customerId/account', controller.getAccount.bind(controller));
router.post('/:customerId/transactions', authorize('ADMIN', 'OWNER', 'ACCOUNTANT'), controller.addTransaction.bind(controller));

// Delivery Schedules
router.get('/:customerId/deliveries', controller.getDeliveries.bind(controller));
router.post('/:customerId/deliveries', authorize('ADMIN', 'OWNER', 'PHARMACIST'), controller.createDelivery.bind(controller));
router.put('/deliveries/:id/status', authorize('ADMIN', 'OWNER', 'PHARMACIST'), controller.updateDeliveryStatus.bind(controller));

export default router;