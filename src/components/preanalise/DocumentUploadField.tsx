import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, CheckCircle2, X, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DocumentUploadFieldProps {
  label: string;
  docType: string;
  maeId: string;
  onUpload: (url: string | null) => void;
  uploadedUrl?: string | null;
}

export function DocumentUploadField({
  label,
  docType,
  maeId,
  onUpload,
  uploadedUrl,
}: DocumentUploadFieldProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamanho (máximo 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 10MB.",
        variant: "destructive",
      });
      return;
    }

    // Validar tipo
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Tipo não permitido",
        description: "Apenas PDF, JPG, PNG e WebP são aceitos.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${maeId}/${docType}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("documentos-preanalise")
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from("documentos-preanalise")
        .getPublicUrl(fileName);

      onUpload(urlData.publicUrl);
      toast({
        title: "Documento anexado",
        description: `${label} enviado com sucesso.`,
      });
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível enviar o arquivo.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const handleRemove = () => {
    onUpload(null);
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={handleFileChange}
        disabled={isUploading}
      />
      
      {uploadedUrl ? (
        <>
          <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
          <Label className="flex-1 flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            {label}
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </>
      ) : (
        <>
          <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
          <Label className="flex-1">{label}</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 gap-1"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="h-3 w-3" />
                Anexar
              </>
            )}
          </Button>
        </>
      )}
    </div>
  );
}
