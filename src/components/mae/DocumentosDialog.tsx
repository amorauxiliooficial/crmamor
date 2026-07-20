import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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

interface DocumentosContentProps {
  maeId: string;
  linkDocumentos: string | null;
  onSuccess: () => void;
}

export function DocumentosContent({
  maeId,
  linkDocumentos,
  onSuccess,
}: DocumentosContentProps) {
  const [link, setLink] = useState(linkDocumentos || "");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setLink(linkDocumentos || "");
  }, [linkDocumentos, maeId]);

  const handleSave = async () => {
    const normalizedLink = link.trim();
    if (normalizedLink) {
      try {
        const parsed = new URL(normalizedLink);
        if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
          throw new Error("Invalid protocol");
        }
      } catch {
        toast.error("Informe um link válido iniciado por http:// ou https://");
        return;
      }
    }

    setIsLoading(true);

    const { error } = await supabase
      .from("mae_processo")
      .update({ link_documentos: normalizedLink || null })
      .eq("id", maeId);

    setIsLoading(false);

    if (error) {
      toast.error("Erro ao salvar link");
      console.error(error);
      return;
    }

    toast.success("Link salvo com sucesso!");
    onSuccess();
  };

  const handleOpenLink = () => {
    if (link) window.open(link, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-5 py-1">
      <div className="flex items-start justify-between gap-3 border-b pb-3">
        <div>
          <h4 className="flex items-center gap-2 font-semibold">
            <FolderOpen className="h-4 w-4 text-primary" />
            Documentos no ZapResponder
          </h4>
          <p className="mt-1 text-sm text-muted-foreground">
            Acesse diretamente o card onde estão os anexos da cliente.
          </p>
        </div>
        {link && (
          <Button variant="outline" size="sm" onClick={handleOpenLink} className="shrink-0 gap-2">
            <ExternalLink className="h-4 w-4" />
            Abrir anexos
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor={`link_documentos_${maeId}`}>Link do card</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id={`link_documentos_${maeId}`}
            value={link}
            onChange={(event) => setLink(event.target.value)}
            placeholder="Cole o link do card no ZapResponder..."
            className="flex-1"
          />
          <Button onClick={handleSave} disabled={isLoading} className="gap-2 sm:shrink-0">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar link
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          O link é preenchido automaticamente quando o card entra em Contrato fechado. Você também pode colá-lo
          manualmente.
        </p>
      </div>

      {!link && (
        <div className="border-t py-8 text-center text-muted-foreground">
          <FolderOpen className="mx-auto mb-2 h-9 w-9 opacity-40" />
          <p className="text-sm font-medium text-foreground">Nenhum card vinculado</p>
          <p className="mt-1 text-xs">Cole o link acima para acessar os anexos da cliente no ZapResponder.</p>
        </div>
      )}
    </div>
  );
}

export function DocumentosDialog({
  open,
  onOpenChange,
  maeId,
  maeNome,
  linkDocumentos,
  onSuccess,
}: DocumentosDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-primary" />
            Documentos - {maeNome}
          </DialogTitle>
          <DialogDescription>
            Acesse os anexos disponíveis no card do ZapResponder.
          </DialogDescription>
        </DialogHeader>

        <DocumentosContent
          maeId={maeId}
          linkDocumentos={linkDocumentos}
          onSuccess={onSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}
