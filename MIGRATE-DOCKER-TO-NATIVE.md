# Docker PostgreSQL → Native PostgreSQL 18.4 Migration Guide

## Overview
This guide helps you migrate your Pharmacy PMS database from Docker PostgreSQL to Native PostgreSQL 18.4 Binaries on Windows, **without losing data**.

## Prerequisites
- Docker Desktop installed and running
- Docker PostgreSQL container running with your data
- `postgresql-18.4-2-windows-x64-binaries` extracted (already present at project root)
- Admin rights on Windows

## Quick Migration (Automated)

### 1. Run the Migration Script
Double-click **`migrate-docker-to-native.bat`** in the project root.

The script will:
1. ✅ Prompt for Docker container name, database name, passwords
2. ✅ Backup your Docker PostgreSQL database to `backup_<db>_<timestamp>.sql`
3. ✅ Stop the Docker container (frees port 5432)
4. ✅ Setup Native PostgreSQL 18.4 from extracted binaries (`postgresql-18.4-2-windows-x64-binaries/pgsql/bin/`)
   - Initializes database cluster at `C:\pgdata\18`
   - Configures port **5433** in `postgresql.conf`
   - Registers as a Windows service named `PostgreSQL18`
   - Starts the service automatically
5. ✅ Restore the backup to native PostgreSQL on port 5433
6. ✅ Guide you to update your `.env` configuration

### 3. After Migration — Update `.env`

Create or update `packages/backend/.env`:

```env
DATABASE_URL="postgresql://postgres:Admin@123@localhost:5433/pharmacy_db"
PORT=3001
NODE_ENV=development
JWT_SECRET=pharmacy-pms-jwt-secret-key-2024
JWT_EXPIRES_IN=24h
ENCRYPTION_KEY=your-32-character-encryption-key-here!
CORS_ORIGIN=*
```

### 4. Run Database Migrations
```bash
cd packages/backend
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

### 5. Start the App
```bash
npm run dev:backend     # Terminal 1
npm run dev:frontend    # Terminal 2
```

---

## Manual Migration (if script fails)

### Step 1: Backup from Docker
```bash
docker exec -t <container-name> pg_dump -U postgres pharmacy_db > backup.sql
```

### Step 2: Stop Docker container
```bash
docker stop <container-name>
```

### Step 3: Setup Native PostgreSQL 18.4 from Binary
```bash
REM Set paths
set BIN_PATH=%CD%\postgresql-18.4-2-windows-x64-binaries\pgsql\bin
set PG_DATA_DIR=C:\pgdata\18

REM Initialize cluster
"%BIN_PATH%\initdb.exe" -D "%PG_DATA_DIR%" --encoding=UTF8 --username=postgres --auth=md5

REM Set port to 5433 in postgresql.conf
echo port = 5433 >> "%PG_DATA_DIR%\postgresql.conf"
echo listen_addresses = '*' >> "%PG_DATA_DIR%\postgresql.conf"

REM Register as Windows service and start
"%BIN_PATH%\pg_ctl.exe" register -N "PostgreSQL18" -D "%PG_DATA_DIR%" -w
net start PostgreSQL18

REM Set password
"%BIN_PATH%\psql.exe" -h localhost -p 5433 -U postgres -c "ALTER USER postgres WITH PASSWORD 'Admin@123';"
```

### Step 4: Restore to Native
```bash
set PGPASSWORD=Admin@123
psql -h localhost -p 5433 -U postgres -c "CREATE DATABASE pharmacy_db;"
psql -h localhost -p 5433 -U postgres -d pharmacy_db < backup.sql
```

### Step 5: Create Extensions (if needed)
```bash
psql -h localhost -p 5433 -U postgres -d pharmacy_db -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
```

---

## Important Notes

- **Docker and Native PostgreSQL are 2 separate databases** — your Docker data is safe until you delete the container/volume
- **Port 5432** = Docker | **Port 5433** = Native (no conflict)
- **Backup file** `backup_<timestamp>.sql` is created before stopping Docker — keep it safe
- Your customers don't need Docker, so this migration is for your development environment only

## Rollback (if needed)
1. Restart Docker container: `docker start <container-name>`
2. Change `.env` back to `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pharmacy_db"`
3. The native EXE won't interfere since it uses port 5433
