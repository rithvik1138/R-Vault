import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Reply, Edit2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Sender {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface ReplyToMessage {
  id: string;
  content: string | null;
  senderName: string;
}

interface GroupChatMessageProps {
  id: string;
  content: string | null;
  mediaUrl: string | null;
  mediaType: string | null;
  isOwn: boolean;
  time: string;
  editedAt: string | null;
  sender?: Sender;
  replyTo?: ReplyToMessage | null;
  onDelete?: (id: string) => void;
  onEdit?: (id: string, newContent: string) => void;
  onReply?: (messageId: string, content: string | null, senderName: string) => void;
  canDelete?: boolean;
  canEdit?: boolean;
}

const EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes in milliseconds

const GroupChatMessage = ({
  id,
  content,
  mediaUrl,
  mediaType,
  isOwn,
  time,
  editedAt,
  sender,
  replyTo,
  onDelete,
  onEdit,
  onReply,
  canDelete = false,
  canEdit = false,
}: GroupChatMessageProps) => {
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

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const senderName = sender?.display_name || sender?.username || "Unknown";

  return (
    <div
      className={`flex ${isOwn ? "justify-end" : "justify-start"} group`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`flex gap-2 max-w-[70%] ${isOwn ? "flex-row-reverse" : "flex-row"}`}>
        {/* Avatar for non-own messages */}
        {!isOwn && (
          <div className="flex-shrink-0">
            {sender?.avatar_url ? (
              <img
                src={sender.avatar_url}
                alt={senderName}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
                <span className="text-xs font-semibold text-primary-foreground">
                  {getInitials(senderName)}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="relative">
          {showActions && !isEditing && (
            <div className={`absolute top-0 ${isOwn ? "-left-24" : "-right-24"} flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-secondary"
                onClick={() => onReply?.(id, content, senderName)}
                title="Reply"
              >
                <Reply className="w-3.5 h-3.5" />
              </Button>
              {canStillEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-secondary"
                  onClick={() => setIsEditing(true)}
                  title="Edit"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onDelete?.(id)}
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          )}

          {/* Sender name for non-own messages */}
          {!isOwn && (
            <p className="text-xs font-medium text-primary mb-1 ml-1">
              {senderName}
            </p>
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
              {editedAt && (
                <span className="opacity-70">(edited)</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupChatMessage;
