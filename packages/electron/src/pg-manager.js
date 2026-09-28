"use strict";
// packages/electron/src/pg-manager.ts
// Manages embedded PostgreSQL 18.4 lifecycle for the Pharmacy PMS Electron app
// Starts PostgreSQL in the background so the app opens immediately
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pgManager = exports.PGManager = void 0;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const child_process_1 = require("child_process");
/**
 * Derives a safe PostgreSQL identifier from a Windows username.
 * Replaces special chars, lowercases, max 63 chars.
 */
function sanitizeDbIdentifier(username) {
    return username
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .slice(0, 63);
}
class PGManager {
    process = null;
    config;
    isStarting = false;
    isReady = false;
    startPromise = null;
    readyCallbacks = [];
    constructor() {
        const appDataDir = path_1.default.join(electron_1.app.getPath('appData'), 'pharmacy-pms');
        const dataDir = path_1.default.join(appDataDir, 'pgdata');
        let binariesDir;
        if (electron_1.app.isPackaged) {
            binariesDir = path_1.default.join(process.resourcesPath, 'pgsql', 'bin');
        }
        else {
            binariesDir = path_1.default.join(electron_1.app.getAppPath(), '..', '..', 'postgresql-18.4-2-windows-x64-binaries', 'pgsql', 'bin');
        }
        const windowsUser = process.env.USERNAME || 'default';
        const safeUser = sanitizeDbIdentifier(windowsUser);
        this.config = {
            dataDir,
            port: 15555,
            binariesDir,
            password: 'Admin@123',
            database: `pharmacy_db_${safeUser}`,
            username: 'postgres',
            databaseOwner: safeUser,
        };
    }
    getBinPath(tool) {
        return path_1.default.join(this.config.binariesDir, `${tool}.exe`);
    }
    getConfig() {
        return this.config;
    }
    logToFile(message) {
        try {
            const logPath = path_1.default.join(this.config.dataDir, 'pg_manager.log');
            const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
            fs_1.default.appendFileSync(logPath, `[${timestamp}] ${message}\n`, 'utf-8');
        }
        catch {
            // ignore
        }
    }
    /**
     * Cleans up stale lock files
     */
    cleanStaleLockFiles() {
        const { dataDir } = this.config;
        const files = ['postmaster.pid', 'postmaster.opts'];
        for (const file of files) {
            const fp = path_1.default.join(dataDir, file);
            if (!fs_1.default.existsSync(fp))
                continue;
            try {
                const content = fs_1.default.readFileSync(fp, 'utf-8');
                const pid = parseInt(content.split('\n')[0], 10);
                let alive = false;
                try {
                    (0, child_process_1.execSync)(`tasklist /FI "PID eq ${pid}" /NH 2>nul | findstr /R "${pid}"`, {
                        stdio: 'pipe',
                        timeout: 1000,
                    });
                    alive = true;
                }
                catch {
                    alive = false;
                }
                if (!alive) {
                    fs_1.default.unlinkSync(fp);
                    console.log(`[PG-Manager] Removed stale ${file}`);
                }
                else {
                    console.log(`[PG-Manager] Killing active PID ${pid}`);
                    try {
                        (0, child_process_1.execSync)(`taskkill /F /PID ${pid}`, { stdio: 'pipe', timeout: 1000 });
                    }
                    catch { /* ignore */ }
                    fs_1.default.unlinkSync(fp);
                }
            }
            catch {
                // ignore malformed files
            }
        }
    }
    async init() {
        const { dataDir, binariesDir, port, username } = this.config;
        console.log(`[PG-Manager] Initializing PostgreSQL...`);
        console.log(`[PG-Manager]   Data dir: ${dataDir}`);
        console.log(`[PG-Manager]   Binaries: ${binariesDir}`);
        console.log(`[PG-Manager]   Port: ${port}`);
        this.logToFile(`init() — Data dir: ${dataDir}, Port: ${port}`);
        const parentDir = path_1.default.dirname(dataDir);
        if (!fs_1.default.existsSync(parentDir)) {
            fs_1.default.mkdirSync(parentDir, { recursive: true });
        }
        const pgHbaPath = path_1.default.join(dataDir, 'pg_hba.conf');
        if (fs_1.default.existsSync(pgHbaPath)) {
            console.log(`[PG-Manager] Data directory already initialized`);
            this.updateConfigFiles('trust');
            return;
        }
        const existingDataDir = 'C:\\pgdata\\18';
        let copiedExisting = false;
        if (fs_1.default.existsSync(path_1.default.join(existingDataDir, 'pg_hba.conf'))) {
            console.log(`[PG-Manager] Found existing data at ${existingDataDir}, copying...`);
            try {
                this.copyDirectoryRecursive(existingDataDir, dataDir);
                copiedExisting = true;
            }
            catch (err) {
                console.warn(`[PG-Manager] Could not copy existing data: ${err}.`);
                fs_1.default.mkdirSync(dataDir, { recursive: true });
            }
        }
        if (!copiedExisting) {
            if (!fs_1.default.existsSync(dataDir)) {
                fs_1.default.mkdirSync(dataDir, { recursive: true });
            }
            const initdbPath = this.getBinPath('initdb');
            try {
                (0, child_process_1.execSync)(`"${initdbPath}" -D "${dataDir}" --encoding=UTF8 --locale=en-US --username=${username} --auth=trust`, { stdio: ['pipe', 'pipe', 'pipe'], timeout: 60000 });
                console.log(`[PG-Manager] initdb completed`);
            }
            catch (err) {
                throw new Error(`initdb failed: ${err.stderr?.toString() || err.message}`);
            }
        }
        this.updateConfigFiles('trust');
        console.log(`[PG-Manager] init() complete`);
    }
    updateConfigFiles(hbaMode = 'trust') {
        const { dataDir, port } = this.config;
        const confPath = path_1.default.join(dataDir, 'postgresql.conf');
        const hbaPath = path_1.default.join(dataDir, 'pg_hba.conf');
        if (fs_1.default.existsSync(confPath)) {
            let conf = fs_1.default.readFileSync(confPath, 'utf-8');
            conf = conf.replace(/^#?port\s*=\s*\d+/m, `port = ${port}`);
            if (!conf.includes('port ='))
                conf += `\nport = ${port}`;
            conf = conf.replace(/^#?listen_addresses\s*=.*/m, `listen_addresses = '*'`);
            if (!conf.includes('listen_addresses'))
                conf += `\nlisten_addresses = '*'`;
            conf = conf.replace(/^#?logging_collector\s*=.*/m, `logging_collector = off`);
            if (!conf.includes('logging_collector'))
                conf += `\nlogging_collector = off`;
            conf = conf.replace(/^#?fsync\s*=.*/m, `fsync = off`);
            // Reduce recovery time for faster startup
            conf = conf.replace(/^#?checkpoint_timeout\s*=.*/m, `checkpoint_timeout = 5min`);
            if (!conf.includes('checkpoint_timeout'))
                conf += `\ncheckpoint_timeout = 5min`;
            fs_1.default.writeFileSync(confPath, conf, 'utf-8');
            console.log(`[PG-Manager] postgresql.conf optimized`);
        }
        if (fs_1.default.existsSync(hbaPath)) {
            let hba = fs_1.default.readFileSync(hbaPath, 'utf-8');
            if (hbaMode === 'md5') {
                hba = hba.replace(/^(local\s+all\s+all\s+)trust/m, '$1md5');
                hba = hba.replace(/^(host\s+all\s+all\s+127\.0\.0\.1\/32\s+)trust/m, '$1md5');
                hba = hba.replace(/^(host\s+all\s+all\s+::1\/128\s+)trust/m, '$1md5');
                console.log(`[PG-Manager] pg_hba.conf: md5 auth`);
            }
            else if (hbaMode === 'trust') {
                hba = hba.replace(/^(local\s+all\s+all\s+)md5/m, '$1trust');
                hba = hba.replace(/^(host\s+all\s+all\s+127\.0\.0\.1\/32\s+)md5/m, '$1trust');
                hba = hba.replace(/^(host\s+all\s+all\s+::1\/128\s+)md5/m, '$1trust');
                console.log(`[PG-Manager] pg_hba.conf: trust auth`);
            }
            fs_1.default.writeFileSync(hbaPath, hba, 'utf-8');
        }
    }
    /**
     * Starts PostgreSQL in the background - returns immediately
     * App opens first, database connects in the background
     */
    async startBackground() {
        // If already starting or running, return immediately
        if (this.isStarting || this.isReady) {
            return;
        }
        this.isStarting = true;
        // Start PostgreSQL in the background without waiting
        setImmediate(() => {
            this.doStart().catch((err) => {
                console.error('[PG-Manager] Background start failed:', err);
            });
        });
    }
    /**
     * Wait for PostgreSQL to be ready (called by backend when needed)
     */
    async waitForReady() {
        if (this.isReady) {
            return;
        }
        return new Promise((resolve) => {
            if (this.isReady) {
                resolve();
                return;
            }
            this.readyCallbacks.push(resolve);
        });
    }
    async doStart() {
        const { dataDir, port } = this.config;
        console.log(`[PG-Manager] Starting PostgreSQL in background on port ${port}...`);
        // Quick kill any orphaned postgres processes
        try {
            (0, child_process_1.execSync)('taskkill /F /IM postgres.exe 2>nul', { stdio: 'pipe', timeout: 2000 });
        }
        catch { /* ignore */ }
        // Clean stale PID files
        this.cleanStaleLockFiles();
        // Start PostgreSQL
        await this.startPostgresWithoutLog();
        // Wait for ready and setup database
        try {
            await this.waitForPostgresReady();
            await this.setupDatabase();
            this.isReady = true;
            console.log(`[PG-Manager] PostgreSQL is ready on port ${port}`);
            this.logToFile(`start() — Running on port ${port}`);
            // Notify all waiters
            for (const callback of this.readyCallbacks) {
                callback();
            }
            this.readyCallbacks = [];
        }
        catch (err) {
            console.error('[PG-Manager] PostgreSQL startup failed:', err);
            throw err;
        }
        finally {
            this.isStarting = false;
        }
    }
    /**
     * Starts PostgreSQL using spawn with Windows path handling
     */
    startPostgresWithoutLog() {
        return new Promise((resolve, reject) => {
            const { dataDir } = this.config;
            const pgCtlPath = this.getBinPath('pg_ctl');
            // Use spawn with shell: true for Windows compatibility
            const args = [
                '-D', dataDir,
                'start',
                '-o', '-c logging_collector=off -c log_destination=stderr -c fsync=off'
            ];
            console.log(`[PG-Manager] Starting PostgreSQL...`);
            this.process = (0, child_process_1.spawn)(pgCtlPath, args, {
                windowsHide: true,
                stdio: ['ignore', 'pipe', 'pipe'],
            });
            let output = '';
            let hasStarted = false;
            if (this.process.stdout) {
                this.process.stdout.on('data', (data) => {
                    const msg = data.toString();
                    output += msg;
                    if (msg.includes('server started') || msg.includes('LOG:')) {
                        hasStarted = true;
                    }
                });
            }
            if (this.process.stderr) {
                this.process.stderr.on('data', (data) => {
                    const msg = data.toString();
                    output += msg;
                    if (msg.includes('server started') || msg.includes('LOG:')) {
                        hasStarted = true;
                    }
                });
            }
            if (this.process) {
                this.process.on('error', (err) => {
                    reject(err);
                });
                this.process.on('close', (code) => {
                    if (output.includes('server is running') || output.includes('already running')) {
                        resolve();
                        return;
                    }
                    if (code === 0 || hasStarted || output.includes('server started')) {
                        resolve();
                        return;
                    }
                    reject(new Error(`Failed to start PostgreSQL: ${output.substring(0, 200)}`));
                });
            }
            // If PostgreSQL doesn't start within 10 seconds, check if it's running
            setTimeout(() => {
                if (this.process && !this.process.killed) {
                    if (this.isRunning()) {
                        console.log(`[PG-Manager] PostgreSQL is running`);
                        resolve();
                    }
                }
            }, 15000);
        });
    }
    /**
     * Fast wait for PostgreSQL to be ready (max 20 seconds)
     */
    async waitForPostgresReady() {
        const isReadyPath = this.getBinPath('pg_isready');
        const { port } = this.config;
        // Try pg_isready first
        for (let i = 0; i < 20; i++) {
            try {
                (0, child_process_1.execSync)(`"${isReadyPath}" -h localhost -p ${port} -q`, {
                    stdio: 'pipe',
                    timeout: 1000,
                });
                console.log(`[PG-Manager] PostgreSQL ready (${i}s)`);
                return;
            }
            catch {
                // not ready yet
                await new Promise((r) => setTimeout(r, 1000));
            }
        }
        // Fallback: try direct connection
        try {
            const psqlPath = this.getBinPath('psql');
            (0, child_process_1.execSync)(`"${psqlPath}" -h localhost -p ${port} -U postgres -c "SELECT 1"`, { stdio: 'pipe', timeout: 2000 });
            console.log(`[PG-Manager] PostgreSQL ready (fallback)`);
            return;
        }
        catch {
            // Still not ready
        }
        console.warn(`[PG-Manager] PostgreSQL may not be ready, continuing anyway...`);
    }
    async setupDatabase() {
        const { port, password, dataDir, database } = this.config;
        const psqlPath = this.getBinPath('psql');
        const pgCtlPath = this.getBinPath('pg_ctl');
        try {
            // Check if password is already set
            try {
                (0, child_process_1.execSync)(`set PGPASSWORD=${password} && "${psqlPath}" -h localhost -p ${port} -U postgres -c "SELECT 1"`, { stdio: 'pipe', timeout: 5000 });
                console.log(`[PG-Manager] Password already set`);
                // Check if database exists
                try {
                    (0, child_process_1.execSync)(`set PGPASSWORD=${password} && "${psqlPath}" -h localhost -p ${port} -U postgres -l | findstr "${database}"`, { stdio: 'pipe', timeout: 5000 });
                    console.log(`[PG-Manager] Database already exists`);
                    return;
                }
                catch {
                    // Database doesn't exist, create it
                    (0, child_process_1.execSync)(`set PGPASSWORD=${password} && "${psqlPath}" -h localhost -p ${port} -U postgres -c "CREATE DATABASE ${database}"`, { stdio: 'pipe', timeout: 10000 });
                    console.log(`[PG-Manager] Database created`);
                    return;
                }
            }
            catch {
                // Password not set, proceed with setup
            }
            // Set password
            (0, child_process_1.execSync)(`"${psqlPath}" -h localhost -p ${port} -U postgres -c "ALTER USER postgres WITH PASSWORD '${password}';"`, { stdio: 'pipe', timeout: 5000 });
            console.log(`[PG-Manager] Password set`);
            // Switch to md5 and reload
            this.updateConfigFiles('md5');
            (0, child_process_1.execSync)(`"${pgCtlPath}" -D "${dataDir}" reload`, { stdio: 'pipe', timeout: 5000 });
            console.log(`[PG-Manager] md5 auth active`);
            // Create database
            (0, child_process_1.execSync)(`set PGPASSWORD=${password} && "${psqlPath}" -h localhost -p ${port} -U postgres -c "CREATE DATABASE ${database}"`, { stdio: 'pipe', timeout: 10000 });
            console.log(`[PG-Manager] Database created`);
        }
        catch (err) {
            const stderr = err.stderr?.toString() || '';
            if (stderr.includes('already exists')) {
                console.log(`[PG-Manager] Database already exists`);
            }
            else {
                console.warn(`[PG-Manager] Setup warning: ${stderr || err.message}`);
            }
        }
    }
    async stop() {
        if (!this.process && !this.isRunning())
            return;
        const { dataDir } = this.config;
        const pgCtlPath = this.getBinPath('pg_ctl');
        try {
            (0, child_process_1.execSync)(`"${pgCtlPath}" -D "${dataDir}" stop -m fast`, {
                stdio: 'pipe',
                timeout: 5000,
            });
            console.log(`[PG-Manager] Stopped`);
        }
        catch (err) {
            console.warn(`[PG-Manager] Stop: ${err.stderr?.toString() || err.message}`);
        }
        this.process = null;
        this.isReady = false;
    }
    isRunning() {
        const isReadyPath = this.getBinPath('pg_isready');
        const { port } = this.config;
        try {
            (0, child_process_1.execSync)(`"${isReadyPath}" -h localhost -p ${port} -q`, {
                stdio: 'pipe',
                timeout: 1000,
            });
            return true;
        }
        catch {
            return false;
        }
    }
    getConnectionString() {
        const { port, database, password, username } = this.config;
        return `postgresql://${username}:${password}@localhost:${port}/${database}`;
    }
    copyDirectoryRecursive(src, dest) {
        if (!fs_1.default.existsSync(dest))
            fs_1.default.mkdirSync(dest, { recursive: true });
        for (const entry of fs_1.default.readdirSync(src, { withFileTypes: true })) {
            const s = path_1.default.join(src, entry.name);
            const d = path_1.default.join(dest, entry.name);
            if (entry.isDirectory()) {
                this.copyDirectoryRecursive(s, d);
            }
            else {
                fs_1.default.copyFileSync(s, d);
            }
        }
    }
}
exports.PGManager = PGManager;
exports.pgManager = new PGManager();
//# sourceMappingURL=pg-manager.js.map