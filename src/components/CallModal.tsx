import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { 
  Phone, PhoneOff, Video, VideoOff, Mic, MicOff, 
  Loader2, X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  friendName: string;
  friendAvatar?: string | null;
  isVideoCall: boolean;
}

type CallState = "connecting" | "ringing" | "connected" | "ended";

const CallModal = ({ open, onOpenChange, friendName, friendAvatar, isVideoCall }: CallModalProps) => {
  const { toast } = useToast();
  const [callState, setCallState] = useState<CallState>("connecting");
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(isVideoCall);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (open) {
      initializeCall();
    }
    
    return () => {
      cleanup();
    };
  }, [open]);

  useEffect(() => {
    if (callState === "connected") {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [callState]);

  const initializeCall = async () => {
    setCallState("connecting");
    setCallDuration(0);

    try {
      const constraints: MediaStreamConstraints = {
        audio: true,
        video: isVideoCall ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        } : false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (localVideoRef.current && isVideoCall) {
        localVideoRef.current.srcObject = stream;
      }

      // Simulate connection (in real app, this would be WebRTC peer connection)
      setCallState("ringing");
      
      // Simulate call being answered after 2 seconds
      setTimeout(() => {
        if (streamRef.current) {
          setCallState("connected");
          toast({
            title: "Call connected",
            description: `You are now in a call with ${friendName}`,
          });
        }
      }, 2000);

    } catch (error: unknown) {
      console.error("Failed to start call:", error);
      toast({
        title: "Call failed",
        description:
          error instanceof Error ? error.message : "Could not access camera/microphone",
        variant: "destructive",
      });
      onOpenChange(false);
    }
  };

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setCallState("ended");
    setCallDuration(0);
  };

  const handleEndCall = () => {
    cleanup();
    onOpenChange(false);
    toast({
      title: "Call ended",
      description: `Call with ${friendName} has ended`,
    });
  };

  const toggleMute = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          <div className="flex-1 relative bg-secondary flex items-center justify-center">
            {isVideoCall && callState === "connected" ? (
              <>
                {/* Remote video (simulated with local for demo) */}
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  muted
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
                
                {callState === "connecting" && (
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
                onClick={toggleMute}
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
                  onClick={toggleVideo}
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

export default CallModal;
