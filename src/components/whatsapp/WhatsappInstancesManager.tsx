import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MissingEvolutionEnvError } from "@/config/evolutionEnv";
import {
  createInstance,
  getQRCode,
  getInstanceStatus,
  deleteInstance,
} from "@/services/evolutionApi";
import { toast } from "sonner";
import { Smartphone, Plus, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import QrPreview from "@/components/whatsapp/QrPreview";

interface WaInstance {
  id: string;
  name: string;
  status: string;
  phone: string | null;
  qr_code: string | null;
  evolution_instance_name: string;
  created_by: string;
  created_at: string;
}

const formSchema = z.object({
  name: z.string().min(2, "Nome deve ter ao menos 2 caracteres").max(40),
});
type FormValues = z.infer<typeof formSchema>;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function statusBadge(status: string) {
  switch (status) {
    case "connected":
      return <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0">🟢 Conectado</Badge>;
    case "qr_pending":
      return <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-0">🟡 Aguardando QR</Badge>;
    default:
      return <Badge variant="outline" className="text-destructive">🔴 Desconectado</Badge>;
  }
}

function handleEvolutionError(err: unknown, fallbackMsg: string) {
  if (err instanceof MissingEvolutionEnvError) {
    toast.error("Integração com Evolution não configurada.", {
      description:
        "No Lovable: Settings → Workspace → Build secrets. Adicione VITE_EVOLUTION_API_URL e VITE_EVOLUTION_API_KEY e depois faça Rebuild/Restart do Preview.",
      duration: 10000,
    });
    return;
  }
  const msg = err instanceof Error ? err.message : fallbackMsg;
  toast.error(msg);
}

export default function WhatsappInstancesManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingNameRef = useRef<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "" },
  });

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    pollingNameRef.current = null;
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const { data: instances = [], isLoading } = useQuery<WaInstance[]>({
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

  const deleteMutation = useMutation({
    mutationFn: async (instance: WaInstance) => {
      try {
        await deleteInstance(instance.evolution_instance_name);
      } catch (err) {
        if (err instanceof MissingEvolutionEnvError) throw err;
        // instance may already be gone on Evolution side
      }
      const { error } = await supabase
        .from("whatsapp_instances")
        .delete()
        .eq("id", instance.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp_instances"] });
      toast.success("Instância removida");
    },
    onError: (err) => handleEvolutionError(err, "Erro ao remover instância"),
  });

  async function onSubmit(values: FormValues) {
    if (!user) return;
    setCreating(true);
    const evolutionName = `${slugify(values.name)}-${Date.now().toString(36)}`;

    try {
      await createInstance(evolutionName);
      const { qrcode } = await getQRCode(evolutionName);
      setQrData(qrcode);

      await supabase.from("whatsapp_instances").insert({
        name: values.name,
        status: "qr_pending",
        qr_code: qrcode,
        evolution_instance_name: evolutionName,
        created_by: user.id,
      });

      queryClient.invalidateQueries({ queryKey: ["whatsapp_instances"] });

      pollingNameRef.current = evolutionName;
      pollingRef.current = setInterval(async () => {
        if (pollingNameRef.current !== evolutionName) return;
        try {
          const { status } = await getInstanceStatus(evolutionName);
          if (status === "open") {
            stopPolling();
            await supabase
              .from("whatsapp_instances")
              .update({ status: "connected", qr_code: null })
              .eq("evolution_instance_name", evolutionName);
            queryClient.invalidateQueries({ queryKey: ["whatsapp_instances"] });
            toast.success("WhatsApp conectado com sucesso!");
            setOpen(false);
            setQrData(null);
            form.reset();
          }
        } catch {
          // silently retry
        }
      }, 3000);
    } catch (err) {
      handleEvolutionError(err, "Falha ao criar instância");
    } finally {
      setCreating(false);
    }
  }

  function handleDialogChange(v: boolean) {
    setOpen(v);
    if (!v) {
      stopPolling();
      setQrData(null);
      setCreating(false);
      form.reset();
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Instâncias WhatsApp (Web)
        </CardTitle>
        <CardDescription>Gerencie conexões via Evolution API</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </div>
        )}

        {instances.map((inst) => (
          <div key={inst.id} className="flex items-center gap-3 py-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{inst.name}</p>
              <p className="text-xs text-muted-foreground">{inst.phone ?? "—"}</p>
            </div>
            {statusBadge(inst.status)}
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={() => deleteMutation.mutate(inst)}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        {!isLoading && instances.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma instância cadastrada.</p>
        )}

        <Dialog open={open} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full">
              <Plus className="h-4 w-4 mr-2" /> Nova Instância
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nova Instância WhatsApp</DialogTitle>
            </DialogHeader>

            {!qrData ? (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome da instância</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Equipe Comercial" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={creating}>
                    {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Criar e gerar QR Code
                  </Button>
                </form>
              </Form>
            ) : (
              <div className="flex flex-col items-center gap-4 py-4">
                <p className="text-sm text-muted-foreground text-center">
                  Escaneie o QR Code com o WhatsApp no celular
                </p>
                <QrPreview value={qrData} size={256} />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Aguardando conexão…
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
