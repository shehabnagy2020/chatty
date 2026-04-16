import { useState, useRef, useEffect, useCallback } from 'react';
import EmojiPicker from 'emoji-picker-react';
import type { EmojiClickData } from 'emoji-picker-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Group,
  Badge,
  Text,
  Avatar,
  Paper,
  TextInput,
  Button,
  Container,
  Stack,
  Indicator,
  ScrollArea,
  Divider,
  ActionIcon,
  Tooltip,
  NavLink,
  Modal,
  Popover,
  Box,
  Progress,
  PasswordInput,
  Tabs,
  Alert,
  Transition,
  Checkbox,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import type { ChatMessage, RoomInfo, PrivateMessageEvent } from './types';
import { useSocket, useChat } from './hooks/useChat';
import { useVoiceChat } from './hooks/useVoiceChat';
import type { CallLogData } from './hooks/useVoiceChat';
import { useNotifications } from './hooks/useNotifications';
import { useAuth } from './hooks/useAuth';

function getDmRoomId(a: string, b: string) {
  return `dm:${[a, b].sort().join('-')}`;
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function TypingDots() {
  return (
    <Group gap={3} align="center" px={4}>
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
    </Group>
  );
}

function VoiceMessageBubble({ audioData, duration, isOwn }: { audioData: string; duration: number; isOwn: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
    }
  };

  return (
    <Group gap="xs" wrap="nowrap" align="center" style={{ minWidth: 120 }}>
      <ActionIcon
        variant="filled"
        color={isOwn ? 'violet.2' : 'violet'}
        size="sm"
        onClick={togglePlay}
        radius="xl"
        className="animate-fade-in"
      >
        {playing ? '⏸' : '▶'}
      </ActionIcon>
      <div style={{ flex: 1 }}>
        <Progress
          value={progress}
          size="xs"
          color={isOwn ? 'violet.2' : 'violet'}
          radius="xl"
          style={{ marginTop: 2 }}
        />
        <Text size="xs" c={isOwn ? 'violet.1' : 'dimmed'} mt={2}>
          {formatDuration(duration)}
        </Text>
      </div>
      <audio
        ref={audioRef}
        src={audioData}
        onEnded={() => { setPlaying(false); setProgress(0); }}
        onPause={() => setPlaying(false)}
        onTimeUpdate={() => {
          if (audioRef.current) {
            const pct = audioRef.current.duration
              ? (audioRef.current.currentTime / audioRef.current.duration) * 100
              : 0;
            setProgress(pct);
          }
        }}
        style={{ display: 'none' }}
      />
    </Group>
  );
}

function CallLogBubble({ callStatus, duration }: { callStatus: 'ended' | 'missed' | 'rejected'; duration: number }) {
  const icon = callStatus === 'missed' ? '📞❌' : callStatus === 'rejected' ? '📞✕' : '📞✓';
  const label = callStatus === 'missed'
    ? 'Missed call'
    : callStatus === 'rejected'
      ? 'Call rejected'
      : duration > 0 ? `Call ended · ${formatDuration(duration)}` : 'Call ended';
  const color = callStatus === 'missed' ? 'red' : callStatus === 'rejected' ? 'orange' : 'green';
  return (
    <Group gap="xs" wrap="nowrap" align="center">
      <Text size="sm">{icon}</Text>
      <Text size="sm" fw={500} c={color}>{label}</Text>
    </Group>
  );
}

function AuthScreen({ onLogin, onRegister, loading, error, setError }: {
  onLogin: (username: string, password: string, remember: boolean) => Promise<boolean>;
  onRegister: (username: string, password: string, remember: boolean) => Promise<boolean>;
  loading: boolean;
  error: string | null;
  setError: (err: string | null) => void;
}) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = async () => {
    // Re-read values from DOM in case autofill didn't trigger React onChange
    const usernameInput = document.getElementById('auth-username') as HTMLInputElement | null;
    const passwordInput = document.getElementById('auth-password') as HTMLInputElement | null;
    const u = (usernameInput?.value || username).trim();
    const p = passwordInput?.value || password;
    if (!u || !p) return;
    if (mode === 'login') {
      await onLogin(u, p, rememberMe);
    } else {
      await onRegister(u, p, rememberMe);
    }
  };

  return (
    <Container size={420} mih="100vh" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} px="md">
      <Paper shadow="xl" radius="xl" p="xl" w="100%" withBorder className="auth-card">
        <Stack align="center" gap="md">
          <div className="auth-emoji" style={{ fontSize: 48, lineHeight: 1 }}>💬</div>
          <Text fw={900} size="2.5rem" variant="gradient" gradient={{ from: 'violet', to: 'grape', deg: 135 }}>
            Chatty
          </Text>
          <Text c="dimmed" size="sm" ta="center">Connect with friends in real-time</Text>
          <Tabs value={mode} onChange={(v) => { setMode(v as 'login' | 'register'); setError(null); }} w="100%">
            <Tabs.List grow>
              <Tabs.Tab value="login">Sign In</Tabs.Tab>
              <Tabs.Tab value="register">Sign Up</Tabs.Tab>
            </Tabs.List>
          </Tabs>
          <Transition mounted={!!error} transition="slide-down" duration={300}>
            {(styles) => (
              <Alert color="red" variant="light" w="100%" style={styles}>
                {error}
              </Alert>
            )}
          </Transition>
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} style={{ width: '100%' }}>
          <TextInput
            id="auth-username"
            w="100%"
            label="Username"
            placeholder="Enter your username"
            size="md"
            value={username}
            onChange={(e) => setUsername(e.currentTarget.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            maxLength={20}
            autoComplete="username"
            styles={(theme) => ({
              input: { background: theme.colors.dark[6], borderColor: theme.colors.dark[4], transition: 'border-color 0.2s' },
            })}
          />
          <PasswordInput
            id="auth-password"
            w="100%"
            label="Password"
            placeholder="Enter your password"
            size="md"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            autoComplete="current-password"
            styles={(theme) => ({
              input: { background: theme.colors.dark[6], borderColor: theme.colors.dark[4], transition: 'border-color 0.2s' },
            })}
          />
          </form>
          {mode === 'login' && (
            <Checkbox
              label="Remember me"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.currentTarget.checked)}
              color="violet"
              size="sm"
            />
          )}
          <Button
            fullWidth size="lg"
            variant="gradient"
            gradient={{ from: 'violet', to: 'grape', deg: 135 }}
            disabled={!username.trim() || !password || loading}
            loading={loading}
            onClick={handleSubmit}
            radius="xl"
            className="animate-pulse-glow"
            style={(!username.trim() || !password) ? { animation: 'none' } : undefined}
          >
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </Button>
          <Text size="xs" c="dimmed" ta="center">
            {mode === 'login'
              ? "Don't have an account? Switch to Sign Up above"
              : 'Already have an account? Switch to Sign In above'}
          </Text>
        </Stack>
      </Paper>
    </Container>
  );
}

function Sidebar({
  activeChannel,
  onSelectRoom,
  onSelectDm,
  rooms,
  onlineUsers,
  username,
  onOpenCreateRoom,
  dms,
  inCallWith,
  isCalling,
  onCallUser,
  onNavigate,
  unread,
}: {
  activeChannel: string;
  onSelectRoom: (id: string) => void;
  onSelectDm: (username: string) => void;
  rooms: RoomInfo[];
  onlineUsers: string[];
  username: string;
  onOpenCreateRoom: () => void;
  dms: Set<string>;
  inCallWith: string | null;
  isCalling: boolean;
  onCallUser: (username: string) => void;
  onNavigate?: () => void;
  unread: Map<string, number>;
}) {
  const others = onlineUsers.filter(u => u !== username);

  const handleSelectRoom = (id: string) => {
    onSelectRoom(id);
    onNavigate?.();
  };

  const handleSelectDm = (user: string) => {
    onSelectDm(user);
    onNavigate?.();
  };

  return (
    <Stack gap={0} h="100%">
      <Group justify="space-between" px="md" py="sm">
        <Text size="sm" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: 1 }}>Rooms</Text>
        <Tooltip label="Create room">
          <ActionIcon variant="subtle" color="violet" size="sm" onClick={onOpenCreateRoom}>+</ActionIcon>
        </Tooltip>
      </Group>
      <ScrollArea style={{ flex: 1 }} offsetScrollbars>
        <Stack gap={2}>
          {rooms.map((room, i) => {
            const roomUnread = unread.get(room.id) || 0;
            return (
              <NavLink
                key={room.id}
                label={room.name}
                active={activeChannel === room.id}
                onClick={() => handleSelectRoom(room.id)}
                rightSection={
                  <Group gap={4}>
                    {roomUnread > 0 && <Badge size="sm" variant="filled" color="violet" radius="xl">{roomUnread > 99 ? '99+' : roomUnread}</Badge>}
                    <Badge size="sm" variant="light" color="gray" radius="xl">{room.memberCount}</Badge>
                  </Group>
                }
                styles={(theme) => ({
                  root: {
                    borderRadius: theme.radius.md,
                    transition: 'all 0.2s ease',
                    animationDelay: `${i * 50}ms`,
                    '&[data-active]': { background: theme.colors.violet[8], color: 'white' },
                    '&:hover': { background: activeChannel === room.id ? theme.colors.violet[8] : theme.colors.dark[4] },
                  },
                })}
              />
            );
          })}
        </Stack>
        <Divider my="sm" mx="md" color="dark.4" />
        <Group px="md">
          <Text size="sm" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: 1 }}>Direct Messages</Text>
        </Group>
        <Stack gap={2} mt={4}>
          {dms.size > 0 && [...dms].map((dmUser, i) => {
            const dmRoomId = getDmRoomId(username, dmUser);
            const dmUnread = unread.get(dmRoomId) || 0;
            return (
              <NavLink
                key={`dm-${dmUser}`}
                label={dmUser}
                active={activeChannel === dmRoomId}
                onClick={() => handleSelectDm(dmUser)}
                leftSection={<Avatar size={24} radius="xl" color="violet">{dmUser.charAt(0).toUpperCase()}</Avatar>}
                rightSection={dmUnread > 0 ? <Badge size="sm" variant="filled" color="violet" radius="xl">{dmUnread > 99 ? '99+' : dmUnread}</Badge> : null}
                styles={(theme) => ({
                  root: {
                    borderRadius: theme.radius.md,
                    transition: 'all 0.2s ease',
                    animationDelay: `${i * 50}ms`,
                    '&[data-active]': { background: theme.colors.violet[8], color: 'white' },
                    '&:hover': { background: activeChannel === dmRoomId ? theme.colors.violet[8] : theme.colors.dark[4] },
                  },
                })}
              />
            );
          })}
          {dms.size === 0 && <Text size="xs" c="dimmed" ta="center" px="md" py="xs">No conversations yet</Text>}
        </Stack>
        <Divider my="sm" mx="md" color="dark.4" />
        <Group px="md">
          <Text size="sm" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: 1 }}>Online — {others.length}</Text>
        </Group>
        <Stack gap={2} mt={4}>
          {others.map((user, i) => (
            <Group key={`online-${user}`} gap={0} px="md" className="animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
              <NavLink
                label={user}
                onClick={() => handleSelectDm(user)}
                leftSection={<Indicator size={8} color="green" inline offset={4} processing />}
                styles={(theme) => ({
                  root: { borderRadius: theme.radius.md, flex: 1, transition: 'all 0.2s ease' },
                })}
              />
              <Tooltip label={isCalling ? 'Calling...' : 'Voice call'}>
                <ActionIcon
                  variant="subtle"
                  color="violet"
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); onCallUser(user); }}
                  disabled={inCallWith !== null || isCalling}
                >
                  {isCalling ? (
                    <div style={{ width: 12, height: 12, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  ) : (
                    '📞'
                  )}
                </ActionIcon>
              </Tooltip>
            </Group>
          ))}
        </Stack>
      </ScrollArea>
    </Stack>
  );
}

function CreateRoomModal({ opened, onClose, onCreate }: { opened: boolean; onClose: () => void; onCreate: (name: string) => void }) {
  const [name, setName] = useState('');

  const handleCreate = () => {
    const id = name.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
    if (!id) return;
    onCreate(id);
    setName('');
    onClose();
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Create Room" centered radius="xl">
      <Stack>
        <TextInput
          label="Room name"
          placeholder="e.g. general, gaming, dev"
          description="Only lowercase letters, numbers, hyphens, and underscores"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
          maxLength={30}
          styles={(theme) => ({
            input: { background: theme.colors.dark[6], borderColor: theme.colors.dark[4] },
          })}
        />
        <Button onClick={handleCreate} disabled={!name.trim()} radius="xl">Create</Button>
      </Stack>
    </Modal>
  );
}

function ChatScreen({
  username,
  messages,
  onlineUsers,
  rooms,
  typingUsers,
  activeChannel,
  setActiveChannel,
  onJoinRoom,
  onLeaveRoom,
  onCreateRoom,
  onSendMessage,
  onSendPrivateMessage,
  onSendVoiceMessage,
  onSendPrivateVoiceMessage,
  onSendCallLog,
  onSendImage,
  onSendPrivateImage,
  onTyping,
  onLogout,
  voiceChat,
  onMessageRef,
  onPrivateMessageRef,
  initialDmList,
  getDmHistory,
  unread,
}: {
  username: string;
  messages: ChatMessage[];
  onlineUsers: string[];
  rooms: RoomInfo[];
  typingUsers: Map<string, Set<string>>;
  activeChannel: string;
  setActiveChannel: (channel: string) => void;
  onJoinRoom: (roomId: string) => void;
  onLeaveRoom: (roomId: string) => void;
  onCreateRoom: (roomId: string) => void;
  onSendMessage: (roomId: string, content: string) => void;
  onSendPrivateMessage: (to: string, content: string) => void;
  onSendVoiceMessage: (roomId: string, audio: string, duration: number) => void;
  onSendPrivateVoiceMessage: (to: string, audio: string, duration: number) => void;
  onSendCallLog: (to: string, callStatus: 'ended' | 'missed' | 'rejected', duration: number) => void;
  onSendImage: (roomId: string, image: string) => void;
  onSendPrivateImage: (to: string, image: string) => void;
  onTyping: (roomId: string, isTyping: boolean) => void;
  onLogout: () => void;
  voiceChat: ReturnType<typeof useVoiceChat>;
  onMessageRef: React.MutableRefObject<((msg: ChatMessage) => void) | null>;
  onPrivateMessageRef: React.MutableRefObject<((msg: PrivateMessageEvent) => void) | null>;
  initialDmList: string[];
  getDmHistory: (username: string) => void;
  unread: Map<string, number>;
}) {
  const isMobile = useMediaQuery('(max-width: 48em)');
  const [mobileNavOpened, { toggle: toggleMobileNav, close: closeMobileNav }] = useDisclosure(false);
  const [input, setInput] = useState('');
  const [emojiOpened, setEmojiOpened] = useState(false);
  const [createRoomOpened, { open: openCreateRoom, close: closeCreateRoom }] = useDisclosure(false);
  const [recording, setRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingDurationRef = useRef(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dms, setDms] = useState<Set<string>>(new Set(initialDmList));
  const [joinedRooms, setJoinedRooms] = useState<Set<string>>(new Set(['general']));
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const activeChannelRef = useRef(activeChannel);

  const { notifyMessage, notifyPrivateMessage, notifyCallIncoming, notifyCallEnded } = useNotifications(username, activeChannel);

  const prevDmListRef = useRef(initialDmList);
  // eslint-disable-next-line react-hooks/refs
  if (initialDmList !== prevDmListRef.current) {
    // eslint-disable-next-line react-hooks/refs
    prevDmListRef.current = initialDmList;
    setDms(new Set(initialDmList));
  }

  useEffect(() => {
    onMessageRef.current = (msg: ChatMessage) => {
      notifyMessage(msg);
    };
    onPrivateMessageRef.current = (msg: PrivateMessageEvent) => {
      notifyPrivateMessage(msg);
      const otherUser = msg.sender === username ? msg.to : msg.sender;
      if (otherUser && otherUser !== username) {
        setDms(prev => new Set(prev).add(otherUser));
      }
    };
    return () => {
      onMessageRef.current = null;
      onPrivateMessageRef.current = null;
    };
  }, [username, onMessageRef, onPrivateMessageRef, notifyMessage, notifyPrivateMessage]);

  useEffect(() => {
    const callLogRef = voiceChat.onCallLogRef;
    callLogRef.current = (log: CallLogData) => {
      onSendCallLog(log.to, log.callStatus, log.duration);
    };
    return () => {
      callLogRef.current = null;
    };
  }, [onSendCallLog, voiceChat.onCallLogRef]);

  useEffect(() => {
    if (voiceChat.incomingCall) {
      notifyCallIncoming();
    } else {
      notifyCallEnded();
    }
  }, [voiceChat.incomingCall, notifyCallIncoming, notifyCallEnded]);

  useEffect(() => {
    activeChannelRef.current = activeChannel;
  }, [activeChannel]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const isNearBottom = () => {
      const threshold = 150;
      return viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < threshold;
    };
    const scrollToBottom = () => {
      viewport.scrollTop = viewport.scrollHeight;
    };
    const observer = new ResizeObserver(() => {
      if (isNearBottom()) {
        scrollToBottom();
      }
    });
    observer.observe(viewport.firstElementChild || viewport);
    scrollToBottom();
    return () => observer.disconnect();
  }, [activeChannel]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const threshold = 150;
    const isNearBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < threshold;
    if (isNearBottom) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [messages]);

  const filteredMessages = messages.filter((msg) => msg.roomId === activeChannel);

  const isDm = activeChannel.startsWith('dm:');

  const dmPartner = isDm
    ? activeChannel.replace('dm:', '').split('-').find(p => p !== username) || activeChannel
    : null;

  const channelLabel = isDm ? dmPartner : activeChannel;

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      if (isDm) {
        const dmUser = [...dms].find(u => getDmRoomId(username, u) === activeChannel);
        if (dmUser) onSendPrivateImage(dmUser, base64);
      } else {
        onSendImage(activeChannel, base64);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [isDm, dms, username, activeChannel, onSendImage, onSendPrivateImage]);

  const handleSelectRoom = (roomId: string) => {
    const prevChannel = activeChannelRef.current;
    if (prevChannel && !prevChannel.startsWith('dm:') && prevChannel !== 'general' && prevChannel !== roomId) {
      onLeaveRoom(prevChannel);
      setJoinedRooms(prev => {
        const next = new Set(prev);
        next.delete(prevChannel);
        return next;
      });
    }
    setActiveChannel(roomId);
    if (!joinedRooms.has(roomId)) {
      onJoinRoom(roomId);
      setJoinedRooms(prev => new Set(prev).add(roomId));
    }
  };

  const handleSelectDm = (otherUser: string) => {
    const prevChannel = activeChannelRef.current;
    if (prevChannel && !prevChannel.startsWith('dm:') && prevChannel !== 'general') {
      onLeaveRoom(prevChannel);
      setJoinedRooms(prev => {
        const next = new Set(prev);
        next.delete(prevChannel);
        return next;
      });
    }
    const dmRoom = getDmRoomId(username, otherUser);
    setActiveChannel(dmRoom);
    setDms(prev => new Set(prev).add(otherUser));
    getDmHistory(otherUser);
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    if (value.length > 0) {
      onTyping(activeChannel, true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => onTyping(activeChannel, false), 2000);
    } else {
      onTyping(activeChannel, false);
    }
  };

  const handleSend = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    if (isDm) {
      const dmUser = [...dms].find(u => getDmRoomId(username, u) === activeChannel);
      if (dmUser) onSendPrivateMessage(dmUser, text);
    } else {
      onSendMessage(activeChannel, text);
    }
    setInput('');
    onTyping(activeChannel, false);
    setEmojiOpened(false);
  }, [input, isDm, dms, username, activeChannel, onSendMessage, onSendPrivateMessage, onTyping]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          const dur = recordingDurationRef.current;
          if (isDm) {
            const dmUser = [...dms].find(u => getDmRoomId(username, u) === activeChannel);
            if (dmUser) onSendPrivateVoiceMessage(dmUser, base64, dur);
          } else {
            onSendVoiceMessage(activeChannel, base64, dur);
          }
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorder.start();
      setRecording(true);
      setRecordingDuration(0);
      recordingDurationRef.current = 0;
      recordingTimerRef.current = setInterval(() => {
        recordingDurationRef.current += 1;
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch {
      setRecording(false);
    }
  }, [isDm, dms, username, activeChannel, onSendVoiceMessage, onSendPrivateVoiceMessage]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setRecording(false);
  }, []);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setInput(prev => prev + emojiData.emoji);
    onTyping(activeChannel, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => onTyping(activeChannel, false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const typingInChannel = isDm
    ? []
    : [...typingUsers.keys()].filter(u => u !== username);

  return (
    <Box style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--mantine-color-dark-8)', overflow: 'hidden' }}>
      {mobileNavOpened && <div className="navbar-overlay" onClick={closeMobileNav} />}

      <Group
        h={56}
        px="sm"
        justify="space-between"
        style={{
          background: 'var(--mantine-color-dark-7)',
          borderBottom: '1px solid var(--mantine-color-dark-4)',
          flexShrink: 0,
          zIndex: 100,
        }}
      >
        <Group gap="xs">
          {isMobile && (
            <ActionIcon
              variant="subtle"
              color="violet"
              size="lg"
              onClick={toggleMobileNav}
              aria-label="Toggle navigation"
              style={{ transition: 'transform 0.3s ease', transform: mobileNavOpened ? 'rotate(90deg)' : 'rotate(0deg)' }}
            >
              ☰
            </ActionIcon>
          )}
          <Text fw={700} size="lg" variant="gradient" gradient={{ from: 'violet', to: 'grape', deg: 135 }}>
            Chatty
          </Text>
        </Group>
        <Group gap="xs">
          <Badge variant="light" color="violet" size="sm" radius="xl" leftSection={<Indicator size={6} color="green" inline />}>
            {username}
          </Badge>
          <Tooltip label="Logout">
            <ActionIcon variant="subtle" color="red" size="sm" onClick={onLogout} style={{ transition: 'transform 0.2s', fontSize: 14 }}>✕</ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {(mobileNavOpened || !isMobile) && (
          <Box
            className={isMobile ? 'navbar-slide' : undefined}
            style={{
              width: isMobile ? 280 : 260,
              background: 'var(--mantine-color-dark-7)',
              borderRight: '1px solid var(--mantine-color-dark-4)',
              overflow: 'auto',
              flexShrink: 0,
              position: isMobile ? 'fixed' as const : 'relative' as const,
              top: isMobile ? 56 : undefined,
              left: isMobile ? 0 : undefined,
              bottom: isMobile ? 0 : undefined,
              zIndex: isMobile ? 200 : undefined,
              height: isMobile ? 'calc(100vh - 56px)' : undefined,
            }}
          >
            <Sidebar
              activeChannel={activeChannel}
              onSelectRoom={handleSelectRoom}
              onSelectDm={handleSelectDm}
              rooms={rooms}
              onlineUsers={onlineUsers}
              username={username}
              onOpenCreateRoom={openCreateRoom}
              dms={dms}
              inCallWith={voiceChat.inCallWith}
              isCalling={voiceChat.isCalling}
              onCallUser={voiceChat.callUser}
              onNavigate={closeMobileNav}
              unread={unread}
            />
          </Box>
        )}

        <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <Group
            px="md"
            py={8}
            style={{
              borderBottom: '1px solid var(--mantine-color-dark-4)',
              flexShrink: 0,
              background: 'var(--mantine-color-dark-7)',
            }}
          >
            {isDm && dmPartner ? (
              <Group gap="xs" align="center" className="animate-slide-up" justify="space-between" w="100%">
                <Group gap="xs" align="center">
                  <Avatar color="violet" radius="xl" size="md">{dmPartner.charAt(0).toUpperCase()}</Avatar>
                  <div>
                    <Text fw={700} size="md">{dmPartner}</Text>
                    <Group gap={4} align="center">
                      <Indicator size={6} color={onlineUsers.includes(dmPartner) ? 'green' : 'gray'} inline />
                      <Text size="xs" c={onlineUsers.includes(dmPartner) ? 'green' : 'dimmed'}>
                        {onlineUsers.includes(dmPartner) ? 'Online' : 'Offline'}
                      </Text>
                    </Group>
                  </div>
                </Group>
                <Tooltip label={voiceChat.isUserOnline(dmPartner) ? 'Voice call' : 'User is offline'}>
                  <ActionIcon
                    variant="subtle"
                    color={voiceChat.isUserOnline(dmPartner) ? 'violet' : 'gray'}
                    size="lg"
                    onClick={() => voiceChat.callUser(dmPartner)}
                    disabled={!voiceChat.isUserOnline(dmPartner) || voiceChat.inCallWith !== null || voiceChat.isCalling}
                    style={{ transition: 'transform 0.2s' }}
                  >
                    {voiceChat.isCalling ? (
                      <div style={{ width: 16, height: 16, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    ) : (
                      '📞'
                    )}
                  </ActionIcon>
                </Tooltip>
              </Group>
            ) : (
              <Group gap="xs" align="center">
                <Text c="violet" fw={700} size="md">#</Text>
                <Text fw={700} size="md" className="animate-fade-in">
                  {channelLabel}
                </Text>
              </Group>
            )}
          </Group>

          <ScrollArea style={{ flex: 1 }} viewportRef={viewportRef}>
            <Stack gap="xs" p="md" style={{ maxWidth: 900, margin: '0 auto' }}>
              {filteredMessages.length === 0 && (
                <Stack align="center" py="xl" gap="xs" className="animate-fade-in">
                  <Text size="3rem" mb="xs">💬</Text>
                  <Text c="dimmed" size="sm" ta="center">No messages yet</Text>
                  <Text c="dimmed" size="xs" ta="center">Be the first to say something!</Text>
                </Stack>
              )}
              {filteredMessages.map((msg) => {
                const isOwn = msg.sender === username;
                const isVoice = msg.type === 'voice';
                const isCallLog = msg.type === 'callLog';
                if (isCallLog) {
                  const callTarget = isOwn ? msg.to || '' : msg.sender;
                  const callLabel = isOwn
                    ? `You called ${callTarget}`
                    : `${msg.sender} called you`;
                  return (
                    <Box key={msg.id} className="msg-call-log" style={{ textAlign: 'center', padding: '6px 0' }}>
                      <Paper radius="xl" px="md" py="xs" bg="dark.4" style={{ display: 'inline-block' }}>
                        <CallLogBubble
                          callStatus={msg.callStatus || 'ended'}
                          duration={msg.duration || 0}
                        />
                      </Paper>
                      <div>
                        <Text size="xs" c="dimmed">{callLabel} · {formatTime(msg.timestamp)}</Text>
                      </div>
                    </Box>
                  );
                }
                return (
                  <Group
                    key={msg.id}
                    justify={isOwn ? 'flex-end' : 'flex-start'}
                    wrap="nowrap"
                    align="flex-start"
                    className={isOwn ? 'msg-bubble-own' : 'msg-bubble-other'}
                  >
                    {!isOwn && (
                      <Avatar color="violet" radius="xl" size="sm" style={{ flexShrink: 0 }}>
                        {msg.sender.charAt(0).toUpperCase()}
                      </Avatar>
                    )}
                    <Paper
                      shadow="xs"
                      radius={isOwn ? 'xl 4px xl xl' : '4px xl xl xl'}
                      bg={isOwn ? 'violet' : 'dark.5'}
                      p="sm"
                      style={{
                        maxWidth: isMobile ? '82%' : '65%',
                        transition: 'transform 0.15s ease',
                      }}
                    >
                      <Group gap="xs" wrap="nowrap">
                        <Text
                          size="xs"
                          fw={600}
                          c={isOwn ? 'violet.1' : 'violet.4'}
                          lineClamp={1}
                          style={{ cursor: isOwn ? 'default' : 'pointer' }}
                          onClick={() => { if (!isOwn) handleSelectDm(msg.sender); }}
                        >
                          {msg.sender}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {formatTime(msg.timestamp)}
                        </Text>
                      </Group>
                      {isVoice ? (
                        <Box mt={4}>
                          <VoiceMessageBubble
                            audioData={msg.content}
                            duration={msg.duration || 0}
                            isOwn={isOwn}
                          />
                        </Box>
                      ) : msg.type === 'image' ? (
                        <Box mt={4}>
                          <img
                            src={msg.content}
                            alt="Shared image"
                            style={{
                              maxWidth: '100%',
                              maxHeight: 300,
                              borderRadius: 8,
                              display: 'block',
                              cursor: 'pointer',
                            }}
                            loading="lazy"
                            onClick={() => setFullscreenImage(msg.content)}
                          />
                        </Box>
                      ) : (
                        <Box size="sm" c={isOwn ? 'white' : undefined} className="chat-markdown" style={{ wordBreak: 'break-word' }}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        </Box>
                      )}
                    </Paper>
                  </Group>
                );
              })}
              {typingInChannel.length > 0 && (
                <Group gap="xs" align="center" pl="sm" className="animate-fade-in">
                  <TypingDots />
                  <Text size="xs" c="dimmed" fs="italic">
                    {typingInChannel.length === 1
                      ? `${typingInChannel[0]} is typing`
                      : `${typingInChannel.length} people typing`}
                  </Text>
                </Group>
              )}
            </Stack>
          </ScrollArea>
        </Box>
      </div>

      <Box
        style={{
          background: 'var(--mantine-color-dark-7)',
          borderTop: '1px solid var(--mantine-color-dark-4)',
          flexShrink: 0,
          zIndex: 50,
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {voiceChat.incomingCall && !voiceChat.inCallWith && (
          <Modal
            opened
            onClose={voiceChat.rejectCall}
            centered={!isMobile}
            fullScreen={isMobile}
            withCloseButton={false}
            padding="xl"
            styles={{
              content: {
                background: 'var(--mantine-color-green-9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: isMobile ? 0 : 'xl',
              },
              inner: { height: isMobile ? '100dvh' : undefined },
            }}
          >
            <Stack align="center" gap="lg">
              <Avatar color="green" radius="xl" size="lg">
                {voiceChat.incomingCall.from.charAt(0).toUpperCase()}
              </Avatar>
              <Text c="white" fw={700} size={isMobile ? 'xl' : 'lg'}>{voiceChat.incomingCall.from}</Text>
              <Text c="green.2" size="sm">Incoming call...</Text>
              <Group gap="md" mt="md">
                <Button size="lg" color="green" radius="xl" leftSection="📞" onClick={voiceChat.answerCall}>Answer</Button>
                <Button size="lg" color="red" variant="outline" radius="xl" leftSection="✕" onClick={voiceChat.rejectCall}>Reject</Button>
              </Group>
            </Stack>
          </Modal>
        )}
        {voiceChat.inCallWith && (
          <Modal
            opened
            onClose={voiceChat.hangUp}
            centered={!isMobile}
            fullScreen={isMobile}
            withCloseButton={false}
            padding="xl"
            styles={{
              content: {
                background: 'var(--mantine-color-violet-9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: isMobile ? 0 : 'xl',
              },
              inner: { height: isMobile ? '100dvh' : undefined },
            }}
          >
            <Stack align="center" gap="lg">
              <Avatar color="violet" radius="xl" size="lg">
                {voiceChat.inCallWith.charAt(0).toUpperCase()}
              </Avatar>
              <Text c="white" fw={700} size={isMobile ? 'xl' : 'lg'}>{voiceChat.inCallWith}</Text>
              <Text c="violet.2" size="xl" fw={600}>
                {voiceChat.callConnected ? formatDuration(voiceChat.callDuration) : 'Calling...'}
              </Text>
              <Group gap="md" mt="md">
                <ActionIcon
                  variant="filled"
                  color={voiceChat.isMuted ? 'red' : 'green'}
                  size="lg"
                  onClick={voiceChat.toggleMute}
                  radius="xl"
                >
                  {voiceChat.isMuted ? '🔇' : '🎤'}
                </ActionIcon>
                <Button size="lg" color="red" radius="xl" leftSection="📞" onClick={voiceChat.hangUp}>Hang up</Button>
              </Group>
            </Stack>
          </Modal>
        )}
        <Group style={{ maxWidth: 900, margin: '0 auto', width: '100%' }} p="xs" gap="xs">
          {recording ? (
            <>
              <Group gap="xs" className="recording-indicator">
                <Text size="sm" c="red" fw={700}>🎤</Text>
                <Text size="sm" c="red" fw={600}>{formatDuration(recordingDuration)}</Text>
              </Group>
              <Button
                variant="filled"
                color="red"
                size="sm"
                onClick={stopRecording}
                radius="xl"
                style={{ flex: 1 }}
              >
                Stop Recording
              </Button>
            </>
          ) : (
            <>
              {!(isMobile && input.length > 0) && (
                <>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleImageUpload}
                  />
                  <Popover opened={emojiOpened} onChange={setEmojiOpened} position="top-start" withArrow shadow="md">
                    <Popover.Target>
                      <ActionIcon variant="subtle" color="violet" size="lg" onClick={() => setEmojiOpened(o => !o)} style={{ transition: 'transform 0.2s' }}>
                        😊
                      </ActionIcon>
                    </Popover.Target>
                    <Popover.Dropdown p={0} style={{ background: 'var(--mantine-color-dark-7)' }}>
                      <EmojiPicker
                        onEmojiClick={handleEmojiClick}
                        theme={"dark" as unknown as undefined}
                        width={isMobile ? 280 : 320}
                        height={isMobile ? 350 : 400}
                        searchDisabled
                        skinTonesDisabled
                        previewConfig={{ showPreview: false }}
                      />
                    </Popover.Dropdown>
                  </Popover>
                  <ActionIcon
                    variant="subtle"
                    color="violet"
                    size="lg"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={recording}
                    title="Send image"
                    style={{ transition: 'transform 0.2s' }}
                  >
                    🖼
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    color="violet"
                    size="lg"
                    onClick={startRecording}
                    disabled={recording}
                    title="Voice message"
                    style={{ transition: 'transform 0.2s' }}
                  >
                    🎤
                  </ActionIcon>
                </>
              )}
              <TextInput
                placeholder={`Message ${isDm ? channelLabel || '' : `#${channelLabel}`}...`}
                style={{ flex: 1 }}
                size="sm"
                value={input}
                onChange={(e) => handleInputChange(e.currentTarget.value)}
                onKeyDown={handleKeyDown}
                radius="xl"
                styles={(theme) => ({
                  input: {
                    background: theme.colors.dark[6],
                    borderColor: theme.colors.dark[4],
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    '&:focus': {
                      borderColor: theme.colors.violet[6],
                      boxShadow: '0 0 0 2px rgba(124, 58, 237, 0.2)',
                    },
                  },
                })}
              />
              <Button
                variant="gradient"
                gradient={{ from: 'violet', to: 'grape', deg: 135 }}
                size="sm"
                disabled={!input.trim()}
                onClick={handleSend}
                px="md"
                radius="xl"
                style={{ transition: 'transform 0.15s, opacity 0.15s' }}
              >
                Send
              </Button>
            </>
          )}
        </Group>
      </Box>

      <Modal
        opened={!!fullscreenImage}
        onClose={() => setFullscreenImage(null)}
        fullScreen
        withCloseButton={false}
        padding={0}
        styles={{ content: { background: 'rgba(0,0,0,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center' } }}
      >
        {fullscreenImage && (
          <img
            src={fullscreenImage}
            alt="Fullscreen"
            style={{ maxWidth: '100vw', maxHeight: '100vh', objectFit: 'contain' }}
            onClick={() => setFullscreenImage(null)}
          />
        )}
      </Modal>
      <CreateRoomModal opened={createRoomOpened} onClose={closeCreateRoom} onCreate={onCreateRoom} />
    </Box>
  );
}

function ConnectingScreen() {
  return (
    <Container size={420} mih="100vh" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} px="md">
      <Stack align="center" gap="md" className="connecting-screen">
        <div className="auth-emoji" style={{ fontSize: 48, lineHeight: 1 }}>💬</div>
        <Text fw={900} size="2.5rem" variant="gradient" gradient={{ from: 'violet', to: 'grape', deg: 135 }}>
          Chatty
        </Text>
        <Badge size="lg" variant="light" color="yellow" radius="xl" leftSection={<Indicator size={8} color="yellow" processing />}>
          Connecting...
        </Badge>
        <Group gap={4} mt="sm">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </Group>
      </Stack>
    </Container>
  );
}

function App() {
  const { token, username: authUsername, logout, register, login, loading: authLoading, error: authError, setError: setAuthError } = useAuth();
  const { socket, connected } = useSocket(token);
  const {
    messages, username: chatUsername, onlineUsers, rooms, typingUsers, dmList,
    joinRoom, createRoom, leaveRoom, sendMessage,
    sendPrivateMessage, setTyping, sendVoiceMessage, sendPrivateVoiceMessage,
    sendCallLog, sendImage, sendPrivateImage, onMessageRef, onPrivateMessageRef, getDmHistory, unread, setActiveChannel: setChatActiveChannel,
  } = useChat(socket, authUsername || '');

  const voiceChat = useVoiceChat(socket, onlineUsers);

  const [activeChannel, setActiveChannelLocal] = useState('general');

  const setActiveChannel = useCallback((channel: string) => {
    setActiveChannelLocal(channel);
    setChatActiveChannel(channel);
  }, [setChatActiveChannel]);

  const handleLogout = useCallback(() => {
    if (socket) {
      socket.disconnect();
    }
    logout();
  }, [socket, logout]);

  if (!token) {
    return <AuthScreen onLogin={login} onRegister={register} loading={authLoading} error={authError} setError={setAuthError} />;
  }

  if (!connected && token) {
    return <ConnectingScreen />;
  }

  return (
    <ChatScreen
      username={chatUsername}
      messages={messages}
      onlineUsers={onlineUsers}
      rooms={rooms}
      typingUsers={typingUsers}
      activeChannel={activeChannel}
      setActiveChannel={setActiveChannel}
      onJoinRoom={joinRoom}
      onLeaveRoom={leaveRoom}
      onCreateRoom={createRoom}
      onSendMessage={sendMessage}
      onSendPrivateMessage={sendPrivateMessage}
      onSendVoiceMessage={sendVoiceMessage}
      onSendPrivateVoiceMessage={sendPrivateVoiceMessage}
      onSendCallLog={sendCallLog}
      onSendImage={sendImage}
      onSendPrivateImage={sendPrivateImage}
      onTyping={setTyping}
      onLogout={handleLogout}
      voiceChat={voiceChat}
      onMessageRef={onMessageRef}
      onPrivateMessageRef={onPrivateMessageRef}
      initialDmList={dmList}
      getDmHistory={getDmHistory}
      unread={unread}
    />
  );
}

export default App;