// src/pages/WhatsappInstances.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Plus, Smartphone, Trash2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { createInstance, deleteInstance, getInstanceStatus, getQRCode } from "@/services/evolutionApi";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";

type InstanceStatus = "disconnected" | "qr_pending" | "connected";

type WaInstance = {
  id: string;
  name: string;
  phone: string | null;
  status: InstanceStatus;
  qr_code: string | null;
  evolution_instance_name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

const formSchema = z.object({
  name: z.string().min(2, "Informe um nome com pelo menos 2 caracteres."),
});
type FormValues = z.infer<typeof formSchema>;

function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function StatusBadge({ status }: { status: InstanceStatus }) {
  switch (status) {
    case "connected":
      return <Badge className="bg-green-600/15 text-green-700 border border-green-600/20">🟢 Conectado</Badge>;
    case "qr_pending":
      return <Badge className="bg-yellow-500/15 text-yellow-800 border border-yellow-500/20">🟡 Aguardando QR</Badge>;
    default:
      return <Badge className="bg-red-600/15 text-red-700 border border-red-600/20">🔴 Desconectado</Badge>;
  }
}

export default function WhatsappInstances() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [creatingEvolutionName, setCreatingEvolutionName] = useState<string | null>(null);

  const pollingRef = useRef<number | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "" },
  });

  const instancesQuery = useQuery({
    queryKey: ["whatsapp_instances"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_instances")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as WaInstance[];
    },
  });

  const currentCreatingInstance = useMemo(() => {
    if (!creatingEvolutionName) return null;
    return instancesQuery.data?.find((i) => i.evolution_instance_name === creatingEvolutionName) ?? null;
  }, [creatingEvolutionName, instancesQuery.data]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    };
  }, []);

  function stopPolling() {
    if (pollingRef.current) window.clearInterval(pollingRef.current);
    pollingRef.current = null;
  }

  async function startPolling(evolutionName: string) {
    stopPolling();

    pollingRef.current = window.setInterval(async () => {
      try {
        const { status } = await getInstanceStatus(evolutionName);

        // na Evolution, "open" costuma indicar conectado
        if (status === "open") {
          stopPolling();

          const { error } = await supabase
            .from("whatsapp_instances")
            .update({ status: "connected", qr_code: null })
            .eq("evolution_instance_name", evolutionName);

          if (error) {
            toast.error("Erro ao atualizar status no Supabase.");
            return;
          }

          toast.success("WhatsApp conectado com sucesso ✅");
          setDialogOpen(false);
          setCreatingEvolutionName(null);
          form.reset({ name: "" });
          queryClient.invalidateQueries({ queryKey: ["whatsapp_instances"] });
        }
      } catch {
        // continua tentando
      }
    }, 3000);
  }

  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!user?.id) throw new Error("Usuário não autenticado.");

      const evolutionName = `${slugify(values.name)}-${Date.now().toString(36)}`;

      await createInstance(evolutionName);
      const { qrcode } = await getQRCode(evolutionName);

      const { data, error } = await supabase
        .from("whatsapp_instances")
        .insert([
          {
            name: values.name,
            status: "qr_pending",
            qr_code: qrcode,
            evolution_instance_name: evolutionName,
            created_by: user.id,
          },
        ])
        .select("*")
        .single();

      if (error) throw error;

      setCreatingEvolutionName(evolutionName);
      await startPolling(evolutionName);

      return data as WaInstance;
    },
    onSuccess: () => {
      toast.success("Instância criada! Escaneie o QR Code 📲");
      queryClient.invalidateQueries({ queryKey: ["whatsapp_instances"] });
    },
    onError: (err) => {
      console.error(err);
      toast.error("Erro ao criar instância na Evolution API.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (instance: WaInstance) => {
      await deleteInstance(instance.evolution_instance_name);
      const { error } = await supabase.from("whatsapp_instances").delete().eq("id", instance.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Instância removida 🗑️");
      queryClient.invalidateQueries({ queryKey: ["whatsapp_instances"] });
    },
    onError: (err) => {
      console.error(err);
      toast.error("Erro ao deletar instância.");
    },
  });

  function handleOpenDialog() {
    setDialogOpen(true);
    setCreatingEvolutionName(null);
    form.reset({ name: "" });
  }

  function handleCloseDialog() {
    stopPolling();
    setDialogOpen(false);
    setCreatingEvolutionName(null);
    form.reset({ name: "" });
  }

  return (
    <div className="p-4 md:p-8 space-y-4">
      <div className="flex items-center gap-2">
        <Smartphone className="h-5 w-5" />
        <div>
          <h1 className="text-lg font-semibold">WhatsApp Instâncias</h1>
          <p className="text-sm text-muted-foreground">Conecte números via QR Code (Evolution API)</p>
        </div>

        <div className="ml-auto">
          <Button onClick={handleOpenDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Instância
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Instâncias cadastradas</CardTitle>
          <CardDescription>Somente instâncias conectadas aparecem no seletor do chat.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {instancesQuery.isLoading && (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando...
            </div>
          )}

          {!instancesQuery.isLoading && (instancesQuery.data?.length ?? 0) === 0 && (
            <div className="text-sm text-muted-foreground">Nenhuma instância cadastrada.</div>
          )}

          {(instancesQuery.data ?? []).map((inst) => (
            <div key={inst.id} className="flex items-center gap-3 rounded-lg border p-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{inst.name}</p>
                  <StatusBadge status={inst.status} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Telefone: {inst.phone ?? "—"} • Evolution:{" "}
                  <span className="font-mono">{inst.evolution_instance_name}</span>
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="text-destructive"
                onClick={() => deleteMutation.mutate(inst)}
                disabled={deleteMutation.isPending}
                title="Deletar instância"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(o) => (o ? setDialogOpen(true) : handleCloseDialog())}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Instância WhatsApp</DialogTitle>
            <DialogDescription>Informe um nome, gere o QR Code e escaneie com o WhatsApp.</DialogDescription>
          </DialogHeader>

          {!creatingEvolutionName ? (
            <Form {...form}>
              <form className="space-y-4" onSubmit={form.handleSubmit((v) => createMutation.mutate(v))}>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <Label>Nome da instância</Label>
                      <FormControl>
                        <Input placeholder="Ex: Vendas João" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={handleCloseDialog}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      "Criar e gerar QR"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <div className="space-y-4">
              <div className="text-sm">
                <p className="font-medium">Escaneie o QR Code abaixo</p>
                <p className="text-xs text-muted-foreground">Aguardando o WhatsApp conectar… (checando a cada 3s)</p>
              </div>

              {currentCreatingInstance?.qr_code ? (
                <div className="rounded-lg border p-3 w-full">
                  <p className="text-xs text-muted-foreground mb-2">QR (code/base64)</p>
                  <div className="bg-muted/30 rounded-md p-2 break-all font-mono text-[10px]">
                    {currentCreatingInstance.qr_code}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">QR Code não disponível. Tente recriar a instância.</div>
              )}

              <div className="flex justify-end">
                <Button variant="ghost" onClick={handleCloseDialog}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
