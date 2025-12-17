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

  const sendMessage = async (content: string) => {
    if (!user || !friendId || !content.trim()) return;

    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: friendId,
      content: content.trim(),
    });

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

  return {
    messages,
    loading,
    sendMessage,
    sendMediaMessage,
    deleteMessage,
    getMediaUrl,
    refreshMessages: fetchMessages,
  };
};
