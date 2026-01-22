import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Forward } from "lucide-react";
import OnlineIndicator from "./OnlineIndicator";

interface Friend {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface ForwardMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  friends: Friend[];
  messageContent: string | null;
  messageMediaUrl: string | null;
  messageMediaType: string | null;
  onForward: (friendIds: string[]) => void;
  isOnline: (friendId: string) => boolean;
}

const ForwardMessageModal = ({
  isOpen,
  onClose,
  friends,
  messageContent,
  messageMediaUrl,
  messageMediaType,
  onForward,
  isOnline,
}: ForwardMessageModalProps) => {
  const [selectedFriends, setSelectedFriends] = useState<Set<string>>(new Set());

  const toggleFriend = (friendId: string) => {
    setSelectedFriends((prev) => {
      const next = new Set(prev);
      if (next.has(friendId)) {
        next.delete(friendId);
      } else {
        next.add(friendId);
      }
      return next;
    });
  };

  const handleForward = () => {
    if (selectedFriends.size > 0) {
      onForward(Array.from(selectedFriends));
      setSelectedFriends(new Set());
      onClose();
    }
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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Forward className="w-5 h-5" />
            Forward Message
          </DialogTitle>
        </DialogHeader>

        {/* Preview */}
        <div className="p-3 bg-secondary/50 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground mb-1">Message to forward:</p>
          {messageContent && (
            <p className="text-sm truncate">{messageContent}</p>
          )}
          {messageMediaUrl && !messageContent && (
            <p className="text-sm text-muted-foreground italic">
              {messageMediaType === "video" ? "Video" : "Image"}
            </p>
          )}
        </div>

        {/* Friends List */}
        <ScrollArea className="h-64">
          <div className="space-y-1">
            {friends.map((friend) => (
              <button
                key={friend.id}
                onClick={() => toggleFriend(friend.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  selectedFriends.has(friend.id)
                    ? "bg-primary/10 border border-primary/30"
                    : "hover:bg-secondary/70"
                }`}
              >
                <div className="relative">
                  {friend.avatar_url ? (
                    <img
                      src={friend.avatar_url}
                      alt={friend.display_name || friend.username || "Friend"}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary-foreground">
                        {getInitials(friend.display_name || friend.username)}
                      </span>
                    </div>
                  )}
                  <OnlineIndicator isOnline={isOnline(friend.id)} size="sm" />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-medium truncate">
                    {friend.display_name || friend.username}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    @{friend.username}
                  </p>
                </div>
                {selectedFriends.has(friend.id) && (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleForward}
            disabled={selectedFriends.size === 0}
            className="bg-gradient-primary"
          >
            Forward to {selectedFriends.size || ""} {selectedFriends.size === 1 ? "friend" : selectedFriends.size > 1 ? "friends" : ""}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ForwardMessageModal;
