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
import { ExternalLink, FolderOpen, Save, Loader2 } from "lucide-react";
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
      onSuccess();
    }
  };

  const handleOpenLink = () => {
    if (link) {
      window.open(link, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            Documentos - {maeNome}
          </DialogTitle>
          <DialogDescription>
            Gerencie o link da pasta de documentos no OneDrive
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Link Input Section */}
          <div className="space-y-2">
            <Label htmlFor="link_documentos">Link da Pasta (OneDrive/SharePoint)</Label>
            <div className="flex gap-2">
              <Input
                id="link_documentos"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="Cole aqui o link de compartilhamento..."
                className="flex-1"
              />
              <Button
                onClick={handleSave}
                disabled={isLoading}
                size="icon"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              💡 No OneDrive, clique com botão direito na pasta → Compartilhar → Copiar link
            </p>
          </div>

          {/* Action Button */}
          {link ? (
            <Button
              onClick={handleOpenLink}
              className="w-full"
              variant="default"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir Pasta no OneDrive
            </Button>
          ) : (
            <div className="text-center py-6 text-muted-foreground border rounded-lg bg-muted/30">
              <FolderOpen className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum link cadastrado</p>
              <p className="text-xs">Cole o link acima para vincular a pasta</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}