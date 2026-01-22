import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

interface ReactionGroup {
  emoji: string;
  count: number;
  userReacted: boolean;
}

export const useMessageReactions = (messageIds: string[]) => {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<Map<string, Reaction[]>>(new Map());

  const fetchReactions = useCallback(async () => {
    if (messageIds.length === 0) return;

    const { data, error } = await supabase
      .from("message_reactions")
      .select("*")
      .in("message_id", messageIds);

    if (error) {
      console.error("Error fetching reactions:", error);
      return;
    }

    const reactionMap = new Map<string, Reaction[]>();
    (data || []).forEach((reaction) => {
      const existing = reactionMap.get(reaction.message_id) || [];
      reactionMap.set(reaction.message_id, [...existing, reaction as Reaction]);
    });
    setReactions(reactionMap);
  }, [messageIds.join(",")]);

  useEffect(() => {
    fetchReactions();
  }, [fetchReactions]);

  // Separate subscription effect to avoid refetching on every message change
  useEffect(() => {
    if (messageIds.length === 0) return;

    // Subscribe to reaction changes with a unique channel name
    const channelName = `message-reactions-${messageIds.slice(0, 5).join("-")}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "message_reactions",
        },
        (payload) => {
          const newReaction = payload.new as Reaction;
          if (messageIds.includes(newReaction.message_id)) {
            setReactions((prev) => {
              const newMap = new Map(prev);
              const existing = newMap.get(newReaction.message_id) || [];
              newMap.set(newReaction.message_id, [...existing, newReaction]);
              return newMap;
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "message_reactions",
        },
        (payload) => {
          const deleted = payload.old as Reaction;
          setReactions((prev) => {
            const newMap = new Map(prev);
            const existing = newMap.get(deleted.message_id) || [];
            newMap.set(
              deleted.message_id,
              existing.filter((r) => r.id !== deleted.id)
            );
            return newMap;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageIds.join(",")]);

  const addReaction = async (messageId: string, emoji: string) => {
    if (!user) return;

    const { error } = await supabase.from("message_reactions").insert({
      message_id: messageId,
      user_id: user.id,
      emoji,
    } as never);

    if (error && !error.message.includes("duplicate")) {
      console.error("Error adding reaction:", error);
    }
  };

  const removeReaction = async (messageId: string, emoji: string) => {
    if (!user) return;

    const { error } = await supabase
      .from("message_reactions")
      .delete()
      .eq("message_id", messageId)
      .eq("user_id", user.id)
      .eq("emoji", emoji);

    if (error) {
      console.error("Error removing reaction:", error);
    }
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;

    const messageReactions = reactions.get(messageId) || [];
    const existingReaction = messageReactions.find(
      (r) => r.user_id === user.id && r.emoji === emoji
    );

    if (existingReaction) {
      await removeReaction(messageId, emoji);
    } else {
      await addReaction(messageId, emoji);
    }
  };

  const getReactionsForMessage = (messageId: string): ReactionGroup[] => {
    const messageReactions = reactions.get(messageId) || [];
    const groups = new Map<string, { count: number; userReacted: boolean }>();

    messageReactions.forEach((reaction) => {
      const existing = groups.get(reaction.emoji) || { count: 0, userReacted: false };
      groups.set(reaction.emoji, {
        count: existing.count + 1,
        userReacted: existing.userReacted || reaction.user_id === user?.id,
      });
    });

    return Array.from(groups.entries()).map(([emoji, data]) => ({
      emoji,
      count: data.count,
      userReacted: data.userReacted,
    }));
  };

  return {
    reactions,
    addReaction,
    removeReaction,
    toggleReaction,
    getReactionsForMessage,
  };
};
