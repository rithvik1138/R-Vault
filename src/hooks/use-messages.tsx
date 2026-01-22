import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { useToast } from "./use-toast";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
  read_at: string | null;
  reply_to_id?: string | null;
}

export const useMessages = (friendId: string | null) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!user || !friendId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`
      )
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
    } else {
      setMessages(data || []);
    }
    setLoading(false);
  }, [user, friendId]);

  // Real-time subscription
  useEffect(() => {
    if (!user || !friendId) {
      setMessages([]);
      return;
    }

    fetchMessages();

    const channel = supabase
      .channel(`messages-${user.id}-${friendId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMessage = payload.new as Message;
          // Only add if it's part of this conversation
          if (
            (newMessage.sender_id === user.id && newMessage.receiver_id === friendId) ||
            (newMessage.sender_id === friendId && newMessage.receiver_id === user.id)
          ) {
            setMessages((prev) => [...prev, newMessage]);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const updatedMessage = payload.new as Message;
          // Update if it's part of this conversation
          if (
            (updatedMessage.sender_id === user.id && updatedMessage.receiver_id === friendId) ||
            (updatedMessage.sender_id === friendId && updatedMessage.receiver_id === user.id)
          ) {
            setMessages((prev) =>
              prev.map((m) => (m.id === updatedMessage.id ? updatedMessage : m))
            );
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const deletedMessage = payload.old as Message;
          setMessages((prev) => prev.filter((m) => m.id !== deletedMessage.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, friendId, fetchMessages]);

  const sendMessage = async (content: string, replyToId?: string | null) => {
    if (!user || !friendId || !content.trim()) return;

    const insertData: Record<string, unknown> = {
      sender_id: user.id,
      receiver_id: friendId,
      content: content.trim(),
    };

    if (replyToId) {
      insertData.reply_to_id = replyToId;
    }

    const { error } = await supabase.from("messages").insert(insertData as never);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const sendMediaMessage = async (file: File) => {
    if (!user || !friendId) return;

    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${friendId}/${Date.now()}.${fileExt}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("chat-media")
      .upload(fileName, file);

    if (uploadError) {
      toast({
        title: "Error",
        description: "Failed to upload media",
        variant: "destructive",
      });
      return;
    }

    // Get signed URL for private bucket
    const { data: urlData } = await supabase.storage
      .from("chat-media")
      .createSignedUrl(fileName, 60 * 60 * 24 * 7); // 7 days

    if (!urlData?.signedUrl) {
      toast({
        title: "Error",
        description: "Failed to get media URL",
        variant: "destructive",
      });
      return;
    }

    const mediaType = file.type.startsWith("video/") ? "video" : "image";

    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: friendId,
      media_url: fileName,
      media_type: mediaType,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send media",
        variant: "destructive",
      });
    }
  };

  const deleteMessage = async (messageId: string) => {
    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("id", messageId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive",
      });
    }
  };

  const getMediaUrl = async (mediaPath: string) => {
    const { data } = await supabase.storage
      .from("chat-media")
      .createSignedUrl(mediaPath, 60 * 60); // 1 hour
    return data?.signedUrl || null;
  };

  const forwardMessage = async (
    content: string | null,
    mediaUrl: string | null,
    mediaType: string | null,
    targetFriendIds: string[]
  ) => {
    if (!user) return;

    const promises = targetFriendIds.map(async (targetFriendId) => {
      const insertData: Record<string, unknown> = {
        sender_id: user.id,
        receiver_id: targetFriendId,
      };

      if (content) {
        insertData.content = content;
      }

      if (mediaUrl) {
        insertData.media_url = mediaUrl;
        insertData.media_type = mediaType;
      }

      return supabase.from("messages").insert(insertData as never);
    });

    const results = await Promise.all(promises);
    const errors = results.filter((r) => r.error);

    if (errors.length > 0) {
      toast({
        title: "Error",
        description: `Failed to forward to ${errors.length} recipient(s)`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Message forwarded to ${targetFriendIds.length} friend(s)`,
      });
    }
  };

  return {
    messages,
    loading,
    sendMessage,
    sendMediaMessage,
    deleteMessage,
    getMediaUrl,
    forwardMessage,
    refreshMessages: fetchMessages,
  };
};
