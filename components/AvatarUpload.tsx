"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Loader2, X, Bot } from "lucide-react";
import {
  uploadBotAvatar,
  getFilePreviewUrl,
  revokeFilePreviewUrl,
  deleteBotAvatar,
} from "@/lib/supabase/upload";
import { useToast } from "@/hooks/use-toast";

interface AvatarUploadProps {
  botId?: string;
  currentAvatarUrl?: string | null;
  botName?: string;
  onAvatarChange: (url: string | null, file?: File) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "w-16 h-16",
  md: "w-20 h-20",
  lg: "w-24 h-24",
};

const iconSizes = {
  sm: "w-6 h-6",
  md: "w-8 h-8",
  lg: "w-10 h-10",
};

export function AvatarUpload({
  botId,
  currentAvatarUrl,
  botName = "Bot",
  onAvatarChange,
  disabled = false,
  size = "md",
}: AvatarUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        revokeFilePreviewUrl(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Create preview
      const preview = getFilePreviewUrl(file);
      setPreviewUrl(preview);

      if (botId) {
        setIsUploading(true);
        const result = await uploadBotAvatar(file, botId);
        setIsUploading(false);

        if (result.success && result.url) {
          onAvatarChange(result.url);
          toast({
            title: "Thành công",
            description: "Đã upload avatar.",
          });
        } else {
          toast({
            title: "Lỗi",
            description: result.error || "Không thể upload avatar.",
            variant: "destructive",
          });
          setPreviewUrl(null);
          revokeFilePreviewUrl(preview);
        }
      } else {
        onAvatarChange(preview, file);
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [botId, onAvatarChange, toast]
  );

  const handleRemove = useCallback(() => {
    if (previewUrl && botId) {
      deleteBotAvatar(botId);
      revokeFilePreviewUrl(previewUrl);
    }
    setPreviewUrl(null);
    onAvatarChange(null);
  }, [previewUrl, onAvatarChange, botId]);

  const displayUrl = previewUrl || currentAvatarUrl;
  const initials = botName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="group relative">
        <Avatar className={`${sizeClasses[size]} border-2 border-muted`}>
          <AvatarImage src={displayUrl || undefined} alt={botName} />
          <AvatarFallback className="bg-primary/10">
            {displayUrl ? initials : <Bot className={`${iconSizes[size]} text-primary`} />}
          </AvatarFallback>
        </Avatar>

        {/* Upload overlay */}
        {!disabled && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            ) : (
              <Camera className="h-6 w-6 text-white" />
            )}
          </button>
        )}

        {/* Remove button */}
        {displayUrl && !disabled && !isUploading && (
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-destructive shadow-md transition-colors hover:bg-destructive/90"
          >
            <X className="h-4 w-4 text-destructive-foreground" />
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />

      <p className="text-center text-xs text-muted-foreground">
        Click để thay đổi avatar (max 2MB)
      </p>
    </div>
  );
}
