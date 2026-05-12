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
import { Plus, Eye, EyeOff, Copy, Pencil, Trash2, Key, ArrowLeft } from "lucide-react";
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
      <div className="p-3 md:p-6 max-w-4xl mx-auto space-y-4">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {senhas.map((senha, idx) => {
              const isVisible = visiblePasswords.has(senha.id);
              const initial = (senha.nome_sistema || "?").trim().charAt(0).toUpperCase();
              const palette = [
                "from-primary/20 via-primary/5 to-transparent",
                "from-accent/30 via-accent/10 to-transparent",
                "from-secondary/40 via-secondary/10 to-transparent",
                "from-primary/15 via-accent/10 to-transparent",
              ];
              const ring = palette[idx % palette.length];
              return (
                <Card
                  key={senha.id}
                  className="group relative overflow-hidden border-border/60 hover:border-primary/40 transition-all hover:shadow-xl hover:-translate-y-1 duration-300"
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${ring} opacity-60 group-hover:opacity-100 transition-opacity`}
                  />
                  <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-primary/10 blur-2xl group-hover:bg-primary/20 transition-colors" />

                  <CardContent className="relative p-5 space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-lg shadow-lg shadow-primary/30 shrink-0">
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm leading-tight truncate" title={senha.nome_sistema}>
                            {senha.nome_sistema}
                          </h3>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                            Credencial
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleEdit(senha)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(senha.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {/* Login */}
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                        Login
                      </p>
                      <div className="flex items-center gap-2 rounded-lg bg-background/60 backdrop-blur-sm border border-border/50 px-3 py-2">
                        <span className="font-mono text-xs truncate flex-1" title={senha.login}>
                          {senha.login}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 hover:bg-primary/10 hover:text-primary"
                          onClick={() => copyToClipboard(senha.login, "Login")}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    {/* Senha */}
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                        Senha
                      </p>
                      <div className="flex items-center gap-2 rounded-lg bg-background/60 backdrop-blur-sm border border-border/50 px-3 py-2">
                        <span className="font-mono text-xs truncate flex-1 tracking-wider">
                          {isVisible ? senha.senha : "•".repeat(Math.min(12, Math.max(8, senha.senha.length)))}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 hover:bg-primary/10 hover:text-primary"
                          onClick={() => togglePasswordVisibility(senha.id)}
                        >
                          {isVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 hover:bg-primary/10 hover:text-primary"
                          onClick={() => copyToClipboard(senha.senha, "Senha")}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
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
