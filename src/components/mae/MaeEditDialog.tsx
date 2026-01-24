import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, DollarSign, FolderOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MaeProcesso, StatusProcesso, STATUS_ORDER } from "@/types/mae";
import { getUserFriendlyError, logError } from "@/lib/errorHandler";
import { PagamentoDialog } from "@/components/pagamentos/PagamentoDialog";
import { DocumentosDialog } from "@/components/mae/DocumentosDialog";
interface MaeEditDialogProps {
  mae: MaeProcesso | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const UF_OPTIONS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO"
];

// Map display status (with emoji) to db status (without emoji)
const mapDisplayStatusToDb = (status: StatusProcesso): string => {
  return status.split(" ").slice(1).join(" ") || status;
};

export function MaeEditDialog({ mae, open, onOpenChange, onSuccess }: MaeEditDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [pagamentoDialogOpen, setPagamentoDialogOpen] = useState(false);
  const [documentosDialogOpen, setDocumentosDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    nome_mae: "",
    cpf: "",
    telefone: "",
    email: "",
    tipo_evento: "Parto" as "Parto" | "Adoção" | "Guarda judicial",
    data_evento: "",
    data_evento_tipo: "none" as "none" | "Parto (real)" | "DPP",
    categoria_previdenciaria: "Não informado" as "CLT" | "MEI" | "Contribuinte Individual" | "Desempregada" | "Não informado",
    status_processo: "📥 Entrada de Documentos" as StatusProcesso,
    protocolo_inss: "",
    parcelas: "",
    contrato_assinado: false,
    segurada: "",
    precisa_gps: "",
    uf: "",
    origem: "",
    observacoes: "",
    senha_gov: "",
    verificacao_duas_etapas: false,
    is_gestante: false,
    mes_gestacao: null as number | null,
  });

  useEffect(() => {
    if (mae) {
      setFormData({
        nome_mae: mae.nome_mae,
        cpf: formatCpf(mae.cpf),
        telefone: mae.telefone || "",
        email: mae.email || "",
        tipo_evento: mae.tipo_evento,
        data_evento: mae.data_evento || "",
        data_evento_tipo: mae.data_evento_tipo || "none",
        categoria_previdenciaria: mae.categoria_previdenciaria,
        status_processo: mae.status_processo,
        protocolo_inss: mae.protocolo_inss || "",
        parcelas: mae.parcelas || "",
        contrato_assinado: mae.contrato_assinado,
        segurada: mae.segurada || "",
        precisa_gps: mae.precisa_gps || "",
        uf: mae.uf || "",
        origem: mae.origem || "",
        observacoes: mae.observacoes || "",
        senha_gov: mae.senha_gov || "",
        verificacao_duas_etapas: mae.verificacao_duas_etapas ?? false,
        is_gestante: mae.is_gestante ?? false,
        mes_gestacao: mae.mes_gestacao ?? null,
      });
    }
  }, [mae]);

  const formatCpf = (value: string) => {
    const numbers = value.replace(/\D/g, "").slice(0, 11);
    return numbers
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "").slice(0, 11);
    if (numbers.length <= 10) {
      return numbers
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    }
    return numbers
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!mae) return;

    if (!formData.nome_mae.trim() || !formData.cpf.trim()) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Nome e CPF são obrigatórios.",
      });
      return;
    }

    setIsLoading(true);
    
    const dbStatusValue = mapDisplayStatusToDb(formData.status_processo) as 
      "Entrada de Documentos" | "Em Análise" | "Pendência Documental" | 
      "Elegível (Análise Positiva)" | "Protocolo INSS" | "Aguardando Análise INSS" | 
      "Aprovada" | "Indeferida" | "Recurso / Judicial" | "Processo Encerrado";

    const { error } = await supabase
      .from("mae_processo")
      .update({
        nome_mae: formData.nome_mae.trim(),
        cpf: formData.cpf.replace(/\D/g, ""),
        telefone: formData.telefone || null,
        email: formData.email || null,
        tipo_evento: formData.tipo_evento,
        data_evento: formData.data_evento || null,
        data_evento_tipo: formData.data_evento_tipo === "none" ? "" : formData.data_evento_tipo,
        categoria_previdenciaria: formData.categoria_previdenciaria,
        status_processo: dbStatusValue,
        protocolo_inss: formData.protocolo_inss || null,
        parcelas: formData.parcelas || null,
        contrato_assinado: formData.contrato_assinado,
        segurada: formData.segurada || null,
        precisa_gps: formData.precisa_gps || null,
        uf: formData.uf || null,
        origem: formData.origem || null,
        observacoes: formData.observacoes || null,
        senha_gov: formData.senha_gov || null,
        verificacao_duas_etapas: formData.verificacao_duas_etapas,
        is_gestante: formData.is_gestante,
        mes_gestacao: formData.is_gestante ? formData.mes_gestacao : null,
      })
      .eq("id", mae.id);

    setIsLoading(false);

    if (error) {
      logError('mae_edit_submit', error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: getUserFriendlyError(error),
      });
    } else {
      toast({
        title: "Sucesso!",
        description: "Processo atualizado com sucesso.",
      });
      onSuccess();
      onOpenChange(false);
    }
  };

  if (!mae) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5 text-primary" />
            Editar Processo
          </DialogTitle>
          <DialogDescription>
            Altere as informações do processo de {mae.nome_mae}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Status */}
          <div className="space-y-2">
            <Label>Status do Processo</Label>
            <Select
              value={formData.status_processo}
              onValueChange={(value: StatusProcesso) => 
                setFormData({ ...formData, status_processo: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_ORDER.map((status) => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dados Pessoais */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Dados Pessoais
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome_mae">Nome da Mãe *</Label>
                <Input
                  id="nome_mae"
                  value={formData.nome_mae}
                  onChange={(e) => setFormData({ ...formData, nome_mae: e.target.value })}
                  placeholder="Nome completo"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF *</Label>
                <Input
                  id="cpf"
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: formatCpf(e.target.value) })}
                  placeholder="000.000.000-00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: formatPhone(e.target.value) })}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="uf">UF</Label>
                <Select
                  value={formData.uf}
                  onValueChange={(value) => setFormData({ ...formData, uf: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {UF_OPTIONS.map((uf) => (
                      <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="origem">Origem</Label>
                <Input
                  id="origem"
                  value={formData.origem}
                  onChange={(e) => setFormData({ ...formData, origem: e.target.value })}
                  placeholder="Como chegou até nós"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senha_gov">Senha Gov.br</Label>
                <Input
                  id="senha_gov"
                  value={formData.senha_gov}
                  onChange={(e) => setFormData({ ...formData, senha_gov: e.target.value })}
                  placeholder="Senha do Gov.br"
                />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  id="verificacao_duas_etapas"
                  checked={formData.verificacao_duas_etapas}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, verificacao_duas_etapas: checked })
                  }
                />
                <Label htmlFor="verificacao_duas_etapas">Verificação em duas etapas ativa</Label>
              </div>
            </div>
          </div>

          {/* Dados do Evento */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Dados do Evento
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Evento</Label>
                <Select
                  value={formData.tipo_evento}
                  onValueChange={(value: "Parto" | "Adoção" | "Guarda judicial") => 
                    setFormData({ ...formData, tipo_evento: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Parto">Parto</SelectItem>
                    <SelectItem value="Adoção">Adoção</SelectItem>
                    <SelectItem value="Guarda judicial">Guarda judicial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="data_evento">Data do Evento</Label>
                <Input
                  id="data_evento"
                  type="date"
                  value={formData.data_evento}
                  onChange={(e) => setFormData({ ...formData, data_evento: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo da Data</Label>
                <Select
                  value={formData.data_evento_tipo}
                  onValueChange={(value: "none" | "Parto (real)" | "DPP") => 
                    setFormData({ ...formData, data_evento_tipo: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não informado</SelectItem>
                    <SelectItem value="Parto (real)">Parto (real)</SelectItem>
                    <SelectItem value="DPP">DPP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Categoria Previdenciária</Label>
                <Select
                  value={formData.categoria_previdenciaria}
                  onValueChange={(value: "CLT" | "MEI" | "Contribuinte Individual" | "Desempregada" | "Não informado") => 
                    setFormData({ ...formData, categoria_previdenciaria: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLT">CLT</SelectItem>
                    <SelectItem value="MEI">MEI</SelectItem>
                    <SelectItem value="Contribuinte Individual">Contribuinte Individual</SelectItem>
                    <SelectItem value="Desempregada">Desempregada</SelectItem>
                    <SelectItem value="Não informado">Não informado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* INSS */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Dados INSS
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="protocolo_inss">Protocolo INSS</Label>
                <Input
                  id="protocolo_inss"
                  value={formData.protocolo_inss}
                  onChange={(e) => setFormData({ ...formData, protocolo_inss: e.target.value })}
                  placeholder="Número do protocolo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="parcelas">Parcelas</Label>
                <Input
                  id="parcelas"
                  value={formData.parcelas}
                  onChange={(e) => setFormData({ ...formData, parcelas: e.target.value })}
                  placeholder="Número de parcelas"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="segurada">Segurada</Label>
                <Input
                  id="segurada"
                  value={formData.segurada}
                  onChange={(e) => setFormData({ ...formData, segurada: e.target.value })}
                  placeholder="Status da segurada"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="precisa_gps">Precisa GPS</Label>
                <Input
                  id="precisa_gps"
                  value={formData.precisa_gps}
                  onChange={(e) => setFormData({ ...formData, precisa_gps: e.target.value })}
                  placeholder="Sim/Não"
                />
              </div>
            </div>
          </div>

          {/* Gestante */}
          <div className="space-y-4 p-4 bg-primary/10 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="is_gestante" className="font-medium">Gestante</Label>
                <p className="text-sm text-muted-foreground">A cliente está grávida?</p>
              </div>
              <Switch
                id="is_gestante"
                checked={formData.is_gestante}
                onCheckedChange={(checked) => setFormData({ ...formData, is_gestante: checked, mes_gestacao: checked ? formData.mes_gestacao : null })}
              />
            </div>
            
            {formData.is_gestante && (
              <div className="space-y-2 pt-2 border-t border-primary/20">
                <Label htmlFor="mes_gestacao">Mês de Gestação</Label>
                <Select
                  value={formData.mes_gestacao?.toString() || "auto"}
                  onValueChange={(value) => setFormData({ ...formData, mes_gestacao: value === "auto" ? null : parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o mês" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Calcular automaticamente (DPP)</SelectItem>
                    <SelectItem value="1">1º Mês</SelectItem>
                    <SelectItem value="2">2º Mês</SelectItem>
                    <SelectItem value="3">3º Mês</SelectItem>
                    <SelectItem value="4">4º Mês</SelectItem>
                    <SelectItem value="5">5º Mês</SelectItem>
                    <SelectItem value="6">6º Mês</SelectItem>
                    <SelectItem value="7">7º Mês</SelectItem>
                    <SelectItem value="8">8º Mês</SelectItem>
                    <SelectItem value="9">9º Mês</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Se não informado, será calculado com base na DPP
                </p>
              </div>
            )}
          </div>

          {/* Contrato */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <Label htmlFor="contrato_assinado" className="font-medium">Contrato Assinado</Label>
              <p className="text-sm text-muted-foreground">A cliente já assinou o contrato?</p>
            </div>
            <Switch
              id="contrato_assinado"
              checked={formData.contrato_assinado}
              onCheckedChange={(checked) => setFormData({ ...formData, contrato_assinado: checked })}
            />
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              placeholder="Anotações adicionais sobre o processo..."
              rows={3}
            />
          </div>

          {/* Submit */}
          <div className="flex flex-wrap justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setPagamentoDialogOpen(true)}
                className="gap-2"
              >
                <DollarSign className="h-4 w-4" />
                Pagamentos
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setDocumentosDialogOpen(true)}
                className="gap-2"
              >
                <FolderOpen className="h-4 w-4" />
                Documentos
              </Button>
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>

      {mae && (
        <>
          <PagamentoDialog
            open={pagamentoDialogOpen}
            onOpenChange={setPagamentoDialogOpen}
            maeId={mae.id}
            maeNome={mae.nome_mae}
            onSuccess={() => {}}
          />
          <DocumentosDialog
            open={documentosDialogOpen}
            onOpenChange={setDocumentosDialogOpen}
            maeId={mae.id}
            maeNome={mae.nome_mae}
            linkDocumentos={(mae as MaeProcesso & { link_documentos?: string | null }).link_documentos || null}
            onSuccess={onSuccess}
          />
        </>
      )}
    </Dialog>
  );
}
