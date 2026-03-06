import { memo, useState } from "react";
import { Download, ExternalLink, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { VoiceNote } from "@/components/atendimento/VoiceNote";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

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

function getDocumentIcon(mime: string | null, filename: string | null) {
  const ext = filename?.split('.').pop()?.toLowerCase() || '';
  const isPdf = mime?.includes('pdf') || ext === 'pdf';
  const isSpreadsheet = ['xls', 'xlsx', 'csv'].includes(ext) || mime?.includes('spreadsheet') || mime?.includes('excel');
  const isDoc = ['doc', 'docx'].includes(ext) || mime?.includes('word');

  if (isPdf) return { icon: "📄", color: "text-red-500", bg: "bg-red-500/10", label: "PDF" };
  if (isSpreadsheet) return { icon: "📊", color: "text-green-600", bg: "bg-green-500/10", label: "Planilha" };
  if (isDoc) return { icon: "📝", color: "text-blue-500", bg: "bg-blue-500/10", label: "Documento" };
  return { icon: "📎", color: "text-muted-foreground", bg: "bg-muted/20", label: "Arquivo" };
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
    // Check if message is old (>5 min) — media download likely failed
    const isStale = false; // Caller doesn't pass timestamp, show generic state
    return (
      <div className={cn(
        "flex items-center gap-2 px-3 py-2.5 rounded-xl min-w-0 w-full",
        isMe ? "opacity-80" : "opacity-80"
      )}>
        <FileText className="h-4 w-4 shrink-0 opacity-50" />
        <span className="text-xs opacity-60">Mídia indisponível</span>
      </div>
    );
  }

  // Audio - WhatsApp-like voice note
  if (msgType === "audio") {
    return (
      <div className="space-y-1 min-w-0 w-full px-2.5">
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
        <div className="space-y-1 min-w-0 px-2.5">
          <button
            onClick={() => setImageModalOpen(true)}
            className="block rounded-xl overflow-hidden cursor-zoom-in hover:opacity-90 transition-opacity"
          >
            <img
              src={mediaUrl!}
              alt={caption || "Imagem"}
              loading="lazy"
              className={cn(
                "object-cover rounded-xl w-full",
                isSticker ? "max-w-[150px] max-h-[150px]" : "max-w-full max-h-[300px]"
              )}
            />
          </button>
          {caption && caption !== "[image]" && caption !== "[sticker]" && (
            <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{caption}</p>
          )}
        </div>

        <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
          <DialogContent fullscreenOnMobile={false} className="max-w-[90vw] max-h-[90vh] p-2 bg-background/95 backdrop-blur" aria-describedby={undefined}>
            <VisuallyHidden.Root><DialogTitle>Imagem</DialogTitle></VisuallyHidden.Root>
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
        <div className="space-y-1 min-w-0 w-full px-2.5">
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
          <DialogContent fullscreenOnMobile={false} className="max-w-[90vw] max-h-[90vh] p-2 bg-background/95 backdrop-blur" aria-describedby={undefined}>
            <VisuallyHidden.Root><DialogTitle>Vídeo</DialogTitle></VisuallyHidden.Root>
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

  // Document - Enhanced card
  if (msgType === "document") {
    const displayName = mediaFilename || "Documento";
    const truncatedName = displayName.length > 35 ? displayName.slice(0, 32) + "…" : displayName;
    const docInfo = getDocumentIcon(mediaMime, mediaFilename);
    const isPdf = mediaMime?.includes('pdf') || displayName.toLowerCase().endsWith('.pdf');

    return (
      <div className="space-y-1.5 min-w-0 w-full">
        <div className={cn(
          "rounded-xl min-w-0 w-full overflow-hidden",
          isMe
            ? "bg-primary-foreground/10 border border-primary-foreground/10"
            : "bg-card border border-border/30"
        )}>
          {/* Document header with icon */}
        <div className="flex items-center gap-3 px-4 py-3 min-w-0">
            <div className={cn("h-11 w-11 rounded-xl flex items-center justify-center shrink-0", docInfo.bg)}>
              <span className="text-xl">{docInfo.icon}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className={cn(
                "text-sm font-medium truncate min-w-0",
                isMe ? "text-primary-foreground" : "text-foreground"
              )} title={displayName}>
                {displayName}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={cn(
                  "text-[10px] font-medium uppercase tracking-wide",
                  isMe ? "text-primary-foreground/50" : "text-muted-foreground/60"
                )}>
                  {docInfo.label}
                </span>
                {mediaSize && (
                  <>
                    <span className={cn("text-[10px]", isMe ? "text-primary-foreground/30" : "text-muted-foreground/30")}>•</span>
                    <span className={cn("text-[10px]", isMe ? "text-primary-foreground/50" : "text-muted-foreground/60")}>
                      {formatFileSize(mediaSize)}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className={cn(
            "flex border-t",
            isMe ? "border-primary-foreground/10" : "border-border/20"
          )}>
            {isPdf && (
              <button
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  try {
                    // Fetch PDF and create blob URL to bypass iframe/CORS restrictions
                    const res = await fetch(mediaUrl!);
                    const blob = await res.blob();
                    const blobUrl = URL.createObjectURL(blob);
                    const opened = window.open(blobUrl, '_blank');
                    if (!opened) {
                      // Fallback: trigger download
                      const link = document.createElement('a');
                      link.href = blobUrl;
                      link.download = displayName;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }
                    // Cleanup blob URL after a delay
                    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
                  } catch {
                    // Last resort: direct link
                    const link = document.createElement('a');
                    link.href = mediaUrl!;
                    link.download = displayName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }
                }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors cursor-pointer",
                  isMe
                    ? "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/5"
                    : "text-primary/70 hover:text-primary hover:bg-primary/5",
                  "border-r",
                  isMe ? "border-primary-foreground/10" : "border-border/20"
                )}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Abrir
              </button>
            )}
            <a
              href={mediaUrl!}
              download={displayName}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors",
                isMe
                  ? "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/5"
                  : "text-primary/70 hover:text-primary hover:bg-primary/5"
              )}
            >
              <Download className="h-3.5 w-3.5" />
              Baixar
            </a>
          </div>
        </div>

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
