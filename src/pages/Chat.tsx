import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Shield, Send, Search, Settings, LogOut, MoreVertical, 
  Phone, VideoIcon, ChevronLeft, Users, ShieldCheck, Plus,
  MessageSquare, UsersRound, UserCog
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/use-auth";
import { useFriends } from "@/hooks/use-friends";
import { useMessages } from "@/hooks/use-messages";
import { useAdmin } from "@/hooks/use-admin";
import { useTypingIndicator } from "@/hooks/use-typing-indicator";
import { useNotifications } from "@/hooks/use-notifications";
import { usePrivacySettings } from "@/hooks/use-privacy-settings";
import { useWebRTCCall } from "@/hooks/use-webrtc-call";
import { useIncomingCalls } from "@/hooks/use-incoming-calls";
import { useOnlinePresence } from "@/hooks/use-online-presence";
import { useLastSeen } from "@/hooks/use-last-seen";
import { useMessageReactions } from "@/hooks/use-message-reactions";
import { useReadReceipts } from "@/hooks/use-read-receipts";
import { useUnreadCount } from "@/hooks/use-unread-count";
import { useFirebaseNotifications } from "@/hooks/use-firebase-notifications";
import { useGroupChats, useGroupMessages, useGroupMembers } from "@/hooks/use-group-chats";
import FriendsManager from "@/components/FriendsManager";
import ChatMessage from "@/components/ChatMessage";
import GroupChatMessage from "@/components/GroupChatMessage";
import MediaUpload from "@/components/MediaUpload";
import TypingIndicator from "@/components/TypingIndicator";
import SettingsDialog from "@/components/SettingsDialog";
import ActiveCallModal from "@/components/ActiveCallModal";
import IncomingCallModal from "@/components/IncomingCallModal";
import EmojiPicker from "@/components/EmojiPicker";
import OnlineIndicator from "@/components/OnlineIndicator";
import ReplyPreview from "@/components/ReplyPreview";
import ForwardMessageModal from "@/components/ForwardMessageModal";
import CreateGroupModal from "@/components/CreateGroupModal";
import GroupMembersPanel from "@/components/GroupMembersPanel";

const Chat = () => {
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [sidebarTab, setSidebarTab] = useState<"dms" | "groups">("dms");
  const [message, setMessage] = useState("");
  const [showSidebar, setShowSidebar] = useState(true);
  const [showFriendsManager, setShowFriendsManager] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [replyTo, setReplyTo] = useState<{
    id: string;
    content: string | null;
    senderName: string;
  } | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<{
    id: string;
    content: string | null;
    mediaUrl: string | null;
    mediaType: string | null;
  } | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showGroupMembers, setShowGroupMembers] = useState(false);
  const [groupReplyTo, setGroupReplyTo] = useState<{
    id: string;
    content: string | null;
    senderName: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { user, profile, loading, signOut } = useAuth();
  const { friends } = useFriends();
  const { messages, sendMessage, sendMediaMessage, deleteMessage, forwardMessage, editMessage } = useMessages(selectedFriendId);
  const { isAdmin } = useAdmin();
  const { friendIsTyping, handleTyping, stopTyping } = useTypingIndicator(selectedFriendId);
  const { settings: privacySettings } = usePrivacySettings();
  
  // WebRTC call hooks
  const webrtcCall = useWebRTCCall();
  const { incomingCall, clearIncomingCall } = useIncomingCalls();
  
  // Online presence - track which friends are online
  const friendIds = useMemo(() => friends.map(f => f.id), [friends]);
  const { isOnline } = useOnlinePresence(friendIds);
  
  // Last seen tracking
  const { formatLastSeen } = useLastSeen(friendIds);
  
  // Message reactions
  const messageIds = useMemo(() => messages.map(m => m.id), [messages]);
  const { toggleReaction, getReactionsForMessage } = useMessageReactions(messageIds);
  
  // Read receipts
  useReadReceipts(messages, selectedFriendId);
  
  // Unread count for browser title
  const { unreadCount, unreadByFriend } = useUnreadCount();

  // Firebase push notifications
  const { initializeFirebase, isInitialized: firebaseInitialized } = useFirebaseNotifications();

  // Group chat hooks
  const { groups } = useGroupChats();
  const { messages: groupMessages, sendMessage: sendGroupMessage, sendMediaMessage: sendGroupMediaMessage, editMessage: editGroupMessage, deleteMessage: deleteGroupMessage } = useGroupMessages(selectedGroupId);
  const { members: groupMembers, refreshMembers: refreshGroupMembers } = useGroupMembers(selectedGroupId);

  // Enable in-app notifications for messages from other conversations
  useNotifications(selectedFriendId, privacySettings.notificationsEnabled, selectedGroupId);

  const selectedFriend = friends.find(f => f.id === selectedFriendId);
  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  // Initialize Firebase for push notifications
  useEffect(() => {
    if (user && !firebaseInitialized) {
      initializeFirebase();
    }
  }, [user, firebaseInitialized, initializeFirebase]);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, groupMessages]);

  // Open call modal when call is active
  useEffect(() => {
    if (webrtcCall.callState !== "idle" && webrtcCall.callState !== "ended") {
      setShowCallModal(true);
    }
  }, [webrtcCall.callState]);

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    if (selectedGroupId) {
      await sendGroupMessage(message, groupReplyTo?.id);
      setMessage("");
      setGroupReplyTo(null);
    } else if (selectedFriendId) {
      stopTyping();
      await sendMessage(message, replyTo?.id);
      setMessage("");
      setReplyTo(null);
    }
  };

  const handleSelectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    setSelectedFriendId(null);
    setReplyTo(null);
    setGroupReplyTo(null);
    if (isMobile) setShowSidebar(false);
  };

  const handleSelectFriend = (friendId: string) => {
    setSelectedFriendId(friendId);
    setSelectedGroupId(null);
    setReplyTo(null);
    setGroupReplyTo(null);
    if (isMobile) setShowSidebar(false);
  };

  const handleGroupReply = (messageId: string, content: string | null, senderName: string) => {
    setGroupReplyTo({ id: messageId, content, senderName });
  };

  const getGroupReplyToMessage = (replyToId: string | null | undefined) => {
    if (!replyToId) return null;
    const msg = groupMessages.find(m => m.id === replyToId);
    if (!msg) return null;
    return {
      id: msg.id,
      content: msg.content,
      senderName: msg.sender_id === user?.id
        ? "You"
        : (msg.sender?.display_name || msg.sender?.username || "Unknown"),
    };
  };

  const handleReply = (messageId: string, content: string | null, senderName: string) => {
    // Update sender name to actual friend name if not own message
    const actualSenderName = senderName === "Friend" 
      ? (selectedFriend?.display_name || selectedFriend?.username || "Friend")
      : senderName;
    setReplyTo({ id: messageId, content, senderName: actualSenderName });
  };

  const handleForward = (
    messageId: string,
    content: string | null,
    mediaUrl: string | null,
    mediaType: string | null
  ) => {
    setForwardingMessage({ id: messageId, content, mediaUrl, mediaType });
  };

  const handleConfirmForward = async (targetFriendIds: string[]) => {
    if (!forwardingMessage) return;
    await forwardMessage(
      forwardingMessage.content,
      forwardingMessage.mediaUrl,
      forwardingMessage.mediaType,
      targetFriendIds
    );
    setForwardingMessage(null);
  };

  const getReplyToMessage = (replyToId: string | null | undefined) => {
    if (!replyToId) return null;
    const msg = messages.find(m => m.id === replyToId);
    if (!msg) return null;
    return {
      id: msg.id,
      content: msg.content,
      senderName: msg.sender_id === user?.id 
        ? "You" 
        : (selectedFriend?.display_name || selectedFriend?.username || "Friend"),
    };
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleStartCall = (video: boolean) => {
    if (selectedFriendId) {
      setIsVideoCall(video);
      webrtcCall.startCall(selectedFriendId, video);
    }
  };

  const handleAnswerCall = () => {
    if (incomingCall) {
      setIsVideoCall(incomingCall.call.call_type === "video");
      webrtcCall.answerCall(incomingCall.call);
      clearIncomingCall();
    }
  };

  const handleDeclineCall = () => {
    if (incomingCall) {
      webrtcCall.declineCall(incomingCall.call.id);
      clearIncomingCall();
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

  if (loading) {
    return (
      <div className="h-screen bg-gradient-hero flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-hero flex overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={`${
          isMobile 
            ? `fixed inset-y-0 left-0 z-50 w-full transition-transform duration-300 ${showSidebar ? 'translate-x-0' : '-translate-x-full'}`
            : 'w-80 flex-shrink-0'
        } bg-card border-r border-border flex flex-col`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold gradient-text">R-Vault</span>
            </Link>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground hover:text-primary"
                onClick={() => setShowCreateGroup(true)}
                title="Create Group"
              >
                <Plus className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className={`text-muted-foreground ${showFriendsManager ? 'bg-secondary text-primary' : ''}`}
                onClick={() => setShowFriendsManager(!showFriendsManager)}
              >
                <Users className="w-4 h-4" />
              </Button>
              {isAdmin && (
                <Link to="/admin">
                  <Button variant="ghost" size="icon" className="text-primary hover:text-primary">
                    <ShieldCheck className="w-4 h-4" />
                  </Button>
                </Link>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground"
                onClick={() => setShowSettings(true)}
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={handleSignOut}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* User Profile */}
          <div 
            className="flex items-center gap-3 p-2 rounded-lg bg-secondary/50 mb-4 cursor-pointer hover:bg-secondary/70 transition-colors"
            onClick={() => setShowSettings(true)}
          >
            {profile?.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt="Avatar" 
                className="w-9 h-9 rounded-full object-cover"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gradient-primary flex items-center justify-center">
                <span className="text-sm font-semibold text-primary-foreground">
                  {getInitials(profile?.display_name || user?.email)}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <p className="text-sm font-medium truncate">{profile?.display_name || 'User'}</p>
                {isAdmin && (
                  <ShieldCheck className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">@{profile?.username || user?.email}</p>
            </div>
          </div>
          
          {/* Search */}
          {!showFriendsManager && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search conversations..." 
                className="pl-9 bg-secondary border-border"
              />
            </div>
          )}
        </div>

        {/* Tab switcher */}
        {!showFriendsManager && (
          <div className="flex border-b border-border">
            <button
              onClick={() => setSidebarTab("dms")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${
                sidebarTab === "dms"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              DMs
            </button>
            <button
              onClick={() => setSidebarTab("groups")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors ${
                sidebarTab === "groups"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <UsersRound className="w-4 h-4" />
              Groups
            </button>
          </div>
        )}

        {/* Friends Manager or Contacts/Groups List */}
        <div className="flex-1 overflow-hidden">
          {showFriendsManager ? (
            <FriendsManager 
              onSelectFriend={(friendId) => {
                handleSelectFriend(friendId);
                setShowFriendsManager(false);
              }}
            />
          ) : sidebarTab === "dms" ? (
            <div className="h-full overflow-y-auto py-2">
              {friends.length === 0 ? (
                <div className="text-center py-8 px-4 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium mb-1">No friends yet</p>
                  <p className="text-xs mb-3">Add friends to start chatting!</p>
                  <Button variant="hero" size="sm" onClick={() => setShowFriendsManager(true)}>
                    <Users className="w-4 h-4 mr-2" />
                    Add Friends
                  </Button>
                </div>
              ) : (
                friends.map((friend) => (
                  <button
                    key={friend.id}
                    onClick={() => handleSelectFriend(friend.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors ${
                      selectedFriendId === friend.id ? 'bg-secondary' : ''
                    }`}
                  >
                    <div className="relative">
                      {friend.avatar_url ? (
                        <img 
                          src={friend.avatar_url} 
                          alt={friend.display_name || friend.username || 'Friend'} 
                          className="w-11 h-11 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-primary flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary-foreground">
                            {getInitials(friend.display_name || friend.username)}
                          </span>
                        </div>
                      )}
                      <OnlineIndicator isOnline={isOnline(friend.id)} size="md" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium truncate">
                        {friend.display_name || friend.username}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        @{friend.username}
                      </p>
                    </div>
                    {(unreadByFriend ?? {})[friend.id] > 0 && (
                      <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center">
                        {(unreadByFriend ?? {})[friend.id]}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          ) : (
            /* Groups Tab */
            <div className="h-full overflow-y-auto py-2">
              {groups.length === 0 ? (
                <div className="text-center py-8 px-4 text-muted-foreground">
                  <UsersRound className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium mb-1">No groups yet</p>
                  <p className="text-xs mb-3">Create a group to chat with friends!</p>
                  <Button variant="hero" size="sm" onClick={() => setShowCreateGroup(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Group
                  </Button>
                </div>
              ) : (
                groups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => handleSelectGroup(group.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors ${
                      selectedGroupId === group.id ? 'bg-secondary' : ''
                    }`}
                  >
                    {group.avatar_url ? (
                      <img 
                        src={group.avatar_url} 
                        alt={group.name} 
                        className="w-11 h-11 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-gradient-primary flex items-center justify-center">
                        <UsersRound className="w-5 h-5 text-primary-foreground" />
                      </div>
                    )}
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium truncate">{group.name}</p>
                      <p className="text-xs text-muted-foreground truncate">Group chat</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {selectedFriend ? (
          <>
            {/* DM Chat Header */}
            <header className="h-16 px-4 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                {isMobile && (
                  <Button variant="ghost" size="icon" onClick={() => setShowSidebar(true)}>
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                )}
                <div className="relative">
                  {selectedFriend.avatar_url ? (
                    <img 
                      src={selectedFriend.avatar_url} 
                      alt={selectedFriend.display_name || selectedFriend.username || 'Friend'} 
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary-foreground">
                        {getInitials(selectedFriend.display_name || selectedFriend.username)}
                      </span>
                    </div>
                  )}
                  <OnlineIndicator isOnline={isOnline(selectedFriend.id)} size="md" />
                </div>
                <div>
                  <p className="font-semibold">{selectedFriend.display_name || selectedFriend.username}</p>
                  <p className="text-xs text-muted-foreground">
                    {isOnline(selectedFriend.id) ? (
                      <span className="text-green-500">Online</span>
                    ) : (
                      formatLastSeen(selectedFriend.id) || `@${selectedFriend.username}`
                    )}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => handleStartCall(false)}
                >
                  <Phone className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => handleStartCall(true)}
                >
                  <VideoIcon className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </header>

            {/* DM Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center h-full">
                  <p className="text-muted-foreground text-sm">No messages yet. Send one to start the conversation!</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <ChatMessage
                    key={msg.id}
                    id={msg.id}
                    content={msg.content}
                    mediaUrl={msg.media_url}
                    mediaType={msg.media_type}
                    isOwn={msg.sender_id === user?.id}
                    time={msg.created_at}
                    readAt={msg.read_at}
                    editedAt={(msg as { edited_at?: string | null }).edited_at}
                    reactions={getReactionsForMessage(msg.id)}
                    replyTo={getReplyToMessage(msg.reply_to_id)}
                    onDelete={deleteMessage}
                    onToggleReaction={toggleReaction}
                    onReply={handleReply}
                    onForward={handleForward}
                    onEdit={editMessage}
                    canDelete={msg.sender_id === user?.id || isAdmin}
                    canEdit={msg.sender_id === user?.id}
                  />
                ))
              )}
              {friendIsTyping && (
                <TypingIndicator name={selectedFriend?.display_name || selectedFriend?.username || undefined} />
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* DM Reply Preview */}
            {replyTo && (
              <ReplyPreview
                replyToMessage={replyTo}
                onCancelReply={() => setReplyTo(null)}
              />
            )}

            {/* DM Message Input */}
            <div className="p-4 border-t border-border bg-card/50 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <MediaUpload 
                    onUpload={sendMediaMessage}
                    disabled={!selectedFriendId}
                  />
                </div>
                
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 relative">
                    <Input
                      value={message}
                      onChange={(e) => {
                        setMessage(e.target.value);
                        handleTyping();
                      }}
                      onKeyPress={handleKeyPress}
                      placeholder="Type a message..."
                      className="pr-10 bg-secondary border-border focus:border-primary"
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2">
                      <EmojiPicker onEmojiSelect={(emoji) => setMessage(prev => prev + emoji)} />
                    </div>
                  </div>
                  <Button 
                    variant="hero" 
                    size="icon" 
                    onClick={handleSendMessage}
                    disabled={!message.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : selectedGroup ? (
          <div className="flex-1 flex min-w-0">
            <div className="flex-1 flex flex-col min-w-0">
              {/* Group Chat Header */}
              <header className="h-16 px-4 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  {isMobile && (
                    <Button variant="ghost" size="icon" onClick={() => setShowSidebar(true)}>
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                  )}
                  {selectedGroup.avatar_url ? (
                    <img 
                      src={selectedGroup.avatar_url} 
                      alt={selectedGroup.name} 
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                      <UsersRound className="w-5 h-5 text-primary-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">{selectedGroup.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {groupMembers.length} member{groupMembers.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => setShowGroupMembers(!showGroupMembers)}
                  title="Manage Members"
                >
                  <UserCog className="w-4 h-4" />
                </Button>
              </header>

              {/* Group Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {groupMessages.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center h-full">
                    <p className="text-muted-foreground text-sm">No messages yet. Say hello to the group!</p>
                  </div>
                ) : (
                  groupMessages.map((msg) => (
                    <GroupChatMessage
                      key={msg.id}
                      id={msg.id}
                      content={msg.content}
                      mediaUrl={msg.media_url}
                      mediaType={msg.media_type}
                      isOwn={msg.sender_id === user?.id}
                      time={msg.created_at}
                      editedAt={msg.edited_at}
                      sender={msg.sender}
                      replyTo={getGroupReplyToMessage(msg.reply_to_id)}
                      onDelete={deleteGroupMessage}
                      onEdit={editGroupMessage}
                      onReply={handleGroupReply}
                      canDelete={msg.sender_id === user?.id || isAdmin}
                      canEdit={msg.sender_id === user?.id}
                    />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Group Reply Preview */}
              {groupReplyTo && (
                <ReplyPreview
                  replyToMessage={groupReplyTo}
                  onCancelReply={() => setGroupReplyTo(null)}
                />
              )}

              {/* Group Message Input */}
              <div className="p-4 border-t border-border bg-card/50 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <MediaUpload 
                      onUpload={sendGroupMediaMessage}
                      disabled={!selectedGroupId}
                    />
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 relative">
                      <Input
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Type a message..."
                        className="pr-10 bg-secondary border-border focus:border-primary"
                      />
                      <div className="absolute right-1 top-1/2 -translate-y-1/2">
                        <EmojiPicker onEmojiSelect={(emoji) => setMessage(prev => prev + emoji)} />
                      </div>
                    </div>
                    <Button 
                      variant="hero" 
                      size="icon" 
                      onClick={handleSendMessage}
                      disabled={!message.trim()}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Group Members Panel */}
            {showGroupMembers && (
              <GroupMembersPanel
                groupId={selectedGroup.id}
                groupCreatedBy={selectedGroup.created_by}
                members={groupMembers}
                onClose={() => setShowGroupMembers(false)}
                onMembersChanged={refreshGroupMembers}
              />
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                <Shield className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Welcome to R-Vault</h2>
              <p className="text-muted-foreground mb-4">Select a conversation to start chatting</p>
              {isAdmin && (
                <p className="text-xs text-primary flex items-center justify-center gap-1 mb-4">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Admin access enabled
                </p>
              )}
              {friends.length === 0 && (
                <Button variant="hero" onClick={() => setShowFriendsManager(true)}>
                  <Users className="w-4 h-4 mr-2" />
                  Add Your First Friend
                </Button>
              )}
            </div>
          </div>
        )}
      </main>
      
      {/* Settings Dialog */}
      <SettingsDialog 
        open={showSettings} 
        onOpenChange={setShowSettings} 
      />

      {/* Active Call Modal */}
      <ActiveCallModal
        open={showCallModal && webrtcCall.callState !== "idle"}
        onClose={() => {
          setShowCallModal(false);
          webrtcCall.cleanup();
        }}
        callState={webrtcCall.callState}
        isVideoCall={isVideoCall}
        friendName={selectedFriend?.display_name || selectedFriend?.username || "Friend"}
        friendAvatar={selectedFriend?.avatar_url}
        localStream={webrtcCall.localStream}
        remoteStream={webrtcCall.remoteStream}
        isMuted={webrtcCall.isMuted}
        isVideoEnabled={webrtcCall.isVideoEnabled}
        callDuration={webrtcCall.callDuration}
        onEndCall={webrtcCall.endCall}
        onToggleMute={webrtcCall.toggleMute}
        onToggleVideo={webrtcCall.toggleVideo}
      />

      {/* Incoming Call Modal */}
      <IncomingCallModal
        incomingCall={incomingCall}
        onAnswer={handleAnswerCall}
        onDecline={handleDeclineCall}
      />

      {/* Forward Message Modal */}
      <ForwardMessageModal
        isOpen={forwardingMessage !== null}
        onClose={() => setForwardingMessage(null)}
        friends={friends.filter((f) => f.id !== selectedFriendId)}
        messageContent={forwardingMessage?.content || null}
        messageMediaUrl={forwardingMessage?.mediaUrl || null}
        messageMediaType={forwardingMessage?.mediaType || null}
        onForward={handleConfirmForward}
        isOnline={isOnline}
      />

      {/* Create Group Modal */}
      <CreateGroupModal
        open={showCreateGroup}
        onOpenChange={setShowCreateGroup}
      />
    </div>
  );
};

export default Chat;
