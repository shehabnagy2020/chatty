# Chatty

Real-time chat application with user authentication, voice calls, file sharing, reactions, and markdown support.

## Video Tour

<video src="./Chatty-Tour.mp4" controls></video>

## Features

- **Authentication** — Sign up / sign in with username + password, JWT tokens, "Remember me" (7d) or session-only (1h)
- **Room chat** — Create and join chat rooms with member counts and unread badges
- **Direct messages** — Private messaging with unread counters and online status
- **@Mentions** — Type `@` to mention users; highlighted with violet pill styling
- **Markdown** — Messages rendered with full GitHub-flavored markdown (code blocks, tables, lists, etc.)
- **Attachments** — Upload photos, videos, or any file via the + menu
- **Voice messages** — Tap the mic button to record, preview before sending or cancel
- **Voice calls** — WebRTC 1:1 audio calls with mute, timer, reject, and call logging
- **Location sharing** — Send your current location with Google Maps link
- **Reactions** — Hover over a message to react with emoji; reaction pills show counts
- **Notifications** — Distinct sounds for messages, DMs, calls + tab title flash for unread
- **Mobile-first** — Responsive design, overlay sidebar, hidden action buttons while typing
- **Dark theme** — Polished UI with smooth animations

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite + Mantine UI
- **Backend**: NestJS + TypeScript
- **Database**: SQLite (better-sqlite3 + TypeORM)
- **Auth**: JWT + bcryptjs
- **Real-time**: Socket.IO
- **Voice**: WebRTC

## Getting Started

### Development

Runs backend + frontend separately with PM2:

```bash
./dev
```

Backend on port 8000, frontend on Vite port 3000 (proxies API to backend).

### Production

Builds both, then serves everything from the backend on port 8000:

```bash
./prod
```

NestJS serves the frontend static files from `frontend/dist` via `@nestjs/serve-static`. Only port 8000 is needed — Socket.IO, auth API, and static files all on the same origin.

### PM2 Commands

```bash
pm2 logs          # View logs
pm2 restart all   # Restart
pm2 stop all      # Stop
pm2 delete all    # Remove all processes
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8000` | Backend server port |
| `JWT_SECRET` | `chatty-secret-key-change-in-production` | JWT signing secret |
| `VITE_SERVER_URL` | `''` (same-origin) | Frontend API/socket URL |

## Project Structure

```
chatty/
├── backend/
│   └── src/
│       ├── auth/           # JWT auth (register, login, validate)
│       │   ├── entities/   # User entity
│       │   ├── auth.module.ts
│       │   ├── auth.service.ts
│       │   └── auth.controller.ts
│       ├── chat/            # Chat logic
│       │   ├── entities/   # Message, Room entities
│       │   ├── chat.gateway.ts   # Socket.IO gateway
│       │   ├── chat.service.ts
│       │   └── chat.module.ts
│       ├── app.module.ts    # Root module
│       └── main.ts
├── frontend/
│   └── src/
│       ├── hooks/          # useAuth, useChat, useVoiceChat, useNotifications
│       ├── App.tsx          # Auth + Chat screens
│       ├── types.ts
│       └── index.css        # Animations + markdown styles
├── dev                     # Dev mode (PM2, backend + frontend separate)
├── prod                    # Build & production mode (PM2, backend serves all on :8000)
├── ecosystem.config.cjs    # PM2 dev config
├── ecosystem.prod.config.cjs # PM2 prod config
└── CLAUDE.md               # Project memory for Claude
```

## Deployment

### Local Production
```bash
./prod  # Builds both, starts PM2 on port 8000
```

### Vercel Deployment (Hybrid Approach)
Due to SQLite and WebSocket requirements, the recommended deployment is:

1. **Frontend on Vercel**: Deploy `frontend/` as a static site
2. **Backend on Railway/Render**: Deploy `backend/` with persistent storage

#### Frontend (Vercel)
1. Set build command: `npm run build`
2. Set output directory: `dist`
3. Set environment variable: `VITE_SERVER_URL=https://your-backend-url.com`

#### Backend (Railway/Render)
1. Set `PORT` environment variable
2. Set `JWT_SECRET` to a secure random string
3. Ensure SQLite database file is in a persistent volume