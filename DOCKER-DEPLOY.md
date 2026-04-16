# Docker + Certbot Deployment (Full HTTPS)

## Requirements
- Server with public IP (VPS, Raspberry Pi with port forwarding, etc.)
- Domain name pointing to your server (A record)
- Docker and Docker Compose installed
- Ports 80 and 443 open

## Quick Deploy

```bash
# 1. Clone and navigate
cd /home/pi/programms/chatty

# 2. Run deploy script (replace with your domain)
./deploy-docker.sh your-domain.com your-email@example.com

# Example:
./deploy-docker.sh chatty.example.com admin@example.com
```

## Manual Steps

### 1. Update domain in nginx.conf
Edit `nginx/nginx.conf` and replace `your-domain.com` with your actual domain.

### 2. Get SSL certificate
```bash
docker compose run --rm certbot certonly --webroot \
  --webroot-path=/var/www/certbot \
  --email your-email@example.com \
  --agree-tos \
  -d your-domain.com \
  -d www.your-domain.com
```

### 3. Start services
```bash
docker compose up -d
```

### 4. Verify
```bash
docker compose ps
docker compose logs -f
```

## Auto-Renew SSL

Add to crontab (`crontab -e`):
```
0 3 * * * docker compose run --rm certbot renew && docker compose restart nginx
```

## Access
- HTTPS: `https://your-domain.com`
- SQLite database persists in Docker volume `chatty-data`

## Stop/Remove
```bash
# Stop
docker compose down

# Stop and remove volumes (deletes data!)
docker compose down -v
```

## Environment Variables
Set in `docker-compose.yml` or create `.env`:
```
JWT_SECRET=your-secure-random-string
```
