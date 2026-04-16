#!/bin/bash

# Docker + Certbot Deployment Script for Chatty

set -e

DOMAIN="${1:-}"
EMAIL="${2:-}"

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
    echo "Usage: $0 <your-domain.com> <your-email@example.com>"
    echo "Example: $0 chatty.example.com admin@example.com"
    exit 1
fi

echo "🚀 Deploying Chatty with HTTPS for $DOMAIN..."

# Update nginx.conf with actual domain
sed -i "s/your-domain.com/$DOMAIN/g" nginx/nginx.conf

# Get SSL certificate
docker compose run --rm certbot certonly --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --force-renewal \
    -d "$DOMAIN" \
    -d "www.$DOMAIN"

# Start all services
docker compose up -d

echo ""
echo "✅ Deployment complete!"
echo "🌐 Access your app at: https://$DOMAIN"
echo "📝 Certificate auto-renews weekly. To renew manually: docker compose run --rm certbot renew"
