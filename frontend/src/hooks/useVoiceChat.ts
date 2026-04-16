import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { VoiceOfferEvent, VoiceAnswerEvent, VoiceIceCandidateEvent } from '../types';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

export interface CallLogData {
  to: string;
  callStatus: 'ended' | 'missed' | 'rejected';
  duration: number;
}

export function useVoiceChat(socket: Socket | null) {
  const [inCallWith, setInCallWith] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [incomingCall, setIncomingCall] = useState<{ from: string; offer: RTCSessionDescriptionInit } | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const callStartRef = useRef<number>(0);
  const callTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onCallLogRef = useRef<((log: CallLogData) => void) | null>(null);

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
    callTimerRef.current = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - callStartRef.current) / 1000));
    }, 1000);
  }, [stopCallTimer]);

  const cleanup = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    stopCallTimer();
    setInCallWith(null);
    setIncomingCall(null);
    setIsMuted(false);
    setCallDuration(0);
    callStartRef.current = 0;
  }, [stopCallTimer]);

  const createPeerConnection = useCallback((targetUser: string) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socket?.emit('voiceIceCandidate', { to: targetUser, candidate: e.candidate.toJSON() });
      }
    };

    pc.ontrack = (e) => {
      if (!remoteAudioRef.current) {
        remoteAudioRef.current = new Audio();
      }
      remoteAudioRef.current.srcObject = e.streams[0];
      remoteAudioRef.current.play().catch(() => {});
    };

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current!));
    }

    return pc;
  }, [socket]);

  const callUser = useCallback(async (targetUser: string) => {
    if (!socket || inCallWith) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      const pc = createPeerConnection(targetUser);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('voiceOffer', { to: targetUser, offer });
      callStartRef.current = 0;
      setInCallWith(targetUser);
    } catch {
      cleanup();
    }
  }, [socket, inCallWith, createPeerConnection, cleanup]);

  const answerCall = useCallback(async () => {
    if (!socket || !incomingCall) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      const pc = createPeerConnection(incomingCall.from);
      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('voiceAnswer', { to: incomingCall.from, answer });
      setInCallWith(incomingCall.from);
      setIncomingCall(null);
      startCallTimer();
    } catch {
      cleanup();
    }
  }, [socket, incomingCall, createPeerConnection, cleanup, startCallTimer]);

  const rejectCall = useCallback(() => {
    if (!socket || !incomingCall) return;
    const from = incomingCall.from;
    socket.emit('voiceReject', { to: from });
    setIncomingCall(null);
    onCallLogRef.current?.({ to: from, callStatus: 'rejected', duration: 0 });
  }, [socket, incomingCall]);

  const hangUp = useCallback(() => {
    if (inCallWith && socket) {
      socket.emit('voiceHangUp', { to: inCallWith });
      const wasConnected = callStartRef.current > 0;
      const status = wasConnected ? 'ended' : 'missed';
      const duration = wasConnected ? Math.round((Date.now() - callStartRef.current) / 1000) : 0;
      onCallLogRef.current?.({ to: inCallWith, callStatus: status, duration });
      cleanup();
    } else {
      cleanup();
    }
  }, [inCallWith, socket, cleanup]);

  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => {
        t.enabled = !t.enabled;
      });
      setIsMuted(prev => !prev);
    }
  }, []);

  useEffect(() => {
    if (!socket) return;

    const onVoiceOffer = (data: VoiceOfferEvent) => {
      if (inCallWith) {
        socket.emit('voiceReject', { to: data.from });
        socket.emit('voiceHangUp', { to: data.from });
        return;
      }
      setIncomingCall({ from: data.from, offer: data.offer });
    };

    const onVoiceAnswer = async (data: VoiceAnswerEvent) => {
      if (peerRef.current && peerRef.current.signalingState === 'have-local-offer') {
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        startCallTimer();
      }
    };

    const onVoiceIceCandidate = async (data: VoiceIceCandidateEvent) => {
      if (peerRef.current) {
        try {
          await peerRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch { /* ignore ICE errors */ }
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
  }, [socket, inCallWith, cleanup, startCallTimer]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return { inCallWith, callDuration, incomingCall, isMuted, callUser, answerCall, rejectCall, hangUp, toggleMute, onCallLogRef };
}