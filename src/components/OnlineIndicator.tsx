import { cn } from "@/lib/utils";

interface OnlineIndicatorProps {
  isOnline: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const OnlineIndicator = ({ isOnline, size = "md", className }: OnlineIndicatorProps) => {
  if (!isOnline) return null;

  const sizeClasses = {
    sm: "w-2.5 h-2.5",
    md: "w-3 h-3",
    lg: "w-3.5 h-3.5",
  };

  return (
    <span
      className={cn(
        "absolute bottom-0 right-0 rounded-full bg-green-500 border-2 border-card",
        sizeClasses[size],
        className
      )}
      title="Online"
    />
  );
};

export default OnlineIndicator;
