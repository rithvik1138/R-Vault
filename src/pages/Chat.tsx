import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Shield, Send, Search, Settings, LogOut, MoreVertical, 
  Phone, VideoIcon, Smile, ChevronLeft, Users, ShieldCheck
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/use-auth";
import { useFriends } from "@/hooks/use-friends";
import { useMessages } from "@/hooks/use-messages";
import { useAdmin } from "@/hooks/use-admin";
import { useTypingIndicator } from "@/hooks/use-typing-indicator";
import { useNotifications } from "@/hooks/use-notifications";
import FriendsManager from "@/components/FriendsManager";
import ChatMessage from "@/components/ChatMessage";
import MediaUpload from "@/components/MediaUpload";
import TypingIndicator from "@/components/TypingIndicator";
import ProfileEditor from "@/components/ProfileEditor";

const Chat = () => {
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [showSidebar, setShowSidebar] = useState(true);
  const [showFriendsManager, setShowFriendsManager] = useState(false);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { user, profile, loading, signOut } = useAuth();
  const { friends } = useFriends();
  const { messages, sendMessage, sendMediaMessage, deleteMessage } = useMessages(selectedFriendId);
  const { isAdmin } = useAdmin();
  const { friendIsTyping, handleTyping, stopTyping } = useTypingIndicator(selectedFriendId);
  
  // Enable in-app notifications for messages from other conversations
  useNotifications(selectedFriendId);

  const selectedFriend = friends.find(f => f.id === selectedFriendId);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (message.trim()) {
      stopTyping();
      await sendMessage(message);
      setMessage("");
    }
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
                onClick={() => setShowProfileEditor(true)}
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
            onClick={() => setShowProfileEditor(true)}
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

        {/* Friends Manager or Contacts List */}
        <div className="flex-1 overflow-hidden">
          {showFriendsManager ? (
            <FriendsManager 
              onSelectFriend={(friendId) => {
                setSelectedFriendId(friendId);
                setShowFriendsManager(false);
                if (isMobile) setShowSidebar(false);
              }}
            />
          ) : (
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
                    onClick={() => {
                      setSelectedFriendId(friend.id);
                      if (isMobile) setShowSidebar(false);
                    }}
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
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium truncate">
                        {friend.display_name || friend.username}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        @{friend.username}
                      </p>
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
            {/* Chat Header */}
            <header className="h-16 px-4 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                {isMobile && (
                  <Button variant="ghost" size="icon" onClick={() => setShowSidebar(true)}>
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                )}
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
                <div>
                  <p className="font-semibold">{selectedFriend.display_name || selectedFriend.username}</p>
                  <p className="text-xs text-muted-foreground">@{selectedFriend.username}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                  <Phone className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                  <VideoIcon className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </header>

            {/* Messages */}
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
                    onDelete={deleteMessage}
                    canDelete={msg.sender_id === user?.id || isAdmin}
                  />
                ))
              )}
              {friendIsTyping && (
                <TypingIndicator name={selectedFriend?.display_name || selectedFriend?.username || undefined} />
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
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
                    <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <Smile className="w-4 h-4" />
                    </Button>
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
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                <Shield className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Welcome to R-Vault</h2>
              <p className="text-muted-foreground mb-4">Select a friend to start chatting</p>
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
      {/* Profile Editor Dialog */}
      <ProfileEditor 
        open={showProfileEditor} 
        onOpenChange={setShowProfileEditor} 
      />
    </div>
  );
};

export default Chat;
