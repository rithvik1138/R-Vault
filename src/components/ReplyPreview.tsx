import { X, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReplyPreviewProps {
  replyToMessage: {
    id: string;
    content: string | null;
    senderName: string;
  };
  onCancelReply: () => void;
}

const ReplyPreview = ({ replyToMessage, onCancelReply }: ReplyPreviewProps) => {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-secondary/50 border-t border-border">
      <Reply className="w-4 h-4 text-primary flex-shrink-0" />
      <div className="flex-1 min-w-0 border-l-2 border-primary pl-2">
        <p className="text-xs font-medium text-primary truncate">
          {replyToMessage.senderName}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {replyToMessage.content || "Media message"}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground hover:text-foreground"
        onClick={onCancelReply}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default ReplyPreview;
