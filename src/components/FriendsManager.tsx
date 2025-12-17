import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  UserPlus,
  Users,
  Clock,
  Send,
  Check,
  X,
  UserMinus,
  Search,
} from "lucide-react";
import { useFriends } from "@/hooks/use-friends";

interface FriendsManagerProps {
  onSelectFriend?: (friendId: string) => void;
}

const FriendsManager = ({ onSelectFriend }: FriendsManagerProps) => {
  const {
    friends,
    pendingRequests,
    sentRequests,
    loading,
    sendFriendRequest,
    acceptRequest,
    declineRequest,
    cancelRequest,
    removeFriend,
  } = useFriends();

  const [activeTab, setActiveTab] = useState<"friends" | "pending" | "add">("friends");
  const [searchUsername, setSearchUsername] = useState("");
  const [sending, setSending] = useState(false);

  const handleSendRequest = async () => {
    if (!searchUsername.trim()) return;
    setSending(true);
    await sendFriendRequest(searchUsername.trim());
    setSending(false);
    setSearchUsername("");
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
    <div className="h-full flex flex-col">
      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("friends")}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
            activeTab === "friends"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="w-4 h-4" />
          Friends ({friends.length})
        </button>
        <button
          onClick={() => setActiveTab("pending")}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
            activeTab === "pending"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Clock className="w-4 h-4" />
          Pending ({pendingRequests.length})
        </button>
        <button
          onClick={() => setActiveTab("add")}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
            activeTab === "add"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <UserPlus className="w-4 h-4" />
          Add
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Friends List */}
            {activeTab === "friends" && (
              <div className="space-y-2">
                {friends.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No friends yet</p>
                    <p className="text-xs mt-1">Add friends to start chatting!</p>
                  </div>
                ) : (
                  friends.map((friend) => (
                    <div
                      key={friend.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary-foreground">
                          {getInitials(friend.display_name || friend.username)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {friend.display_name || friend.username}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          @{friend.username}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-primary"
                          onClick={() => onSelectFriend?.(friend.id)}
                        >
                          <Send className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => removeFriend(friend.id)}
                        >
                          <UserMinus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Pending Requests */}
            {activeTab === "pending" && (
              <div className="space-y-4">
                {/* Received Requests */}
                {pendingRequests.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Received
                    </h3>
                    <div className="space-y-2">
                      {pendingRequests.map((request) => (
                        <div
                          key={request.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50"
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                            <span className="text-sm font-semibold text-primary-foreground">
                              {getInitials(
                                request.requester?.display_name ||
                                  request.requester?.username
                              )}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {request.requester?.display_name ||
                                request.requester?.username}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Wants to be your friend
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                              onClick={() => acceptRequest(request.id)}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => declineRequest(request.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sent Requests */}
                {sentRequests.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Sent
                    </h3>
                    <div className="space-y-2">
                      {sentRequests.map((request) => (
                        <div
                          key={request.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50"
                        >
                          <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                            <span className="text-sm font-semibold text-primary-foreground">
                              {getInitials(
                                request.addressee?.display_name ||
                                  request.addressee?.username
                              )}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {request.addressee?.display_name ||
                                request.addressee?.username}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Request pending
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => cancelRequest(request.id)}
                          >
                            Cancel
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {pendingRequests.length === 0 && sentRequests.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">No pending requests</p>
                  </div>
                )}
              </div>
            )}

            {/* Add Friend */}
            {activeTab === "add" && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Enter a username to send a friend request
                  </p>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Enter username..."
                        value={searchUsername}
                        onChange={(e) => setSearchUsername(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSendRequest()}
                        className="pl-9 bg-secondary border-border"
                      />
                    </div>
                    <Button
                      variant="hero"
                      onClick={handleSendRequest}
                      disabled={!searchUsername.trim() || sending}
                    >
                      {sending ? (
                        <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      ) : (
                        <UserPlus className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="text-center py-6 border-t border-border mt-6">
                  <p className="text-xs text-muted-foreground">
                    Share your username with friends so they can add you!
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FriendsManager;
