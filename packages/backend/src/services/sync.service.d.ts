export interface SyncPushRequest {
    deviceId: string;
    lastSyncedAt?: string;
    changes: SyncChange[];
}
export interface SyncChange {
    model: string;
    action: 'CREATED' | 'UPDATED' | 'DELETED';
    record: any;
    version: number;
}
export interface SyncPullRequest {
    deviceId: string;
    lastSyncedAt: string;
}
export interface SyncPullResponse {
    changes: SyncChange[];
    serverTime: string;
}
/**
 * Push local changes to the central server.
 * Uses last-write-wins conflict resolution based on syncVersion.
 */
export declare function pushChanges(request: SyncPushRequest): Promise<{
    accepted: number;
    conflicts: number;
}>;
/**
 * Pull changes from the central server since last sync.
 */
export declare function pullChanges(request: SyncPullRequest): Promise<SyncPullResponse>;
/**
 * Get device registration info for a new device.
 * Uses camelCase column names matching Prisma schema field names.
 */
export declare function registerDevice(deviceId: string, deviceName: string): Promise<unknown>;
//# sourceMappingURL=sync.service.d.ts.map