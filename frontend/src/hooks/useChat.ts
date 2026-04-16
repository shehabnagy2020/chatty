import { io, Socket } from 'socket.io-client';
import { useEffect, useState, useCallback, useRef } from 'react';
import type { ChatMessage, UserListEvent, TypingEvent, RoomListEvent, PrivateMessageEvent, MessageHistoryEvent, DmListEvent } from '../types';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || '';

function useSocket(token: string | null) {
  const [socketResult, setSocketResult] = useState<{ socket: Socket | null }>({ socket: null });
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) {
      if (socketResult.socket) {
        socketResult.socket.disconnect();
      }
      setSocketResult({ socket: null });
      setConnected(false);
      return;
    }

    const s = io(SERVER_URL, {
      autoConnect: true,
      auth: { token },
    });
    setSocketResult({ socket: s });

    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));

    return () => {
      s.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return { socket: socketResult.socket, connected };
}

function useChat(socket: Socket | null, initialUsername: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const username = initialUsername;
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [rooms, setRooms] = useState<RoomListEvent['rooms']>([]);
  const [typingUsers, setTypingUsers] = useState<Map<string, Set<string>>>(new Map());
  const [dmList, setDmList] = useState<string[]>([]);
  const [unread, setUnread] = useState<Map<string, number>>(new Map());
  const activeChannelRef = useRef<string>('general');
  const onMessageRef = useRef<((msg: ChatMessage) => void) | null>(null);
  const onPrivateMessageRef = useRef<((msg: PrivateMessageEvent) => void) | null>(null);

  const setActiveChannel = useCallback((channel: string) => {
    activeChannelRef.current = channel;
    setUnread(prev => {
      const next = new Map(prev);
      next.delete(channel);
      return next;
    });
  }, []);

  const incrementUnread = useCallback((roomId: string) => {
    if (roomId === activeChannelRef.current) return;
    setUnread(prev => {
      const next = new Map(prev);
      next.set(roomId, (next.get(roomId) || 0) + 1);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onMessage = (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
      incrementUnread(msg.roomId);
      onMessageRef.current?.(msg);
    };
    const onMessageHistory = (data: MessageHistoryEvent) => {
      setMessages(prev => {
        const existingIds = new Set(prev.map(m => m.id));
        const newMsgs = data.messages.filter(m => !existingIds.has(m.id));
        return [...prev, ...newMsgs];
      });
    };
    const onUserList = (data: UserListEvent) => setOnlineUsers(data.users);
    const onRoomList = (data: RoomListEvent) => setRooms(data.rooms);
    const onPrivateMessage = (msg: PrivateMessageEvent) => {
      setMessages(prev => [...prev, msg]);
      incrementUnread(msg.roomId);
      onPrivateMessageRef.current?.(msg);
    };
    const onTyping = (data: TypingEvent) => {
      setTypingUsers(prev => {
        const next = new Map(prev);
        const room = next.get(data.username) || new Set<string>();
        if (data.isTyping) {
          next.set(data.username, room);
        } else {
          next.delete(data.username);
        }
        return next;
      });
    };
    const onDmList = (data: DmListEvent) => {
      setDmList(data.dms);
    };
    const onAuthError = () => {
      localStorage.removeItem('chatty_token');
      localStorage.removeItem('chatty_username');
      sessionStorage.removeItem('chatty_token');
      sessionStorage.removeItem('chatty_username');
      window.location.reload();
    };

    socket.on('message', onMessage);
    socket.on('messageHistory', onMessageHistory);
    socket.on('userList', onUserList);
    socket.on('roomList', onRoomList);
    socket.on('privateMessage', onPrivateMessage);
    socket.on('typing', onTyping);
    socket.on('dmList', onDmList);
    socket.on('authError', onAuthError);

    socket.emit('joinChat');

    return () => {
      socket.off('message', onMessage);
      socket.off('messageHistory', onMessageHistory);
      socket.off('userList', onUserList);
      socket.off('roomList', onRoomList);
      socket.off('privateMessage', onPrivateMessage);
      socket.off('typing', onTyping);
      socket.off('dmList', onDmList);
      socket.off('authError', onAuthError);
    };
  }, [socket, incrementUnread]);

  const joinRoom = useCallback((roomId: string) => {
    socket?.emit('joinRoom', { roomId });
  }, [socket]);

  const createRoom = useCallback((roomId: string) => {
    socket?.emit('createRoom', { roomId });
  }, [socket]);

  const leaveRoom = useCallback((roomId: string) => {
    socket?.emit('leaveRoom', { roomId });
  }, [socket]);

  const sendMessage = useCallback((roomId: string, content: string) => {
    socket?.emit('message', { roomId, content });
  }, [socket]);

  const sendPrivateMessage = useCallback((to: string, content: string) => {
    socket?.emit('privateMessage', { to, content });
  }, [socket]);

  const setTyping = useCallback((roomId: string, isTyping: boolean) => {
    socket?.emit('typing', { roomId, isTyping });
  }, [socket]);

  const sendVoiceMessage = useCallback((roomId: string, audio: string, duration: number) => {
    socket?.emit('voiceMessage', { roomId, audio, duration });
  }, [socket]);

  const sendPrivateVoiceMessage = useCallback((to: string, audio: string, duration: number) => {
    socket?.emit('privateVoiceMessage', { to, audio, duration });
  }, [socket]);

  const sendCallLog = useCallback((to: string, callStatus: 'ended' | 'missed' | 'rejected', duration: number) => {
    socket?.emit('callLog', { to, callStatus, duration });
  }, [socket]);

  const sendImage = useCallback((roomId: string, image: string) => {
    socket?.emit('image', { roomId, image });
  }, [socket]);

  const sendPrivateImage = useCallback((to: string, image: string) => {
    socket?.emit('privateImage', { to, image });
  }, [socket]);

  const getDmHistory = useCallback((otherUser: string) => {
    socket?.emit('getDmHistory', { username: otherUser });
  }, [socket]);

  return {
    messages,
    username,
    onlineUsers,
    rooms,
    typingUsers,
    dmList,
    unread,
    setActiveChannel,
    joinRoom,
    createRoom,
    leaveRoom,
    sendMessage,
    sendPrivateMessage,
    setTyping,
    sendVoiceMessage,
    sendPrivateVoiceMessage,
    sendCallLog,
    sendImage,
    sendPrivateImage,
    onMessageRef,
    onPrivateMessageRef,
    getDmHistory,
  };
}

export { useSocket, useChat };