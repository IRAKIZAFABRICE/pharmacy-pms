@echo off
title Postgres Migration: Docker -> Native 18.4
color 0B

echo ============================================
echo   Postgres Migration: Docker to Native 18.4
echo ============================================
echo.
echo This script will:
echo   1. Backup your Docker PostgreSQL database
echo   2. Stop Docker container (to free port 5432)
echo   3. Setup Native PostgreSQL 18.4 from extracted binaries (no Windows service)
echo   4. Restore the backup to native PostgreSQL
echo.
echo PREREQUISITES:
echo   - Docker Desktop must be running
echo   - Docker PostgreSQL container must exist
echo   - postgresql-18.4-2-windows-x64-binaries extracted (already present)
echo.
echo WARNING: This is a one-way migration. Backup first!
echo.
set /p CONFIRM=Do you want to proceed? (y/n): 

if /i not "%CONFIRM%"=="y" (
    echo Migration cancelled.
    pause
    exit /b
)

echo.
echo ============================================
echo   STEP 1: Gather Configuration
echo ============================================
echo.

REM Show detected container from docker-compose.yml
echo.
echo Detected from docker-compose.yml: container=pharma_db, user=pharma_admin, pass=Pharma@2024, db=pharmacy_db
echo.

set /p CONTAINER_NAME=Enter Docker container name [default: pharma_db]: 
if "%CONTAINER_NAME%"=="" set CONTAINER_NAME=pharma_db

set /p DB_USER=Enter database username [default: pharma_admin]: 
if "%DB_USER%"=="" set DB_USER=pharma_admin

set /p DB_NAME=Enter database name [default: pharmacy_db]: 
if "%DB_NAME%"=="" set DB_NAME=pharmacy_db

set /p DB_PASS=Enter Docker Postgres password [default: Pharma@2024]: 
if "%DB_PASS%"=="" set DB_PASS=Pharma@2024

set /p NEW_DB_PASS=Enter NEW Native Postgres password [default: Admin@123]: 
if "%NEW_DB_PASS%"=="" set NEW_DB_PASS=Admin@123

REM Generate timestamp using PowerShell
for /f %%I in ('powershell -Command "Get-Date -Format 'yyyyMMdd_HHmmss'"') do set TIMESTAMP=%%I
set BACKUP_FILE=%~dp0backup_%DB_NAME%_%TIMESTAMP%.sql

echo.
echo ============================================
echo   STEP 2: Backup Docker Database
echo ============================================
echo.
echo Backing up Docker database to: %BACKUP_FILE%
echo Container: %CONTAINER_NAME%
echo Database:  %DB_NAME%
echo User:      %DB_USER%
echo.

REM Check if Docker is running
docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker is not running! Please start Docker Desktop first.
    pause
    exit /b 1
)

REM Check if container exists
docker inspect %CONTAINER_NAME% >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Container '%CONTAINER_NAME%' not found!
    echo Available containers:
    docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
    pause
    exit /b 1
)

echo [1/5] Exporting PGPASSWORD and backing up...
set PGPASSWORD=%DB_PASS%
docker exec -e PGPASSWORD=%DB_PASS% -t %CONTAINER_NAME% pg_dump -U %DB_USER% %DB_NAME% > "%BACKUP_FILE%"
set PGPASSWORD=

if %ERRORLEVEL% neq 0 (
    echo [ERROR] Backup failed! Check if Docker is running and password is correct.
    pause
    exit /b 1
)

echo [SUCCESS] Backup created: %BACKUP_FILE%
dir "%BACKUP_FILE%"
echo.

echo ============================================
echo   STEP 3: Stop Docker Container
echo ============================================
echo.
echo Stopping Docker container to free port 5432...
docker stop %CONTAINER_NAME%

if %ERRORLEVEL% neq 0 (
    echo [WARNING] Could not stop container. You may need to stop it manually.
) else (
    echo [SUCCESS] Container stopped.
)

echo.
echo ============================================
echo   STEP 4: Setup Native PostgreSQL 18.4 from Binaries
echo ============================================
echo.
echo Setting up PostgreSQL 18.4 from extracted binaries (no Windows service)...
echo.

REM Set binary and data paths (using %~dp0 for script directory)
set BIN_PATH=%~dp0postgresql-18.4-2-windows-x64-binaries\pgsql\bin
set PG_DATA_DIR=C:\pgdata\18

echo Binary path: %BIN_PATH%
echo Data directory: %PG_DATA_DIR%
echo Port: 5433
echo.

REM Step 4a: Create data directory
if not exist "%PG_DATA_DIR%" (
    echo [1/5] Creating data directory...
    mkdir "%PG_DATA_DIR%"
) else (
    echo [1/5] Data directory already exists.
)

REM Step 4b: Initialize database cluster
echo [2/5] Initializing PostgreSQL database cluster...
"%BIN_PATH%\initdb.exe" -D "%PG_DATA_DIR%" --encoding=UTF8 --locale=en-US --username=postgres --auth=trust

if %ERRORLEVEL% neq 0 (
    echo [ERROR] initdb failed! Check permissions on %PG_DATA_DIR%.
    pause
    exit /b 1
)
echo [SUCCESS] Database cluster initialized.
echo.

REM Step 4c: Configure postgresql.conf - set port to 5433
echo [3/5] Configuring port to 5433 in postgresql.conf...
set PG_CONF=%PG_DATA_DIR%\postgresql.conf

REM Replace or add port setting
findstr /B "port" "%PG_CONF%" >nul
if %ERRORLEVEL% equ 0 (
    REM Replace existing port line
    powershell -Command "(Get-Content '%PG_CONF%') -replace '#?port\s*=\s*\d+', 'port = 5433' | Set-Content '%PG_CONF%'"
) else (
    REM Add port line
    echo port = 5433 >> "%PG_CONF%"
)

REM Ensure listen_addresses is set
findstr /B "listen_addresses" "%PG_CONF%" >nul
if %ERRORLEVEL% equ 0 (
    powershell -Command "(Get-Content '%PG_CONF%') -replace '#?listen_addresses\s*=.*', 'listen_addresses = ''*''' | Set-Content '%PG_CONF%'"
) else (
    echo listen_addresses = '*' >> "%PG_CONF%"
)

echo [SUCCESS] Port set to 5433.
echo.

REM Step 4d: Start PostgreSQL directly (no Windows service)
echo [4/5] Starting PostgreSQL (non-service mode)...
"%BIN_PATH%\pg_ctl.exe" -D "%PG_DATA_DIR%" -l "%PG_DATA_DIR%\pg_log.log" start
if %ERRORLEVEL% neq 0 (
    echo [WARNING] pg_ctl start may have warnings (server might already be running).
)

echo [SUCCESS] PostgreSQL 18 started on port 5433!
echo.

REM Step 4e: Set postgres user password (trust auth is active, no password needed yet)
echo [5/5] Setting postgres user password...
"%BIN_PATH%\psql.exe" -h localhost -p 5433 -U postgres -c "ALTER USER postgres WITH PASSWORD '%NEW_DB_PASS%';"
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to set postgres password.
    pause
    exit /b 1
)
echo [SUCCESS] Postgres password set.

REM Configure pg_hba.conf for md5 authentication AFTER password is set
echo Configuring pg_hba.conf for md5 authentication...
set PG_HBA=%PG_DATA_DIR%\pg_hba.conf

REM Replace local and host lines to use md5
powershell -Command "(Get-Content '%PG_HBA%') -replace '^(local\s+all\s+all\s+)trust', '$1md5' | Set-Content '%PG_HBA%'"
powershell -Command "(Get-Content '%PG_HBA%') -replace '^(host\s+all\s+all\s+127\.0\.0\.1/32\s+)trust', '$1md5' | Set-Content '%PG_HBA%'"
powershell -Command "(Get-Content '%PG_HBA%') -replace '^(host\s+all\s+all\s+::1/128\s+)trust', '$1md5' | Set-Content '%PG_HBA%'"

echo [SUCCESS] Authentication configured (md5).

REM Reload PostgreSQL configuration to apply md5 authentication from pg_hba.conf
echo Reloading PostgreSQL configuration to apply md5 authentication...
"%BIN_PATH%\pg_ctl.exe" -D "%PG_DATA_DIR%" reload
echo [SUCCESS] md5 authentication enabled.

echo.
echo ============================================
echo   STEP 5: Restore Backup to Native PostgreSQL
echo ============================================
echo.
echo Restoring from: %BACKUP_FILE%
echo Target: localhost:5433
echo.

REM Wait for PostgreSQL to be ready
echo Waiting for PostgreSQL to be ready...
"%BIN_PATH%\pg_isready.exe" -h localhost -p 5433
if %ERRORLEVEL% neq 0 (
    echo Waiting for PostgreSQL to start...
    timeout /t 10 /nobreak >nul
    "%BIN_PATH%\pg_isready.exe" -h localhost -p 5433
)

echo [SUCCESS] PostgreSQL is ready.
echo.

set PG_PATH=%BIN_PATH%

echo Restoring database...
set PGPASSWORD=%NEW_DB_PASS%
"%PG_PATH%\psql.exe" -h localhost -p 5433 -U postgres -c "CREATE DATABASE %DB_NAME% WITH ENCODING 'UTF8' LC_COLLATE 'en_US.UTF-8' LC_CTYPE 'en_US.UTF-8' TEMPLATE template0;" 2>nul

echo Importing data...
"%PG_PATH%\psql.exe" -h localhost -p 5433 -U postgres -d %DB_NAME% < "%BACKUP_FILE%"
set PGPASSWORD=

if %ERRORLEVEL% neq 0 (
    echo [ERROR] Restore failed! Check if password is correct.
    echo You can manually restore using:
    echo   psql -h localhost -p 5433 -U postgres -d %DB_NAME% ^< "%BACKUP_FILE%"
    pause
    exit /b 1
)

echo.
echo ============================================
echo   STEP 6: Update Application Configuration
echo ============================================
echo.
echo [SUCCESS] Migration complete!
echo.
echo NEXT STEPS:
echo.
echo 1. Create or update your .env file with:
echo    DATABASE_URL=postgresql://postgres:%NEW_DB_PASS%@localhost:5433/%DB_NAME%
echo    PORT=3001
echo    NODE_ENV=development
echo.
echo 2. Run Prisma generate:
echo    cd packages\backend
echo    npm run prisma:generate
echo.
echo 3. Run prisma migrate:
echo    npm run prisma:migrate
echo.
echo 4. Seed the database (if needed):
echo    npm run prisma:seed
echo.
echo 5. Start the backend:
echo    npm run dev
echo.

REM Create a .env.example file
(
echo # PostgreSQL Connection
echo DATABASE_URL="postgresql://postgres:%NEW_DB_PASS%@localhost:5433/%DB_NAME%"
echo.
echo # Server Configuration
echo PORT=3001
echo NODE_ENV=development
echo CORS_ORIGIN=*
echo.
echo # JWT Secret
echo JWT_SECRET=pharmacy-pms-jwt-secret-key-2024
echo JWT_EXPIRES_IN=24h
echo.
echo # Encryption Key
echo ENCRYPTION_KEY=your-32-character-encryption-key-here!
echo.
echo # RRA Configuration
echo RRA_API_URL=https://rra-api.example.com
echo RRA_API_KEY=your-rra-api-key
) > env-migration-example.txt

echo Created env-migration-example.txt with sample configuration.
echo.
echo IMPORTANT: Remember to re-create any extensions like uuid-ossp:
echo   psql -h localhost -p 5433 -U postgres -d %DB_NAME% -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
echo.

pause
