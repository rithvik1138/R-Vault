interface TypingIndicatorProps {
  name?: string;
}

const TypingIndicator = ({ name }: TypingIndicatorProps) => {
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className="flex items-center gap-1">
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
        <span className="text-sm text-muted-foreground ml-2">
          {name ? `${name} is typing...` : "typing..."}
        </span>
      </div>
    </div>
  );
};

export default TypingIndicator;
