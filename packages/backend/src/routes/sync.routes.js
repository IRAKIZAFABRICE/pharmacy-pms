"use strict";
// packages/backend/src/routes/sync.routes.ts
// REST API endpoints for offline-first data sync
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sync_service_1 = require("../services/sync.service");
const router = (0, express_1.Router)();
/**
 * POST /api/sync/push
 * Push local changes from a device to the central server.
 */
router.post('/push', async (req, res) => {
    try {
        const pushRequest = req.body;
        if (!pushRequest.deviceId) {
            return res.status(400).json({ error: 'deviceId is required' });
        }
        if (!pushRequest.changes || !Array.isArray(pushRequest.changes)) {
            return res.status(400).json({ error: 'changes array is required' });
        }
        const result = await (0, sync_service_1.pushChanges)(pushRequest);
        res.json({
            success: true,
            accepted: result.accepted,
            conflicts: result.conflicts,
            serverTime: new Date().toISOString(),
        });
    }
    catch (err) {
        console.error('[Sync Push Error]', err.message);
        res.status(500).json({ error: 'Sync push failed', details: err.message });
    }
});
/**
 * GET /api/sync/pull?deviceId=xxx&lastSyncedAt=2024-01-01T00:00:00Z
 * Pull changes from the central server since last sync.
 */
router.get('/pull', async (req, res) => {
    try {
        const { deviceId, lastSyncedAt } = req.query;
        if (!deviceId || typeof deviceId !== 'string') {
            return res.status(400).json({ error: 'deviceId query parameter is required' });
        }
        const pullRequest = {
            deviceId,
            lastSyncedAt: lastSyncedAt || new Date(0).toISOString(),
        };
        const result = await (0, sync_service_1.pullChanges)(pullRequest);
        res.json({
            success: true,
            changes: result.changes,
            serverTime: result.serverTime,
            count: result.changes.length,
        });
    }
    catch (err) {
        console.error('[Sync Pull Error]', err.message);
        res.status(500).json({ error: 'Sync pull failed', details: err.message });
    }
});
/**
 * POST /api/sync/register
 * Register a new device with the central server.
 */
router.post('/register', async (req, res) => {
    try {
        const { deviceId, deviceName } = req.body;
        if (!deviceId) {
            return res.status(400).json({ error: 'deviceId is required' });
        }
        await (0, sync_service_1.registerDevice)(deviceId, deviceName || 'Unknown Device');
        res.json({
            success: true,
            deviceId,
            registeredAt: new Date().toISOString(),
        });
    }
    catch (err) {
        console.error('[Sync Register Error]', err.message);
        res.status(500).json({ error: 'Device registration failed', details: err.message });
    }
});
/**
 * GET /api/sync/status
 * Health check for sync service.
 */
router.get('/status', (_req, res) => {
    res.json({
        service: 'Sync Service',
        status: 'online',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
    });
});
exports.default = router;
//# sourceMappingURL=sync.routes.js.map