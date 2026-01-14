import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Smile } from "lucide-react";

const EMOJI_CATEGORIES = {
  smileys: ["😀", "😃", "😄", "😁", "😅", "😂", "🤣", "😊", "😇", "🙂", "😉", "😍", "🥰", "😘", "😋", "😜", "🤪", "😎", "🤩", "🥳"],
  gestures: ["👍", "👎", "👌", "✌️", "🤞", "🤟", "🤙", "👋", "🙏", "🤝", "💪", "👏", "🙌", "👐", "🤲", "❤️", "🧡", "💛", "💚", "💙"],
  objects: ["🎉", "🎊", "🎁", "🎈", "✨", "⭐", "🌟", "💫", "🔥", "💥", "💯", "🎯", "🏆", "🥇", "🎵", "🎶", "📱", "💻", "🎮", "📷"],
  nature: ["🌸", "🌺", "🌻", "🌹", "🌷", "🌼", "🌱", "🌲", "🌴", "🍀", "🌈", "☀️", "🌙", "⭐", "☁️", "🌧️", "❄️", "🐶", "🐱", "🐼"],
  food: ["🍕", "🍔", "🍟", "🌭", "🍿", "🧁", "🍰", "🍩", "🍪", "🍫", "🍦", "🍭", "☕", "🍵", "🥤", "🍺", "🍷", "🥂", "🍾", "🎂"],
};

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

const EmojiPicker = ({ onEmojiSelect }: EmojiPickerProps) => {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<keyof typeof EMOJI_CATEGORIES>("smileys");

  const handleSelect = (emoji: string) => {
    onEmojiSelect(emoji);
    setOpen(false);
  };

  const categoryIcons: Record<keyof typeof EMOJI_CATEGORIES, string> = {
    smileys: "😀",
    gestures: "👍",
    objects: "🎉",
    nature: "🌸",
    food: "🍕",
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="text-muted-foreground hover:text-foreground"
          type="button"
        >
          <Smile className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-72 p-2" 
        side="top" 
        align="end"
        sideOffset={8}
      >
        {/* Category Tabs */}
        <div className="flex gap-1 mb-2 pb-2 border-b border-border">
          {(Object.keys(EMOJI_CATEGORIES) as Array<keyof typeof EMOJI_CATEGORIES>).map((category) => (
            <Button
              key={category}
              variant={activeCategory === category ? "secondary" : "ghost"}
              size="sm"
              className="h-8 w-8 p-0 text-lg"
              onClick={() => setActiveCategory(category)}
            >
              {categoryIcons[category]}
            </Button>
          ))}
        </div>
        
        {/* Emoji Grid */}
        <div className="grid grid-cols-8 gap-1 max-h-40 overflow-y-auto">
          {EMOJI_CATEGORIES[activeCategory].map((emoji, index) => (
            <button
              key={index}
              className="w-8 h-8 flex items-center justify-center text-lg hover:bg-secondary rounded transition-colors"
              onClick={() => handleSelect(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default EmojiPicker;
