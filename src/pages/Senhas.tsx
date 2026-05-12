import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Eye, EyeOff, Copy, Pencil, Trash2, Key, ArrowLeft, ExternalLink, User, Lock, Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SenhaSistema {
  id: string;
  nome_sistema: string;
  login: string;
  senha: string;
  created_at: string;
}

export default function Senhas() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState({
    nome_sistema: "",
    login: "",
    senha: "",
  });

  const { data: senhas, isLoading } = useQuery({
    queryKey: ["senhas_sistemas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("senhas_sistemas")
        .select("*")
        .order("nome_sistema");

      if (error) throw error;
      return data as SenhaSistema[];
    },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from("senhas_sistemas")
        .insert({
          ...data,
          created_by: user?.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["senhas_sistemas"] });
      toast.success("Senha adicionada com sucesso!");
      resetForm();
    },
    onError: () => {
      toast.error("Erro ao adicionar senha");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from("senhas_sistemas")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["senhas_sistemas"] });
      toast.success("Senha atualizada com sucesso!");
      resetForm();
    },
    onError: () => {
      toast.error("Erro ao atualizar senha");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("senhas_sistemas")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["senhas_sistemas"] });
      toast.success("Senha removida com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao remover senha");
    },
  });

  const resetForm = () => {
    setFormData({ nome_sistema: "", login: "", senha: "" });
    setEditingId(null);
    setDialogOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (senha: SenhaSistema) => {
    setFormData({
      nome_sistema: senha.nome_sistema,
      login: senha.login,
      senha: senha.senha,
    });
    setEditingId(senha.id);
    setDialogOpen(true);
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const copyToClipboard = async (text: string, type: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(`${type} copiado!`);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="p-3 md:p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-2 md:gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="h-8 w-8 md:h-10 md:w-10 shrink-0"
          >
            <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
          <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
            <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
              <Key className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            </div>
            <h1 className="text-lg md:text-xl font-bold truncate">Senhas de Sistemas</h1>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className="h-8 md:h-9 shrink-0"
                onClick={() => {
                  setFormData({ nome_sistema: "", login: "", senha: "" });
                  setEditingId(null);
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Nova Senha</span>
                <span className="sm:hidden">Nova</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Editar Senha" : "Nova Senha"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome_sistema">Nome do Sistema</Label>
                  <Input
                    id="nome_sistema"
                    value={formData.nome_sistema}
                    onChange={(e) =>
                      setFormData({ ...formData, nome_sistema: e.target.value })
                    }
                    placeholder="Ex: Meu Gov, INSS Digital..."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login">Login</Label>
                  <Input
                    id="login"
                    value={formData.login}
                    onChange={(e) =>
                      setFormData({ ...formData, login: e.target.value })
                    }
                    placeholder="Email, CPF ou usuário"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="senha">Senha</Label>
                  <Input
                    id="senha"
                    type="text"
                    value={formData.senha}
                    onChange={(e) =>
                      setFormData({ ...formData, senha: e.target.value })
                    }
                    placeholder="Senha do sistema"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingId ? "Salvar" : "Adicionar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-44 rounded-2xl bg-gradient-to-br from-muted/40 to-muted/10 animate-pulse"
              />
            ))}
          </div>
        ) : !senhas?.length ? (
          <Card className="border-dashed border-2 bg-gradient-to-br from-primary/5 via-background to-background">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Key className="h-8 w-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-1">Nenhuma senha cadastrada</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Adicione sua primeira senha para começar
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Nova Senha
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {senhas.map((senha) => {
              const isVisible = visiblePasswords.has(senha.id);
              const raw = (senha.nome_sistema || "").trim();
              const isUrl = /^https?:\/\//i.test(raw) || /\.[a-z]{2,}/i.test(raw);
              const href = isUrl
                ? raw.startsWith("http")
                  ? raw
                  : `https://${raw}`
                : null;
              let domain = "";
              let displayName = raw;
              try {
                if (href) {
                  const u = new URL(href);
                  domain = u.hostname.replace(/^www\./, "");
                  displayName = domain;
                }
              } catch {
                /* noop */
              }
              const favicon = domain
                ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
                : null;
              const initial = raw.charAt(0).toUpperCase() || "?";

              return (
                <Card
                  key={senha.id}
                  className="group relative overflow-hidden border-border/60 hover:border-primary/40 hover:shadow-md transition-all"
                >
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center gap-3 md:gap-4">
                      {/* Avatar / favicon */}
                      <a
                        href={href ?? undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`h-11 w-11 md:h-12 md:w-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden border border-border/50 bg-gradient-to-br from-primary/15 to-primary/5 ${
                          href ? "hover:border-primary hover:shadow-md transition-all cursor-pointer" : "cursor-default pointer-events-none"
                        }`}
                        title={href ? `Abrir ${displayName}` : undefined}
                      >
                        {favicon ? (
                          <img
                            src={favicon}
                            alt=""
                            className="h-6 w-6 md:h-7 md:w-7 object-contain"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <span className="font-bold text-base md:text-lg text-primary">{initial}</span>
                        )}
                      </a>

                      {/* Nome / link */}
                      <div className="flex-1 min-w-0">
                        {href ? (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group/link inline-flex items-center gap-1.5 font-semibold text-sm md:text-base truncate hover:text-primary transition-colors max-w-full"
                            title={href}
                          >
                            <span className="truncate">{displayName}</span>
                            <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-50 group-hover/link:opacity-100" />
                          </a>
                        ) : (
                          <h3 className="font-semibold text-sm md:text-base truncate" title={raw}>
                            {raw}
                          </h3>
                        )}
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 truncate">
                          <User className="h-3 w-3 shrink-0" />
                          <span className="font-mono truncate" title={senha.login}>
                            {senha.login}
                          </span>
                        </div>
                      </div>

                      {/* Ações de cópia */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 hidden sm:inline-flex hover:bg-primary/10 hover:text-primary hover:border-primary/40"
                          onClick={() => copyToClipboard(senha.login, "Login")}
                          title="Copiar login"
                        >
                          <User className="h-3.5 w-3.5" />
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 gap-1.5 hidden sm:inline-flex hover:bg-primary/10 hover:text-primary hover:border-primary/40"
                          onClick={() => copyToClipboard(senha.senha, "Senha")}
                          title="Copiar senha"
                        >
                          <Lock className="h-3.5 w-3.5" />
                          <Copy className="h-3 w-3" />
                        </Button>

                        {/* Mobile compacto */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 sm:hidden"
                          onClick={() => copyToClipboard(senha.login, "Login")}
                          title="Copiar login"
                        >
                          <User className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 sm:hidden"
                          onClick={() => copyToClipboard(senha.senha, "Senha")}
                          title="Copiar senha"
                        >
                          <Lock className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => togglePasswordVisibility(senha.id)}
                          title={isVisible ? "Ocultar senha" : "Mostrar senha"}
                        >
                          {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>

                        <div className="hidden md:flex items-center gap-0.5 ml-1 pl-1 border-l border-border/60">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEdit(senha)}
                            title="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => deleteMutation.mutate(senha.id)}
                            title="Excluir"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Senha revelada */}
                    {isVisible && (
                      <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted/50 border border-border/50 px-3 py-2">
                        <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="font-mono text-sm tracking-wider flex-1 break-all">
                          {senha.senha}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => copyToClipboard(senha.senha, "Senha")}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    )}

                    {/* Ações mobile (editar/excluir) */}
                    <div className="md:hidden flex items-center justify-end gap-1 mt-2 pt-2 border-t border-border/40">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleEdit(senha)}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(senha.id)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Excluir
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
