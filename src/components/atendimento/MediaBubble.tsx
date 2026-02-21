import { memo, useState } from "react";
import { Download, FileText, Loader2, Play, X, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface MediaBubbleProps {
  msgType: string;
  mediaUrl: string | null;
  mediaMime: string | null;
  mediaFilename: string | null;
  mediaSize: number | null;
  mediaDuration: number | null;
  caption: string | null;
  isMe: boolean;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export const MediaBubble = memo(function MediaBubble({
  msgType,
  mediaUrl,
  mediaMime,
  mediaFilename,
  mediaSize,
  mediaDuration,
  caption,
  isMe,
}: MediaBubbleProps) {
  const [imageModalOpen, setImageModalOpen] = useState(false);

  // Loading state - media not yet downloaded
  if (!mediaUrl && msgType !== "text") {
    return (
      <div className={cn(
        "flex items-center gap-2 px-3 py-2.5 rounded-xl min-w-[140px]",
        isMe ? "bg-primary/80 text-primary-foreground" : "bg-muted/30 border border-border/20"
      )}>
        <Loader2 className="h-4 w-4 animate-spin shrink-0 opacity-60" />
        <span className="text-xs opacity-70">Baixando mídia…</span>
      </div>
    );
  }

  // Audio
  if (msgType === "audio") {
    return (
      <div className="space-y-1 min-w-[220px] max-w-[300px]">
        <audio controls preload="none" className="w-full h-10 rounded-lg" style={{ colorScheme: 'auto' }}>
          <source src={mediaUrl!} type={mediaMime || "audio/ogg"} />
        </audio>
        {mediaDuration && (
          <span className="text-[10px] opacity-50">{formatDuration(mediaDuration)}</span>
        )}
      </div>
    );
  }

  // Image
  if (msgType === "image" || msgType === "sticker") {
    const isSticker = msgType === "sticker";
    return (
      <>
        <div className="space-y-1">
          <button
            onClick={() => setImageModalOpen(true)}
            className="block rounded-xl overflow-hidden cursor-zoom-in hover:opacity-90 transition-opacity"
          >
            <img
              src={mediaUrl!}
              alt={caption || "Imagem"}
              loading="lazy"
              className={cn(
                "object-cover rounded-xl",
                isSticker ? "max-w-[150px] max-h-[150px]" : "max-w-[280px] max-h-[300px]"
              )}
            />
          </button>
          {caption && caption !== `[${msgType}]` && (
            <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{caption}</p>
          )}
        </div>

        <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
          <DialogContent className="max-w-[90vw] max-h-[90vh] p-2 bg-background/95 backdrop-blur">
            <div className="relative flex items-center justify-center">
              <img
                src={mediaUrl!}
                alt={caption || "Imagem"}
                className="max-w-full max-h-[85vh] object-contain rounded-lg"
              />
              <div className="absolute top-2 right-2 flex gap-1">
                <a href={mediaUrl!} download target="_blank" rel="noopener noreferrer">
                  <Button size="icon" variant="secondary" className="h-8 w-8 rounded-lg">
                    <Download className="h-4 w-4" />
                  </Button>
                </a>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Video
  if (msgType === "video") {
    return (
      <div className="space-y-1 max-w-[300px]">
        <video
          controls
          preload="metadata"
          className="rounded-xl max-w-full max-h-[300px]"
          playsInline
        >
          <source src={mediaUrl!} type={mediaMime || "video/mp4"} />
        </video>
        {caption && caption !== `[${msgType}]` && (
          <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{caption}</p>
        )}
      </div>
    );
  }

  // Document
  if (msgType === "document") {
    const displayName = mediaFilename || "Documento";
    return (
      <a
        href={mediaUrl!}
        target="_blank"
        rel="noopener noreferrer"
        download
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-xl min-w-[200px] max-w-[300px] transition-colors",
          isMe
            ? "bg-primary-foreground/10 hover:bg-primary-foreground/20"
            : "bg-muted/20 hover:bg-muted/40 border border-border/20"
        )}
      >
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{displayName}</p>
          {mediaSize && (
            <p className="text-[10px] opacity-50">{formatFileSize(mediaSize)}</p>
          )}
        </div>
        <Download className="h-4 w-4 opacity-40 shrink-0" />
      </a>
    );
  }

  // Fallback for unknown media types
  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2.5 rounded-xl",
      isMe ? "bg-primary/80 text-primary-foreground" : "bg-muted/30 border border-border/20"
    )}>
      <FileText className="h-4 w-4 opacity-60" />
      <span className="text-xs opacity-70">[{msgType}]</span>
    </div>
  );
});
