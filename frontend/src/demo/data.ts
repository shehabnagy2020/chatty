import type { ChatMessage, RoomInfo } from '../types';

const now = Date.now();
const min = 60000;

export const demoOnlineUsers = ['alice', 'bob', 'charlie', 'diana'];

export const demoDmList = ['alice', 'bob'];

export const demoRooms: RoomInfo[] = [
  { id: 'general', name: 'general', memberCount: 5 },
  { id: 'dev-talk', name: 'dev-talk', memberCount: 3 },
  { id: 'random', name: 'random', memberCount: 4 },
];

export const demoMessages: ChatMessage[] = [
  // General room messages
  {
    id: '1',
    roomId: 'general',
    content: 'Hey everyone! Just deployed the new feature to staging 🚀',
    sender: 'alice',
    timestamp: now - 45 * min,
  },
  {
    id: '2',
    roomId: 'general',
    content: 'Nice! The new auth flow looks solid. How\'s the performance?',
    sender: 'bob',
    timestamp: now - 42 * min,
  },
  {
    id: '3',
    roomId: 'general',
    content: `Yeah it's looking good. Here's the PR summary:

- **2FA support** with TOTP
- **Session management** with device tracking
- **Rate limiting** on login attempts

All tests passing ✅`,
    sender: 'alice',
    timestamp: now - 40 * min,
    reactions: { '🚀': ['bob', 'charlie'], '👍': ['diana'] },
  },
  {
    id: '4',
    roomId: 'general',
    content: 'Ship it! 🎉',
    sender: 'charlie',
    timestamp: now - 38 * min,
  },
  {
    id: '5',
    roomId: 'general',
    content: 'I just tested the staging build. The login page loads in under 200ms now, down from 1.2s. Great optimization work!',
    sender: 'diana',
    timestamp: now - 30 * min,
    reactions: { '🔥': ['alice', 'bob'] },
  },
  {
    id: '6',
    roomId: 'general',
    content: 'https://picsum.photos/400/250',
    sender: 'bob',
    timestamp: now - 25 * min,
    type: 'image',
  },
  {
    id: '7',
    roomId: 'general',
    content: 'Caught this from the office window today 😄',
    sender: 'bob',
    timestamp: now - 25 * min,
  },
  // Call log
  {
    id: '8',
    roomId: 'general',
    content: '',
    sender: 'charlie',
    timestamp: now - 20 * min,
    type: 'callLog',
    callStatus: 'ended',
    duration: 185,
    to: 'alice',
  },
  // Voice message
  {
    id: '9',
    roomId: 'general',
    content: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=',
    sender: 'diana',
    timestamp: now - 15 * min,
    type: 'voice',
    duration: 12,
  },
  // File share
  {
    id: '10',
    roomId: 'general',
    content: 'data:text/plain;base64,ZmFrZSBmaWxlIGNvbnRlbnQ=',
    sender: 'alice',
    timestamp: now - 10 * min,
    type: 'file',
    fileName: 'deploy-config.yml',
    fileType: 'text/yaml',
  },
  // Location
  {
    id: '11',
    roomId: 'general',
    content: JSON.stringify({ lat: 30.0444, lng: 31.2357 }),
    sender: 'charlie',
    timestamp: now - 5 * min,
    type: 'location',
  },
  {
    id: '12',
    roomId: 'general',
    content: 'For anyone in Cairo, there\'s a great tech meetup tonight at that location! 📍',
    sender: 'charlie',
    timestamp: now - 5 * min,
  },
  // DM with alice
  {
    id: '13',
    roomId: 'dm:alice-you',
    content: 'Hey! Do you have a minute to review my PR?',
    sender: 'alice',
    timestamp: now - 60 * min,
  },
  {
    id: '14',
    roomId: 'dm:alice-you',
    content: 'Sure, send me the link and I\'ll take a look right away',
    sender: 'you',
    timestamp: now - 58 * min,
  },
  {
    id: '15',
    roomId: 'dm:alice-you',
    content: 'Thanks! I also wanted to ask about the database migration — should we use a separate migration file or add it to the existing one?',
    sender: 'alice',
    timestamp: now - 55 * min,
  },
  // DM with bob
  {
    id: '16',
    roomId: 'dm:bob-you',
    content: 'The WebSocket connection keeps dropping on mobile. Have you seen this before?',
    sender: 'bob',
    timestamp: now - 120 * min,
  },
  {
    id: '17',
    roomId: 'dm:bob-you',
    content: 'Yeah, it\'s usually a timeout issue. Try increasing the heartbeat interval',
    sender: 'you',
    timestamp: now - 118 * min,
  },
];

export const demoResponses = [
  'That sounds great! Let me know if you need any help with that.',
  'I was just thinking about the same thing. We should definitely look into it.',
  'Good point! I\'ll add that to the backlog for next sprint.',
  '💯 couldn\'t agree more',
  'Let me check and get back to you on that.',
  'Nice! The team is going to love this.',
  'Interesting approach. Have you considered using a different strategy?',
  'Works for me! 👍',
  'I just pushed a fix for that. Can you pull and test?',
];