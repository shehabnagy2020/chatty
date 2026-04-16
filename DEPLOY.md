# Deploy Chatty to Railway (free, automatic HTTPS)

## Prerequisites
- GitHub account
- Railway account (free tier: $5 credit/month, enough for small apps)

## Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "Prepare for Railway deployment"
git push origin main
```

### 2. Deploy to Railway
1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Connect your `chatty` repository
5. Railway auto-detects Node.js and deploys

### 3. Set Environment Variables
In Railway dashboard → Variables:
- `JWT_SECRET`: Your secret key (change from default)
- `PORT`: 8000 (Railway sets this automatically)
- `NODE_ENV`: production

### 4. Get Your HTTPS URL
- Railway provides automatic HTTPS at `https://your-project.railway.app`
- URL shown in Railway dashboard after deployment

## Alternative: Render (also free with HTTPS)

1. Go to https://render.com
2. New → Web Service
3. Connect GitHub repo
4. Settings:
   - Build Command: `cd backend && npm install && npm run build`
   - Start Command: `cd backend && npm run start:prod`
   - Environment: Node
5. Add environment variables (JWT_SECRET)
6. Deploy → Get HTTPS URL

## Notes
- Both platforms provide automatic SSL/HTTPS
- Railway: Free tier with persistent disks available for SQLite
- Render: Free tier with auto-sleep after 15 min inactivity
- SQLite database persists on Railway persistent disk (add disk in Railway dashboard)
