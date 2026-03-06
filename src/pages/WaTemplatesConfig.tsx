import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWaTemplates, useCreateWaTemplate, useUpdateWaTemplate, useDeleteWaTemplate, type WaTemplate } from "@/hooks/useWaTemplates";
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

function TemplateFormDialog({
  open,
  onOpenChange,
  template,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  template?: WaTemplate | null;
}) {
  const { toast } = useToast();
  const create = useCreateWaTemplate();
  const update = useUpdateWaTemplate();

  const [name, setName] = useState(template?.name || "");
  const [languageCode, setLanguageCode] = useState(template?.language_code || "pt_BR");
  const [category, setCategory] = useState(template?.category || "UTILITY");
  const [status, setStatus] = useState(template?.status || "APPROVED");
  const [bodyText, setBodyText] = useState(() => {
    const schema = Array.isArray(template?.components_schema) ? template.components_schema : [];
    const body = schema.find((c: any) => c.type === "BODY" || c.type === "body");
    return body?.text || "";
  });
  const [headerText, setHeaderText] = useState(() => {
    const schema = Array.isArray(template?.components_schema) ? template.components_schema : [];
    const header = schema.find((c: any) => c.type === "HEADER");
    return header?.text || "";
  });
  const [footerText, setFooterText] = useState(() => {
    const schema = Array.isArray(template?.components_schema) ? template.components_schema : [];
    const footer = schema.find((c: any) => c.type === "FOOTER");
    return footer?.text || "";
  });

  const handleSave = () => {
    if (!name.trim() || !bodyText.trim()) {
      toast({ title: "Preencha nome e corpo do template", variant: "destructive" });
      return;
    }

    const components: any[] = [];
    if (headerText.trim()) components.push({ type: "HEADER", format: "TEXT", text: headerText.trim() });
    components.push({ type: "BODY", text: bodyText.trim() });
    if (footerText.trim()) components.push({ type: "FOOTER", text: footerText.trim() });

    if (template?.id) {
      update.mutate(
        { id: template.id, name: name.trim(), language_code: languageCode, category, status, components_schema: components },
        {
          onSuccess: () => { toast({ title: "Template atualizado ✅" }); onOpenChange(false); },
          onError: () => toast({ title: "Erro ao atualizar", variant: "destructive" }),
        }
      );
    } else {
      create.mutate(
        { name: name.trim(), language_code: languageCode, category, status, components_schema: components },
        {
          onSuccess: () => { toast({ title: "Template criado ✅" }); onOpenChange(false); },
          onError: () => toast({ title: "Erro ao criar", variant: "destructive" }),
        }
      );
    }
  };

  const isLoading = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{template ? "Editar Template" : "Novo Template"}</DialogTitle>
          <DialogDescription className="text-xs">
            Cadastre o template exatamente como aprovado na Meta
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome do template</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="hello_world" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Idioma</Label>
              <Select value={languageCode} onValueChange={setLanguageCode}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pt_BR">Português (BR)</SelectItem>
                  <SelectItem value="en_US">English (US)</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTILITY">Utilidade</SelectItem>
                  <SelectItem value="MARKETING">Marketing</SelectItem>
                  <SelectItem value="AUTHENTICATION">Autenticação</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="APPROVED">Aprovado</SelectItem>
                  <SelectItem value="PENDING">Pendente</SelectItem>
                  <SelectItem value="REJECTED">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Cabeçalho (opcional)</Label>
            <Input value={headerText} onChange={e => setHeaderText(e.target.value)} placeholder="Título do template" className="h-9 text-sm" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Corpo do template *</Label>
            <Textarea
              value={bodyText}
              onChange={e => setBodyText(e.target.value)}
              placeholder="Olá {{1}}, seu atendimento foi agendado para {{2}}."
              className="min-h-[100px] text-sm"
            />
            <p className="text-[10px] text-muted-foreground/50">Use {"{{1}}"}, {"{{2}}"}, etc. para variáveis</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Rodapé (opcional)</Label>
            <Input value={footerText} onChange={e => setFooterText(e.target.value)} placeholder="AAM Advocacia" className="h-9 text-sm" />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSave} disabled={isLoading} className="gap-1.5">
              {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {template ? "Salvar" : "Criar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function WaTemplatesConfig() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: templates, isLoading } = useWaTemplates();
  const deleteTemplate = useDeleteWaTemplate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WaTemplate | null>(null);

  if (loading) return null;
  if (!user) { navigate("/auth"); return null; }

  const handleEdit = (t: WaTemplate) => {
    setEditing(t);
    setDialogOpen(true);
  };

  const handleDelete = (t: WaTemplate) => {
    if (!confirm(`Excluir template "${t.name}"?`)) return;
    deleteTemplate.mutate(t.id, {
      onSuccess: () => toast({ title: "Template excluído" }),
      onError: () => toast({ title: "Erro ao excluir", variant: "destructive" }),
    });
  };

  const statusColors: Record<string, string> = {
    APPROVED: "border-emerald-400/30 text-emerald-600 dark:text-emerald-400",
    PENDING: "border-amber-400/30 text-amber-600 dark:text-amber-400",
    REJECTED: "border-destructive/30 text-destructive",
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="h-14 border-b border-border bg-card flex items-center gap-3 px-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/atendimento/config")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="font-semibold text-base">Templates WhatsApp</h1>
      </header>

      <div className="max-w-2xl mx-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Templates aprovados</h2>
            <p className="text-xs text-muted-foreground">Cadastre templates para envio fora da janela de 24h</p>
          </div>
          <Button size="sm" className="gap-1.5" onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-3.5 w-3.5" />
            Novo template
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !templates?.length ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
              <FileText className="h-10 w-10 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground/50">Nenhum template cadastrado</p>
              <p className="text-xs text-muted-foreground/30">Cadastre templates aprovados na Meta para retomar conversas</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {templates.map(t => (
              <Card key={t.id} className="hover:border-primary/10 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{t.name}</span>
                        <Badge variant="outline" className={statusColors[t.status] || ""}>
                          {t.status}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
                        <span className="text-[10px] text-muted-foreground/40">{t.language_code}</span>
                      </div>
                      <p className="text-xs text-muted-foreground/60 line-clamp-2">
                        {(() => {
                          const schema = Array.isArray(t.components_schema) ? t.components_schema : [];
                          const body = schema.find((c: any) => c.type === "BODY" || c.type === "body");
                          return body?.text || "Sem corpo";
                        })()}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEdit(t)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive/60 hover:text-destructive" onClick={() => handleDelete(t)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <TemplateFormDialog
          key={editing?.id || "new"}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          template={editing}
        />
      </div>
    </div>
  );
}
