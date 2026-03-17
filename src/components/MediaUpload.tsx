import { useRef } from "react";
import { FileText, Image, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface MediaUploadProps {
  onUpload: (file: File) => Promise<void>;
  disabled?: boolean;
}

const MediaUpload = ({ onUpload, disabled = false }: MediaUploadProps) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = async (file: File | null) => {
    if (!file) return;

    // Check file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 100MB",
        variant: "destructive",
      });
      return;
    }

    await onUpload(file);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    await handleFile(file);

    // Reset input
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    const file = e.dataTransfer.files?.[0] || null;
    await handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      className="flex items-center gap-1"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf,.rar,application/vnd.rar,application/x-rar-compressed"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled}
      />
      
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-primary"
        onClick={() => imageInputRef.current?.click()}
        disabled={disabled}
      >
        <Image className="w-5 h-5" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-primary"
        onClick={() => videoInputRef.current?.click()}
        disabled={disabled}
      >
        <Video className="w-5 h-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="text-muted-foreground hover:text-primary"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled}
        title="Send file (PDF/RAR)"
      >
        <FileText className="w-5 h-5" />
      </Button>
    </div>
  );
};

export default MediaUpload;
