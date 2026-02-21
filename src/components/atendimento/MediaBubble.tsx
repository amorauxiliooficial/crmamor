import { memo, useState } from "react";
import { Download, FileText, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { VoiceNote } from "@/components/atendimento/VoiceNote";

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
  const [videoModalOpen, setVideoModalOpen] = useState(false);

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

  // Audio - WhatsApp-like voice note
  if (msgType === "audio") {
    return (
      <div className="space-y-1">
        <VoiceNote
          src={mediaUrl!}
          duration={mediaDuration}
          isMe={isMe}
        />
        {caption && caption !== "[audio]" && (
          <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{caption}</p>
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
          {caption && caption !== "[image]" && caption !== "[sticker]" && (
            <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{caption}</p>
          )}
        </div>

        <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
          <DialogContent fullscreenOnMobile={false} className="max-w-[90vw] max-h-[90vh] p-2 bg-background/95 backdrop-blur">
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
      <>
        <div className="space-y-1 max-w-[300px]">
          <button
            onClick={() => setVideoModalOpen(true)}
            className="block rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity relative"
          >
            <video
              preload="metadata"
              className="rounded-xl max-w-full max-h-[200px] object-cover"
              playsInline
              muted
            >
              <source src={mediaUrl!} type={mediaMime || "video/mp4"} />
            </video>
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl">
              <div className="h-12 w-12 rounded-full bg-background/80 flex items-center justify-center">
                <span className="text-lg ml-0.5">▶</span>
              </div>
            </div>
          </button>
          {caption && caption !== "[video]" && (
            <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{caption}</p>
          )}
        </div>

        <Dialog open={videoModalOpen} onOpenChange={setVideoModalOpen}>
          <DialogContent fullscreenOnMobile={false} className="max-w-[90vw] max-h-[90vh] p-2 bg-background/95 backdrop-blur">
            <div className="relative flex items-center justify-center">
              <video
                controls
                autoPlay
                preload="auto"
                className="max-w-full max-h-[85vh] rounded-lg"
                playsInline
              >
                <source src={mediaUrl!} type={mediaMime || "video/mp4"} />
              </video>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Document
  if (msgType === "document") {
    const displayName = mediaFilename || "Documento";
    return (
      <div className="space-y-1">
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
        {caption && caption !== "[document]" && (
          <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{caption}</p>
        )}
      </div>
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
