import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { 
  PhoneOff, Video, VideoOff, Mic, MicOff, 
  Loader2, X
} from "lucide-react";
import { CallState } from "@/hooks/use-webrtc-call";

interface ActiveCallModalProps {
  open: boolean;
  onClose: () => void;
  callState: CallState;
  isVideoCall: boolean;
  friendName: string;
  friendAvatar?: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoEnabled: boolean;
  callDuration: number;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
}

const ActiveCallModal = ({
  open,
  onClose,
  callState,
  isVideoCall,
  friendName,
  friendAvatar,
  localStream,
  remoteStream,
  isMuted,
  isVideoEnabled,
  callDuration,
  onEndCall,
  onToggleMute,
  onToggleVideo,
}: ActiveCallModalProps) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Attach local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Attach remote stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleEndCall = () => {
    onEndCall();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleEndCall()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-background">
        <div className="relative min-h-[400px] flex flex-col">
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-50 text-foreground/70 hover:text-foreground"
            onClick={handleEndCall}
          >
            <X className="w-5 h-5" />
          </Button>

          {/* Video area / Avatar area */}
          <div className="flex-1 relative bg-secondary flex items-center justify-center min-h-[300px]">
            {isVideoCall && callState === "connected" && remoteStream ? (
              <>
                {/* Remote video */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                {/* Local video preview */}
                <div className="absolute bottom-4 right-4 w-32 h-24 rounded-lg overflow-hidden border-2 border-border shadow-lg">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${!isVideoEnabled ? "hidden" : ""}`}
                  />
                  {!isVideoEnabled && (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <VideoOff className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center">
                {/* Avatar */}
                {friendAvatar ? (
                  <img
                    src={friendAvatar}
                    alt={friendName}
                    className="w-32 h-32 rounded-full object-cover mx-auto mb-4 border-4 border-primary/20"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gradient-primary flex items-center justify-center mx-auto mb-4">
                    <span className="text-4xl font-bold text-primary-foreground">
                      {getInitials(friendName)}
                    </span>
                  </div>
                )}
                
                <h3 className="text-xl font-semibold mb-1">{friendName}</h3>
                
                {(callState === "calling" || callState === "connecting") && (
                  <div className="flex items-center justify-center gap-2 text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Connecting...</span>
                  </div>
                )}
                
                {callState === "ringing" && (
                  <p className="text-muted-foreground animate-pulse">Ringing...</p>
                )}
                
                {callState === "connected" && !isVideoCall && (
                  <p className="text-primary font-medium">{formatDuration(callDuration)}</p>
                )}
              </div>
            )}

            {/* Call duration overlay for video */}
            {isVideoCall && callState === "connected" && (
              <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm rounded-full px-3 py-1">
                <span className="text-sm font-medium">{formatDuration(callDuration)}</span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="p-6 bg-card border-t border-border">
            <div className="flex items-center justify-center gap-4">
              {/* Mute button */}
              <Button
                variant={isMuted ? "destructive" : "secondary"}
                size="icon"
                className="w-12 h-12 rounded-full"
                onClick={onToggleMute}
              >
                {isMuted ? (
                  <MicOff className="w-5 h-5" />
                ) : (
                  <Mic className="w-5 h-5" />
                )}
              </Button>

              {/* End call button */}
              <Button
                variant="destructive"
                size="icon"
                className="w-14 h-14 rounded-full"
                onClick={handleEndCall}
              >
                <PhoneOff className="w-6 h-6" />
              </Button>

              {/* Video toggle (only for video calls) */}
              {isVideoCall && (
                <Button
                  variant={!isVideoEnabled ? "destructive" : "secondary"}
                  size="icon"
                  className="w-12 h-12 rounded-full"
                  onClick={onToggleVideo}
                >
                  {isVideoEnabled ? (
                    <Video className="w-5 h-5" />
                  ) : (
                    <VideoOff className="w-5 h-5" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ActiveCallModal;

