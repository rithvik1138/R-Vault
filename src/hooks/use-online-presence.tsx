import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

interface OnlineUser {
  id: string;
  online_at: string;
}

export const useOnlinePresence = (friendIds: string[]) => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!user) {
      setOnlineUsers(new Set());
      return;
    }

    const channel = supabase.channel("online-presence", {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const online = new Set<string>();
        
        Object.keys(state).forEach((userId) => {
          if (friendIds.includes(userId)) {
            online.add(userId);
          }
        });
        
        setOnlineUsers(online);
      })
      .on("presence", { event: "join" }, ({ key }) => {
        if (friendIds.includes(key)) {
          setOnlineUsers((prev) => new Set([...prev, key]));
        }
      })
      .on("presence", { event: "leave" }, ({ key }) => {
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user, friendIds.join(",")]);

  const isOnline = useCallback(
    (userId: string) => onlineUsers.has(userId),
    [onlineUsers]
  );

  return { onlineUsers, isOnline };
};
