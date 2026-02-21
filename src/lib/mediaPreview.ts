/**
 * Returns a friendly preview string for a media message type,
 * used in the inbox sidebar instead of raw "[audio]" etc.
 */
export function formatMediaPreview(
  preview: string,
  msgType?: string,
  filename?: string | null,
): string {
  if (!msgType || msgType === "text") return preview;

  // If the preview is already a "[type]" placeholder, replace it
  const isPlaceholder = /^\[.+\]$/.test(preview.trim());
  
  switch (msgType) {
    case "audio":
      return isPlaceholder ? "🎤 Mensagem de voz" : `🎤 ${preview}`;
    case "image":
      return isPlaceholder ? "🖼️ Foto" : `🖼️ ${preview}`;
    case "video":
      return isPlaceholder ? "🎞️ Vídeo" : `🎞️ ${preview}`;
    case "document":
      if (filename) return `📄 ${filename}`;
      return isPlaceholder ? "📄 Documento" : `📄 ${preview}`;
    case "sticker":
      return "🎨 Figurinha";
    default:
      return preview;
  }
}
