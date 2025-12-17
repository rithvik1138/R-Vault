import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { useToast } from "./use-toast";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string | null;
  media_type: string | null;
  created_at: string;
}

interface Profile {
  id: string;
  display_name: string | null;
  username: string | null;
}

export const useNotifications = (currentChatFriendId: string | null) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchSenderProfile = useCallback(async (senderId: string): Promise<Profile | null> => {
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, username")
      .eq("id", senderId)
      .maybeSingle();
    return data;
  }, []);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload) => {
          const newMessage = payload.new as Message;
          
          // Don't notify if we're currently chatting with this person
          if (currentChatFriendId === newMessage.sender_id) return;

          // Fetch sender profile
          const senderProfile = await fetchSenderProfile(newMessage.sender_id);
          const senderName = senderProfile?.display_name || senderProfile?.username || "Someone";

          let messagePreview = "Sent you a message";
          if (newMessage.content) {
            messagePreview = newMessage.content.length > 50 
              ? newMessage.content.slice(0, 50) + "..." 
              : newMessage.content;
          } else if (newMessage.media_type === "image") {
            messagePreview = "📷 Sent you an image";
          } else if (newMessage.media_type === "video") {
            messagePreview = "🎥 Sent you a video";
          }

          toast({
            title: `New message from ${senderName}`,
            description: messagePreview,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, currentChatFriendId, toast, fetchSenderProfile]);
};
