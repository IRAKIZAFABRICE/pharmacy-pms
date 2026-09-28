"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.backendManager = exports.BackendManager = void 0;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const net_1 = __importDefault(require("net"));
const electron_1 = require("electron");
const pg_manager_1 = require("./pg-manager");
function killProcessOnPort(port) {
    try {
        // Windows: find PID using port and kill it. No shell: true needed
        const result = (0, child_process_1.execSync)(`netstat -ano | find ":${port}" | find "LISTENING"`, { encoding: 'utf8' });
        const lines = result.split('\n').filter(l => l.trim());
        for (const line of lines) {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && !isNaN(Number(pid))) {
                (0, child_process_1.execSync)(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
            }
        }
    }
    catch (e) {
        // port is free or no process found
    }
}
function killAllNode() {
    try {
        (0, child_process_1.execSync)(`taskkill /F /IM node.exe /T`, { stdio: 'ignore' });
    }
    catch { }
}
class BackendManager {
    process = null;
    isStarting = false;
    async start() {
        if (this.isStarting)
            return;
        this.isStarting = true;
        try {
            console.log('[Backend] Checking for zombie on port 3001...');
            killProcessOnPort(3001);
            await new Promise(r => setTimeout(r, 1500)); // wait for OS to release port
            if (await this.isRunning()) {
                console.log('[Backend] Already running');
                return;
            }
            console.log('[Backend] Waiting for PostgreSQL...');
            await pg_manager_1.pgManager.waitForReady();
            const targetPort = electron_1.app.isPackaged ? 15555 : 5432;
            const isPgUp = await this.checkPgPort(targetPort);
            if (!isPgUp)
                throw new Error(`PostgreSQL failed to start on port ${targetPort}`);
            await this.ensureDatabaseExists();
            await this.startBackendProcess();
        }
        catch (error) {
            electron_1.dialog.showErrorBox('Startup Failed', error.message);
            electron_1.app.quit();
        }
        finally {
            this.isStarting = false;
        }
    }
    async ensureDatabaseExists() {
        const dbName = electron_1.app.isPackaged ? 'pharmacy_prod' : 'pharmacy_dev';
        const pg = require('pg');
        const client = new pg.Client({
            host: 'localhost',
            port: electron_1.app.isPackaged ? 15555 : 5432,
            user: 'postgres',
            password: electron_1.app.isPackaged ? 'Admin@123' : 'postgres',
            database: 'postgres'
        });
        try {
            await client.connect();
            const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
            if (res.rowCount === 0) {
                console.log(`[Backend] Creating database: ${dbName}`);
                await client.query(`CREATE DATABASE "${dbName}"`);
            }
        }
        finally {
            await client.end();
        }
    }
    async checkPgPort(port) {
        const pg = require('pg');
        const client = new pg.Client({
            host: 'localhost',
            port,
            user: 'postgres',
            password: electron_1.app.isPackaged ? 'Admin@123' : 'postgres',
            database: 'postgres',
            connectionTimeoutMillis: 1000
        });
        try {
            await client.connect();
            await client.end();
            return true;
        }
        catch {
            return false;
        }
    }
    async isRunning() {
        return new Promise((resolve) => {
            const req = net_1.default.createConnection({ port: 3001, host: 'localhost' });
            req.once('connect', () => {
                req.end();
                resolve(true);
            });
            req.once('error', () => {
                resolve(false);
            });
        });
    }
    getBackendPaths() {
        if (!electron_1.app.isPackaged) {
            const backendDir = path_1.default.join(__dirname, '..', '..', 'backend');
            return {
                backendPath: path_1.default.join(backendDir, 'dist', 'index.js'),
                nodeModulesPath: path_1.default.join(backendDir, 'node_modules'),
                backendDir
            };
        }
        else {
            const backendDir = path_1.default.join(process.resourcesPath, 'backend');
            return {
                backendPath: path_1.default.join(backendDir, 'dist', 'index.js'),
                nodeModulesPath: path_1.default.join(backendDir, 'node_modules'),
                backendDir
            };
        }
    }
    async startBackendProcess() {
        return new Promise((resolve, reject) => {
            const { backendPath, nodeModulesPath } = this.getBackendPaths();
            const dbName = electron_1.app.isPackaged ? 'pharmacy_prod' : 'pharmacy_dev';
            if (electron_1.app.isPackaged) {
                module.paths.unshift(nodeModulesPath);
            }
            const env = {
                ...process.env,
                DATABASE_URL: `postgresql://postgres:Admin@123@localhost:15555/${dbName}`,
                PORT: '3001',
                NODE_ENV: electron_1.app.isPackaged ? 'production' : 'development',
                NODE_PATH: nodeModulesPath,
            };
            console.log(`[Backend] Starting with DB: ${dbName}`);
            const nodePath = process.execPath;
            // FIX: No shell, no detached. This lets electron kill it on quit
            this.process = (0, child_process_1.spawn)(nodePath, [backendPath], {
                env,
                windowsHide: true,
                cwd: path_1.default.dirname(backendPath),
            });
            let resolved = false;
            this.process.stdout?.on('data', (data) => {
                const str = data.toString();
                console.log(`[Backend] ${str}`);
                if (!resolved && str.includes('3001')) {
                    resolved = true;
                    resolve();
                }
            });
            this.process.stderr?.on('data', (data) => console.error(`[Backend ERR] ${data}`));
            this.process.on('error', (err) => reject(err));
            this.process.on('exit', (code) => {
                if (!resolved)
                    reject(new Error(`Backend exited with code ${code}`));
            });
            setTimeout(() => { if (!resolved)
                resolve(); }, 5000); // fallback
        });
    }
    async stop() {
        if (this.process) {
            console.log('[Backend] Stopping...');
            this.process.kill('SIGTERM');
            this.process = null;
        }
        killAllNode(); // cleanup zombies on quit
    }
}
exports.BackendManager = BackendManager;
exports.backendManager = new BackendManager();
//# sourceMappingURL=backend-manager.js.map