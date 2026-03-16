import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { Loader2 } from "lucide-react";

interface QrPreviewProps {
  value: string;
  size?: number;
}

export default function QrPreview({ value, size = 256 }: QrPreviewProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!value) return;

    // If already a data URL or image URL, use directly
    if (value.startsWith("data:image")) {
      setDataUrl(value);
      return;
    }

    // Generate QR image from text
    let cancelled = false;
    QRCode.toDataURL(value, { width: size, margin: 2 })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [value, size]);

  if (!dataUrl) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt="QR Code WhatsApp"
      className="rounded-lg border"
      style={{ width: size, height: size }}
    />
  );
}
