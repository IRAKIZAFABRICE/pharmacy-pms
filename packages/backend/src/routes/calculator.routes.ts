// packages/backend/src/routes/calculator.routes.ts
import { Router } from 'express';
import { CalculatorController } from '../controllers/calculator.controller';
import { authorize } from '../middleware/auth.middleware';

const router = Router();
const controller = new CalculatorController();

// Dose calculations
router.post('/dose', authorize('ADMIN', 'OWNER', 'PHARMACIST', 'NURSE'), controller.calculateDose.bind(controller));
router.get('/dose/history', controller.getDoseHistory.bind(controller));

// BMI
router.post('/bmi', authorize('ADMIN', 'OWNER', 'PHARMACIST', 'NURSE'), controller.calculateBMI.bind(controller));

// Patient records (monitoring)
router.get('/patient-records', controller.getPatientRecords.bind(controller));
router.post('/patient-records', authorize('ADMIN', 'OWNER', 'PHARMACIST', 'NURSE'), controller.createPatientRecord.bind(controller));

// Device records (temperature/humidity)
router.get('/device-records', controller.getDeviceRecords.bind(controller));
router.post('/device-records', authorize('ADMIN', 'OWNER', 'PHARMACIST'), controller.createDeviceRecord.bind(controller));

export default router;