import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import MessageReactions from "@/components/MessageReactions";
import ReadReceipt from "@/components/ReadReceipt";

interface ReactionGroup {
  emoji: string;
  count: number;
  userReacted: boolean;
}

interface ChatMessageProps {
  id: string;
  content: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  isOwn: boolean;
  time: string;
  readAt: string | null;
  reactions: ReactionGroup[];
  onDelete?: (id: string) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  canDelete?: boolean;
}

const ChatMessage = ({
  id,
  content,
  mediaUrl,
  mediaType,
  isOwn,
  time,
  readAt,
  reactions,
  onDelete,
  onToggleReaction,
  canDelete = false,
}: ChatMessageProps) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    const loadMedia = async () => {
      if (!mediaUrl) return;
      setLoadingMedia(true);
      const { data } = await supabase.storage
        .from("chat-media")
        .createSignedUrl(mediaUrl, 60 * 60);
      setSignedUrl(data?.signedUrl || null);
      setLoadingMedia(false);
    };

    loadMedia();
  }, [mediaUrl]);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className={`flex ${isOwn ? "justify-end" : "justify-start"} group`}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
    >
      <div className="relative max-w-[70%]">
        {canDelete && showDelete && (
          <Button
            variant="ghost"
            size="icon"
            className={`absolute top-0 ${isOwn ? "-left-10" : "-right-10"} h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10`}
            onClick={() => onDelete?.(id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
        
        <div
          className={`rounded-2xl px-4 py-2.5 ${
            isOwn
              ? "bg-gradient-primary text-primary-foreground rounded-br-md"
              : "bg-secondary text-foreground rounded-bl-md"
          }`}
        >
          {mediaUrl && (
            <div className="mb-2 rounded-lg overflow-hidden">
              {loadingMedia ? (
                <div className="w-48 h-48 bg-muted animate-pulse rounded-lg" />
              ) : mediaType === "video" ? (
                <video
                  src={signedUrl || undefined}
                  controls
                  className="max-w-full max-h-64 rounded-lg"
                >
                  <track kind="captions" />
                </video>
              ) : (
                <img
                  src={signedUrl || undefined}
                  alt="Shared media"
                  className="max-w-full max-h-64 rounded-lg object-cover"
                />
              )}
            </div>
          )}
          
          {content && <p className="text-sm">{content}</p>}
          
          <div
            className={`flex items-center gap-1 text-xs mt-1 ${
              isOwn ? "text-primary-foreground/70 justify-end" : "text-muted-foreground"
            }`}
          >
            <span>{formatTime(time)}</span>
            <ReadReceipt isRead={readAt !== null} isOwn={isOwn} />
          </div>
        </div>

        {/* Reactions */}
        <MessageReactions
          reactions={reactions}
          onToggleReaction={(emoji) => onToggleReaction?.(id, emoji)}
          isOwn={isOwn}
        />
      </div>
    </div>
  );
};

export default ChatMessage;
