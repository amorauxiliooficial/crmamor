import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PlaybookImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (entries: { pergunta: string; resposta: string }[]) => Promise<void>;
}

export function PlaybookImportDialog({
  open,
  onOpenChange,
  onImport,
}: PlaybookImportDialogProps) {
  const { toast } = useToast();
  const [manualText, setManualText] = useState("");
  const [importing, setImporting] = useState(false);
  const [parsedEntries, setParsedEntries] = useState<{ pergunta: string; resposta: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseText = (text: string): { pergunta: string; resposta: string }[] => {
    const entries: { pergunta: string; resposta: string }[] = [];
    
    // Split by "Pergunta:" to get each entry
    const blocks = text.split(/Pergunta:\s*/i).filter(Boolean);
    
    for (const block of blocks) {
      const parts = block.split(/Resposta:\s*/i);
      if (parts.length >= 2) {
        const pergunta = parts[0].trim();
        const resposta = parts.slice(1).join("Resposta:").trim();
        if (pergunta && resposta) {
          entries.push({ pergunta, resposta });
        }
      }
    }
    
    return entries;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const entries = parseText(text);
      setParsedEntries(entries);
      
      if (entries.length === 0) {
        toast({
          variant: "destructive",
          title: "Formato inválido",
          description: "Use o formato: Pergunta: [texto] Resposta: [texto]",
        });
      } else {
        toast({
          title: `${entries.length} entrada(s) encontrada(s)`,
          description: "Clique em Importar para adicionar ao Playbook",
        });
      }
    };
    reader.readAsText(file);
  };

  const handleManualParse = () => {
    const entries = parseText(manualText);
    setParsedEntries(entries);
    
    if (entries.length === 0) {
      toast({
        variant: "destructive",
        title: "Formato inválido",
        description: "Use o formato: Pergunta: [texto] Resposta: [texto]",
      });
    } else {
      toast({
        title: `${entries.length} entrada(s) encontrada(s)`,
        description: "Clique em Importar para adicionar ao Playbook",
      });
    }
  };

  const handleImport = async () => {
    if (parsedEntries.length === 0) return;
    
    setImporting(true);
    try {
      await onImport(parsedEntries);
      toast({
        title: "Importação concluída",
        description: `${parsedEntries.length} entrada(s) adicionada(s) ao Playbook`,
      });
      setParsedEntries([]);
      setManualText("");
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro na importação",
        description: "Não foi possível importar as entradas",
      });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = (value: boolean) => {
    if (!value) {
      setParsedEntries([]);
      setManualText("");
    }
    onOpenChange(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar Perguntas e Respostas</DialogTitle>
          <DialogDescription>
            Importe várias entradas de uma vez por arquivo ou texto
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual" className="gap-2">
              <FileText className="h-4 w-4" />
              Manual
            </TabsTrigger>
            <TabsTrigger value="file" className="gap-2">
              <Upload className="h-4 w-4" />
              Arquivo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Cole as perguntas e respostas</Label>
              <Textarea
                placeholder={`Pergunta:\n"Isso é garantido?"\n\nResposta:\n"Não é garantido. Por isso sempre começamos com uma análise prévia."\n\nPergunta:\n"Quanto custa?"\n\nResposta:\n"O valor depende de cada caso..."`}
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
              />
            </div>
            <Button 
              onClick={handleManualParse} 
              variant="outline" 
              className="w-full"
              disabled={!manualText.trim()}
            >
              Processar Texto
            </Button>
          </TabsContent>

          <TabsContent value="file" className="space-y-4 mt-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Arraste um arquivo .txt ou clique para selecionar
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
              >
                Selecionar Arquivo
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">Formato esperado:</p>
              <pre className="bg-muted p-2 rounded text-xs">
{`Pergunta:
"Isso é garantido?"

Resposta:
"Não é garantido..."`}
              </pre>
            </div>
          </TabsContent>
        </Tabs>

        {parsedEntries.length > 0 && (
          <div className="border rounded-lg p-4 bg-muted/50 space-y-2">
            <p className="text-sm font-medium">
              {parsedEntries.length} entrada(s) prontas para importar:
            </p>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {parsedEntries.map((entry, i) => (
                <p key={i} className="text-xs text-muted-foreground truncate">
                  • {entry.pergunta}
                </p>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleImport} 
            disabled={parsedEntries.length === 0 || importing}
          >
            {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Importar {parsedEntries.length > 0 && `(${parsedEntries.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
