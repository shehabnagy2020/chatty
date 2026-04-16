# Chatty

Real-time chat application with user authentication, voice calls, image sharing, and markdown support.

## Features

- **Authentication** — Sign up / sign in with username + password, JWT tokens, "Remember me" option
- **Room chat** — Create and join chat rooms with member counts and unread badges
- **Direct messages** — Private messaging with unread counters and online status
- **Markdown** — Messages rendered with full GitHub-flavored markdown (code blocks, tables, lists, etc.)
- **Image sharing** — Send images from device, click to view fullscreen
- **Voice messages** — Record and send audio messages with inline playback
- **Voice calls** — WebRTC 1:1 audio calls with mute, timer, reject, and call logging
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

Run backend and frontend separately:

```bash
# Backend (port 3000)
cd backend
npm install
npm run start:dev

# Frontend (port 5173)
cd frontend
npm install
npm run dev
```

Or use the start scripts:
```bash
start.cmd      # Windows
./start.sh     # Unix
```

The Vite dev server proxies `/socket.io` and `/auth` to the backend.

### Production

Build both and serve everything from NestJS on port 3000:

```bash
cd frontend && npm run build
cd backend && npm run build
cd backend && npm run start:prod
```

Or use the production script:
```bash
start-prod.cmd
```

NestJS serves the frontend static files from `frontend/dist` via `@nestjs/serve-static`. Only port 3000 is needed — Socket.IO, auth API, and static files all on the same origin.

### External Access (ngrok / localtunnel)

To access from other devices or over HTTPS:

```bash
# After starting both dev servers
npx localtunnel --port 5173
```

Or with ngrok:
```bash
ngrok http 5173
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Backend server port |
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
├── AGENTS.md               # Detailed project memory
├── start.cmd               # Dev start (Windows)
├── start.sh                # Dev start (Unix)
└── start-prod.cmd          # Production build + start
```