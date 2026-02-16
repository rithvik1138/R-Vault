import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

interface TypingUser {
  id: string;
  display_name: string | null;
}

export const useTypingIndicator = (friendId: string | null) => {
  const { user, profile } = useAuth();
  const [isTyping, setIsTyping] = useState(false);
  const [friendIsTyping, setFriendIsTyping] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Set up presence channel for typing indicators
  useEffect(() => {
    if (!user || !friendId) {
      setFriendIsTyping(false);
      return;
    }

    // Create a unique channel name for this conversation (sorted IDs for consistency)
    const ids = [user.id, friendId].sort();
    const channelName = `typing-${ids[0]}-${ids[1]}`;

    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState() ?? {};
        // Check if friend is in the typing state
        const friendPresence = state[friendId];
        if (friendPresence && Array.isArray(friendPresence)) {
          const isTypingNow = friendPresence.some(
            (p) => (p as unknown as { typing?: boolean }).typing === true
          );
          setFriendIsTyping(isTypingNow);
        } else {
          setFriendIsTyping(false);
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            typing: false,
            display_name: profile?.display_name || "User",
          });
        }
      });

    channelRef.current = channel;

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user, friendId, profile?.display_name]);

  // Function to update typing status
  const setTyping = useCallback(
    async (typing: boolean) => {
      if (!channelRef.current || !user) return;

      setIsTyping(typing);

      await channelRef.current.track({
        typing,
        display_name: profile?.display_name || "User",
      });

      // Auto-clear typing after 3 seconds of inactivity
      if (typing) {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(async () => {
          setIsTyping(false);
          if (channelRef.current) {
            await channelRef.current.track({
              typing: false,
              display_name: profile?.display_name || "User",
            });
          }
        }, 3000);
      }
    },
    [user, profile?.display_name]
  );

  // Handler for input changes
  const handleTyping = useCallback(() => {
    setTyping(true);
  }, [setTyping]);

  // Stop typing when message is sent
  const stopTyping = useCallback(() => {
    setTyping(false);
  }, [setTyping]);

  return {
    isTyping,
    friendIsTyping,
    handleTyping,
    stopTyping,
  };
};
