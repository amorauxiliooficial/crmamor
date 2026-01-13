import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExternalLink, FolderOpen, Save, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DocumentosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  maeId: string;
  maeNome: string;
  linkDocumentos: string | null;
  onSuccess: () => void;
}

// Helper to convert OneDrive sharing link to embed URL
const getEmbedUrl = (link: string): string | null => {
  if (!link) return null;
  
  // If it's already an embed URL, use it
  if (link.includes("embed")) return link;
  
  // OneDrive personal sharing link format
  if (link.includes("1drv.ms") || link.includes("onedrive.live.com")) {
    // For folder sharing links, append embed parameter
    if (link.includes("?")) {
      return link + "&embed=1";
    }
    return link + "?embed=1";
  }
  
  // OneDrive for Business / SharePoint format
  if (link.includes("sharepoint.com") || link.includes("my.sharepoint.com")) {
    // Replace /view with /embed or add embed parameter
    let embedUrl = link;
    if (embedUrl.includes("/view")) {
      embedUrl = embedUrl.replace("/view", "/embed");
    } else if (embedUrl.includes("?")) {
      embedUrl += "&action=embedview";
    } else {
      embedUrl += "?action=embedview";
    }
    return embedUrl;
  }
  
  // Return as-is if we can't determine the format
  return link;
};

export function DocumentosDialog({
  open,
  onOpenChange,
  maeId,
  maeNome,
  linkDocumentos,
  onSuccess,
}: DocumentosDialogProps) {
  const [link, setLink] = useState(linkDocumentos || "");
  const [isLoading, setIsLoading] = useState(false);
  const [showEmbed, setShowEmbed] = useState(!!linkDocumentos);

  const handleSave = async () => {
    setIsLoading(true);
    
    const { error } = await supabase
      .from("mae_processo")
      .update({ link_documentos: link.trim() || null })
      .eq("id", maeId);

    setIsLoading(false);

    if (error) {
      toast.error("Erro ao salvar link");
      console.error(error);
    } else {
      toast.success("Link salvo com sucesso!");
      setShowEmbed(!!link.trim());
      onSuccess();
    }
  };

  const embedUrl = getEmbedUrl(link);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            Documentos - {maeNome}
          </DialogTitle>
          <DialogDescription>
            Visualize ou atualize o link da pasta de documentos no OneDrive
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Link Input Section */}
          <div className="space-y-2">
            <Label htmlFor="link_documentos">Link da Pasta de Documentos (OneDrive)</Label>
            <div className="flex gap-2">
              <Input
                id="link_documentos"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="Cole aqui o link de compartilhamento do OneDrive..."
                className="flex-1"
              />
              <Button
                onClick={handleSave}
                disabled={isLoading}
                size="sm"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
              </Button>
              {link && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(link, "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              💡 Dica: No OneDrive, clique com botão direito na pasta → Compartilhar → Copiar link
            </p>
          </div>

          {/* Embed Preview */}
          {showEmbed && embedUrl && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Pré-visualização</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEmbed(false)}
                >
                  <X className="h-4 w-4 mr-1" />
                  Fechar
                </Button>
              </div>
              <div className="relative w-full h-[500px] border rounded-lg overflow-hidden bg-muted">
                <iframe
                  src={embedUrl}
                  className="absolute inset-0 w-full h-full"
                  frameBorder="0"
                  scrolling="yes"
                  allowFullScreen
                  title={`Documentos de ${maeNome}`}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Se a visualização não carregar, clique no botão 🔗 para abrir no OneDrive
              </p>
            </div>
          )}

          {!showEmbed && link && (
            <Button
              variant="outline"
              onClick={() => setShowEmbed(true)}
              className="w-full"
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              Visualizar Documentos
            </Button>
          )}

          {!link && (
            <div className="text-center py-8 text-muted-foreground">
              <FolderOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum link de documentos cadastrado</p>
              <p className="text-xs">Cole o link do OneDrive acima para começar</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
