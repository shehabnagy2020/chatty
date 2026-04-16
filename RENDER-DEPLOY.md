# Deploy Chatty to Render (free, automatic HTTPS)

## Prerequisites
- GitHub account
- Render account (free tier available)

## Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### 2. Deploy to Render

#### Option A: Using render.yaml (Automatic)
1. Go to https://render.com
2. Click "New +" → "Blueprint"
3. Connect your GitHub account
4. Select the `chatty` repository
5. Render will auto-detect `render.yaml` and configure everything
6. Click "Apply"

#### Option B: Manual Setup
1. Go to https://render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repo
4. Configure:
   - **Name**: chatty
   - **Region**: Choose closest to your users
   - **Branch**: main
   - **Root Directory**: backend
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build && cd ../frontend && npm install && npm run build`
   - **Start Command**: `npm run start:prod`
   - **Instance Type**: Free

5. Add Environment Variables:
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: Generate a secure random string (e.g., use `openssl rand -hex 32`)
   - `DATABASE_PATH`: `/opt/render/project/src/chatty.db`

6. Add Persistent Disk:
   - Click "Add Disk"
   - **Name**: chatty-data
   - **Mount Path**: `/opt/render/project/src`
   - **Size**: 1 GB (free tier)

7. Click "Create Web Service"

### 3. Get Your HTTPS URL
- Render provides automatic HTTPS at `https://your-service-name.onrender.com`
- URL shown in Render dashboard after deployment

## Notes
- Free tier instances sleep after 15 minutes of inactivity (wakes on next request)
- SQLite database persists on the mounted disk
- Automatic SSL/HTTPS provided by Render
- Build takes ~5 minutes (builds both frontend and backend)

## Troubleshooting

### Database not persisting
Ensure the disk is mounted at `/opt/render/project/src` and `DATABASE_PATH` env var is set correctly.

### Build fails
Check logs in Render dashboard. Common issues:
- Missing dependencies: Ensure all packages are in package.json
- Path issues: Root directory must be set to `backend`

### Frontend not loading
Verify the build command builds the frontend and the ServeStaticModule path is correct:
```typescript
ServeStaticModule.forRoot({
  rootPath: join(__dirname, '..', '..', 'frontend', 'dist'),
```

## Environment Variables Reference
| Variable | Value | Required |
|----------|-------|----------|
| `NODE_ENV` | `production` | Yes |
| `JWT_SECRET` | Random secure string | Yes |
| `DATABASE_PATH` | `/opt/render/project/src/chatty.db` | Yes |
| `PORT` | `3000` (auto-set by Render) | No |
