# Chatty - Project Memory

## Project Overview
Real-time chat website with user authentication. Users sign up/in with a username and password, then can chat in rooms or via private messages using Socket.IO. Supports file uploads, voice messages, voice calls via WebRTC, image sharing, location sharing, emoji reactions, @mentions, call logging, and markdown messages.

## Architecture
- **Frontend**: React 19 + TypeScript + Vite + Mantine UI (port 3000 in dev, served by NestJS in production)
- **Backend**: NestJS + TypeScript (port 8000)
- **Database**: SQLite via better-sqlite3 + TypeORM (messages, rooms, users persisted)
- **Auth**: JWT-based authentication (bcryptjs password hashing, 7-day expiry with remember me, 1-hour session-only without)
- **Real-time**: Socket.IO (backend uses `@nestjs/websockets` + `@nestjs/platform-socket.io`, frontend uses `socket.io-client`)
- **Voice Calls**: WebRTC (signaling via Socket.IO events, STUN: `stun.l.google.com:19302`)
- **Voice Messages**: Click mic button → MediaRecorder API → base64 audio → Socket.IO relay, preview before send
- **File Messages**: File input → base64 → Socket.IO relay; images render inline, other files show download link
- **Location Messages**: `navigator.geolocation` → lat/lng JSON → Google Maps link
- **Reactions**: Emoji toggles stored as JSON on Message entity, broadcast via `reactionUpdate` socket event
- **Notifications**: Web Audio API sounds (different tones for messages, DMs, voice messages, incoming calls, user join/leave) + document title flash with unread count
- **UI Library**: Mantine v9 (core, hooks, notifications)
- **Structure**: Separate `/backend` and `/frontend` folders, each with own `package.json`

## Commands
- Dev mode: `./dev` (PM2, backend + frontend separately)
- Production: `./prod` (builds both, backend serves all on port 8000)
- Backend dev: `cd backend && npm run start:dev`
- Frontend dev: `cd frontend && npm run dev`
- Backend build: `cd backend && npm run build`
- Frontend build: `cd frontend && npm run build`
- Backend lint: `cd backend && npm run lint`
- Frontend lint: `cd frontend && npm run lint`

## PM2 Configs
- `ecosystem.config.cjs` — Dev: runs backend + frontend dev server as separate PM2 apps
- `ecosystem.prod.config.cjs` — Prod: single `chatty` app, backend on port 8000, serves frontend static files

## Production Deployment
1. `./prod` builds both, then starts backend via PM2 on port 8000
2. NestJS serves frontend static files from `../frontend/dist` via `@nestjs/serve-static`
3. Only port 8000 needed — Socket.IO, auth API, and static files all on same origin

## Current Features
- **User authentication** — sign up/in with username + password, JWT tokens, "Remember me" (7d localStorage) or session-only (1h sessionStorage)
- **Token expiry check** — frontend validates JWT `exp` on page load, auto-logout if expired (no "Connecting..." flash)
- **Multi-tab support** — same user can connect from multiple tabs
- **Message persistence** — all messages (text, voice, image, file, location, call logs) stored in SQLite database
- **Message history** — room and DM history loaded on join from database
- Room list with member counts + unread message badges
- Create new rooms via modal
- Join/switch rooms via sidebar (leaves previous room on switch, except `general`)
- Private messaging (click on username in chat or sidebar to open DM; DM list auto-populates)
- Unread message counters on rooms and DMs in sidebar
- Real-time messaging via Socket.IO
- **@Mentions** — type `@` in input to see autocomplete of online users; Tab/Enter to select; mentions highlighted in messages with violet pill
- **Markdown rendering** — text messages rendered with react-markdown + remark-gfm
- **Attachment menu** — + button with Photo/Video, File, Location options (emoji picker inside input)
- **File messages** — upload any file; images render inline, other files show icon + download link
- **Image messages** — upload from device, base64 relay, inline display with click-to-fullscreen modal
- **Voice messages** — tap mic button to record, tap stop to end, preview modal with play/send/cancel
- **Voice calls** — WebRTC 1:1 audio calls with live timer, mute/hang-up, reject, signaling via Socket.IO
- **Call logging** — calls show in chat as system messages (ended with duration, missed, rejected)
- **Location sharing** — send current geolocation, rendered as Google Maps link card
- **Reactions** — hover over message to see reaction bar (👍❤️😂😮😢🎉); reaction pills below messages, click to toggle; synced via `reactionUpdate` socket event
- Typing indicators
- Online user list in sidebar (deduplicated for multi-tab)
- **Notifications** — distinct sounds for messages, DMs, voice messages, incoming calls, call ended, user join/leave + title flash
- Mobile-first responsive design (overlay navbar, touch-friendly, safe-area insets, `100dvh`)
- Dark theme UI with Mantine components + animations

## Backend Structure
- `src/main.ts` - Entry point, CORS enabled, binds to `0.0.0.0`
- `src/app.module.ts` - Root module (ConfigModule + TypeOrmModule + ServeStaticModule + ChatModule + AuthModule)
- `src/auth/auth.module.ts` - Auth module (JwtModule + TypeOrmModule for User)
- `src/auth/auth.service.ts` - Register, login (bcrypt), validateToken (JWT verify); `rememberMe` param controls expiry (7d vs 1h)
- `src/auth/auth.controller.ts` - `POST /auth/register`, `POST /auth/login` (accept `rememberMe` body field)
- `src/auth/entities/user.entity.ts` - User entity (id, username unique, hashed password, isActive, createdAt)
- `src/chat/chat.gateway.ts` - Socket.IO gateway handling:
  - `handleConnection` — validates JWT token, sets `client.data.username` and `client.data.userId`
  - `joinChat` — joins `general` room, sends message history + DM list
  - `createRoom` / `joinRoom` / `leaveRoom` — room subscription, history on join
  - `message` / `privateMessage` — text messages (saves to DB, broadcasts)
  - `image` / `privateImage` — image messages
  - `file` / `privateFile` — file messages (with fileName, fileType)
  - `voiceMessage` / `privateVoiceMessage` — voice messages
  - `location` / `privateLocation` — location messages (lat/lng JSON)
  - `react` — toggle reaction on a message (parse/store JSON, broadcast `reactionUpdate`)
  - `typing` — typing indicator relay
  - `voiceOffer` / `voiceAnswer` / `voiceIceCandidate` / `voiceHangUp` / `voiceReject` — WebRTC signaling
  - `callLog` — save and emit call log as DM
  - `getDmHistory` — DM message history for user pair
- `src/chat/chat.service.ts` - Chat service (saveMessage, getMessages, getDmList, ensureRoom, getRooms, deleteRoom, toggleReaction)
- `src/chat/chat.module.ts` - Chat module (imports AuthModule)
- `src/chat/entities/message.entity.ts` - Message entity (id, roomId, content, sender, recipient nullable, type, duration, callStatus nullable, fileName nullable, fileType nullable, reactions nullable JSON text, createdAt)
- `src/chat/entities/room.entity.ts` - Room entity (id, roomId, name)

## Frontend Structure
- `src/main.tsx` - Entry point (MantineProvider + Notifications)
- `src/App.tsx` - Main component: AuthScreen, ChatScreen (sidebar, attachment menu, voice recording with preview, mention autocomplete, reaction hover bar, file/location bubbles), VoiceMessageBubble, CallLogBubble, FileMessageBubble, LocationMessageBubble, MentionText, ReactionPills, CreateRoomModal, VoicePreviewModal
- `src/index.css` - Global resets, mobile input zoom fix, animation keyframes, chat markdown styles
- `src/types.ts` - TypeScript interfaces (ChatMessage with type/duration/callStatus/to/fileName/fileType/reactions, ReactionUpdateEvent, etc.)
- `src/hooks/useAuth.ts` - Auth hook (register, login with rememberMe, logout; localStorage vs sessionStorage; JWT expiry check on init)
- `src/hooks/useChat.ts` - Custom hooks:
  - `useSocket(token)` — Socket.IO connection with JWT auth
  - `useChat(socket, username)` — messages, rooms, typing, user list, private messages, voice/image/file/location messages, reactions, unread counters, `reactionUpdate` listener
- `src/hooks/useVoiceChat.ts` - WebRTC voice call hook
- `src/hooks/useNotifications.ts` - Notification hook with distinct sounds + title flash

## Socket Events
- Client → Server: `joinChat`, `createRoom`, `joinRoom`, `leaveRoom`, `message`, `privateMessage`, `image`, `privateImage`, `file`, `privateFile`, `location`, `privateLocation`, `voiceMessage`, `privateVoiceMessage`, `typing`, `react`, `voiceOffer`, `voiceAnswer`, `voiceIceCandidate`, `voiceHangUp`, `voiceReject`, `callLog`, `getDmHistory`
- Server → Client: `message`, `privateMessage`, `messageHistory`, `dmList`, `userList`, `roomList`, `userJoined`, `userLeft`, `typing`, `joinedRoom`, `reactionUpdate`, `voiceOffer`, `voiceAnswer`, `voiceIceCandidate`, `voiceHangUp`, `voiceReject`, `authError`

## Auth Flow
1. User signs up or signs in via `/auth/register` or `/auth/login`
2. Server validates credentials, returns JWT (7d with remember me, 1h without)
3. Frontend stores token in localStorage (remember) or sessionStorage (session-only)
4. Socket.IO connects with `auth: { token }` — server validates on connection
5. Invalid/expired token → `authError` event → client clears storage and reloads
6. On page load, frontend checks JWT `exp` claim; expired tokens auto-logout immediately
7. Multiple tabs per user allowed

## Environment Variables
- Backend: `PORT` (default 8000), `JWT_SECRET` (default `chatty-secret-key-change-in-production`)
- Frontend: `VITE_SERVER_URL` (default empty = same-origin)

## Next Steps / TODO
- Add user reconnection handling
- Add rate limiting / spam protection