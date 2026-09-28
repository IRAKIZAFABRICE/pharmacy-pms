// packages/backend/src/routes/sync.routes.ts
// REST API endpoints for offline-first data sync

import { Router, Request, Response } from 'express';
import { pushChanges, pullChanges, registerDevice, SyncPushRequest, SyncPullRequest } from '../services/sync.service';

const router = Router();

/**
 * POST /api/sync/push
 * Push local changes from a device to the central server.
 */
router.post('/push', async (req: Request, res: Response) => {
  try {
    const pushRequest: SyncPushRequest = req.body;

    if (!pushRequest.deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    if (!pushRequest.changes || !Array.isArray(pushRequest.changes)) {
      return res.status(400).json({ error: 'changes array is required' });
    }

    const result = await pushChanges(pushRequest);

    res.json({
      success: true,
      accepted: result.accepted,
      conflicts: result.conflicts,
      serverTime: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[Sync Push Error]', err.message);
    res.status(500).json({ error: 'Sync push failed', details: err.message });
  }
});

/**
 * GET /api/sync/pull?deviceId=xxx&lastSyncedAt=2024-01-01T00:00:00Z
 * Pull changes from the central server since last sync.
 */
router.get('/pull', async (req: Request, res: Response) => {
  try {
    const { deviceId, lastSyncedAt } = req.query;

    if (!deviceId || typeof deviceId !== 'string') {
      return res.status(400).json({ error: 'deviceId query parameter is required' });
    }

    const pullRequest: SyncPullRequest = {
      deviceId,
      lastSyncedAt: (lastSyncedAt as string) || new Date(0).toISOString(),
    };

    const result = await pullChanges(pullRequest);

    res.json({
      success: true,
      changes: result.changes,
      serverTime: result.serverTime,
      count: result.changes.length,
    });
  } catch (err: any) {
    console.error('[Sync Pull Error]', err.message);
    res.status(500).json({ error: 'Sync pull failed', details: err.message });
  }
});

/**
 * POST /api/sync/register
 * Register a new device with the central server.
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { deviceId, deviceName } = req.body;

    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    await registerDevice(deviceId, deviceName || 'Unknown Device');

    res.json({
      success: true,
      deviceId,
      registeredAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('[Sync Register Error]', err.message);
    res.status(500).json({ error: 'Device registration failed', details: err.message });
  }
});

/**
 * GET /api/sync/status
 * Health check for sync service.
 */
router.get('/status', (_req: Request, res: Response) => {
  res.json({
    service: 'Sync Service',
    status: 'online',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

export default router;
