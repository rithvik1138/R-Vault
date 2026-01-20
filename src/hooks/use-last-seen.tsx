import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export const useLastSeen = (friendIds: string[]) => {
  const { user } = useAuth();
  const [lastSeenMap, setLastSeenMap] = useState<Map<string, Date>>(new Map());
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch last seen for all friends
  const fetchLastSeen = useCallback(async () => {
    if (friendIds.length === 0) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, last_seen")
      .in("id", friendIds);

    if (error) {
      console.error("Error fetching last seen:", error);
      return;
    }

    const map = new Map<string, Date>();
    (data || []).forEach((profile) => {
      if (profile.last_seen) {
        map.set(profile.id, new Date(profile.last_seen));
      }
    });
    setLastSeenMap(map);
  }, [friendIds.join(",")]);

  // Update current user's last seen
  const updateLastSeen = useCallback(async () => {
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ last_seen: new Date().toISOString() })
      .eq("id", user.id);

    if (error) {
      console.error("Error updating last seen:", error);
    }
  }, [user]);

  useEffect(() => {
    fetchLastSeen();

    // Update own last seen every 30 seconds
    updateLastSeen();
    updateIntervalRef.current = setInterval(updateLastSeen, 30000);

    // Also update on visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        updateLastSeen();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Refresh friend last seen every minute
    const refreshInterval = setInterval(fetchLastSeen, 60000);

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
      clearInterval(refreshInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchLastSeen, updateLastSeen]);

  const getLastSeen = (userId: string): Date | null => {
    return lastSeenMap.get(userId) || null;
  };

  const formatLastSeen = (userId: string): string | null => {
    const lastSeen = lastSeenMap.get(userId);
    if (!lastSeen) return null;

    const now = new Date();
    const diff = now.getTime() - lastSeen.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Last seen just now";
    if (minutes < 60) return `Last seen ${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    if (hours < 24) return `Last seen ${hours} hour${hours > 1 ? "s" : ""} ago`;
    if (days < 7) return `Last seen ${days} day${days > 1 ? "s" : ""} ago`;
    
    return `Last seen ${lastSeen.toLocaleDateString()}`;
  };

  return {
    getLastSeen,
    formatLastSeen,
    updateLastSeen,
  };
};
