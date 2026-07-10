import { useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import { useWebRTC } from '../hooks/useWebRTC';

interface VideoCallProps {
  meetingId: string;
  token: string;
  onLeave: () => void;
}

export function VideoCall({ meetingId, token, onLeave }: VideoCallProps) {
  const {
    localStream,
    remoteStream,
    status,
    isMuted,
    isCameraOff,
    toggleMute,
    toggleCamera,
    leaveCall
  } = useWebRTC(meetingId, token);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleLeave = () => {
    leaveCall();
    onLeave();
  };

  const statusConfig: Record<typeof status, { label: string; dot: string }> = {
    connecting: { label: 'Setting up camera...', dot: 'bg-amber-400' },
    waiting: { label: 'Waiting for the other participant...', dot: 'bg-amber-400' },
    connected: { label: 'Connected', dot: 'bg-emerald-400' },
    error: { label: 'Connection error occurred', dot: 'bg-red-500' }
  };

  return (
    <div className="rounded-xl bg-slate-900 overflow-hidden">
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${statusConfig[status].dot}`} />
          <span className="text-sm text-slate-300">{statusConfig[status].label}</span>
        </div>
      </div>

      {/* Video grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
        {/* Remote participant — larger/primary tile */}
        <div className="relative aspect-video rounded-lg bg-slate-800 overflow-hidden order-1 sm:order-2">
          {remoteStream ? (
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-500 text-sm px-4 text-center">
              Waiting for the other participant to join...
            </div>
          )}
          <span className="absolute bottom-2 left-2 rounded bg-black/50 px-2 py-0.5 text-xs text-white">
            Participant
          </span>
        </div>

        {/* Local video — smaller tile */}
        <div className="relative aspect-video rounded-lg bg-slate-800 overflow-hidden order-2 sm:order-1">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-cover ${isCameraOff ? 'invisible' : ''}`}
          />
          {isCameraOff && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
              Camera is off
            </div>
          )}
          <span className="absolute bottom-2 left-2 rounded bg-black/50 px-2 py-0.5 text-xs text-white">
            You
          </span>
          {isMuted && (
            <span
              className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500"
              aria-label="Microphone is muted"
              title="Muted"
            >
              <MicOff size={13} color="white" />
            </span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 px-4 py-4 border-t border-slate-800">
        <button
          onClick={toggleMute}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
          className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
            isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-slate-700 hover:bg-slate-600'
          }`}
        >
          {isMuted ? <MicOff size={18} color="white" /> : <Mic size={18} color="white" />}
        </button>

        <button
          onClick={toggleCamera}
          aria-label={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
          className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${
            isCameraOff ? 'bg-red-500 hover:bg-red-600' : 'bg-slate-700 hover:bg-slate-600'
          }`}
        >
          {isCameraOff ? <VideoOff size={18} color="white" /> : <Video size={18} color="white" />}
        </button>

        <button
          onClick={handleLeave}
          aria-label="Leave meeting"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-red-600 hover:bg-red-700 transition-colors"
        >
          <PhoneOff size={18} color="white" />
        </button>
      </div>
    </div>
  );
}