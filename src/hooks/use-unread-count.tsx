import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

// App icon badge (PWA) - shows unread count on the app icon
function setAppBadgeCount(count: number) {
  const nav = navigator as Navigator & { setAppBadge?(count: number): Promise<void>; clearAppBadge?(): Promise<void> };
  if (count > 0 && typeof nav.setAppBadge === "function") {
    nav.setAppBadge(count).catch(() => {});
  } else if (count === 0 && typeof nav.clearAppBadge === "function") {
    nav.clearAppBadge().catch(() => {});
  }
}

export const useUnreadCount = () => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadByFriend, setUnreadByFriend] = useState<Record<string, number>>({});

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;

    // Total unread
    const { count, error } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("receiver_id", user.id)
      .is("read_at", null);

    if (!error && count !== null) {
      setUnreadCount(count);
      document.title = count > 0 ? `(${count}) R-Vault` : "R-Vault";
      setAppBadgeCount(count);
    }

    // Per-friend unread
    const { data: unreadMessages } = await supabase
      .from("messages")
      .select("sender_id")
      .eq("receiver_id", user.id)
      .is("read_at", null);

    if (unreadMessages) {
      const counts: Record<string, number> = {};
      for (const msg of unreadMessages) {
        counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1;
      }
      setUnreadByFriend(counts);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setUnreadByFriend({});
      document.title = "R-Vault";
      setAppBadgeCount(0);
      return;
    }

    fetchUnreadCount();

    const channel = supabase
      .channel(`unread-count-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        () => fetchUnreadCount()
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        () => fetchUnreadCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      document.title = "R-Vault";
      setAppBadgeCount(0);
    };
  }, [user, fetchUnreadCount]);

  return { unreadCount, unreadByFriend: unreadByFriend ?? {} };
};
