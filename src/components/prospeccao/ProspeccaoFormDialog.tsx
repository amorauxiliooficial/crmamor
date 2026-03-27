import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ResponsiveOverlay } from "@/components/ui/responsive-overlay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getUserFriendlyError, logError } from "@/lib/errorHandler";
import { normalizePhoneToE164BR } from "@/lib/phoneUtils";
import { Loader2 } from "lucide-react";

interface ProspeccaoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const origemOptions = [
  { value: "chatbot", label: "Chatbot" },
  { value: "instagram", label: "Instagram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "outro", label: "Outro" },
];

export function ProspeccaoFormDialog({ open, onOpenChange, onSuccess }: ProspeccaoFormDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    mes_gestacao: "",
    observacoes: "",
    origem: "chatbot",
  });

  const resetForm = () => {
    setFormData({ nome: "", telefone: "", mes_gestacao: "", observacoes: "", origem: "chatbot" });
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) resetForm();
    onOpenChange(isOpen);
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!formData.nome.trim() || !formData.telefone.trim()) {
      toast({ variant: "destructive", title: "Campos obrigatórios", description: "Nome e telefone são obrigatórios." });
      return;
    }

    setLoading(true);
    const telefone_e164 = normalizePhoneToE164BR(formData.telefone);
    const digits = formData.telefone.replace(/\D/g, "");
    let checkDigits = digits;
    if (checkDigits.startsWith("55") && checkDigits.length >= 12) checkDigits = checkDigits.slice(2);

    // Check duplicates in prospeccao and mae_processo
    const { data: existingProsp } = await supabase.from("prospeccao" as any).select("telefone");
    const { data: existingMae } = await supabase.from("mae_processo").select("telefone");
    const prospPhones = new Set((existingProsp || []).map((p: any) => p.telefone?.replace(/\D/g, "")));
    const maePhones = new Set((existingMae || []).map((m: any) => m.telefone?.replace(/\D/g, "")));

    if (prospPhones.has(checkDigits) || prospPhones.has(digits)) {
      toast({ variant: "destructive", title: "Contato duplicado", description: "Este telefone já existe na prospecção." });
      setLoading(false);
      return;
    }
    if (maePhones.has(checkDigits) || maePhones.has(digits)) {
      toast({ variant: "destructive", title: "Contato já cadastrado", description: "Este telefone já tem um processo ativo." });
      setLoading(false);
      return;
    }

    const mes = formData.mes_gestacao ? parseInt(formData.mes_gestacao, 10) : null;

    const { error } = await supabase.from("prospeccao" as any).insert({
      nome: formData.nome.trim(),
      telefone: formData.telefone.trim(),
      telefone_e164,
      mes_gestacao: mes && mes >= 1 && mes <= 9 ? mes : null,
      observacoes: formData.observacoes.trim() || null,
      origem: formData.origem,
      status: "novo",
      user_id: user.id,
    } as any);

    if (error) {
      logError("create_prospeccao", error);
      const isDup = error.message?.includes("idx_prospeccao_telefone_unique") || error.code === "23505";
      toast({ variant: "destructive", title: isDup ? "Contato duplicado" : "Erro ao criar", description: isDup ? "Este telefone já existe na prospecção." : getUserFriendlyError(error) });
    } else {
      toast({ title: "Prospecção criada", description: "Lead registrado com sucesso." });
      onSuccess();
      handleOpenChange(false);
    }
    setLoading(false);
  };

  const footerContent = (
    <div className="flex items-center justify-end gap-2">
      <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>Cancelar</Button>
      <Button onClick={handleSubmit} disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Criar Prospecção
      </Button>
    </div>
  );

  return (
    <ResponsiveOverlay open={open} onOpenChange={handleOpenChange} title="Nova Prospecção" description="Registre um novo lead de prospecção." footer={footerContent} desktopWidth="sm:max-w-lg" mobileSide="bottom">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="prosp_nome">Nome *</Label>
            <Input id="prosp_nome" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} placeholder="Nome completo" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prosp_telefone">Telefone *</Label>
            <Input id="prosp_telefone" value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} placeholder="(XX) XXXXX-XXXX" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Mês Gestação</Label>
            <Select value={formData.mes_gestacao} onValueChange={(v) => setFormData({ ...formData, mes_gestacao: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent className="z-[100]">
                {Array.from({ length: 9 }, (_, i) => i + 1).map((m) => (
                  <SelectItem key={m} value={String(m)}>{m}º mês</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Origem</Label>
            <Select value={formData.origem} onValueChange={(v) => setFormData({ ...formData, origem: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="z-[100]">
                {origemOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="prosp_obs">Observações</Label>
          <Textarea id="prosp_obs" value={formData.observacoes} onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })} rows={2} placeholder="Anotações adicionais..." />
        </div>
      </div>
    </ResponsiveOverlay>
  );
}
