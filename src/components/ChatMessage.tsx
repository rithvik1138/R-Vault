import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Reply, Forward, Edit2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MessageReactions from "@/components/MessageReactions";
import ReadReceipt from "@/components/ReadReceipt";

interface ReactionGroup {
  emoji: string;
  count: number;
  userReacted: boolean;
}

interface ReplyToMessage {
  id: string;
  content: string | null;
  senderName: string;
}

const EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

interface ChatMessageProps {
  id: string;
  content: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  isOwn: boolean;
  time: string;
  readAt: string | null;
  editedAt?: string | null;
  reactions: ReactionGroup[];
  replyTo?: ReplyToMessage | null;
  onDelete?: (id: string) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onReply?: (messageId: string, content: string | null, senderName: string) => void;
  onForward?: (id: string, content: string | null, mediaUrl: string | null, mediaType: string | null) => void;
  onEdit?: (id: string, newContent: string) => void;
  canDelete?: boolean;
  canEdit?: boolean;
}

const ChatMessage = ({
  id,
  content,
  mediaUrl,
  mediaType,
  isOwn,
  time,
  readAt,
  editedAt,
  reactions,
  replyTo,
  onDelete,
  onToggleReaction,
  onReply,
  onForward,
  onEdit,
  canDelete = false,
  canEdit = false,
}: ChatMessageProps) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content || "");
  const [canStillEdit, setCanStillEdit] = useState(false);

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

  // Check if message is still within edit window
  useEffect(() => {
    if (!canEdit) {
      setCanStillEdit(false);
      return;
    }

    const checkEditWindow = () => {
      const messageTime = new Date(time).getTime();
      const now = Date.now();
      const withinWindow = now - messageTime < EDIT_WINDOW_MS;
      setCanStillEdit(withinWindow);
    };

    checkEditWindow();
    const interval = setInterval(checkEditWindow, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [time, canEdit]);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent.trim() !== content) {
      onEdit?.(id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(content || "");
    setIsEditing(false);
  };

  return (
    <div
      className={`flex ${isOwn ? "justify-end" : "justify-start"} group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="relative max-w-[70%]">
        {showActions && !isEditing && (
          <div className={`absolute top-0 ${isOwn ? "-left-32" : "-right-32"} flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary"
              onClick={() => onReply?.(id, content, isOwn ? "You" : "Friend")}
              title="Reply"
            >
              <Reply className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary"
              onClick={() => onForward?.(id, content, mediaUrl, mediaType)}
              title="Forward"
            >
              <Forward className="w-4 h-4" />
            </Button>
            {canStillEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary"
                onClick={() => setIsEditing(true)}
                title="Edit"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => onDelete?.(id)}
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
        
        <div
          className={`rounded-2xl px-4 py-2.5 ${
            isOwn
              ? "bg-gradient-primary text-primary-foreground rounded-br-md"
              : "bg-secondary text-foreground rounded-bl-md"
          }`}
        >
          {/* Reply preview */}
          {replyTo && (
            <div className={`mb-2 border-l-2 border-primary/50 pl-2 py-1 ${
              isOwn ? "bg-primary-foreground/10" : "bg-muted/50"
            } rounded-r`}>
              <p className="text-xs font-medium opacity-80">{replyTo.senderName}</p>
              <p className="text-xs opacity-60 truncate max-w-[200px]">
                {replyTo.content || "Media message"}
              </p>
            </div>
          )}
          
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
          
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="text-sm bg-background/20 border-0 focus-visible:ring-0 text-inherit placeholder:text-inherit/50"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveEdit();
                  if (e.key === "Escape") handleCancelEdit();
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleSaveEdit}
              >
                <Check className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleCancelEdit}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ) : (
            content && <p className="text-sm">{content}</p>
          )}
          
          <div
            className={`flex items-center gap-1 text-xs mt-1 ${
              isOwn ? "text-primary-foreground/70 justify-end" : "text-muted-foreground"
            }`}
          >
            <span>{formatTime(time)}</span>
            {editedAt && <span className="opacity-70">(edited)</span>}
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
