import { useEffect, useCallback, useState } from "react";
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

const requestNotificationPermission = async (): Promise<boolean> => {
  if (!("Notification" in window)) {
    console.log("This browser does not support notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
};

const sendBrowserNotification = (title: string, body: string, icon?: string) => {
  if (Notification.permission === "granted") {
    const notification = new Notification(title, {
      body,
      icon: icon || "/favicon.png",
      tag: "r-vault-message",
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    // Auto-close after 5 seconds
    setTimeout(() => notification.close(), 5000);
  }
};

export const useNotifications = (currentChatFriendId: string | null, notificationsEnabled: boolean = true) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">("default");

  // Request notification permission on mount
  useEffect(() => {
    if (!("Notification" in window)) {
      setNotificationPermission("unsupported");
      return;
    }

    setNotificationPermission(Notification.permission);

    if (Notification.permission === "default") {
      requestNotificationPermission().then((granted) => {
        setNotificationPermission(granted ? "granted" : "denied");
      });
    }
  }, []);

  const fetchSenderProfile = useCallback(async (senderId: string): Promise<Profile | null> => {
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, username")
      .eq("id", senderId)
      .maybeSingle();
    return data;
  }, []);

  useEffect(() => {
    if (!user || !notificationsEnabled) return;

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

          // Show in-app toast
          toast({
            title: `New message from ${senderName}`,
            description: messagePreview,
          });

          // Send browser notification if page is not focused
          if (document.hidden || !document.hasFocus()) {
            sendBrowserNotification(
              `New message from ${senderName}`,
              messagePreview
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, currentChatFriendId, toast, fetchSenderProfile, notificationsEnabled]);

  return { notificationPermission };
};
