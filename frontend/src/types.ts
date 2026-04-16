export interface ChatMessage {
  id: string;
  roomId: string;
  content: string;
  sender: string;
  timestamp: number;
  type?: 'text' | 'voice' | 'callLog' | 'image';
  duration?: number;
  callStatus?: 'ended' | 'missed' | 'rejected';
  to?: string;
}

export interface UserListEvent {
  users: string[];
}

export interface WelcomeEvent {
  username: string;
}

export interface UserJoinedEvent {
  username: string;
  roomId: string;
}

export interface TypingEvent {
  username: string;
  isTyping: boolean;
}

export interface RoomInfo {
  id: string;
  name: string;
  memberCount: number;
}

export interface RoomListEvent {
  rooms: RoomInfo[];
}

export interface PrivateMessageEvent extends ChatMessage {
  to: string;
}

export interface VoiceOfferEvent {
  from: string;
  offer: RTCSessionDescriptionInit;
}

export interface VoiceAnswerEvent {
  from: string;
  answer: RTCSessionDescriptionInit;
}

export interface VoiceIceCandidateEvent {
  from: string;
  candidate: RTCIceCandidateInit;
}

export interface VoiceHangUpEvent {
  from: string;
}

export interface VoiceRejectEvent {
  from: string;
}

export interface UsernameChangedEvent {
  username: string;
}

export interface UsernameErrorEvent {
  message: string;
}

export interface MessageHistoryEvent {
  messages: ChatMessage[];
}

export interface DmListEvent {
  dms: string[];
}

export interface AuthResponse {
  accessToken: string;
  username: string;
}

export interface AuthError {
  message: string;
}