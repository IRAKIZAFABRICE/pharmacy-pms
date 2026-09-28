export interface PGConfig {
    dataDir: string;
    port: number;
    binariesDir: string;
    password: string;
    database: string;
    username: string;
    databaseOwner: string;
}
export declare class PGManager {
    private process;
    private config;
    private isStarting;
    private isReady;
    private startPromise;
    private readyCallbacks;
    constructor();
    getBinPath(tool: string): string;
    getConfig(): PGConfig;
    private logToFile;
    /**
     * Cleans up stale lock files
     */
    private cleanStaleLockFiles;
    init(): Promise<void>;
    private updateConfigFiles;
    /**
     * Starts PostgreSQL in the background - returns immediately
     * App opens first, database connects in the background
     */
    startBackground(): Promise<void>;
    /**
     * Wait for PostgreSQL to be ready (called by backend when needed)
     */
    waitForReady(): Promise<void>;
    private doStart;
    /**
     * Starts PostgreSQL using spawn with Windows path handling
     */
    private startPostgresWithoutLog;
    /**
     * Fast wait for PostgreSQL to be ready (max 20 seconds)
     */
    private waitForPostgresReady;
    private setupDatabase;
    stop(): Promise<void>;
    isRunning(): boolean;
    getConnectionString(): string;
    private copyDirectoryRecursive;
}
export declare const pgManager: PGManager;
//# sourceMappingURL=pg-manager.d.ts.map