import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, UserPlus, Crown, UserMinus, Search } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useFriends } from "@/hooks/use-friends";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

interface GroupMembersPanelProps {
  groupId: string;
  groupCreatedBy: string;
  members: GroupMember[];
  onClose: () => void;
  onMembersChanged: () => void;
}

const GroupMembersPanel = ({
  groupId,
  groupCreatedBy,
  members,
  onClose,
  onMembersChanged,
}: GroupMembersPanelProps) => {
  const { user } = useAuth();
  const { friends } = useFriends();
  const { toast } = useToast();
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [search, setSearch] = useState("");

  const isAdmin =
    user?.id === groupCreatedBy ||
    members.some((m) => m.user_id === user?.id && m.role === "admin");

  const memberUserIds = new Set(members.map((m) => m.user_id));
  const availableFriends = friends.filter(
    (f) => !memberUserIds.has(f.id) && (f.display_name?.toLowerCase().includes(search.toLowerCase()) || f.username?.toLowerCase().includes(search.toLowerCase()))
  );

  const handleAddMember = async (friendId: string) => {
    const { error } = await supabase
      .from("group_members")
      .insert({ group_id: groupId, user_id: friendId, role: "member" });

    if (error) {
      toast({ title: "Error", description: "Failed to add member", variant: "destructive" });
    } else {
      toast({ title: "Member added!" });
      onMembersChanged();
    }
  };

  const handleRemoveMember = async (memberId: string, memberUserId: string) => {
    if (memberUserId === groupCreatedBy) {
      toast({ title: "Cannot remove group creator", variant: "destructive" });
      return;
    }
    const { error } = await supabase
      .from("group_members")
      .delete()
      .eq("id", memberId);

    if (error) {
      toast({ title: "Error", description: "Failed to remove member", variant: "destructive" });
    } else {
      toast({ title: "Member removed" });
      onMembersChanged();
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <div className="w-72 border-l border-border bg-card flex flex-col h-full">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-sm">Members ({members.length})</h3>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {isAdmin && (
        <div className="p-3 border-b border-border">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setShowAddMembers(!showAddMembers)}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            {showAddMembers ? "Back to Members" : "Add Members"}
          </Button>
        </div>
      )}

      {showAddMembers ? (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search friends..."
                className="pl-8 h-8 text-sm bg-secondary border-border"
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="px-2 pb-2 space-y-1">
              {availableFriends.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No friends to add</p>
              ) : (
                availableFriends.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/50"
                  >
                    {friend.avatar_url ? (
                      <img src={friend.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
                        <span className="text-xs font-semibold text-primary-foreground">
                          {getInitials(friend.display_name || friend.username)}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{friend.display_name || friend.username}</p>
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleAddMember(friend.id)}>
                      <UserPlus className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="px-2 py-2 space-y-1">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/50"
              >
                {member.profile?.avatar_url ? (
                  <img src={member.profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
                    <span className="text-xs font-semibold text-primary-foreground">
                      {getInitials(member.profile?.display_name || member.profile?.username)}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-medium truncate">
                      {member.profile?.display_name || member.profile?.username || "Unknown"}
                    </p>
                    {(member.role === "admin" || member.user_id === groupCreatedBy) && (
                      <Crown className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {member.user_id === user?.id ? "You" : `@${member.profile?.username || ""}`}
                  </p>
                </div>
                {isAdmin && member.user_id !== user?.id && member.user_id !== groupCreatedBy && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => handleRemoveMember(member.id, member.user_id)}
                  >
                    <UserMinus className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default GroupMembersPanel;
