import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { useToast } from "./use-toast";

interface GroupChat {
  id: string;
  name: string;
  avatar_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  reply_to_id: string | null;
  edited_at: string | null;
  created_at: string;
  sender?: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

export const useGroupChats = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [groups, setGroups] = useState<GroupChat[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchGroups = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("group_chats")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching groups:", error);
    } else {
      setGroups(data || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchGroups();

    if (!user) return;

    const channel = supabase
      .channel(`group-chats-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_chats",
        },
        () => {
          fetchGroups();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchGroups]);

  const createGroup = async (name: string, memberIds: string[]) => {
    if (!user) return null;

    // Create the group
    const { data: group, error: groupError } = await supabase
      .from("group_chats")
      .insert({ name, created_by: user.id })
      .select()
      .single();

    if (groupError || !group) {
      toast({
        title: "Error",
        description: "Failed to create group",
        variant: "destructive",
      });
      return null;
    }

    // Add creator as admin
    const members = [
      { group_id: group.id, user_id: user.id, role: "admin" },
      ...memberIds.map((id) => ({ group_id: group.id, user_id: id, role: "member" })),
    ];

    const { error: membersError } = await supabase
      .from("group_members")
      .insert(members);

    if (membersError) {
      toast({
        title: "Error",
        description: "Failed to add members",
        variant: "destructive",
      });
      // Clean up the group
      await supabase.from("group_chats").delete().eq("id", group.id);
      return null;
    }

    toast({
      title: "Success",
      description: `Group "${name}" created!`,
    });

    // Optimistically update local state so the new group appears immediately
    setGroups((prev) => [group as GroupChat, ...prev]);

    return group as GroupChat;
  };

  const updateGroup = async (groupId: string, name: string) => {
    const { error } = await supabase
      .from("group_chats")
      .update({ name })
      .eq("id", groupId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update group",
        variant: "destructive",
      });
    }
  };

  const deleteGroup = async (groupId: string) => {
    const { error } = await supabase
      .from("group_chats")
      .delete()
      .eq("id", groupId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete group",
        variant: "destructive",
      });
    }
  };

  const leaveGroup = async (groupId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", user.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to leave group",
        variant: "destructive",
      });
    }
  };

  return {
    groups,
    loading,
    createGroup,
    updateGroup,
    deleteGroup,
    leaveGroup,
    refreshGroups: fetchGroups,
  };
};

export const useGroupMembers = (groupId: string | null) => {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMembers = useCallback(async () => {
    if (!groupId) {
      setMembers([]);
      return;
    }

    setLoading(true);
    // Fetch members
    const { data: membersData, error } = await supabase
      .from("group_members")
      .select("*")
      .eq("group_id", groupId);

    if (error) {
      console.error("Error fetching members:", error);
      setLoading(false);
      return;
    }

    // Fetch profiles separately
    const userIds = membersData?.map((m) => m.user_id) || [];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url")
      .in("id", userIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
    
    const membersWithProfiles: GroupMember[] = (membersData || []).map((m) => ({
      ...m,
      profile: profileMap.get(m.user_id),
    }));
    setMembers(membersWithProfiles);
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    fetchMembers();

    if (!groupId) return;

    const channel = supabase
      .channel(`group-members-${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_members",
          filter: `group_id=eq.${groupId}`,
        },
        () => {
          fetchMembers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, fetchMembers]);

  return { members, loading, refreshMembers: fetchMembers };
};

export const useGroupMessages = (groupId: string | null) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!groupId) {
      setMessages([]);
      return;
    }

    setLoading(true);
    
    // Fetch messages
    const { data: messagesData, error } = await supabase
      .from("group_messages")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching group messages:", error);
      setLoading(false);
      return;
    }

    // Fetch sender profiles separately
    const senderIds = [...new Set(messagesData?.map((m) => m.sender_id) || [])];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, username, avatar_url")
      .in("id", senderIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
    
    const messagesWithSenders: GroupMessage[] = (messagesData || []).map((m) => ({
      ...m,
      sender: profileMap.get(m.sender_id),
    }));

    setMessages(messagesWithSenders);
    setLoading(false);
  }, [groupId]);

  useEffect(() => {
    fetchMessages();

    if (!groupId) return;

    const channel = supabase
      .channel(`group-messages-${groupId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "group_messages",
          filter: `group_id=eq.${groupId}`,
        },
        async (payload) => {
          const newMessage = payload.new as GroupMessage;
          // Fetch sender profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("id, display_name, username, avatar_url")
            .eq("id", newMessage.sender_id)
            .single();
          
          setMessages((prev) => [...prev, { ...newMessage, sender: profile || undefined }]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "group_messages",
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          const updatedMessage = payload.new as GroupMessage;
          setMessages((prev) =>
            prev.map((m) => (m.id === updatedMessage.id ? { ...m, ...updatedMessage } : m))
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "group_messages",
          filter: `group_id=eq.${groupId}`,
        },
        (payload) => {
          const deletedMessage = payload.old as GroupMessage;
          setMessages((prev) => prev.filter((m) => m.id !== deletedMessage.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, fetchMessages]);

  const sendMessage = async (content: string, replyToId?: string | null) => {
    if (!user || !groupId || !content.trim()) return;

    const insertData = {
      group_id: groupId,
      sender_id: user.id,
      content: content.trim(),
      reply_to_id: replyToId || null,
    };

    const { error } = await supabase.from("group_messages").insert(insertData);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const sendMediaMessage = async (file: File) => {
    if (!user || !groupId) return;

    const fileExt = file.name.split(".").pop();
    const fileName = `groups/${groupId}/${user.id}/${Date.now()}.${fileExt}`;

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

    const mediaType = file.type.startsWith("video/") ? "video" : "image";

    const { error } = await supabase.from("group_messages").insert({
      group_id: groupId,
      sender_id: user.id,
      media_url: fileName,
      media_type: mediaType,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send media message",
        variant: "destructive",
      });
    }
  };

  const editMessage = async (messageId: string, newContent: string) => {
    if (!user) return;

    const { error } = await supabase
      .from("group_messages")
      .update({ content: newContent, edited_at: new Date().toISOString() })
      .eq("id", messageId)
      .eq("sender_id", user.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to edit message",
        variant: "destructive",
      });
    }
  };

  const deleteMessage = async (messageId: string) => {
    const { error } = await supabase
      .from("group_messages")
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

  return {
    messages,
    loading,
    sendMessage,
    sendMediaMessage,
    editMessage,
    deleteMessage,
    refreshMessages: fetchMessages,
  };
};
