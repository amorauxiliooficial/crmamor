import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, DollarSign, FolderOpen, UserCog, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MaeProcesso, StatusProcesso, STATUS_ORDER } from "@/types/mae";
import { getUserFriendlyError, logError } from "@/lib/errorHandler";
import { normalizePhoneToE164BR } from "@/lib/phoneUtils";
import { PagamentoDialog } from "@/components/pagamentos/PagamentoDialog";
import { DocumentosDialog } from "@/components/mae/DocumentosDialog";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { MultiAtendentesSelect } from "@/components/mae/MultiAtendentesSelect";

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
  const { isAdmin } = useIsAdmin();
  const [isLoading, setIsLoading] = useState(false);
  const [pagamentoDialogOpen, setPagamentoDialogOpen] = useState(false);
  const [documentosDialogOpen, setDocumentosDialogOpen] = useState(false);
  const [users, setUsers] = useState<{ id: string; full_name: string | null; email: string | null }[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedAtendentes, setSelectedAtendentes] = useState<string[]>([]);
  const [originalAtendentes, setOriginalAtendentes] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    nome_mae: "",
    cpf: "",
    telefone: "",
    email: "",
    tipo_evento: "Parto" as "Parto" | "Adoção" | "Guarda judicial",
    data_evento: "",
    data_evento_tipo: "none" as "none" | "Parto (real)" | "DPP",
    categoria_previdenciaria: "Não informado" as "CLT" | "MEI" | "Contribuinte Individual" | "Desempregada" | "Não informado",
    status_processo: "⚠️ Pendência Documental" as StatusProcesso,
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

  // Fetch users for admin assignment
  useEffect(() => {
    const fetchUsers = async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .order("full_name", { ascending: true, nullsFirst: false });
      
      if (profiles) {
        setUsers(profiles);
      }
    };
    
    if (isAdmin && open) {
      fetchUsers();
    }
  }, [isAdmin, open]);

  // Fetch existing atendentes for this mae
  useEffect(() => {
    const fetchAtendentes = async () => {
      if (!mae?.id || !open) return;
      
      const { data } = await supabase
        .from("mae_atendentes")
        .select("user_id")
        .eq("mae_id", mae.id);
      
      if (data) {
        const userIds = data.map((a) => a.user_id);
        // Always include the primary user_id
        if (mae.user_id && !userIds.includes(mae.user_id)) {
          userIds.unshift(mae.user_id);
        }
        setSelectedAtendentes(userIds);
        setOriginalAtendentes(userIds);
      } else {
        // If no extra atendentes, just set the primary
        const primaryList = mae.user_id ? [mae.user_id] : [];
        setSelectedAtendentes(primaryList);
        setOriginalAtendentes(primaryList);
      }
    };

    if (isAdmin) {
      fetchAtendentes();
    }
  }, [mae?.id, mae?.user_id, open, isAdmin]);

  useEffect(() => {
    if (mae && open) {
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
      // Always set selectedUserId when mae data loads
      setSelectedUserId(mae.user_id || "");
    }
  }, [mae, open]);

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
      "Pendência Documental" | "Elegível (Análise Positiva)" | 
      "Aguardando Análise INSS" | "Aprovada" | "Indeferida" | 
      "Recurso / Judicial" | "Inadimplência" | "Processo Encerrado";

    // Build update object - include user_id only if admin is changing it
    const phoneRaw = formData.telefone || null;
    const phoneE164 = normalizePhoneToE164BR(phoneRaw);

    const updateData: Record<string, unknown> = {
      nome_mae: formData.nome_mae.trim(),
      cpf: formData.cpf.replace(/\D/g, ""),
      telefone: phoneRaw,
      telefone_e164: phoneE164,
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
    };

    // Admin can reassign to different user - always update if admin has selected a user
    if (isAdmin && selectedUserId) {
      updateData.user_id = selectedUserId;
    }

    const { error } = await supabase
      .from("mae_processo")
      .update(updateData)
      .eq("id", mae.id);

    // Handle multiple atendentes
    if (!error && isAdmin) {
      // Find which to add and which to remove
      const toAdd = selectedAtendentes.filter(
        (id) => !originalAtendentes.includes(id) && id !== selectedUserId
      );
      const toRemove = originalAtendentes.filter(
        (id) => !selectedAtendentes.includes(id) && id !== selectedUserId
      );

      // Insert new atendentes
      if (toAdd.length > 0) {
        await supabase
          .from("mae_atendentes")
          .insert(toAdd.map((user_id) => ({ mae_id: mae.id, user_id })));
      }

      // Remove old atendentes
      if (toRemove.length > 0) {
        await supabase
          .from("mae_atendentes")
          .delete()
          .eq("mae_id", mae.id)
          .in("user_id", toRemove);
      }
    }

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
          {/* Admin: Atendentes Responsáveis */}
          {isAdmin && (
            <div className="space-y-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <Label className="font-semibold text-primary">Atendentes Responsáveis</Label>
              </div>
              
              {/* Primary attendant */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Atendente Principal</Label>
                <Select
                  value={selectedUserId}
                  onValueChange={(value) => {
                    setSelectedUserId(value);
                    // Ensure primary is in selected list
                    if (!selectedAtendentes.includes(value)) {
                      setSelectedAtendentes([...selectedAtendentes, value]);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o atendente principal" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name || u.email?.split("@")[0] || "Sem nome"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Additional attendants */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Atendentes Adicionais</Label>
                <MultiAtendentesSelect
                  users={users}
                  selectedUserIds={selectedAtendentes}
                  onChange={setSelectedAtendentes}
                  primaryUserId={selectedUserId}
                  onPrimaryChange={setSelectedUserId}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Somente administradores podem alterar os atendentes responsáveis pelo processo.
              </p>
            </div>
          )}

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
