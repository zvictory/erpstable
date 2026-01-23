#!/bin/bash

# LAZA ERP Deployment Script (SSHPASS version)
# ⚠️  WARNING: This script contains plaintext password - use only for development!

set -e  # Exit on any error

SERVER="laza.odoob.uz"
USER="root"
PASSWORD="2@19Myokyanus"
REMOTE_DIR="/var/www/laza"
APP_NAME="laza-erp"

# Check if sshpass is installed
if ! command -v sshpass &> /dev/null; then
    echo "❌ sshpass not found. Installing..."
    # Uncomment the line below for your OS:
    # brew install hudochenkov/sshpass/sshpass  # macOS
    # sudo apt-get install sshpass              # Ubuntu/Debian
    # sudo yum install sshpass                  # CentOS/RHEL
    exit 1
fi

echo "🚀 Starting deployment to $SERVER..."

# 1. Build the application
echo "📦 Building application..."
npm run build

# 2. Sync files to server
echo "📤 Syncing files to server..."
sshpass -p "$PASSWORD" rsync -avz --delete \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude '.next/cache' \
  --exclude 'db/data.db' \
  --exclude 'db/data.db-shm' \
  --exclude 'db/data.db-wal' \
  --exclude '.env.local' \
  -e "ssh -o StrictHostKeyChecking=no" \
  ./ ${USER}@${SERVER}:${REMOTE_DIR}/

# 3. Install dependencies and restart on server
echo "🔧 Installing dependencies and restarting..."
sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no ${USER}@${SERVER} << 'ENDSSH'
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
echo "📊 Application running at: http://$SERVER:3000"
echo "📋 View logs: sshpass -p '$PASSWORD' ssh ${USER}@${SERVER} 'pm2 logs laza-erp'"
