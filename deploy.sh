#!/bin/bash

# LAZA ERP Deployment Script
# Deploy to production server: laza.odoob.uz

set -e  # Exit on any error

SERVER="laza.odoob.uz"
USER="root"
REMOTE_DIR="/var/www/laza"
APP_NAME="laza-erp"

echo "🚀 Starting deployment to $SERVER..."

# 1. Build the application
echo "📦 Building application..."
npm run build

# 2. Sync files to server (excluding node_modules and .next cache)
echo "📤 Syncing files to server..."
rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.next/cache' \
  --exclude 'db/data.db' \
  --exclude 'db/data.db-shm' \
  --exclude 'db/data.db-wal' \
  --exclude '.env.local' \
  ./ ${USER}@${SERVER}:${REMOTE_DIR}/

# 3. Install dependencies and restart on server
echo "🔧 Installing dependencies on server..."
ssh ${USER}@${SERVER} << 'ENDSSH'
cd /var/www/laza

# Install dependencies
npm ci --production

# Restart application with PM2
if pm2 describe laza-erp > /dev/null 2>&1; then
  echo "♻️  Restarting existing PM2 process..."
  pm2 restart laza-erp
else
  echo "🆕 Starting new PM2 process..."
  pm2 start npm --name "laza-erp" -- start
  pm2 save
fi

# Show status
pm2 status

ENDSSH

echo "✅ Deployment complete!"
echo "📊 Check status: ssh ${USER}@${SERVER} 'pm2 status'"
echo "📋 View logs: ssh ${USER}@${SERVER} 'pm2 logs laza-erp'"
