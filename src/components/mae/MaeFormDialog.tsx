import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getUserFriendlyError, logError } from "@/lib/errorHandler";

interface MaeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (createdMae?: MaeProcesso) => void;
}

interface MaeProcesso {
  id: string;
  nome_mae: string;
  cpf: string;
  telefone?: string;
  email?: string;
  tipo_evento: "Parto" | "Adoção" | "Guarda judicial";
  data_evento?: string;
  data_evento_tipo?: "" | "Parto (real)" | "DPP";
  categoria_previdenciaria: "CLT" | "MEI" | "Contribuinte Individual" | "Desempregada" | "Não informado";
  status_processo: string;
  protocolo_inss?: string;
  parcelas?: string;
  contrato_assinado: boolean;
  segurada?: string;
  precisa_gps?: string;
  uf?: string;
  observacoes?: string;
  origem?: string;
  senha_gov?: string;
  verificacao_duas_etapas: boolean;
  is_gestante: boolean;
  data_ultima_atualizacao: string;
}

type MaeFormData = {
  nome_mae: string;
  cpf: string;
  telefone: string;
  email: string;
  tipo_evento: "Parto" | "Adoção" | "Guarda judicial";
  data_evento: string;
  data_evento_tipo: "none" | "Parto (real)" | "DPP";
  categoria_previdenciaria: "CLT" | "MEI" | "Contribuinte Individual" | "Desempregada" | "Não informado";
  contrato_assinado: boolean;
  uf: string;
  origem: string;
  observacoes: string;
  senha_gov: string;
  verificacao_duas_etapas: boolean;
  is_gestante: boolean;
};

const getEmptyFormData = (): MaeFormData => ({
  nome_mae: "",
  cpf: "",
  telefone: "",
  email: "",
  tipo_evento: "Parto",
  data_evento: "",
  data_evento_tipo: "none",
  categoria_previdenciaria: "Não informado",
  contrato_assinado: false,
  uf: "",
  origem: "",
  observacoes: "",
  senha_gov: "",
  verificacao_duas_etapas: false,
  is_gestante: false,
});

const UF_OPTIONS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

export function MaeFormDialog({ open, onOpenChange, onSuccess }: MaeFormDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState<MaeFormData>(getEmptyFormData);

  // Reset form to empty state when dialog opens
  useEffect(() => {
    if (open) {
      setFormData(getEmptyFormData());
    }
  }, [open]);

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
    
    if (!user) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Você precisa estar logado para cadastrar.",
      });
      return;
    }

    if (!formData.nome_mae.trim() || !formData.cpf.trim() || !formData.senha_gov.trim()) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Nome, CPF e Senha Gov.br são obrigatórios.",
      });
      return;
    }

    setIsLoading(true);

    // Check for duplicate CPF
    const cpfClean = formData.cpf.replace(/\D/g, "");
    const { data: existingMae } = await supabase
      .from("mae_processo")
      .select("id, nome_mae")
      .eq("cpf", cpfClean)
      .maybeSingle();

    if (existingMae) {
      setIsLoading(false);
      toast({
        variant: "destructive",
        title: "CPF já cadastrado",
        description: `Já existe um cadastro com este CPF: ${existingMae.nome_mae}`,
      });
      return;
    }
    
    const { data, error } = await supabase.from("mae_processo").insert({
      user_id: user.id,
      nome_mae: formData.nome_mae.trim(),
      cpf: cpfClean,
      telefone: formData.telefone || null,
      email: formData.email || null,
      tipo_evento: formData.tipo_evento,
      data_evento: formData.data_evento || null,
      data_evento_tipo: formData.data_evento_tipo === "none" ? "" : formData.data_evento_tipo,
      categoria_previdenciaria: formData.categoria_previdenciaria,
      contrato_assinado: formData.contrato_assinado,
      uf: formData.uf || null,
      origem: formData.origem || null,
      observacoes: formData.observacoes || null,
      senha_gov: formData.senha_gov || null,
      verificacao_duas_etapas: formData.verificacao_duas_etapas,
      is_gestante: formData.is_gestante,
    }).select().single();

    setIsLoading(false);

    if (error) {
      logError('mae_form_submit', error);
      toast({
        variant: "destructive",
        title: "Erro ao cadastrar",
        description: getUserFriendlyError(error),
      });
    } else if (data) {
      toast({
        title: "Sucesso!",
        description: `${data.nome_mae} cadastrada com sucesso.`,
      });
      
      // Create the MaeProcesso object to pass back
      const createdMae: MaeProcesso = {
        id: data.id,
        nome_mae: data.nome_mae,
        cpf: data.cpf,
        telefone: data.telefone || undefined,
        email: data.email || undefined,
        tipo_evento: data.tipo_evento as MaeProcesso["tipo_evento"],
        data_evento: data.data_evento || undefined,
        data_evento_tipo: (data.data_evento_tipo || "") as MaeProcesso["data_evento_tipo"],
        categoria_previdenciaria: data.categoria_previdenciaria as MaeProcesso["categoria_previdenciaria"],
        status_processo: data.status_processo,
        protocolo_inss: data.protocolo_inss || undefined,
        parcelas: data.parcelas || undefined,
        contrato_assinado: data.contrato_assinado,
        segurada: data.segurada || undefined,
        precisa_gps: data.precisa_gps || undefined,
        uf: data.uf || undefined,
        observacoes: data.observacoes || undefined,
        origem: data.origem || undefined,
        senha_gov: data.senha_gov || undefined,
        verificacao_duas_etapas: data.verificacao_duas_etapas ?? false,
        is_gestante: data.is_gestante ?? false,
        data_ultima_atualizacao: data.data_ultima_atualizacao,
      };

      setFormData(getEmptyFormData());
      onOpenChange(false);
      onSuccess(createdMae);
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Cadastrar Nova Mãe
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
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
                <Label htmlFor="senha_gov">Senha Gov.br *</Label>
                <Input
                  id="senha_gov"
                  value={formData.senha_gov}
                  onChange={(e) => setFormData({ ...formData, senha_gov: e.target.value })}
                  placeholder="Senha do Gov.br"
                  required
                />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  id="verificacao_duas_etapas_form"
                  checked={formData.verificacao_duas_etapas}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, verificacao_duas_etapas: checked })
                  }
                />
                <Label htmlFor="verificacao_duas_etapas_form">Verificação em duas etapas ativa</Label>
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

          {/* Gestante */}
          <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg">
            <div>
              <Label htmlFor="is_gestante_form" className="font-medium">Gestante</Label>
              <p className="text-sm text-muted-foreground">A cliente está grávida?</p>
            </div>
            <Switch
              id="is_gestante_form"
              checked={formData.is_gestante}
              onCheckedChange={(checked) => setFormData({ ...formData, is_gestante: checked })}
            />
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
          <div className="flex justify-end gap-3">
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
                  <UserPlus className="mr-2 h-4 w-4" />
                  Cadastrar
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
