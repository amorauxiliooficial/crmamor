import { useCallback, useEffect, useState } from "react";
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
import { ExternalLink, FileText, FolderOpen, Image, Save, Loader2, RefreshCw } from "lucide-react";
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

interface DocumentoCliente {
  id: string;
  nome_arquivo: string;
  mime_type: string | null;
  tamanho_bytes: number | null;
  received_at: string | null;
  created_at: string;
  storage_path: string;
  signedUrl: string;
}


const hiddenMediaExtensions = new Set([
  "aac", "amr", "flac", "m4a", "mp3", "oga", "ogg", "opus", "wav", "wma",
  "3gp", "avi", "mkv", "mov", "mp4", "mpeg", "mpg", "webm",
]);

function isAudioOrVideo(document: Pick<DocumentoCliente, "nome_arquivo" | "mime_type">) {
  const mimeType = document.mime_type?.toLowerCase() || "";
  if (mimeType.startsWith("audio/") || mimeType.startsWith("video/")) return true;

  const extension = document.nome_arquivo.toLowerCase().split(".").pop();
  return Boolean(extension && hiddenMediaExtensions.has(extension));
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return null;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentosContent({
  maeId,
  linkDocumentos,
  onSuccess,
}: DocumentosContentProps) {
  const [link, setLink] = useState(linkDocumentos || "");
  const [isLoading, setIsLoading] = useState(false);
  const [documents, setDocuments] = useState<DocumentoCliente[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setLink(linkDocumentos || "");
  }, [linkDocumentos, maeId]);

  const loadDocuments = useCallback(async () => {
    setIsLoadingDocuments(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from("mae_documentos")
      .select("id, nome_arquivo, mime_type, tamanho_bytes, received_at, created_at, storage_path")
      .eq("mae_id", maeId)
      .order("received_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar documentos:", error);
      setDocuments([]);
      setLoadError(error.message || "Não foi possível carregar os documentos.");
      setIsLoadingDocuments(false);
      return;
    }

    const visibleDocuments = (data || []).filter((document) => !isAudioOrVideo(document));
    const withUrls = await Promise.all(visibleDocuments.map(async (document) => {
      try {
        const { data: signed, error: signedError } = await supabase.storage
          .from("documentos-clientes")
          .createSignedUrl(document.storage_path, 60 * 60);
        if (signedError) console.error("Erro ao gerar URL:", document.storage_path, signedError);
        return { ...document, signedUrl: signed?.signedUrl || "" };
      } catch (err) {
        console.error("Erro ao gerar URL:", document.storage_path, err);
        return { ...document, signedUrl: "" };
      }
    }));
    // Mantém os itens mesmo se a URL assinada falhar individualmente
    setDocuments(withUrls);
    setIsLoadingDocuments(false);
  }, [maeId]);


  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const handleSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("zap-sync-documentos", {
        body: { maeId },
      });

      if (error) {
        console.error("Erro ao sincronizar documentos:", error);
        toast.error("Não foi possível sincronizar a conversa agora.");
        return;
      }

      if (data && data.success === false) {
        toast.error(data.error || "Falha ao processar a conversa.");
        return;
      }

      if (data?.processed) {
        toast.success("Conversa sincronizada. Atualizando documentos...");
      } else {
        toast.success("Sincronização agendada. Os documentos aparecerão em instantes.");
      }
    } catch (err) {
      console.error("Erro ao sincronizar documentos:", err);
      toast.error("Não foi possível sincronizar a conversa agora.");
    } finally {
      setIsSyncing(false);
      await loadDocuments();
    }
  }, [maeId, loadDocuments]);

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

      <div className="space-y-3 border-t pt-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h5 className="font-medium">Anexos recebidos na conversa</h5>
            <p className="text-xs text-muted-foreground">
              Fotos e documentos enviados pela cliente no WhatsApp.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => void loadDocuments()}
            disabled={isLoadingDocuments}
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingDocuments ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        {loadError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            Erro ao carregar documentos: {loadError}
          </div>
        )}

        {isLoadingDocuments ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : documents.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {documents.map((document) => {
              const isImage = document.mime_type?.startsWith("image/");
              const receivedAt = document.received_at || document.created_at;
              const tipo = document.mime_type?.split("/").pop()?.toUpperCase()
                || document.nome_arquivo.split(".").pop()?.toUpperCase()
                || "Arquivo";
              const meta = [
                tipo,
                new Date(receivedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }),
                formatFileSize(document.tamanho_bytes),
              ].filter(Boolean).join(" · ");

              const inner = (
                <>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
                    {isImage && document.signedUrl ? (
                      <img src={document.signedUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{document.nome_arquivo}</p>
                    <p className="text-xs text-muted-foreground">
                      {meta}
                      {!document.signedUrl && " · link indisponível"}
                    </p>
                  </div>
                  {isImage && <Image className="ml-auto h-4 w-4 shrink-0 text-muted-foreground" />}
                </>
              );

              const className = "flex min-w-0 items-center gap-3 rounded-lg border p-3 transition-colors";

              return document.signedUrl ? (
                <a
                  key={document.id}
                  href={document.signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${className} hover:bg-muted/60`}
                >
                  {inner}
                </a>
              ) : (
                <div key={document.id} className={`${className} opacity-60`}>
                  {inner}
                </div>
              );
            })}
          </div>
        ) : (

          <div className="rounded-lg border border-dashed py-7 text-center text-muted-foreground">
            <FileText className="mx-auto mb-2 h-8 w-8 opacity-40" />
            <p className="text-sm">Nenhum anexo sincronizado ainda.</p>
          </div>
        )}
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
