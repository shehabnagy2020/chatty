import { useCallback, useEffect, useRef } from 'react';
import type { ChatMessage, PrivateMessageEvent } from '../types';

let audioContext: AudioContext | null = null;

function initAudioContext() {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.3, startDelay = 0) {
  try {
    initAudioContext();
    if (!audioContext) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime + startDelay);
    gainNode.gain.setValueAtTime(volume, audioContext.currentTime + startDelay);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + startDelay + duration);
    oscillator.start(audioContext.currentTime + startDelay);
    oscillator.stop(audioContext.currentTime + startDelay + duration);
  } catch { /* audio playback not critical */ }
}

let ringtoneInterval: ReturnType<typeof setInterval> | null = null;

function startCallRingtone() {
  stopCallRingtone();
  const playRing = () => {
    playTone(440, 0.15, 'sine', 0.35, 0);
    playTone(440, 0.15, 'sine', 0.35, 0.2);
    playTone(523, 0.3, 'sine', 0.35, 0.4);
    playTone(440, 0.15, 'sine', 0.35, 0.8);
    playTone(440, 0.15, 'sine', 0.35, 1.0);
    playTone(523, 0.3, 'sine', 0.35, 1.2);
  };
  playRing();
  ringtoneInterval = setInterval(playRing, 1800);
}

function stopCallRingtone() {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
}

function playMessageSound() {
  playTone(880, 0.1, 'sine', 0.25);
  playTone(660, 0.12, 'sine', 0.2, 0.08);
}

function playDmSound() {
  playTone(1046, 0.08, 'sine', 0.25);
  playTone(1318, 0.08, 'sine', 0.25, 0.08);
  playTone(1568, 0.15, 'sine', 0.25, 0.16);
}

function playVoiceMsgSound() {
  playTone(523, 0.1, 'triangle', 0.25);
  playTone(659, 0.12, 'triangle', 0.25, 0.1);
}

function playCallEndedSound() {
  playTone(659, 0.15, 'sine', 0.3);
  playTone(523, 0.2, 'sine', 0.25, 0.15);
}

function playUserJoinSound() {
  playTone(659, 0.1, 'sine', 0.2);
  playTone(784, 0.12, 'sine', 0.2, 0.1);
}

function playUserLeaveSound() {
  playTone(784, 0.1, 'sine', 0.15);
  playTone(659, 0.12, 'sine', 0.15, 0.1);
}

function flashTitle(message: string) {
  const original = document.title;
  let count = 0;
  const interval = setInterval(() => {
    document.title = count % 2 === 0 ? message : original;
    count++;
    if (count >= 8) {
      clearInterval(interval);
      document.title = original;
    }
  }, 800);

  const onFocus = () => {
    clearInterval(interval);
    document.title = original;
    window.removeEventListener('focus', onFocus);
  };
  window.addEventListener('focus', onFocus);
}

export function useNotifications(username: string, activeChannel: string) {
  const unreadCountRef = useRef(0);
  const isActiveRef = useRef(true);

  useEffect(() => {
    const onFocus = () => { isActiveRef.current = true; unreadCountRef.current = 0; document.title = 'Chatty'; };
    const onBlur = () => { isActiveRef.current = false; };
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  const notifyMessage = useCallback((msg: ChatMessage) => {
    if (msg.sender === username) return;
    if (msg.roomId === activeChannel && isActiveRef.current) return;

    unreadCountRef.current++;
    if (msg.type === 'voice') {
      playVoiceMsgSound();
    } else {
      playMessageSound();
    }

    if (!isActiveRef.current) {
      const prefix = msg.type === 'voice' ? '🎤 Voice message' : '💬 New message';
      flashTitle(`(${unreadCountRef.current}) ${prefix} from ${msg.sender}`);
    }
  }, [username, activeChannel]);

  const notifyPrivateMessage = useCallback((msg: PrivateMessageEvent) => {
    if (msg.sender === username) return;
    if (msg.type === 'callLog') {
      unreadCountRef.current++;
      playCallEndedSound();
      if (!isActiveRef.current) {
        const status = msg.callStatus === 'missed' ? '📞 Missed call' : msg.callStatus === 'rejected' ? '📞 Call rejected' : '📞 Call ended';
        flashTitle(`(${unreadCountRef.current}) ${status} with ${msg.sender}`);
      }
      return;
    }

    const dmRoomId = `dm:${[username, msg.to].sort().join('-')}`;
    if (dmRoomId === activeChannel && isActiveRef.current) return;

    unreadCountRef.current++;
    if (msg.type === 'voice') {
      playVoiceMsgSound();
    } else {
      playDmSound();
    }

    if (!isActiveRef.current) {
      if (msg.type === 'voice') {
        flashTitle(`(${unreadCountRef.current}) 🎤 Voice DM from ${msg.sender}`);
      } else {
        flashTitle(`(${unreadCountRef.current}) 💬 DM from ${msg.sender}`);
      }
    }
  }, [username, activeChannel]);

  const notifyCallIncoming = useCallback(() => {
    startCallRingtone();
  }, []);

  const notifyCallEnded = useCallback(() => {
    stopCallRingtone();
    playCallEndedSound();
  }, []);

  const notifyUserJoin = useCallback(() => {
    playUserJoinSound();
  }, []);

  const notifyUserLeave = useCallback(() => {
    playUserLeaveSound();
  }, []);

  return { notifyMessage, notifyPrivateMessage, notifyCallIncoming, notifyCallEnded, notifyUserJoin, notifyUserLeave };
}