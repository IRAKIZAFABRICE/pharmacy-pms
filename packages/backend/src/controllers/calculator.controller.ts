// packages/backend/src/controllers/calculator.controller.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

// Standard weight-based dosing references (mg/kg)
const DOSE_REFERENCE: Record<string, { dosePerKg: number; unit: string; notes: string }> = {
  'AMOXICLAV': { dosePerKg: 25, unit: 'mg/kg', notes: 'Every 8 hours (amoxicillin component). Max 500mg/dose.' },
  'AMOXICILLIN': { dosePerKg: 15, unit: 'mg/kg', notes: 'Every 8 hours. Max 500mg/dose.' },
  'BACTRIM': { dosePerKg: 4, unit: 'mg/kg', notes: 'Every 12 hours (trimethoprim component).' },
  'ARTEMETHER': { dosePerKg: 1.6, unit: 'mg/kg', notes: 'Day 1 then daily for 3 days. Antimalarial.' },
  'PARACETAMOL': { dosePerKg: 15, unit: 'mg/kg', notes: 'Every 4-6 hours. Max 4g/day.' },
  'IBUPROFEN': { dosePerKg: 10, unit: 'mg/kg', notes: 'Every 6-8 hours. Max 400mg/dose.' }
};

export class CalculatorController {
  async calculateDose(req: AuthRequest, res: Response) {
    try {
      const { patientName, patientAge, patientWeight, medication, frequency, duration, notes } = req.body;
      if (!medication) return res.status(400).json({ error: 'Medication is required' });

      const ref = DOSE_REFERENCE[medication.toUpperCase()];
      if (!ref) return res.status(400).json({ error: `No dosing reference found for ${medication}` });
      if (!patientWeight && ref.dosePerKg > 0) return res.status(400).json({ error: 'Patient weight is required' });

      const calculated = ref.dosePerKg > 0 ? ref.dosePerKg * (patientWeight || 0) : ref.dosePerKg;

      const result = await prisma.doseCalculation.create({
        data: {
          patientName: patientName || 'Unknown',
          patientAge: patientAge ? parseInt(patientAge) : null,
          patientWeight: patientWeight ? parseFloat(patientWeight) : null,
          medication: medication.toUpperCase(),
          dosePerKg: ref.dosePerKg,
          calculatedDose: Math.round(calculated * 100) / 100,
          unit: ref.unit,
          frequency: frequency || undefined,
          duration: duration || undefined,
          notes: notes || ref.notes,
          calculatedBy: req.user?.id,
        },
      });

      return res.json({ message: 'Dose calculated', data: result, reference: ref.notes });
    } catch (error) {
      console.error('Calculate dose error:', error);
      return res.status(500).json({ error: 'Failed to calculate dose' });
    }
  }

  async getDoseHistory(req: Request, res: Response) {
    try {
      const calculations = await prisma.doseCalculation.findMany({
        where: { isDeleted: false },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
      return res.json({ data: calculations });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch dose history' });
    }
  }

  async calculateBMI(req: AuthRequest, res: Response) {
    try {
      const { patientName, patientHeight, patientWeight, customerId, notes } = req.body;
      if (!patientHeight || !patientWeight) {
        return res.status(400).json({ error: 'Height (cm) and weight (kg) are required' });
      }

      const heightM = parseFloat(patientHeight) / 100;
      const weightKg = parseFloat(patientWeight);
      const bmi = weightKg / (heightM * heightM);

      let category = 'Normal';
      if (bmi < 18.5) category = 'Underweight';
      else if (bmi < 25) category = 'Normal';
      else if (bmi < 30) category = 'Overweight';
      else if (bmi < 35) category = 'Obese Class I';
      else if (bmi < 40) category = 'Obese Class II';
      else category = 'Obese Class III';

      const record = await prisma.patientRecord.create({
        data: {
          customerId: customerId || null,
          patientName: patientName || 'Unknown',
          patientWeight: weightKg,
          patientHeight: parseFloat(patientHeight),
          recordType: 'BMI',
          value: Math.round(bmi * 10) / 10,
          unit: 'kg/m²',
          notes: notes || `BMI Category: ${category}`,
          recordedBy: req.user?.id,
        },
      });

      return res.json({ message: 'BMI calculated', data: record, bmi: Math.round(bmi * 10) / 10, category });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to calculate BMI' });
    }
  }

  async createPatientRecord(req: AuthRequest, res: Response) {
    try {
      const { customerId, patientName, patientAge, patientWeight, patientHeight, recordType, value, unit, notes } = req.body;
      if (!recordType || !value) return res.status(400).json({ error: 'Record type and value are required' });

      const record = await prisma.patientRecord.create({
        data: {
          customerId: customerId || null,
          patientName: patientName || 'Unknown',
          patientAge: patientAge ? parseInt(patientAge) : null,
          patientWeight: patientWeight ? parseFloat(patientWeight) : null,
          patientHeight: patientHeight ? parseFloat(patientHeight) : null,
          recordType,
          value: parseFloat(value),
          unit: unit || '',
          notes,
          recordedBy: req.user?.id,
        },
      });

      return res.status(201).json({ message: 'Record created', data: record });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to create record' });
    }
  }

  async getPatientRecords(req: Request, res: Response) {
    try {
      const { customerId, recordType } = req.query;
      const where: any = { isDeleted: false };
      if (customerId) where.customerId = String(customerId);
      if (recordType) where.recordType = String(recordType);

      const records = await prisma.patientRecord.findMany({
        where,
        include: { customer: true },
        orderBy: { recordedAt: 'desc' },
        take: 100,
      });
      return res.json({ data: records });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch records' });
    }
  }

  async createDeviceRecord(req: AuthRequest, res: Response) {
    try {
      const { deviceName, deviceType, temperature, humidity, location, notes } = req.body;
      if (!deviceName || !deviceType) return res.status(400).json({ error: 'Device name and type are required' });
      if (temperature === undefined && humidity === undefined) {
        return res.status(400).json({ error: 'Temperature or humidity reading required' });
      }

      const record = await prisma.deviceRecord.create({
        data: {
          deviceName,
          deviceType,
          temperature: temperature !== undefined ? parseFloat(temperature) : null,
          humidity: humidity !== undefined ? parseFloat(humidity) : null,
          location,
          notes,
          recordedBy: req.user?.id,
        },
      });

      return res.status(201).json({ message: 'Device record created', data: record });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to create device record' });
    }
  }

  async getDeviceRecords(req: Request, res: Response) {
    try {
      const { deviceName } = req.query;
      const where: any = {};
      if (deviceName) where.deviceName = String(deviceName);

      const records = await prisma.deviceRecord.findMany({
        where,
        orderBy: { readingTime: 'desc' },
        take: 100,
      });
      return res.json({ data: records });
    } catch (error) {
      return res.status(500).json({ error: 'Failed to fetch device records' });
    }
  }
}