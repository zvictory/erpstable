# LAZA ERP - Deployment Guide

## Server Information
- **Server**: laza.odoob.uz (173.212.195.32)
- **Port**: 3002
- **Application Directory**: /var/www/laza
- **Process Manager**: PM2

## Deployment Status ✅

The application has been successfully deployed and is running on the production server.

### Application Access
- **Direct Access**: http://laza.odoob.uz:3002
- **Internal**: http://localhost:3002 (on server)

### PM2 Status
```bash
pm2 list
# Shows laza-erp running on port 3002
```

## Deployment Scripts

### 1. Quick Deploy (SSH Key-based)
```bash
./deploy.sh
```

### 2. Deploy with Password (sshpass)
```bash
./deploy-sshpass.sh
```

## Server Management Commands

### Access Server
```bash
sshpass -p '2@19Myokyanus' ssh root@laza.odoob.uz
```

### View Application Logs
```bash
sshpass -p '2@19Myokyanus' ssh root@laza.odoob.uz "pm2 logs laza-erp"
```

### View Application Status
```bash
sshpass -p '2@19Myokyanus' ssh root@laza.odoob.uz "pm2 list"
```

### Restart Application
```bash
sshpass -p '2@19Myokyanus' ssh root@laza.odoob.uz "pm2 restart laza-erp"
```

### Stop Application
```bash
sshpass -p '2@19Myokyanus' ssh root@laza.odoob.uz "pm2 stop laza-erp"
```

### View Real-time Logs
```bash
sshpass -p '2@19Myokyanus' ssh root@laza.odoob.uz "pm2 logs laza-erp --lines 100"
```

## Configuration Files

### PM2 Ecosystem Config
Located at: `/var/www/laza/ecosystem.config.js`

```javascript
module.exports = {
  apps: [{
    name: 'laza-erp',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/laza',
    env: {
      NODE_ENV: 'production',
      PORT: 3002
    }
  }]
}
```

### Environment Variables
Located at: `/var/www/laza/.env`

```env
DATABASE_URL="file:db/data.db"
AUTH_SECRET="your-production-secret-key-here"
NODE_ENV="production"
```

## Next Steps

### 1. Set up Nginx Reverse Proxy (Recommended)
To access the application via http://laza.odoob.uz without port number:

```nginx
# /etc/nginx/sites-available/laza.odoob.uz

server {
    listen 80;
    server_name laza.odoob.uz;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Then enable:
```bash
sudo ln -s /etc/nginx/sites-available/laza.odoob.uz /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 2. Set up SSL with Let's Encrypt
```bash
sudo certbot --nginx -d laza.odoob.uz
```

### 3. Initialize Database on Server
If this is the first deployment:

```bash
ssh root@laza.odoob.uz
cd /var/www/laza
npm run db:push
npm run db:seed
```

### 4. Create Production Secret
Update AUTH_SECRET in .env with a secure random value:

```bash
ssh root@laza.odoob.uz
cd /var/www/laza
# Generate a secure random string
echo "AUTH_SECRET=\"$(openssl rand -base64 32)\"" >> .env
pm2 restart laza-erp
```

## Build Information

### Last Successful Build
- **Date**: 2026-01-09
- **TypeScript**: ✅ All errors resolved
- **Production Build**: ✅ Successful
- **Routes**: 20 dynamic pages compiled
- **Build Size**: 154 kB middleware + 84.4 kB shared chunks

### Database Migration Status
- ✅ Drizzle ORM migration complete (100+ query patterns updated)
- ✅ All transaction-based queries converted
- ✅ FIFO inventory calculations verified
- ✅ GL entry reversals working correctly

## Troubleshooting

### Application Won't Start
1. Check PM2 logs: `pm2 logs laza-erp --lines 50`
2. Check port availability: `lsof -i :3002`
3. Check disk space: `df -h`
4. Check memory: `free -h`

### Port Already in Use
If port 3002 is occupied, update ecosystem.config.js:
```bash
ssh root@laza.odoob.uz
cd /var/www/laza
nano ecosystem.config.js  # Change PORT value
pm2 restart laza-erp
```

### Database Issues
```bash
ssh root@laza.odoob.uz
cd /var/www/laza
# Backup current database
cp db/data.db db/data.db.backup-$(date +%Y%m%d)
# Run migrations
npm run db:push
```

## Security Notes

⚠️ **IMPORTANT**:
- Change the default password immediately
- Set up SSH key-based authentication
- Update AUTH_SECRET with a strong random value
- Configure firewall to restrict direct port access
- Set up regular database backups

## Monitoring

### Set up PM2 Monitoring (Optional)
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Check Resource Usage
```bash
ssh root@laza.odoob.uz "pm2 monit"
```

## Contact & Support

For deployment issues, check:
1. Application logs: `pm2 logs laza-erp`
2. System logs: `/var/log/nginx/error.log`
3. Process status: `pm2 list`
