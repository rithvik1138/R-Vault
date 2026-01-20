import { Check, CheckCheck } from "lucide-react";

interface ReadReceiptProps {
  isRead: boolean;
  isOwn: boolean;
}

const ReadReceipt = ({ isRead, isOwn }: ReadReceiptProps) => {
  if (!isOwn) return null;

  return (
    <span className="inline-flex ml-1">
      {isRead ? (
        <CheckCheck className="h-3.5 w-3.5 text-primary" />
      ) : (
        <Check className="h-3.5 w-3.5 text-primary-foreground/50" />
      )}
    </span>
  );
};

export default ReadReceipt;
