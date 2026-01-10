import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Phone, PhoneOff, Video } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { IncomingCall } from "@/hooks/use-incoming-calls";

interface IncomingCallModalProps {
  incomingCall: IncomingCall | null;
  onAnswer: () => void;
  onDecline: () => void;
}

const IncomingCallModal = ({ incomingCall, onAnswer, onDecline }: IncomingCallModalProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (incomingCall) {
      // Play ringtone
      try {
        audioRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
        audioRef.current.loop = true;
        audioRef.current.volume = 0.5;
        audioRef.current.play().catch(console.error);
      } catch (e) {
        console.log("Could not play ringtone");
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [incomingCall]);

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!incomingCall) return null;

  const { caller, call } = incomingCall;
  const callerName = caller.display_name || caller.username || "Unknown";
  const isVideo = call.call_type === "video";

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden bg-background" hideCloseButton>
        <div className="relative flex flex-col items-center py-8 px-6">
          {/* Pulsing ring animation */}
          <div className="relative mb-6">
            <AnimatePresence>
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 rounded-full border-2 border-primary"
                  initial={{ scale: 1, opacity: 0.6 }}
                  animate={{ scale: 2, opacity: 0 }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.5,
                    ease: "easeOut",
                  }}
                  style={{
                    width: 96,
                    height: 96,
                    left: "50%",
                    top: "50%",
                    marginLeft: -48,
                    marginTop: -48,
                  }}
                />
              ))}
            </AnimatePresence>
            
            {caller.avatar_url ? (
              <img
                src={caller.avatar_url}
                alt={callerName}
                className="w-24 h-24 rounded-full object-cover border-4 border-primary/20 relative z-10"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center border-4 border-primary/20 relative z-10">
                <span className="text-3xl font-bold text-primary-foreground">
                  {getInitials(callerName)}
                </span>
              </div>
            )}
          </div>

          {/* Caller info */}
          <h3 className="text-xl font-semibold mb-1">{callerName}</h3>
          <p className="text-muted-foreground flex items-center gap-2 mb-8">
            {isVideo ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
            Incoming {isVideo ? "video" : "audio"} call...
          </p>

          {/* Action buttons */}
          <div className="flex items-center gap-6">
            <Button
              variant="destructive"
              size="lg"
              className="w-16 h-16 rounded-full"
              onClick={onDecline}
            >
              <PhoneOff className="w-6 h-6" />
            </Button>
            
            <Button
              variant="default"
              size="lg"
              className="w-16 h-16 rounded-full bg-green-600 hover:bg-green-700"
              onClick={onAnswer}
            >
              {isVideo ? <Video className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IncomingCallModal;
