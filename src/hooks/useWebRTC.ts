import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

// RTCPeerConnection 
interface ExtendedPeerConnection extends RTCPeerConnection {
  remoteSocketId?: string;
}

type ConnectionStatus = 'connecting' | 'waiting' | 'connected' | 'error';

export function useWebRTC(meetingId: string, token: string) {
  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<ExtendedPeerConnection | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const localStreamRef = useRef<MediaStream | null>(null); // FIX: ref for cleanup, state ke liye stale closure ka scene nahi hoga

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [notification, setNotification] = useState<string | null>(null); // FIX: join/leave message ke liye

  useEffect(() => {
    let isMounted = true;
    let notificationTimer: ReturnType<typeof setTimeout> | null = null;

    const showNotification = (msg: string) => {
      if (notificationTimer) clearTimeout(notificationTimer);
      setNotification(msg);
      notificationTimer = setTimeout(() => setNotification(null), 3000);
    };

  
    const createPeerConnection = (socket: Socket, stream: MediaStream) => {
      const pc = new RTCPeerConnection(ICE_SERVERS) as ExtendedPeerConnection;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.onicecandidate = (e) => {
        if (e.candidate && pc.remoteSocketId) {
          socket.emit('ice-candidate', { candidate: e.candidate, to: pc.remoteSocketId });
        }
      };

      pc.ontrack = (e) => {
        setRemoteStream(e.streams[0]);
        setStatus('connected');
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setStatus('error');
        }
      };

      return pc;
    };

    const setup = async () => {
    
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      if (!isMounted) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      localStreamRef.current = stream; 
      setLocalStream(stream);

      const socket = io(import.meta.env.VITE_SERVER_URL, { auth: { token } });
      socketRef.current = socket;

      socket.on('connect', () => {
        setStatus('waiting');
      });
      socket.on('connect_error', () => {
        setStatus('error');
      });

      const pc = createPeerConnection(socket, stream);
      pcRef.current = pc;

      socket.emit('join-meeting', { meetingId });

      socket.on('user-joined', async ({ socketId }: { socketId: string }) => {
        const currentPc = pcRef.current;
        if (!currentPc) return;

        currentPc.remoteSocketId = socketId;
        showNotification('Participant joined the call'); 

        const offer = await currentPc.createOffer();
        await currentPc.setLocalDescription(offer);
        socket.emit('offer', { offer, to: socketId });
      });

      socket.on('user-left', () => {
        showNotification('Participant left the call');

        pcRef.current?.close();
        setRemoteStream(null);
        setStatus('waiting');
        pendingCandidatesRef.current = [];

        if (localStreamRef.current && socketRef.current) {
          const newPc = createPeerConnection(socketRef.current, localStreamRef.current);
          pcRef.current = newPc;
        }
      });

      socket.on('offer', async ({ offer, from }: { offer: RTCSessionDescriptionInit; from: string }) => {
        const currentPc = pcRef.current;
        if (!currentPc) return;

        currentPc.remoteSocketId = from;
        await currentPc.setRemoteDescription(offer);

        for (const candidate of pendingCandidatesRef.current) {
          await currentPc.addIceCandidate(candidate);
        }
        pendingCandidatesRef.current = [];

        const answer = await currentPc.createAnswer();
        await currentPc.setLocalDescription(answer);
        socket.emit('answer', { answer, to: from });
      });

      socket.on('answer', async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
        const currentPc = pcRef.current;
        if (!currentPc) return;

        await currentPc.setRemoteDescription(answer);

        for (const candidate of pendingCandidatesRef.current) {
          await currentPc.addIceCandidate(candidate);
        }
        pendingCandidatesRef.current = [];
      });

      socket.on('ice-candidate', async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
        const currentPc = pcRef.current;
        if (!currentPc) return;

        if (currentPc.remoteDescription && currentPc.remoteDescription.type) {
          await currentPc.addIceCandidate(candidate);
        } else {
          pendingCandidatesRef.current.push(candidate);
        }
      });
    };

    setup();

    return () => {
      isMounted = false;
      if (notificationTimer) clearTimeout(notificationTimer);
      socketRef.current?.disconnect();
      pcRef.current?.close();
      
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    };
  }, [meetingId, token]);

  const toggleMute = () => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    setIsMuted((prev) => !prev);
  };

  const toggleCamera = () => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
    });
    setIsCameraOff((prev) => !prev);
  };

  const leaveCall = () => {
    socketRef.current?.emit('leave-meeting', { meetingId });
    socketRef.current?.disconnect();
    pcRef.current?.close();
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
  };

  return {
    localStream,
    remoteStream,
    status,
    isMuted,
    isCameraOff,
    notification,
    toggleMute,
    toggleCamera,
    leaveCall
  };
}