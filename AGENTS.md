# Chatty - Project Memory

## Project Overview
Real-time chat website with user authentication. Users sign up/in with a username and password, then can chat in rooms or via private messages using Socket.IO. Supports voice messages, voice calls via WebRTC, image sharing, call logging, and markdown messages.

## Architecture
- **Frontend**: React 19 + TypeScript + Vite + Mantine UI (port 5173 dev, served by NestJS in production)
- **Backend**: NestJS + TypeScript (port 3000)
- **Database**: SQLite via better-sqlite3 + TypeORM (messages, rooms, users persisted)
- **Auth**: JWT-based authentication (bcryptjs password hashing, 7-day token expiry)
- **Real-time**: Socket.IO (backend uses `@nestjs/websockets` + `@nestjs/platform-socket.io`, frontend uses `socket.io-client`)
- **Voice Calls**: WebRTC (signaling via Socket.IO events, STUN: `stun.l.google.com:19302`)
- **Voice Messages**: MediaRecorder API → base64 audio → Socket.IO relay
- **Image Messages**: File input → base64 → Socket.IO relay (same pattern as voice)
- **Notifications**: Web Audio API sounds (different tones for messages, DMs, voice messages, incoming calls, user join/leave) + document title flash with unread count
- **UI Library**: Mantine v9 (core, hooks, notifications)
- **Structure**: Separate `/backend` and `/frontend` folders, each with own `package.json`

## Commands
- Run both dev (Windows): `start.cmd`
- Run both dev (Unix): `./start.sh`
- Production: `start-prod.cmd` (builds frontend, serves from NestJS on port 3000)
- Backend dev: `cd backend && npm run start:dev`
- Frontend dev: `cd frontend && npm run dev`
- Backend build: `cd backend && npm run build`
- Frontend build: `cd frontend && npm run build`
- Backend lint: `cd backend && npm run lint`
- Frontend lint: `cd frontend && npm run lint`

## Production Deployment
1. Build frontend: `cd frontend && npm run build`
2. Build backend: `cd backend && npm run build`
3. Start: `cd backend && npm run start:prod`
4. NestJS serves frontend static files from `../frontend/dist` via `@nestjs/serve-static`
5. Only port 3000 needed — Socket.IO, auth API, and static files all on same origin

## Current Features
- **User authentication** — sign up/in with username + password, JWT tokens, "Remember me" checkbox (localStorage for 7 days vs sessionStorage for session-only)
- **Message persistence** — all messages (text, voice, image, call logs) stored in SQLite database
- **Message history** — room and DM history loaded on join from database
- Room list with member counts + unread message badges (updates when users join/leave rooms)
- Create new rooms via modal
- Join/switch rooms via sidebar (leaves previous room on switch, except `general`)
- Private messaging (click on username in chat or sidebar to open DM; DM list auto-populates from history and incoming messages)
- Unread message counters on rooms and DMs in sidebar
- Real-time messaging via Socket.IO
- **Markdown rendering** — text messages rendered with react-markdown + remark-gfm (bold, italic, code blocks, tables, lists, links, etc.)
- Image messages (upload from device, base64 relay, inline display with click-to-fullscreen modal)
- Voice messages (record via mic, send as base64 audio, inline playback with play/pause and progress)
- Voice calls (WebRTC 1:1 audio calls with live timer, mute/hang-up, reject, signaling via Socket.IO)
- **Call button in DM header** — direct call button next to DM partner's name and online status
- **Call logging** — calls show in chat as system messages (ended with duration, missed, rejected); rejecting a call cancels it on the caller's side; call logs appear in DM between both users
- Typing indicators
- Online user list in sidebar (current user excluded)
- **Notifications** — distinct sounds for messages, DMs, voice messages, incoming calls (looping ringtone), call ended, user join/leave + title flash when tab is inactive
- Mobile-first responsive design (overlay navbar with blur backdrop, touch-friendly inputs, safe-area insets, `100dvh` viewport)
- **Mobile UX** — emoji/image/voice buttons hidden when typing on mobile to maximize input space
- Cool animations (message slide-in, auth card fade-up, typing dots bounce, call bar pulse, input focus glow)
- Dark theme UI with Mantine components
- Session persistence via JWT (remember me or session-only)

## Backend Structure
- `src/main.ts` - Entry point, CORS enabled, binds to `0.0.0.0`
- `src/app.module.ts` - Root module (ConfigModule + TypeOrmModule + ServeStaticModule + ChatModule + AuthModule)
- `src/auth/auth.module.ts` - Auth module (JwtModule + TypeOrmModule for User)
- `src/auth/auth.service.ts` - Register (bcrypt hash), login (bcrypt compare), validateToken (JWT verify)
- `src/auth/auth.controller.ts` - `POST /auth/register`, `POST /auth/login`
- `src/auth/entities/user.entity.ts` - User entity (id, username unique, hashed password, isActive, createdAt)
- `src/chat/chat.gateway.ts` - Socket.IO gateway handling:
  - `handleConnection` — validates JWT token from `handshake.auth.token`, disconnects unauthenticated sockets; rejects duplicate tab connections
  - `joinChat` — requires authenticated user, joins `general` room, sends message history + DM list
  - `createRoom` / `joinRoom` / `leaveRoom` — room subscription (room list broadcast on join/leave, history sent on join)
  - `message` — saves to DB then broadcasts text message to room (DB ID used for dedup)
  - `privateMessage` — saves to DB then sends DM to specific user
  - `image` / `privateImage` — saves and relays image messages (base64)
  - `voiceMessage` / `privateVoiceMessage` — saves and relays voice messages (base64 audio + duration)
  - `typing` — typing indicator relay
  - `voiceOffer` / `voiceAnswer` / `voiceIceCandidate` / `voiceHangUp` / `voiceReject` — WebRTC signaling
  - `callLog` — save and emit call log message as DM
  - `getDmHistory` — returns DM message history for a specific user pair
- `src/chat/chat.service.ts` - Chat service (saveMessage, getMessages, getDmList, ensureRoom, getRooms, deleteRoom)
- `src/chat/chat.module.ts` - Chat module (imports AuthModule)
- `src/chat/entities/message.entity.ts` - Message entity (id, roomId, content, sender, recipient nullable, type, duration, callStatus nullable, createdAt)
- `src/chat/entities/room.entity.ts` - Room entity (id, roomId, name)

## Frontend Structure
- `src/main.tsx` - Entry point (MantineProvider + Notifications)
- `src/App.tsx` - Main component: AuthScreen (sign in/up with remember me), ChatScreen (sidebar, voice msg recording, image upload, mobile overlay navbar, fullscreen image modal), VoiceMessageBubble, CallLogBubble, CreateRoomModal
- `src/index.css` - Global resets, mobile input zoom fix, all animation keyframes and classes, chat markdown styles, call bar animation overrides
- `src/types.ts` - TypeScript interfaces (ChatMessage with `type`/`duration`/`callStatus`/`to`, UserListEvent, TypingEvent, RoomInfo, RoomListEvent, PrivateMessageEvent, VoiceOfferEvent, VoiceAnswerEvent, VoiceIceCandidateEvent, VoiceHangUpEvent, VoiceRejectEvent, MessageHistoryEvent, DmListEvent, AuthResponse, AuthError)
- `src/hooks/useAuth.ts` - Auth hook (register, login with remember flag, logout; localStorage vs sessionStorage)
- `src/hooks/useChat.ts` - Custom hooks:
  - `useSocket(token)` — manages Socket.IO connection with JWT auth
  - `useChat(socket, username)` — handles messages, rooms, typing, user list, private messages, voice/image messages, unread counters, `setActiveChannel` (clears unread), `onMessageRef`/`onPrivateMessageRef` for external callbacks
- `src/hooks/useVoiceChat.ts` - WebRTC voice call hook (callUser, answerCall, rejectCall, hangUp with call log tracking, toggleMute, live `callDuration` timer, `onCallLogRef` for call log callbacks)
- `src/hooks/useNotifications.ts` - Notification hook with distinct sounds: looping ringtone for incoming calls, separate tones for messages/DMs/voice messages/call ended/user join/leave + document title flash with unread count
- `vite.config.ts` - Vite config with `host: true`, `allowedHosts: true`, proxy for `/socket.io` and `/auth` → `http://localhost:3000`
- `postcss.config.cjs` - PostCSS config for Mantine

## Socket Events
- Client → Server: `joinChat`, `createRoom`, `joinRoom`, `leaveRoom`, `message`, `privateMessage`, `image`, `privateImage`, `voiceMessage`, `privateVoiceMessage`, `typing`, `voiceOffer`, `voiceAnswer`, `voiceIceCandidate`, `voiceHangUp`, `voiceReject`, `callLog`, `getDmHistory`
- Server → Client: `message`, `privateMessage`, `messageHistory`, `dmList`, `userList`, `roomList`, `userJoined`, `userLeft`, `typing`, `joinedRoom`, `voiceOffer`, `voiceAnswer`, `voiceIceCandidate`, `voiceHangUp`, `voiceReject`, `authError`

## Auth Flow
1. User signs up or signs in via `/auth/register` or `/auth/login`
2. Server validates credentials, returns JWT (7-day expiry)
3. Frontend stores token in localStorage (remember me) or sessionStorage (session-only)
4. Socket.IO connects with `auth: { token }` — server validates on connection
5. Invalid/expired token → `authError` event → client clears storage and reloads
6. Only one socket per account allowed (duplicate tabs rejected)

## Channel System
- Rooms: identified by roomId (e.g. `general`, `gaming`) — messages broadcast to all in room
- DMs: identified by `dm:user1-user2` (sorted names) — `privateMessage` event targets specific socket
- Switching rooms leaves the previous non-general room (updates member counts)
- Unread counters tracked per channel, cleared on channel switch

## Default Room
- `general` (user auto-joins on `joinChat`)

## Voice Call Flow
1. Caller clicks phone icon (in sidebar or DM header) → `voiceOffer` sent to target
2. Target sees incoming call banner → Answer (`voiceAnswer` + WebRTC) or Reject (`voiceReject` emitted to caller)
3. On reject: caller's call UI clears, call log message emitted with status `rejected`
4. On answer: WebRTC connection established, call timer starts
5. Hang up: `voiceHangUp` sent to peer, call log emitted with status `ended` and duration
6. Call logs appear as centered messages in the DM chat between both users

## Environment Variables
- Backend: `PORT` (default 3000), `JWT_SECRET` (default `chatty-secret-key-change-in-production`)
- Frontend: `VITE_SERVER_URL` (default empty = same-origin)

## Next Steps / TODO
- Add user reconnection handling
- Add rate limiting / spam protection