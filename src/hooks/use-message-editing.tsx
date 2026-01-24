import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { useToast } from "./use-toast";

const EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export const useMessageEditing = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const canEditMessage = useCallback((messageTime: string, senderId: string) => {
    if (!user || senderId !== user.id) return false;
    
    const messageDate = new Date(messageTime).getTime();
    const now = Date.now();
    return now - messageDate < EDIT_WINDOW_MS;
  }, [user]);

  const editMessage = useCallback(async (messageId: string, newContent: string, messageTime: string) => {
    if (!user) return false;

    // Check if within edit window
    const messageDate = new Date(messageTime).getTime();
    const now = Date.now();
    
    if (now - messageDate >= EDIT_WINDOW_MS) {
      toast({
        title: "Cannot edit",
        description: "Messages can only be edited within 15 minutes of sending",
        variant: "destructive",
      });
      return false;
    }

    const { error } = await supabase
      .from("messages")
      .update({ 
        content: newContent, 
        edited_at: new Date().toISOString() 
      })
      .eq("id", messageId)
      .eq("sender_id", user.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to edit message",
        variant: "destructive",
      });
      return false;
    }

    return true;
  }, [user, toast]);

  const getRemainingEditTime = useCallback((messageTime: string) => {
    const messageDate = new Date(messageTime).getTime();
    const now = Date.now();
    const remaining = EDIT_WINDOW_MS - (now - messageDate);
    
    if (remaining <= 0) return null;
    
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    
    return { minutes, seconds, totalMs: remaining };
  }, []);

  return {
    canEditMessage,
    editMessage,
    getRemainingEditTime,
    EDIT_WINDOW_MS,
  };
};
