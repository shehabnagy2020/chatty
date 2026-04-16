# PM2 Deployment Guide for Chatty

## Prerequisites
- Node.js 20+ installed
- PM2 installed globally: `npm install -g pm2`

## Setup

### 1. Install dependencies
```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Build frontend
```bash
cd frontend && npm run build
```

### 3. Start with PM2
```bash
pm2 start ecosystem.config.js
```

### 4. Save PM2 process list
```bash
pm2 save
```

### 5. Setup PM2 to start on boot
```bash
pm2 startup
# Run the command it outputs
```

## Commands

```bash
# View logs
pm2 logs

# View status
pm2 status

# Restart all
pm2 restart all

# Stop all
pm2 stop all

# Delete all
pm2 delete all

# Monitor
pm2 monit
```

## Environment Variables

Set in `.env` file or export before starting:

```bash
export JWT_SECRET="your-secure-random-string"
export PORT=3000
```

## SSL/HTTPS Setup

Use Caddy or nginx as reverse proxy:

### Caddy (easiest)
```bash
# Install Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy

# Create Caddyfile
sudo nano /etc/caddy/Caddyfile

# Add:
shehabnagy.ddns.net {
    reverse_proxy localhost:3000
}

# Start Caddy
sudo systemctl enable caddy
sudo systemctl start caddy
```

Caddy automatically gets SSL certificates from Let's Encrypt.

## Notes
- Backend runs on port 3000
- Frontend served from backend via ServeStaticModule
- SQLite database stored in `backend/chatty.db`
- PM2 handles process management and auto-restart
