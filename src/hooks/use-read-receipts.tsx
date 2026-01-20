import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  read_at: string | null;
}

export const useReadReceipts = (
  messages: Message[],
  selectedFriendId: string | null
) => {
  const { user } = useAuth();

  // Mark messages as read when viewing them
  const markAsRead = useCallback(async () => {
    if (!user || !selectedFriendId) return;

    // Find unread messages from the friend
    const unreadMessages = messages.filter(
      (msg) =>
        msg.sender_id === selectedFriendId &&
        msg.receiver_id === user.id &&
        !msg.read_at
    );

    if (unreadMessages.length === 0) return;

    const messageIds = unreadMessages.map((msg) => msg.id);

    const { error } = await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", messageIds);

    if (error) {
      console.error("Error marking messages as read:", error);
    }
  }, [user, selectedFriendId, messages]);

  // Auto-mark messages as read when conversation is opened
  useEffect(() => {
    markAsRead();
  }, [markAsRead]);

  // Check if a message has been read
  const isMessageRead = (message: Message): boolean => {
    return message.read_at !== null;
  };

  // Get the last read message from the current user's sent messages
  const getLastReadMessageId = (): string | null => {
    if (!user) return null;

    const sentMessages = messages.filter(
      (msg) => msg.sender_id === user.id && msg.read_at !== null
    );

    if (sentMessages.length === 0) return null;

    // Return the last read message
    return sentMessages[sentMessages.length - 1].id;
  };

  return {
    markAsRead,
    isMessageRead,
    getLastReadMessageId,
  };
};
