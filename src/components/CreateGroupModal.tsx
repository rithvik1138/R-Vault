import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Users } from "lucide-react";
import { useFriends } from "@/hooks/use-friends";

interface CreateGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateGroup: (name: string, memberIds: string[]) => Promise<{ id: string } | null>;
}

const CreateGroupModal = ({
  open,
  onOpenChange,
  onCreateGroup,
}: CreateGroupModalProps) => {
  const { friends } = useFriends();
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const handleToggleMember = (friendId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selectedMembers.length === 0) return;

    setIsCreating(true);
    await onCreateGroup(groupName.trim(), selectedMembers);
    setIsCreating(false);
    setGroupName("");
    setSelectedMembers([]);
    onOpenChange(false);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Create Group Chat
          </DialogTitle>
          <DialogDescription>
            Create a group with your friends to chat together
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label htmlFor="groupName" className="text-sm font-medium mb-2 block">
              Group Name
            </label>
            <Input
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name..."
              className="bg-secondary border-border"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Select Members ({selectedMembers.length} selected)
            </label>
            <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-2 bg-secondary/30">
              {friends.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No friends to add
                </p>
              ) : (
                friends.map((friend) => (
                  <label
                    key={friend.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={selectedMembers.includes(friend.id)}
                      onCheckedChange={() => handleToggleMember(friend.id)}
                    />
                    {friend.avatar_url ? (
                      <img
                        src={friend.avatar_url}
                        alt={friend.display_name || friend.username || "Friend"}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
                        <span className="text-xs font-semibold text-primary-foreground">
                          {getInitials(friend.display_name || friend.username)}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {friend.display_name || friend.username}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        @{friend.username}
                      </p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="hero"
            onClick={handleCreate}
            disabled={!groupName.trim() || selectedMembers.length === 0 || isCreating}
          >
            {isCreating ? "Creating..." : "Create Group"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupModal;
