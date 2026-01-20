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

    // Subscribe to reaction changes
    const channel = supabase
      .channel("message-reactions")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_reactions",
        },
        () => {
          fetchReactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchReactions]);

  const addReaction = async (messageId: string, emoji: string) => {
    if (!user) return;

    const { error } = await supabase.from("message_reactions").insert({
      message_id: messageId,
      user_id: user.id,
      emoji,
    });

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
