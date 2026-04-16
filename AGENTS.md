# Chatty - Project Memory

## Project Overview
Real-time chat website. Users must choose a unique display name to join, then can chat in rooms or via private messages via Socket.IO. Supports voice messages, voice calls via WebRTC, and call logging.

## Architecture
- **Frontend**: React 19 + TypeScript + Vite + Mantine UI (port 5173)
- **Backend**: NestJS + TypeScript (port 3000)
- **Real-time**: Socket.IO (backend uses `@nestjs/websockets` + `@nestjs/platform-socket.io`, frontend uses `socket.io-client`)
- **Voice Calls**: WebRTC (signaling via Socket.IO events, STUN: `stun.l.google.com:19302`)
- **Voice Messages**: MediaRecorder API → base64 audio → Socket.IO relay
- **Notifications**: Web Audio API sounds (different tones for messages, DMs, voice messages, incoming calls, user join/leave) + document title flash with unread count
- **UI Library**: Mantine v9 (core, hooks, notifications)
- **Structure**: Separate `/backend` and `/frontend` folders, each with own `package.json`

## Commands
- Run both (Windows): `start.cmd`
- Run both (Unix): `./start.sh`
- Backend dev: `cd backend && npm run start:dev`
- Frontend dev: `cd frontend && npm run dev`
- Backend build: `cd backend && npm run build`
- Frontend build: `cd frontend && npm run build`
- Backend lint: `cd backend && npm run lint`
- Frontend lint: `cd frontend && npm run lint`

## Current Features
- **Required display names** — users must enter a unique name to join (duplicate names rejected with error shown)
- Room list with member counts (updates when users join/leave rooms)
- Create new rooms via modal
- Join/switch rooms via sidebar (leaves previous room on switch, except `general`)
- Private messaging (click on online user to start DM; DM list auto-populates from incoming messages)
- Real-time messaging via Socket.IO
- Voice messages (record via mic, send as base64 audio, inline playback with play/pause and progress)
- Voice calls (WebRTC 1:1 audio calls with live timer, mute/hang-up, reject, signaling via Socket.IO)
- **Call logging** — calls show in chat as system messages (ended with duration, missed, rejected); rejecting a call cancels it on the caller's side; call logs appear in DM between both users
- Typing indicators
- Online user list in sidebar (current user excluded from others list via `isOwnUser`)
- **Notifications** — distinct sounds for messages, DMs, voice messages, incoming calls (looping ringtone), call ended, user join/leave + title flash when tab is inactive
- Mobile responsive (hamburger menu sidebar, responsive input bar, smaller touch targets)
- Dark theme UI with Mantine components
- No session persistence — each tab is a fresh session (no localStorage)

## Backend Structure
- `src/main.ts` - Entry point, CORS enabled
- `src/app.module.ts` - Root module (ConfigModule + ChatModule)
- `src/chat/chat.gateway.ts` - Socket.IO gateway handling:
  - `handleConnection` / `handleDisconnect` — no username assigned on connect; user must `setUsername` before `joinChat`
  - `setUsername` — sets display name, rejects duplicates, emits `usernameChanged` or `usernameError`
  - `joinChat` — requires username set first, joins `general` room
  - `createRoom` / `joinRoom` / `leaveRoom` — room subscription (room list broadcast on join/leave)
  - `message` — broadcast text message to room
  - `privateMessage` — send DM to specific user
  - `voiceMessage` / `privateVoiceMessage` — relay voice messages (base64 audio + duration)
  - `typing` — typing indicator relay
  - `voiceOffer` / `voiceAnswer` / `voiceIceCandidate` / `voiceHangUp` / `voiceReject` — WebRTC signaling for voice calls
  - `callLog` — emit call log message (ended/missed/rejected) as DM between caller and callee
- `src/chat/chat.module.ts` - Chat module

## Frontend Structure
- `src/main.tsx` - Entry point (MantineProvider + Notifications)
- `src/App.tsx` - Main component: LobbyScreen (name required, shows errors), ChatScreen (sidebar, voice msg recording, mobile hamburger menu), VoiceMessageBubble, CallLogBubble, CreateRoomModal
- `src/App.css` - Minimal overrides (Mantine handles most styling)
- `src/index.css` - Global resets + mobile input zoom fix
- `src/types.ts` - TypeScript interfaces (ChatMessage with `type`/`duration`/`callStatus`, UserListEvent, TypingEvent, RoomInfo, RoomListEvent, PrivateMessageEvent, VoiceOfferEvent, VoiceAnswerEvent, VoiceIceCandidateEvent, VoiceHangUpEvent, VoiceRejectEvent, UsernameChangedEvent, UsernameErrorEvent)
- `src/hooks/useChat.ts` - Custom hooks:
  - `useSocket()` — manages Socket.IO connection
  - `useChat(socket)` — handles messages, rooms, typing, user list, private messages, voice messages, `isOwnUser()`, `onMessageRef`/`onPrivateMessageRef` for external callbacks
- `src/hooks/useVoiceChat.ts` - WebRTC voice call hook (callUser, answerCall, rejectCall with `voiceReject` emit, hangUp with call log tracking, toggleMute, live `callDuration` timer, `onCallLogRef` for call log callbacks)
- `src/hooks/useNotifications.ts` - Notification hook with distinct sounds: looping ringtone for incoming calls, separate tones for messages/DMs/voice messages/call ended/user join/leave + document title flash with unread count
- `src/utils/storage.ts` - Empty (session persistence removed — each tab is independent)
- `vite.config.ts` - Vite config with Socket.IO proxy (`/socket.io` → `http://localhost:3000`)
- `postcss.config.cjs` - PostCSS config for Mantine

## Socket Events
- Client → Server: `setUsername`, `joinChat`, `createRoom`, `joinRoom`, `leaveRoom`, `message`, `privateMessage`, `voiceMessage`, `privateVoiceMessage`, `typing`, `voiceOffer`, `voiceAnswer`, `voiceIceCandidate`, `voiceHangUp`, `voiceReject`, `callLog`
- Server → Client: `usernameChanged`, `usernameError`, `message`, `privateMessage`, `userList`, `roomList`, `userJoined`, `userLeft`, `typing`, `joinedRoom`, `voiceOffer`, `voiceAnswer`, `voiceIceCandidate`, `voiceHangUp`, `voiceReject`

## Channel System
- Rooms: identified by roomId (e.g. `general`, `gaming`) — messages broadcast to all in room
- DMs: identified by `dm:user1-user2` (sorted names) — `privateMessage` event targets specific socket
- Switching rooms leaves the previous non-general room (updates member counts)

## Default Room
- `general` (user auto-joins on `joinChat`)

## Username Flow
1. Socket connects — no name assigned (`client.data.username = ''`)
2. User enters name in lobby → client emits `setUsername`
3. Server checks for duplicates via `isUsernameTaken()` (excludes own socket ID)
4. If taken → server emits `usernameError` with message
5. If unique → server emits `usernameChanged`, client updates state, then emits `joinChat`
6. Multiple tabs = multiple independent users (no shared state)

## Voice Call Flow
1. Caller clicks phone icon → `voiceOffer` sent to target
2. Target sees incoming call banner → Answer (`voiceAnswer` + WebRTC) or Reject (`voiceReject` emitted to caller)
3. On reject: caller's call UI clears, call log message emitted with status `rejected`
4. On answer: WebRTC connection established, call timer starts
5. Hang up: `voiceHangUp` sent to peer, call log emitted with status `ended` and duration
6. Call logs appear as centered messages in the DM chat between both users

## Environment Variables
- Backend: `PORT` (default 3000)
- Frontend: `VITE_SERVER_URL` (default `http://localhost:3000`)

## Next Steps / TODO
- Add message persistence (database)
- Add user reconnection handling
- Add message history on room join
- Add rate limiting / spam protection