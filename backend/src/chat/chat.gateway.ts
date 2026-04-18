/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { AuthService } from '../auth/auth.service';

interface ChatMessage {
  id: string;
  roomId: string;
  content: string;
  sender: string;
  timestamp: number;
  type?: 'text' | 'voice' | 'callLog' | 'image' | 'file' | 'location';
  duration?: number;
  callStatus?: 'ended' | 'missed' | 'rejected';
  to?: string;
  fileName?: string;
  fileType?: string;
  reactions?: Record<string, string[]>;
}

interface VoiceMessagePayload {
  roomId: string;
  audio: string;
  duration: number;
}

interface PrivateVoiceMessagePayload {
  to: string;
  audio: string;
  duration: number;
}

interface ImageMessagePayload {
  roomId: string;
  image: string;
}

interface PrivateImageMessagePayload {
  to: string;
  image: string;
}

interface FileMessagePayload {
  roomId: string;
  file: string;
  fileName: string;
  fileType: string;
}

interface PrivateFileMessagePayload {
  to: string;
  file: string;
  fileName: string;
  fileType: string;
}

interface LocationMessagePayload {
  roomId: string;
  lat: number;
  lng: number;
}

interface PrivateLocationMessagePayload {
  to: string;
  lat: number;
  lng: number;
}

interface RoomInfo {
  id: string;
  name: string;
  memberCount: number;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private rooms: Map<string, string> = new Map([['general', 'general']]);

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
  ) {}

  private getOnlineUsers(): string[] {
    const seen = new Set<string>();
    for (const socket of this.server.sockets.sockets.values()) {
      if (socket.data.joined && socket.data.username) {
        seen.add(socket.data.username as string);
      }
    }
    return [...seen];
  }

  private getRoomList(): RoomInfo[] {
    const list: RoomInfo[] = [];
    for (const [id, name] of this.rooms) {
      const sockets = this.server.sockets.adapter.rooms.get(id);
      list.push({ id, name, memberCount: sockets ? sockets.size : 0 });
    }
    return list;
  }

  private broadcastUserList() {
    this.server.emit('userList', { users: this.getOnlineUsers() });
  }

  private broadcastRoomList() {
    this.server.emit('roomList', { rooms: this.getRoomList() });
  }

  private formatMessage = (row: {
    id: number;
    roomId: string;
    content: string;
    sender: string;
    recipient: string | null;
    type: string;
    duration: number;
    callStatus: string | null;
    fileName: string | null;
    fileType: string | null;
    reactions: string | null;
    createdAt: Date;
  }): ChatMessage => {
    const msg: ChatMessage = {
      id: String(row.id),
      roomId: row.roomId,
      content: row.content,
      sender: row.sender,
      timestamp: new Date(row.createdAt).getTime(),
      type: (row.type as ChatMessage['type']) || undefined,
      duration: row.duration || undefined,
      callStatus: (row.callStatus as ChatMessage['callStatus']) || undefined,
      to: row.recipient || undefined,
      fileName: row.fileName || undefined,
      fileType: row.fileType || undefined,
    };
    if (row.reactions) {
      try {
        msg.reactions = JSON.parse(row.reactions);
      } catch {
        msg.reactions = {};
      }
    }
    return msg;
  };

  handleConnection(client: Socket) {
    const token = client.handshake.auth?.token || client.handshake.query?.token;
    if (!token || typeof token !== 'string') {
      client.emit('authError', { message: 'Authentication required' });
      client.disconnect();
      return;
    }

    const payload = this.authService.validateToken(token);
    if (!payload) {
      client.emit('authError', { message: 'Invalid or expired token' });
      client.disconnect();
      return;
    }

    client.data.username = payload.username;
    client.data.userId = payload.userId;
    client.data.joined = false;
  }

  handleDisconnect() {
    setTimeout(() => {
      this.broadcastUserList();
      this.broadcastRoomList();
    }, 100);
  }

  @SubscribeMessage('joinChat')
  async handleJoinChat(client: Socket) {
    if (client.data.joined) return;
    if (!client.data.username) {
      client.emit('authError', { message: 'Authentication required' });
      return;
    }
    client.data.joined = true;
    client.join('general');
    if (!this.rooms.has('general')) {
      this.rooms.set('general', 'general');
    }
    await this.chatService.ensureRoom('general', 'general');
    this.broadcastUserList();
    this.broadcastRoomList();
    client.emit('joinedRoom', { roomId: 'general' });

    const history = await this.chatService.getMessages('general', 100);
    client.emit('messageHistory', {
      messages: history.map(this.formatMessage),
    });

    const dmList = await this.chatService.getDmList(
      client.data.username as string,
    );
    client.emit('dmList', { dms: dmList });
  }

  @SubscribeMessage('createRoom')
  async handleCreateRoom(client: Socket, payload: { roomId: string }) {
    const roomId = (payload.roomId || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '');
    if (!roomId) return;
    if (!client.data.joined) {
      client.data.joined = true;
      this.broadcastUserList();
    }
    this.rooms.set(roomId, roomId);
    await this.chatService.ensureRoom(roomId, roomId);
    client.join(roomId);
    this.broadcastRoomList();
    client.emit('joinedRoom', { roomId });

    const history = await this.chatService.getMessages(roomId, 100);
    client.emit('messageHistory', {
      messages: history.map(this.formatMessage),
    });
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(client: Socket, payload: { roomId: string }) {
    const roomId = (payload.roomId || '').trim();
    if (!roomId) return;
    if (!client.data.joined) {
      client.data.joined = true;
      this.broadcastUserList();
    }
    client.join(roomId);
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, roomId);
      await this.chatService.ensureRoom(roomId, roomId);
    }
    client.to(roomId).emit('userJoined', {
      username: client.data.username as string,
      roomId,
    });
    this.broadcastRoomList();
    client.emit('joinedRoom', { roomId });

    const history = await this.chatService.getMessages(roomId, 100);
    client.emit('messageHistory', {
      messages: history.map(this.formatMessage),
    });
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(client: Socket, payload: { roomId: string }) {
    const roomId = (payload.roomId || '').trim();
    if (!roomId) return;
    client.leave(roomId);
    client.to(roomId).emit('userLeft', {
      username: client.data.username as string,
      roomId,
    });
    this.broadcastRoomList();
  }

  @SubscribeMessage('message')
  async handleMessage(
    client: Socket,
    payload: { roomId: string; content: string },
  ) {
    const sender = client.data.username as string;
    const saved = await this.chatService.saveMessage({
      roomId: payload.roomId,
      content: payload.content,
      sender,
      type: 'text',
    });
    const message: ChatMessage = this.formatMessage(saved);
    this.server.to(payload.roomId).emit('message', message);
  }

  @SubscribeMessage('privateMessage')
  async handlePrivateMessage(
    client: Socket,
    payload: { to: string; content: string },
  ) {
    const targetSocket = this.findSocketByUsername(payload.to);
    if (!targetSocket) return;

    const sender = client.data.username as string;
    const dmRoomId = `dm:${[sender, payload.to].sort().join('-')}`;
    const saved = await this.chatService.saveMessage({
      roomId: dmRoomId,
      content: payload.content,
      sender,
      recipient: payload.to,
      type: 'text',
    });
    const message: ChatMessage = this.formatMessage(saved);
    message.to = payload.to;

    targetSocket.emit('privateMessage', message);
    client.emit('privateMessage', message);
  }

  @SubscribeMessage('typing')
  handleTyping(client: Socket, payload: { roomId: string; isTyping: boolean }) {
    const sender = client.data.username as string;
    if (payload.roomId.startsWith('dm:')) {
      const parts = payload.roomId.replace('dm:', '').split('-');
      const partner = parts[0] === sender ? parts[1] : parts[0];
      const target = this.findSocketByUsername(partner);
      if (target) {
        target.emit('typing', { username: sender, isTyping: payload.isTyping });
      }
    } else {
      client.to(payload.roomId).emit('typing', {
        username: sender,
        isTyping: payload.isTyping,
      });
    }
  }

  @SubscribeMessage('voiceOffer')
  handleVoiceOffer(client: Socket, payload: { to: string; offer: unknown }) {
    const target = this.findSocketByUsername(payload.to);
    if (!target) return;
    target.emit('voiceOffer', {
      from: client.data.username as string,
      offer: payload.offer,
    });
  }

  @SubscribeMessage('voiceAnswer')
  handleVoiceAnswer(client: Socket, payload: { to: string; answer: unknown }) {
    const target = this.findSocketByUsername(payload.to);
    if (!target) return;
    target.emit('voiceAnswer', {
      from: client.data.username as string,
      answer: payload.answer,
    });
  }

  @SubscribeMessage('voiceIceCandidate')
  handleVoiceIceCandidate(
    client: Socket,
    payload: { to: string; candidate: unknown },
  ) {
    const target = this.findSocketByUsername(payload.to);
    if (!target) return;
    target.emit('voiceIceCandidate', {
      from: client.data.username as string,
      candidate: payload.candidate,
    });
  }

  @SubscribeMessage('voiceReject')
  handleVoiceReject(client: Socket, payload: { to: string }) {
    const target = this.findSocketByUsername(payload.to);
    if (!target) return;
    target.emit('voiceReject', { from: client.data.username as string });
  }

  @SubscribeMessage('voiceHangUp')
  handleVoiceHangUp(client: Socket, payload: { to: string }) {
    const target = this.findSocketByUsername(payload.to);
    if (!target) return;
    target.emit('voiceHangUp', { from: client.data.username as string });
  }

  @SubscribeMessage('voiceMessage')
  async handleVoiceMessage(client: Socket, payload: VoiceMessagePayload) {
    const sender = client.data.username as string;
    const saved = await this.chatService.saveMessage({
      roomId: payload.roomId,
      content: payload.audio,
      sender,
      type: 'voice',
      duration: payload.duration,
    });
    const message: ChatMessage = this.formatMessage(saved);
    this.server.to(payload.roomId).emit('message', message);
  }

  @SubscribeMessage('privateVoiceMessage')
  async handlePrivateVoiceMessage(
    client: Socket,
    payload: PrivateVoiceMessagePayload,
  ) {
    const targetSocket = this.findSocketByUsername(payload.to);
    if (!targetSocket) return;

    const sender = client.data.username as string;
    const dmRoomId = `dm:${[sender, payload.to].sort().join('-')}`;
    const saved = await this.chatService.saveMessage({
      roomId: dmRoomId,
      content: payload.audio,
      sender,
      recipient: payload.to,
      type: 'voice',
      duration: payload.duration,
    });
    const message: ChatMessage = this.formatMessage(saved);
    message.to = payload.to;

    targetSocket.emit('privateMessage', message);
    client.emit('privateMessage', message);
  }

  @SubscribeMessage('image')
  async handleImage(client: Socket, payload: ImageMessagePayload) {
    const sender = client.data.username as string;
    const saved = await this.chatService.saveMessage({
      roomId: payload.roomId,
      content: payload.image,
      sender,
      type: 'image',
    });
    const message: ChatMessage = this.formatMessage(saved);
    this.server.to(payload.roomId).emit('message', message);
  }

  @SubscribeMessage('privateImage')
  async handlePrivateImage(
    client: Socket,
    payload: PrivateImageMessagePayload,
  ) {
    const targetSocket = this.findSocketByUsername(payload.to);
    if (!targetSocket) return;

    const sender = client.data.username as string;
    const dmRoomId = `dm:${[sender, payload.to].sort().join('-')}`;
    const saved = await this.chatService.saveMessage({
      roomId: dmRoomId,
      content: payload.image,
      sender,
      recipient: payload.to,
      type: 'image',
    });
    const message: ChatMessage = this.formatMessage(saved);
    message.to = payload.to;

    targetSocket.emit('privateMessage', message);
    client.emit('privateMessage', message);
  }

  @SubscribeMessage('file')
  async handleFile(client: Socket, payload: FileMessagePayload) {
    const sender = client.data.username as string;
    const saved = await this.chatService.saveMessage({
      roomId: payload.roomId,
      content: payload.file,
      sender,
      type: 'file',
      fileName: payload.fileName,
      fileType: payload.fileType,
    });
    const message: ChatMessage = this.formatMessage(saved);
    this.server.to(payload.roomId).emit('message', message);
  }

  @SubscribeMessage('privateFile')
  async handlePrivateFile(client: Socket, payload: PrivateFileMessagePayload) {
    const targetSocket = this.findSocketByUsername(payload.to);
    if (!targetSocket) return;

    const sender = client.data.username as string;
    const dmRoomId = `dm:${[sender, payload.to].sort().join('-')}`;
    const saved = await this.chatService.saveMessage({
      roomId: dmRoomId,
      content: payload.file,
      sender,
      recipient: payload.to,
      type: 'file',
      fileName: payload.fileName,
      fileType: payload.fileType,
    });
    const message: ChatMessage = this.formatMessage(saved);
    message.to = payload.to;

    targetSocket.emit('privateMessage', message);
    client.emit('privateMessage', message);
  }

  @SubscribeMessage('location')
  async handleLocation(client: Socket, payload: LocationMessagePayload) {
    const sender = client.data.username as string;
    const saved = await this.chatService.saveMessage({
      roomId: payload.roomId,
      content: JSON.stringify({ lat: payload.lat, lng: payload.lng }),
      sender,
      type: 'location',
    });
    const message: ChatMessage = this.formatMessage(saved);
    this.server.to(payload.roomId).emit('message', message);
  }

  @SubscribeMessage('privateLocation')
  async handlePrivateLocation(
    client: Socket,
    payload: PrivateLocationMessagePayload,
  ) {
    const targetSocket = this.findSocketByUsername(payload.to);
    if (!targetSocket) return;

    const sender = client.data.username as string;
    const dmRoomId = `dm:${[sender, payload.to].sort().join('-')}`;
    const saved = await this.chatService.saveMessage({
      roomId: dmRoomId,
      content: JSON.stringify({ lat: payload.lat, lng: payload.lng }),
      sender,
      recipient: payload.to,
      type: 'location',
    });
    const message: ChatMessage = this.formatMessage(saved);
    message.to = payload.to;

    targetSocket.emit('privateMessage', message);
    client.emit('privateMessage', message);
  }

  @SubscribeMessage('react')
  async handleReact(
    client: Socket,
    payload: { messageId: number; emoji: string },
  ) {
    const username = client.data.username as string;
    const result = await this.chatService.toggleReaction(
      payload.messageId,
      username,
      payload.emoji,
    );
    if (!result) return;

    const reactionUpdate = {
      messageId: String(payload.messageId),
      reactions: result.reactions,
    };

    // Send to all in room INCLUDING the sender
    this.server.in(result.roomId).emit('reactionUpdate', reactionUpdate);
  }

  @SubscribeMessage('callLog')
  async handleCallLog(
    client: Socket,
    payload: {
      to: string;
      callStatus: 'ended' | 'missed' | 'rejected';
      duration: number;
    },
  ) {
    const targetSocket = this.findSocketByUsername(payload.to);
    if (!targetSocket) return;

    const sender = client.data.username as string;
    const dmRoomId = `dm:${[sender, payload.to].sort().join('-')}`;
    const saved = await this.chatService.saveMessage({
      roomId: dmRoomId,
      content: payload.callStatus,
      sender,
      recipient: payload.to,
      type: 'callLog',
      duration: payload.duration,
      callStatus: payload.callStatus,
    });
    const message: ChatMessage = this.formatMessage(saved);
    message.to = payload.to;

    targetSocket.emit('privateMessage', message);
    client.emit('privateMessage', message);
  }

  @SubscribeMessage('getDmHistory')
  async handleGetDmHistory(client: Socket, payload: { username: string }) {
    const sender = client.data.username as string;
    const dmRoomId = `dm:${[sender, payload.username].sort().join('-')}`;
    const history = await this.chatService.getMessages(dmRoomId, 100);
    client.emit('messageHistory', {
      messages: history.map(this.formatMessage),
    });
  }

  private findSocketByUsername(username: string): Socket | undefined {
    for (const socket of this.server.sockets.sockets.values()) {
      if (socket.data.username === username) {
        return socket;
      }
    }
    return undefined;
  }
}