Deployment checklist

1. Build
   npm ci
   npm run build

2. Configure environment (example .env)
   JWT_SECRET=...
   DEFAULT_ADMIN_PASSWORD=...
   DEFAULT_MANAGER_PASSWORD=...
   ALLOWED_ORIGINS=https://your.domain.com

3. Start with PM2
   pm2 start ecosystem.config.js --env production

4. Nginx
   Place provided nginx.conf and point `server_name` and `alias` paths

5. Backup
   Configure daily cron to run `scripts/backup.sh`

6. Logs
   Ensure `logs/` directory is writable and monitored
