import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MessageSquare, Lock, Users, Zap, Image } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import LockerIntro from "@/components/LockerIntro";

const Index = () => {
  const [showIntro, setShowIntro] = useState(true);
  const [hasEntered, setHasEntered] = useState(false);

  useEffect(() => {
    // Check if user has already seen the intro this session
    const hasSeenIntro = sessionStorage.getItem("r-vault-intro-seen");
    if (hasSeenIntro) {
      setShowIntro(false);
      setHasEntered(true);
    }
  }, []);

  const handleEnter = () => {
    sessionStorage.setItem("r-vault-intro-seen", "true");
    setShowIntro(false);
    setHasEntered(true);
  };

  return (
    <>
      <AnimatePresence>
        {showIntro && <LockerIntro onEnter={handleEnter} />}
      </AnimatePresence>
      
      <motion.div 
        className="min-h-screen bg-gradient-hero relative overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: hasEntered ? 1 : 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Background glow effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-glow" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent/20 rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />
      
      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-12 py-6">
        <Link to="/" className="flex items-center gap-2">
          <img src="/favicon.png" alt="R-Vault" className="w-10 h-10 rounded-xl shadow-button" />
          <span className="text-xl font-bold gradient-text">R-Vault</span>
        </Link>
        
        <div className="flex items-center gap-3">
          <Button variant="nav" asChild>
            <Link to="/auth">Login</Link>
          </Button>
          <Button variant="hero" asChild>
            <Link to="/auth?mode=signup">Sign Up</Link>
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 container mx-auto px-6 pt-12 lg:pt-24 pb-20">
        <div className="max-w-4xl mx-auto text-center animate-slide-up">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8">
            <Lock className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">End-to-End Encrypted</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight">
            Chat Securely with
            <span className="gradient-text block mt-2">Complete Privacy</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Send messages, photos, and videos knowing only you and your friends can see them. 
            Your conversations, your rules.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="hero" size="xl" asChild>
              <Link to="/auth?mode=signup">
                Get Started Free
                <Zap className="w-5 h-5" />
              </Link>
            </Button>
            <Button variant="glass" size="xl" asChild>
              <Link to="/auth">
                <MessageSquare className="w-5 h-5" />
                Start Chatting
              </Link>
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mt-24 max-w-5xl mx-auto">
          <FeatureCard
            icon={<Lock className="w-6 h-6" />}
            title="Private by Default"
            description="Only you and your friends can access your messages. No third parties, ever."
            delay={0}
          />
          <FeatureCard
            icon={<Image className="w-6 h-6" />}
            title="Media Sharing"
            description="Share photos and videos securely with the same privacy protection as your messages."
            delay={100}
          />
          <FeatureCard
            icon={<Users className="w-6 h-6" />}
            title="Trusted Connections"
            description="Connect with friends in a secure environment where your privacy is guaranteed."
            delay={200}
          />
        </div>

        {/* Chat Preview */}
        <div className="mt-24 max-w-3xl mx-auto animate-fade-in" style={{ animationDelay: '0.5s' }}>
          <div className="glass rounded-2xl p-6 shadow-card">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
              <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                <span className="text-sm font-bold text-primary-foreground">R</span>
              </div>
              <div>
                <p className="font-semibold">Rithvik</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Online
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <ChatBubble message="hey maccha start chedama" isOwn={false} time="2:30 PM" />
              <ChatBubble message="ha sare ra" isOwn={true} time="2:31 PM" />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border py-8 mt-12">
        <div className="container mx-auto px-6 text-center">
          <p className="text-muted-foreground text-sm">
            © 2024 R-Vault. Your privacy is our priority.
          </p>
        </div>
      </footer>
    </motion.div>
    </>
  );
};

const FeatureCard = ({ icon, title, description, delay }: { icon: React.ReactNode; title: string; description: string; delay: number }) => (
  <div 
    className="glass rounded-2xl p-6 hover:border-primary/30 transition-all duration-300 hover:-translate-y-1 animate-slide-up"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 text-primary">
      {icon}
    </div>
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <p className="text-muted-foreground text-sm">{description}</p>
  </div>
);

const ChatBubble = ({ message, isOwn, time }: { message: string; isOwn: boolean; time: string }) => (
  <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
    <div className={`max-w-xs rounded-2xl px-4 py-3 ${isOwn ? 'bg-gradient-primary text-primary-foreground rounded-br-md' : 'bg-secondary text-foreground rounded-bl-md'}`}>
      <p className="text-sm">{message}</p>
      <p className={`text-xs mt-1 ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{time}</p>
    </div>
  </div>
);

export default Index;
