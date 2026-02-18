import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { useToast } from "./use-toast";
import { Json } from "@/integrations/supabase/types";

interface CallData {
  id: string;
  caller_id: string;
  receiver_id: string;
  call_type: "audio" | "video";
  status: "ringing" | "accepted" | "declined" | "ended" | "missed";
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

interface SignalData {
  id: string;
  call_id: string;
  sender_id: string;
  signal_type: "offer" | "answer" | "ice-candidate";
  signal_data: Json;
  created_at: string;
}

export type CallState = "idle" | "calling" | "ringing" | "connecting" | "connected" | "ended";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export const useWebRTCCall = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [callState, setCallState] = useState<CallState>("idle");
  const [currentCall, setCurrentCall] = useState<CallData | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const signalChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const callStateRef = useRef<CallState>("idle");
  const currentCallRef = useRef<CallData | null>(null);

  // Duration timer
  useEffect(() => {
    if (callState === "connected") {
      timerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (callState === "idle") {
        setCallDuration(0);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [callState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const localStreamRef = useRef<MediaStream | null>(null);

  // Keep localStreamRef in sync
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // Keep callState and currentCall refs in sync
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    currentCallRef.current = currentCall;
  }, [currentCall]);

  const cleanup = useCallback(() => {
    console.log("Cleaning up call resources");
    
    // Use ref to avoid stale closure
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    if (signalChannelRef.current) {
      supabase.removeChannel(signalChannelRef.current);
      signalChannelRef.current = null;
    }
    
    pendingCandidatesRef.current = [];
    setRemoteStream(null);
    setCallState("idle");
    setCurrentCall(null);
  }, []);

  const getMediaStream = async (isVideo: boolean): Promise<MediaStream> => {
    const constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: isVideo ? {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: "user",
      } : false,
    };

    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error: unknown) {
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          const deviceType = isVideo ? 'camera and microphone' : 'microphone';
          throw new Error(`Permission denied: Please allow ${deviceType} access in your browser settings and try again.`);
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          const deviceType = isVideo ? 'camera' : 'microphone';
          throw new Error(`No ${deviceType} found. Please connect a ${deviceType} and try again.`);
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          throw new Error('Device is already in use by another application. Please close other apps using your camera/microphone.');
        }
      }
      throw error;
    }
  };

  const createPeerConnection = (callId: string): RTCPeerConnection => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    pc.onicecandidate = async (event) => {
      if (event.candidate && user) {
        console.log("Sending ICE candidate");
        await supabase.from("call_signals").insert({
          call_id: callId,
          sender_id: user.id,
          signal_type: "ice-candidate" as const,
          signal_data: event.candidate.toJSON() as Json,
        });
      }
    };

    pc.ontrack = (event) => {
      console.log("Received remote track", event.streams);
      if (event.streams[0]) {
        setRemoteStream(event.streams[0]);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("Connection state:", pc.connectionState);
      if (pc.connectionState === "connected") {
        setCallState("connected");
      } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        endCall();
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log("ICE connection state:", pc.iceConnectionState);
    };

    return pc;
  };

  const subscribeToSignals = (callId: string) => {
    console.log("Subscribing to signals for call:", callId);
    
    const channel = supabase
      .channel(`call-signals-${callId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_signals",
          filter: `call_id=eq.${callId}`,
        },
        async (payload) => {
          const signal = payload.new as SignalData;
          
          // Ignore our own signals
          if (signal.sender_id === user?.id) return;
          
          console.log("Received signal:", signal.signal_type);
          const pc = peerConnectionRef.current;
          if (!pc) return;

          try {
            if (signal.signal_type === "offer") {
              const offerData = signal.signal_data as unknown as RTCSessionDescriptionInit;
              await pc.setRemoteDescription(new RTCSessionDescription(offerData));
              // Process any pending candidates
              for (const candidate of pendingCandidatesRef.current) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              }
              pendingCandidatesRef.current = [];
            } else if (signal.signal_type === "answer") {
              const answerData = signal.signal_data as unknown as RTCSessionDescriptionInit;
              await pc.setRemoteDescription(new RTCSessionDescription(answerData));
              // Process any pending candidates
              for (const candidate of pendingCandidatesRef.current) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              }
              pendingCandidatesRef.current = [];
            } else if (signal.signal_type === "ice-candidate") {
              const candidateData = signal.signal_data as unknown as RTCIceCandidateInit;
              if (pc.remoteDescription) {
                await pc.addIceCandidate(new RTCIceCandidate(candidateData));
              } else {
                pendingCandidatesRef.current.push(candidateData);
              }
            }
          } catch (error) {
            console.error("Error processing signal:", error);
          }
        }
      )
      .subscribe();

    signalChannelRef.current = channel;
  };

  const startCall = async (receiverId: string, isVideo: boolean) => {
    if (!user) return;

    try {
      console.log("Starting call to:", receiverId, "isVideo:", isVideo);
      setCallState("calling");

      // Get local media
      const stream = await getMediaStream(isVideo);
      setLocalStream(stream);
      setIsVideoEnabled(isVideo);

      // Create call record
      const { data: call, error } = await supabase
        .from("calls")
        .insert({
          caller_id: user.id,
          receiver_id: receiverId,
          call_type: isVideo ? "video" : "audio",
          status: "ringing",
        })
        .select()
        .single();

      if (error) throw error;
      
      const callData: CallData = {
        ...call,
        call_type: call.call_type as "audio" | "video",
        status: call.status as CallData["status"],
      };
      setCurrentCall(callData);

      // Create peer connection
      const pc = createPeerConnection(call.id);
      peerConnectionRef.current = pc;

      // Add local tracks
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Subscribe to signals
      subscribeToSignals(call.id);

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await supabase.from("call_signals").insert({
        call_id: call.id,
        sender_id: user.id,
        signal_type: "offer" as const,
        signal_data: offer as unknown as Json,
      });

      setCallState("ringing");

      // Timeout if no answer in 30 seconds
      setTimeout(async () => {
        if (callStateRef.current === "ringing" && currentCallRef.current?.id === call.id) {
          await supabase
            .from("calls")
            .update({ status: "missed", ended_at: new Date().toISOString() })
            .eq("id", call.id);
          
          toast({
            title: "No answer",
            description: "The call was not answered",
          });
          cleanup();
        }
      }, 30000);

    } catch (error: unknown) {
      console.error("Failed to start call:", error);
      toast({
        title: "Call failed",
        description: error instanceof Error ? error.message : "Could not start the call",
        variant: "destructive",
      });
      cleanup();
    }
  };

  const answerCall = async (call: CallData) => {
    if (!user) return;

    try {
      console.log("Answering call:", call.id);
      setCallState("connecting");
      setCurrentCall(call);

      // Get local media
      const stream = await getMediaStream(call.call_type === "video");
      setLocalStream(stream);
      setIsVideoEnabled(call.call_type === "video");

      // Create peer connection
      const pc = createPeerConnection(call.id);
      peerConnectionRef.current = pc;

      // Add local tracks
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Subscribe to signals
      subscribeToSignals(call.id);

      // Fetch the offer
      const { data: signals } = await supabase
        .from("call_signals")
        .select("*")
        .eq("call_id", call.id)
        .eq("signal_type", "offer")
        .order("created_at", { ascending: false })
        .limit(1);

      if (signals && signals[0]) {
        const offer = signals[0].signal_data as unknown as RTCSessionDescriptionInit;
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // Fetch any ICE candidates that arrived before we joined
        const { data: candidates } = await supabase
          .from("call_signals")
          .select("*")
          .eq("call_id", call.id)
          .eq("signal_type", "ice-candidate")
          .neq("sender_id", user.id);

        if (candidates) {
          for (const candidateSignal of candidates) {
            try {
              const candidateData = candidateSignal.signal_data as unknown as RTCIceCandidateInit;
              await pc.addIceCandidate(new RTCIceCandidate(candidateData));
            } catch (e) {
              console.log("Error adding early ICE candidate:", e);
            }
          }
        }

        // Create and send answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await supabase.from("call_signals").insert({
          call_id: call.id,
          sender_id: user.id,
          signal_type: "answer" as const,
          signal_data: answer as unknown as Json,
        });
      }

      // Update call status
      await supabase
        .from("calls")
        .update({ status: "accepted", started_at: new Date().toISOString() })
        .eq("id", call.id);

    } catch (error: unknown) {
      console.error("Failed to answer call:", error);
      toast({
        title: "Call failed",
        description: error instanceof Error ? error.message : "Could not answer the call",
        variant: "destructive",
      });
      cleanup();
    }
  };

  const declineCall = async (callId: string) => {
    console.log("Declining call:", callId);
    
    await supabase
      .from("calls")
      .update({ status: "declined", ended_at: new Date().toISOString() })
      .eq("id", callId);
    
    cleanup();
  };

  const endCall = async () => {
    console.log("Ending call");
    
    if (currentCall) {
      await supabase
        .from("calls")
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", currentCall.id);
    }
    
    cleanup();
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  return {
    callState,
    currentCall,
    localStream,
    remoteStream,
    isMuted,
    isVideoEnabled,
    callDuration,
    startCall,
    answerCall,
    declineCall,
    endCall,
    toggleMute,
    toggleVideo,
    cleanup,
  };
};
