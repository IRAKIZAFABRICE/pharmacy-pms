export declare class BackendManager {
    private process;
    private isStarting;
    start(): Promise<void>;
    private ensureDatabaseExists;
    private checkPgPort;
    isRunning(): Promise<boolean>;
    private getBackendPaths;
    private startBackendProcess;
    stop(): Promise<void>;
}
export declare const backendManager: BackendManager;
//# sourceMappingURL=backend-manager.d.ts.map