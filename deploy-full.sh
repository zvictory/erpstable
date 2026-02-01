#!/bin/bash
# Full deployment script including database

set -e  # Exit on any error

SERVER="laza.erpstable.com"
USER="root"
REMOTE_DIR="/var/www/laza"
APP_NAME="stable-erp"

echo "🚀 Starting FULL deployment (app + database) to $SERVER..."
echo ""

# 1. Backup on server
echo "Step 1/5: 💾 Creating backup on server..."
ssh ${USER}@${SERVER} << 'BACKUP'
  BACKUP_DIR="/var/www/laza-backups/backup-$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$BACKUP_DIR"

  if [ -d /var/www/laza ]; then
    echo "  Backing up existing application..."
    cp -r /var/www/laza "$BACKUP_DIR/app"
  fi

  echo "  ✅ Backup created at: $BACKUP_DIR"
  ls -lh "$BACKUP_DIR" 2>/dev/null || echo "  (New installation)"
BACKUP

echo ""

# 2. Build locally
echo "Step 2/5: 📦 Building application locally..."
npm run build > /dev/null 2>&1
if [ -d .next ]; then
  echo "  ✅ Build completed successfully"
else
  echo "  ❌ Build failed!"
  exit 1
fi

echo ""

# 3. Sync files INCLUDING database
echo "Step 3/5: 📤 Syncing files to server (including database)..."
echo "  This may take a minute..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.next/cache' \
  --exclude '.env.local' \
  --exclude 'db/data.db-shm' \
  --exclude 'db/data.db-wal' \
  --progress \
  ./ ${USER}@${SERVER}:${REMOTE_DIR}/ 2>&1 | tail -20

echo "  ✅ Sync completed"

echo ""

# 4. Install and configure on server
echo "Step 4/5: 🔧 Installing dependencies and configuring..."
ssh ${USER}@${SERVER} << 'CONFIGURE'
  cd /var/www/laza

  # Install production dependencies
  echo "  Installing npm dependencies..."
  npm ci --production > /dev/null 2>&1

  # Verify .env exists
  if [ ! -f .env ]; then
    echo "  ⚠️  Creating .env from .env.example..."
    if [ -f .env.example ]; then
      cp .env.example .env
    else
      echo "DATABASE_URL=\"file:db/data.db\"" > .env
      echo "AUTH_SECRET=\"production-secret-key\"" >> .env
      echo "NODE_ENV=\"production\"" >> .env
    fi
  fi

  # Verify database
  if [ -f db/data.db ]; then
    echo "  ✅ Database found: $(ls -lh db/data.db | awk '{print $5, $6, $7, $8, $9}')"
  else
    echo "  ⚠️  No database file found!"
  fi

  echo "  ✅ Configuration complete"
CONFIGURE

echo ""

# 5. Restart with PM2
echo "Step 5/5: ♻️  Starting/restarting application..."
ssh ${USER}@${SERVER} << 'RESTART'
  cd /var/www/laza

  # Stop old process if it exists
  if pm2 describe stable-erp > /dev/null 2>&1; then
    echo "  Stopping old stable-erp process..."
    pm2 stop stable-erp
    pm2 delete stable-erp
  fi

  # Stop evercold-crm if exists (previous app)
  if pm2 describe evercold-crm > /dev/null 2>&1; then
    echo "  Stopping old evercold-crm process..."
    pm2 stop evercold-crm
  fi

  # Start new process
  echo "  Starting stable-erp..."
  pm2 start npm --name "stable-erp" -- start
  pm2 save

  sleep 2

  # Show status
  echo ""
  echo "  📊 PM2 Status:"
  pm2 status
RESTART

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "📊 Verification:"
echo "  - Web: http://${SERVER}:3002"
echo "  - Status: ssh ${USER}@${SERVER} 'pm2 status'"
echo "  - Logs: ssh ${USER}@${SERVER} 'pm2 logs stable-erp --lines 50'"
