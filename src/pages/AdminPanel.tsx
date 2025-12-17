import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useAdmin } from "@/hooks/use-admin";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Shield,
  Search,
  ChevronLeft,
  ShieldCheck,
  Trash2,
  MessageSquare,
  Users,
  Image,
  Video,
} from "lucide-react";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
  sender_profile?: {
    display_name: string | null;
    username: string | null;
  };
  receiver_profile?: {
    display_name: string | null;
    username: string | null;
  };
}

interface ConversationPair {
  user1_id: string;
  user2_id: string;
  user1_name: string;
  user2_name: string;
  message_count: number;
  last_message: string;
}

const AdminPanel = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<ConversationPair[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<ConversationPair | null>(null);
  const [conversationMessages, setConversationMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [view, setView] = useState<"conversations" | "search">("conversations");

  // Redirect if not admin
  useEffect(() => {
    if (!loading && !adminLoading) {
      if (!user) {
        navigate("/auth");
      } else if (!isAdmin) {
        toast({
          title: "Access Denied",
          description: "You don't have admin privileges",
          variant: "destructive",
        });
        navigate("/chat");
      }
    }
  }, [user, isAdmin, loading, adminLoading, navigate, toast]);

  // Fetch all conversations
  useEffect(() => {
    if (!isAdmin) return;

    const fetchConversations = async () => {
      // Get all messages and group by conversation pairs
      const { data: allMessages, error } = await supabase
        .from("messages")
        .select("sender_id, receiver_id, content, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching messages:", error);
        return;
      }

      // Get all profiles
      const { data: profiles } = await supabase.from("profiles").select("id, display_name, username");

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      // Group messages by conversation pairs
      const convMap = new Map<string, ConversationPair>();

      allMessages?.forEach((msg) => {
        const ids = [msg.sender_id, msg.receiver_id].sort();
        const key = `${ids[0]}-${ids[1]}`;

        if (!convMap.has(key)) {
          const user1 = profileMap.get(ids[0]);
          const user2 = profileMap.get(ids[1]);
          convMap.set(key, {
            user1_id: ids[0],
            user2_id: ids[1],
            user1_name: user1?.display_name || user1?.username || "Unknown",
            user2_name: user2?.display_name || user2?.username || "Unknown",
            message_count: 0,
            last_message: msg.content || "[Media]",
          });
        }
        const conv = convMap.get(key)!;
        conv.message_count++;
      });

      setConversations(Array.from(convMap.values()));
    };

    fetchConversations();
  }, [isAdmin]);

  // Fetch messages for selected conversation
  useEffect(() => {
    if (!selectedConversation || !isAdmin) {
      setConversationMessages([]);
      return;
    }

    const fetchConversationMessages = async () => {
      setLoadingMessages(true);

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${selectedConversation.user1_id},receiver_id.eq.${selectedConversation.user2_id}),and(sender_id.eq.${selectedConversation.user2_id},receiver_id.eq.${selectedConversation.user1_id})`
        )
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching conversation:", error);
      } else {
        setConversationMessages(data || []);
      }
      setLoadingMessages(false);
    };

    fetchConversationMessages();
  }, [selectedConversation, isAdmin]);

  // Search messages
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoadingMessages(true);
    setView("search");

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .ilike("content", `%${searchQuery}%`)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Error searching:", error);
      toast({
        title: "Error",
        description: "Failed to search messages",
        variant: "destructive",
      });
    } else {
      setMessages(data || []);
    }
    setLoadingMessages(false);
  };

  // Delete message
  const handleDeleteMessage = async (messageId: string) => {
    const { error } = await supabase.from("messages").delete().eq("id", messageId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Message deleted",
      });
      // Refresh the current view
      if (view === "search") {
        setMessages((prev) => prev.filter((m) => m.id !== messageId));
      } else {
        setConversationMessages((prev) => prev.filter((m) => m.id !== messageId));
      }
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  const getMediaUrl = async (mediaPath: string) => {
    const { data } = await supabase.storage.from("chat-media").createSignedUrl(mediaPath, 60 * 60);
    return data?.signedUrl || null;
  };

  if (loading || adminLoading) {
    return (
      <div className="h-screen bg-gradient-hero flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="h-screen bg-gradient-hero flex flex-col">
      {/* Header */}
      <header className="h-16 px-4 border-b border-border flex items-center justify-between bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link to="/chat">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-bold">Admin Panel</h1>
            <p className="text-xs text-muted-foreground">Moderate conversations and content</p>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Conversations List */}
        <aside className="w-80 border-r border-border bg-card flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search messages..."
                className="pl-9 bg-secondary border-border"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button variant="hero" size="sm" className="w-full mt-2" onClick={handleSearch}>
              <Search className="w-4 h-4 mr-2" />
              Search All Messages
            </Button>
          </div>

          <div className="p-2 border-b border-border">
            <Button
              variant={view === "conversations" ? "secondary" : "ghost"}
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                setView("conversations");
                setSelectedConversation(null);
              }}
            >
              <MessageSquare className="w-4 h-4 mr-2" />
              All Conversations ({conversations.length})
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {conversations.map((conv) => (
                <button
                  key={`${conv.user1_id}-${conv.user2_id}`}
                  onClick={() => {
                    setSelectedConversation(conv);
                    setView("conversations");
                  }}
                  className={`w-full flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors text-left ${
                    selectedConversation?.user1_id === conv.user1_id &&
                    selectedConversation?.user2_id === conv.user2_id
                      ? "bg-secondary"
                      : ""
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {conv.user1_name} ↔ {conv.user2_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{conv.last_message}</p>
                    <p className="text-xs text-muted-foreground">{conv.message_count} messages</p>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {view === "search" && messages.length > 0 ? (
            <>
              <div className="p-4 border-b border-border bg-card/50">
                <h2 className="font-semibold">Search Results ({messages.length})</h2>
                <p className="text-sm text-muted-foreground">Results for "{searchQuery}"</p>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div key={msg.id} className="p-4 rounded-lg bg-card border border-border">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground mb-1">{formatDate(msg.created_at)}</p>
                          {msg.content && <p className="text-sm">{msg.content}</p>}
                          {msg.media_type && (
                            <div className="flex items-center gap-1 text-xs text-primary mt-1">
                              {msg.media_type === "image" ? (
                                <Image className="w-3 h-3" />
                              ) : (
                                <Video className="w-3 h-3" />
                              )}
                              {msg.media_type}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteMessage(msg.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          ) : selectedConversation ? (
            <>
              <div className="p-4 border-b border-border bg-card/50">
                <h2 className="font-semibold">
                  {selectedConversation.user1_name} ↔ {selectedConversation.user2_name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {selectedConversation.message_count} messages in conversation
                </p>
              </div>
              <ScrollArea className="flex-1 p-4">
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {conversationMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-4 rounded-lg border border-border ${
                          msg.sender_id === selectedConversation.user1_id
                            ? "bg-card ml-0 mr-12"
                            : "bg-primary/10 ml-12 mr-0"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground mb-1">
                              {msg.sender_id === selectedConversation.user1_id
                                ? selectedConversation.user1_name
                                : selectedConversation.user2_name}{" "}
                              • {formatDate(msg.created_at)}
                            </p>
                            {msg.content && <p className="text-sm">{msg.content}</p>}
                            {msg.media_type && (
                              <div className="flex items-center gap-1 text-xs text-primary mt-1">
                                {msg.media_type === "image" ? (
                                  <Image className="w-3 h-3" />
                                ) : (
                                  <Video className="w-3 h-3" />
                                )}
                                {msg.media_type}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteMessage(msg.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Admin Dashboard</h2>
                <p className="text-muted-foreground">
                  Select a conversation or search messages to moderate
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminPanel;
