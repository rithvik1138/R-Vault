import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

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

interface CallerProfile {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export interface IncomingCall {
  call: CallData;
  caller: CallerProfile;
}

export const useIncomingCalls = () => {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);

  const fetchCallerProfile = useCallback(async (callerId: string): Promise<CallerProfile | null> => {
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url")
      .eq("id", callerId)
      .maybeSingle();
    return data;
  }, []);

  useEffect(() => {
    if (!user) return;

    console.log("Setting up incoming call listener for user:", user.id);

    // Listen for new calls where we are the receiver
    const channel = supabase
      .channel(`incoming-calls-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "calls",
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload) => {
          const call = payload.new as CallData;
          console.log("Incoming call:", call);

          if (call.status === "ringing") {
            const caller = await fetchCallerProfile(call.caller_id);
            if (caller) {
              setIncomingCall({ call, caller });
              
              // Send browser notification if page is not focused
              if ((document.hidden || !document.hasFocus()) && Notification.permission === "granted") {
                const notification = new Notification(
                  `Incoming ${call.call_type} call`,
                  {
                    body: `${caller.display_name || caller.username || "Someone"} is calling you`,
                    icon: caller.avatar_url || "/favicon.png",
                    tag: "incoming-call",
                    requireInteraction: true,
                  }
                );

                notification.onclick = () => {
                  window.focus();
                  notification.close();
                };
              }
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "calls",
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const call = payload.new as CallData;
          console.log("Call updated:", call);

          // Clear incoming call if it's no longer ringing
          if (call.status !== "ringing") {
            setIncomingCall((current) => 
              current?.call.id === call.id ? null : current
            );
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "calls",
          filter: `caller_id=eq.${user.id}`,
        },
        (payload) => {
          const call = payload.new as CallData;
          console.log("Outgoing call updated:", call);
          
          // This helps the caller know when their call was answered/declined
          // The caller's useWebRTCCall will handle the actual connection
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchCallerProfile]);

  const clearIncomingCall = useCallback(() => {
    setIncomingCall(null);
  }, []);

  return { incomingCall, clearIncomingCall };
};
