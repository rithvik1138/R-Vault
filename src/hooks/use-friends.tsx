import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { useToast } from "./use-toast";

interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  requester?: Profile;
  addressee?: Profile;
}

export const useFriends = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [friends, setFriends] = useState<Profile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friendship[]>([]);
  const [sentRequests, setSentRequests] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFriends = async () => {
    if (!user) return;

    // Fetch accepted friendships
    const { data: friendships } = await supabase
      .from("friendships")
      .select("*")
      .eq("status", "accepted")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (friendships) {
      const friendIds = friendships.map((f) =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      );

      if (friendIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("*")
          .in("id", friendIds);

        setFriends(profiles || []);
      } else {
        setFriends([]);
      }
    }
  };

  const fetchPendingRequests = async () => {
    if (!user) return;

    // Fetch pending requests received
    const { data: pending } = await supabase
      .from("friendships")
      .select("*")
      .eq("addressee_id", user.id)
      .eq("status", "pending");

    if (pending && pending.length > 0) {
      const requesterIds = pending.map((p) => p.requester_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", requesterIds);

      const requestsWithProfiles = pending.map((p) => ({
        ...p,
        requester: profiles?.find((pr) => pr.id === p.requester_id),
      }));

      setPendingRequests(requestsWithProfiles as Friendship[]);
    } else {
      setPendingRequests([]);
    }

    // Fetch sent requests
    const { data: sent } = await supabase
      .from("friendships")
      .select("*")
      .eq("requester_id", user.id)
      .eq("status", "pending");

    if (sent && sent.length > 0) {
      const addresseeIds = sent.map((s) => s.addressee_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("id", addresseeIds);

      const sentWithProfiles = sent.map((s) => ({
        ...s,
        addressee: profiles?.find((pr) => pr.id === s.addressee_id),
      }));

      setSentRequests(sentWithProfiles as Friendship[]);
    } else {
      setSentRequests([]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchFriends(), fetchPendingRequests()]);
      setLoading(false);
    };

    if (user) {
      loadData();
    }
  }, [user]);

  const sendFriendRequest = async (username: string) => {
    if (!user) return { error: new Error("Not authenticated") };

    // Find user by username
    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", username)
      .maybeSingle();

    if (!targetProfile) {
      toast({
        title: "User not found",
        description: "No user found with that username",
        variant: "destructive",
      });
      return { error: new Error("User not found") };
    }

    if (targetProfile.id === user.id) {
      toast({
        title: "Cannot add yourself",
        description: "You cannot send a friend request to yourself",
        variant: "destructive",
      });
      return { error: new Error("Cannot add yourself") };
    }

    // Check if friendship already exists
    const { data: existing } = await supabase
      .from("friendships")
      .select("*")
      .or(
        `and(requester_id.eq.${user.id},addressee_id.eq.${targetProfile.id}),and(requester_id.eq.${targetProfile.id},addressee_id.eq.${user.id})`
      )
      .maybeSingle();

    if (existing) {
      toast({
        title: "Request exists",
        description: "A friend request already exists with this user",
        variant: "destructive",
      });
      return { error: new Error("Friendship already exists") };
    }

    const { error } = await supabase.from("friendships").insert({
      requester_id: user.id,
      addressee_id: targetProfile.id,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send friend request",
        variant: "destructive",
      });
      return { error };
    }

    toast({
      title: "Request sent!",
      description: `Friend request sent to ${targetProfile.display_name || targetProfile.username}`,
    });

    await fetchPendingRequests();
    return { error: null };
  };

  const acceptRequest = async (friendshipId: string) => {
    const { error } = await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", friendshipId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to accept request",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Friend added!",
      description: "You are now friends",
    });

    await Promise.all([fetchFriends(), fetchPendingRequests()]);
  };

  const declineRequest = async (friendshipId: string) => {
    const { error } = await supabase
      .from("friendships")
      .update({ status: "declined" })
      .eq("id", friendshipId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to decline request",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Request declined",
    });

    await fetchPendingRequests();
  };

  const cancelRequest = async (friendshipId: string) => {
    const { error } = await supabase
      .from("friendships")
      .delete()
      .eq("id", friendshipId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to cancel request",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Request cancelled",
    });

    await fetchPendingRequests();
  };

  const removeFriend = async (friendId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from("friendships")
      .delete()
      .or(
        `and(requester_id.eq.${user.id},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${user.id})`
      );

    if (error) {
      toast({
        title: "Error",
        description: "Failed to remove friend",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Friend removed",
    });

    await fetchFriends();
  };

  return {
    friends,
    pendingRequests,
    sentRequests,
    loading,
    sendFriendRequest,
    acceptRequest,
    declineRequest,
    cancelRequest,
    removeFriend,
    refreshFriends: fetchFriends,
  };
};
