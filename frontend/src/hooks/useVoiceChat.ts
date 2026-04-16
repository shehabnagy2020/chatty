import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { VoiceOfferEvent, VoiceAnswerEvent, VoiceIceCandidateEvent } from '../types';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export interface CallLogData {
  to: string;
  callStatus: 'ended' | 'missed' | 'rejected';
  duration: number;
}

export function useVoiceChat(socket: Socket | null, onlineUsers: string[]) {
  const [inCallWith, setInCallWith] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [incomingCall, setIncomingCall] = useState<{ from: string; offer: RTCSessionDescriptionInit } | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callConnected, setCallConnected] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const callStartRef = useRef<number>(0);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCallLogRef = useRef<((log: CallLogData) => void) | null>(null);
  const inCallWithRef = useRef<string | null>(null);
  const iceCandidatesQueue = useRef<RTCIceCandidateInit[]>([]);

  const stopCallTimer = useCallback(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
  }, []);

  const startCallTimer = useCallback(() => {
    stopCallTimer();
    callStartRef.current = Date.now();
    setCallDuration(0);
    setCallConnected(true);
    callTimerRef.current = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - callStartRef.current) / 1000));
    }, 1000);
  }, [stopCallTimer]);

  const ensureRemoteAudio = useCallback(() => {
    if (!remoteAudioRef.current) {
      const audio = new Audio();
      audio.autoplay = true;
      audio.setAttribute('playsinline', '');
      document.body.appendChild(audio);
      audio.style.display = 'none';
      remoteAudioRef.current = audio;
    }
    return remoteAudioRef.current;
  }, []);

  const drainIceCandidates = useCallback(async () => {
    const pc = peerRef.current;
    if (!pc) return;
    while (iceCandidatesQueue.current.length > 0) {
      const candidate = iceCandidatesQueue.current.shift()!;
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // ignore - might fail before remote description
      }
    }
  }, []);

  const cleanup = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
      if (remoteAudioRef.current.parentNode) {
        remoteAudioRef.current.parentNode.removeChild(remoteAudioRef.current);
      }
      remoteAudioRef.current = null;
    }
    iceCandidatesQueue.current = [];
    stopCallTimer();
    setInCallWith(null);
    inCallWithRef.current = null;
    setIncomingCall(null);
    setIsMuted(false);
    setCallDuration(0);
    setCallConnected(false);
    setIsCalling(false);
    callStartRef.current = 0;
  }, [stopCallTimer]);

  const waitForIceGatheringComplete = useCallback((pc: RTCPeerConnection, timeoutMs = 3000): Promise<void> => {
    return new Promise((resolve) => {
      if (pc.iceGatheringState === 'complete') {
        resolve();
        return;
      }
      const checkState = () => {
        if (pc.iceGatheringState === 'complete') {
          pc.removeEventListener('icegatheringstatechange', checkState);
          resolve();
        }
      };
      pc.addEventListener('icegatheringstatechange', checkState);
      setTimeout(resolve, timeoutMs);
    });
  }, []);

  const createPeerConnection = useCallback((targetUser: string) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket?.emit('voiceIceCandidate', { to: targetUser, candidate: e.candidate.toJSON() });
      }
    };

    pc.ontrack = (e) => {
      const audio = ensureRemoteAudio();
      audio.srcObject = e.streams[0];
      audio.play().catch(() => {});
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected') {
        // Connection established, start timer if caller
        if (inCallWithRef.current && !callTimerRef.current) {
          startCallTimer();
        }
      }
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        if (inCallWithRef.current) {
          pc.restartIce();
        }
      }
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!));
    }

    return pc;
  }, [socket, ensureRemoteAudio, startCallTimer]);

  const callUser = useCallback(async (targetUser: string) => {
    if (!socket || inCallWithRef.current) return;
    setIsCalling(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      const pc = createPeerConnection(targetUser);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      // Wait for ICE gathering to ensure all candidates are included
      await waitForIceGatheringComplete(pc, 3000);
      const enrichedOffer = pc.localDescription;
      socket.emit('voiceOffer', { to: targetUser, offer: enrichedOffer });
      inCallWithRef.current = targetUser;
      setInCallWith(targetUser);
      setIsCalling(false);
      // Timer will start when ICE connects or when answer is received
    } catch (err) {
      console.error('callUser error:', err);
      setIsCalling(false);
      cleanup();
    }
  }, [socket, createPeerConnection, cleanup, waitForIceGatheringComplete]);

  const answerCall = useCallback(async () => {
    if (!socket || !incomingCall) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      const pc = createPeerConnection(incomingCall.from);
      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      // Apply any queued ICE candidates now that remote description is set
      await drainIceCandidates();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      // Wait for ICE gathering to ensure all candidates are included
      await waitForIceGatheringComplete(pc, 3000);
      const enrichedAnswer = pc.localDescription;
      socket.emit('voiceAnswer', { to: incomingCall.from, answer: enrichedAnswer });
      inCallWithRef.current = incomingCall.from;
      setInCallWith(incomingCall.from);
      setIncomingCall(null);
      // Timer will start when ICE connects
    } catch (err) {
      console.error('answerCall error:', err);
      cleanup();
    }
  }, [socket, incomingCall, createPeerConnection, cleanup, drainIceCandidates, waitForIceGatheringComplete]);

  const rejectCall = useCallback(() => {
    if (!socket || !incomingCall) return;
    const from = incomingCall.from;
    socket.emit('voiceReject', { to: from });
    setIncomingCall(null);
    onCallLogRef.current?.({ to: from, callStatus: 'rejected', duration: 0 });
  }, [socket, incomingCall]);

  const hangUp = useCallback(() => {
    const currentCallWith = inCallWithRef.current;
    if (currentCallWith && socket) {
      socket.emit('voiceHangUp', { to: currentCallWith });
      const wasConnected = callStartRef.current > 0;
      const status = wasConnected ? 'ended' : 'missed';
      const duration = wasConnected ? Math.round((Date.now() - callStartRef.current) / 1000) : 0;
      onCallLogRef.current?.({ to: currentCallWith, callStatus: status, duration });
      cleanup();
    } else {
      cleanup();
    }
  }, [socket, cleanup]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length === 0) return;
      const newMuted = !audioTracks[0].enabled;
      audioTracks.forEach(t => { t.enabled = newMuted; });
      setIsMuted(!newMuted);
    }
  }, []);

  const isUserOnline = useCallback((username: string) => {
    return onlineUsers.includes(username);
  }, [onlineUsers]);

  useEffect(() => {
    if (!socket) return;

    const onVoiceOffer = (data: VoiceOfferEvent) => {
      if (inCallWithRef.current) {
        socket.emit('voiceReject', { to: data.from });
        return;
      }
      setIncomingCall({ from: data.from, offer: data.offer });
    };

    const onVoiceAnswer = async (data: VoiceAnswerEvent) => {
      const pc = peerRef.current;
      if (pc && pc.signalingState === 'have-local-offer') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          await drainIceCandidates();
          // Timer will start when ICE connection succeeds
        } catch (err) {
          console.error('setRemoteDescription error:', err);
        }
      }
    };

    const onVoiceIceCandidate = async (data: VoiceIceCandidateEvent) => {
      const pc = peerRef.current;
      if (!pc) return;
      if (pc.remoteDescription) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch {
          // ignore ICE errors
        }
      } else {
        iceCandidatesQueue.current.push(data.candidate);
      }
    };

    const onVoiceHangUp = () => {
      cleanup();
    };

    const onVoiceReject = () => {
      cleanup();
    };

    socket.on('voiceOffer', onVoiceOffer);
    socket.on('voiceAnswer', onVoiceAnswer);
    socket.on('voiceIceCandidate', onVoiceIceCandidate);
    socket.on('voiceHangUp', onVoiceHangUp);
    socket.on('voiceReject', onVoiceReject);

    return () => {
      socket.off('voiceOffer', onVoiceOffer);
      socket.off('voiceAnswer', onVoiceAnswer);
      socket.off('voiceIceCandidate', onVoiceIceCandidate);
      socket.off('voiceHangUp', onVoiceHangUp);
      socket.off('voiceReject', onVoiceReject);
    };
  }, [socket, cleanup, drainIceCandidates]);

  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch { /* wake lock not critical */ }
    };

    const releaseWakeLock = () => {
      wakeLock?.release().catch(() => {});
      wakeLock = null;
    };

    const onProximity = (e: Event) => {
      const target = e.target as EventTarget & { value: boolean | undefined };
      if (target?.value !== undefined) {
        const near = target.value;
        if (near && remoteAudioRef.current) {
          remoteAudioRef.current.volume = 0.1;
          document.documentElement.style.filter = 'brightness(0)';
        } else {
          if (remoteAudioRef.current) remoteAudioRef.current.volume = 1;
          document.documentElement.style.filter = '';
        }
      }
    };

    if (inCallWith) {
      requestWakeLock();
      if ('ProximitySensor' in window) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ProximitySensorCtor = (window as any).ProximitySensor;
          const sensor = new ProximitySensorCtor({ frequency: 1 });
          sensor.addEventListener('reading', onProximity);
          sensor.start();
        } catch { /* proximity not available */ }
      }
    }

    return () => {
      releaseWakeLock();
      document.documentElement.style.filter = '';
    };
  }, [inCallWith]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return { inCallWith, callDuration, callConnected, incomingCall, isMuted, isCalling, callUser, answerCall, rejectCall, hangUp, toggleMute, isUserOnline, onCallLogRef };
}