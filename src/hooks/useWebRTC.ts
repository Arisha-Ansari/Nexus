import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

// RTCPeerConnection pe apna custom property nahi daal sakte — extend karo
interface ExtendedPeerConnection extends RTCPeerConnection {
  remoteSocketId?: string;
}

type ConnectionStatus = 'connecting' | 'waiting' | 'connected' | 'error';

export function useWebRTC(meetingId: string, token: string) {
  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<ExtendedPeerConnection | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const setup = async () => {
      // 1. Apna camera/mic stream lo — isके bina remote side ko kuch nahi milega
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      if (!isMounted) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      setLocalStream(stream);

      const socket = io(import.meta.env.VITE_SERVER_URL, { auth: { token } });
      socketRef.current = socket;

      socket.on('connect', () => {
        setStatus('waiting'); // socket connected, doosre participant ka wait
      });
      socket.on('connect_error', () => {
        setStatus('error');
      });

      const pc = new RTCPeerConnection(ICE_SERVERS) as ExtendedPeerConnection;
      pcRef.current = pc;

      // 2. Apne tracks peer connection mein add karo — ye missing tha
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

      socket.emit('join-meeting', { meetingId });

      socket.on('user-joined', async ({ socketId }: { socketId: string }) => {
        pc.remoteSocketId = socketId;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', { offer, to: socketId });
      });

      socket.on('offer', async ({ offer, from }: { offer: RTCSessionDescriptionInit; from: string }) => {
        pc.remoteSocketId = from;
        await pc.setRemoteDescription(offer);

        // Queue mein pade hue candidates ab add karo, remote description set hone ke baad
        for (const candidate of pendingCandidatesRef.current) {
          await pc.addIceCandidate(candidate);
        }
        pendingCandidatesRef.current = [];

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('answer', { answer, to: from });
      });

      socket.on('answer', async ({ answer }: { answer: RTCSessionDescriptionInit }) => {
        await pc.setRemoteDescription(answer);

        for (const candidate of pendingCandidatesRef.current) {
          await pc.addIceCandidate(candidate);
        }
        pendingCandidatesRef.current = [];
      });

      socket.on('ice-candidate', async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
        // Agar remote description abhi set nahi hui, candidate ko queue mein daal do
        if (pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(candidate);
        } else {
          pendingCandidatesRef.current.push(candidate);
        }
      });
    };

    setup();

    return () => {
      isMounted = false;
      socketRef.current?.disconnect();
      pcRef.current?.close();
      localStream?.getTracks().forEach((track) => track.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    localStream?.getTracks().forEach((track) => track.stop());
  };

  return {
    localStream,
    remoteStream,
    status,
    isMuted,
    isCameraOff,
    toggleMute,
    toggleCamera,
    leaveCall
  };
}