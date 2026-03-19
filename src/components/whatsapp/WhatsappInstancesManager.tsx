import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
// Evolution API calls are now proxied through edge function (no CORS issues)
import {
  createInstance,
  getQRCode,
  deleteInstance,
  getInstanceStatus,
} from "@/services/evolutionApi";
import { toast } from "sonner";
import {
  Smartphone, Plus, Trash2, Loader2, Wifi, WifiOff,
  Radio, RefreshCw, MoreVertical, QrCode,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  updated_at: string;
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

const STATUS_MAP: Record<string, {
  label: string;
  color: string;
  bgColor: string;
  icon: typeof Wifi;
  pulse?: boolean;
}> = {
  connected: {
    label: "Conectado",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10 border-emerald-500/20",
    icon: Wifi,
  },
  qr_pending: {
    label: "Aguardando QR",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-500/10 border-amber-500/20",
    icon: Radio,
    pulse: true,
  },
  disconnected: {
    label: "Desconectado",
    color: "text-destructive",
    bgColor: "bg-destructive/5 border-destructive/20",
    icon: WifiOff,
  },
};

function getStatusConfig(status: string) {
  return STATUS_MAP[status] ?? STATUS_MAP.disconnected;
}

function handleEvolutionError(err: unknown, fallbackMsg: string) {
  const msg = err instanceof Error ? err.message : fallbackMsg;
  toast.error(msg);
}

function InstanceCard({
  instance,
  onDelete,
  onReconnect,
  deleting,
}: {
  instance: WaInstance;
  onDelete: () => void;
  onReconnect: () => void;
  deleting: boolean;
}) {
  const cfg = getStatusConfig(instance.status);
  const Icon = cfg.icon;
  const createdAt = new Date(instance.created_at);

  return (
    <div className="group relative flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card hover:bg-accent/5 transition-colors">
      {/* Status indicator dot */}
      <div className={`relative flex items-center justify-center h-10 w-10 rounded-lg border ${cfg.bgColor}`}>
        <Icon className={`h-4.5 w-4.5 ${cfg.color} ${cfg.pulse ? "animate-pulse" : ""}`} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold truncate">{instance.name}</p>
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 border ${cfg.color} ${cfg.bgColor}`}>
            {cfg.label}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {instance.phone && (
            <span className="text-xs text-muted-foreground font-mono">{instance.phone}</span>
          )}
          <span className="text-[10px] text-muted-foreground/40">
            {createdAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
          </span>
          <span className="text-[10px] text-muted-foreground/30 font-mono truncate max-w-[120px]">
            {instance.evolution_instance_name}
          </span>
        </div>
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {instance.status !== "connected" && (
            <DropdownMenuItem onClick={onReconnect} className="gap-2">
              <QrCode className="h-3.5 w-3.5" /> Reconectar (QR)
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={onDelete}
            disabled={deleting}
            className="gap-2 text-destructive focus:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" /> Remover instância
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default function WhatsappInstancesManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [pendingInstanceName, setPendingInstanceName] = useState<string | null>(null);
  const [reconnectingId, setReconnectingId] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "" },
  });

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

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("whatsapp_instances_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_instances" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["whatsapp_instances"] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  // Stop polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Start polling Evolution API for connection status
  const startPolling = useCallback((evolutionName: string, instanceId?: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    let attempts = 0;
    const maxAttempts = 60; // ~3 min (every 3s)

    pollingRef.current = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = null;
        toast.error("Tempo esgotado aguardando conexão. Tente reconectar.");
        setPendingInstanceName(null);
        setReconnectingId(null);
        return;
      }

      try {
        const { status } = await getInstanceStatus(evolutionName);
        if (status === "open") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          pollingRef.current = null;

          // Update DB
          const updateFilter = instanceId
            ? supabase.from("whatsapp_instances").update({ status: "connected", qr_code: null }).eq("id", instanceId)
            : supabase.from("whatsapp_instances").update({ status: "connected", qr_code: null }).eq("evolution_instance_name", evolutionName);
          await updateFilter;

          queryClient.invalidateQueries({ queryKey: ["whatsapp_instances"] });
          toast.success("WhatsApp conectado com sucesso! 🎉");
          setOpen(false);
          setPendingInstanceName(null);
          setReconnectingId(null);
          form.reset();
        }
      } catch {
        // keep polling
      }
    }, 3000);
  }, [queryClient, form]);

  // Auto-close dialog when pending instance becomes connected (via Realtime)
  useEffect(() => {
    if (!pendingInstanceName || !open) return;
    const inst = instances.find((i) => i.evolution_instance_name === pendingInstanceName);
    if (inst?.status === "connected") {
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = null;
      toast.success("WhatsApp conectado com sucesso! 🎉");
      setOpen(false);
      setPendingInstanceName(null);
      form.reset();
    }
  }, [instances, pendingInstanceName, open, form]);

  // Auto-close reconnect dialog
  useEffect(() => {
    if (!reconnectingId) return;
    const inst = instances.find((i) => i.id === reconnectingId);
    if (inst?.status === "connected") {
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = null;
      toast.success("Reconectado com sucesso! 🎉");
      setReconnectingId(null);
    }
  }, [instances, reconnectingId]);
  const deleteMutation = useMutation({
    mutationFn: async (instance: WaInstance) => {
      try {
        await deleteInstance(instance.evolution_instance_name);
      } catch {
        // Instance may already be deleted on Evolution side
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

      let qrCode: string | null = null;
      try {
        const { qrcode } = await getQRCode(evolutionName);
        qrCode = qrcode;
      } catch {
        // QR will arrive via webhook
      }

      await supabase.from("whatsapp_instances").insert({
        name: values.name,
        status: "qr_pending",
        qr_code: qrCode,
        evolution_instance_name: evolutionName,
        created_by: user.id,
      });

      queryClient.invalidateQueries({ queryKey: ["whatsapp_instances"] });
      setPendingInstanceName(evolutionName);
      startPolling(evolutionName);
    } catch (err) {
      handleEvolutionError(err, "Falha ao criar instância");
    } finally {
      setCreating(false);
    }
  }

  async function handleReconnect(instance: WaInstance) {
    setReconnectingId(instance.id);
    try {
      const { qrcode } = await getQRCode(instance.evolution_instance_name);
      await supabase
        .from("whatsapp_instances")
        .update({ status: "qr_pending", qr_code: qrcode || null })
        .eq("id", instance.id);
      queryClient.invalidateQueries({ queryKey: ["whatsapp_instances"] });
      startPolling(instance.evolution_instance_name, instance.id);
    } catch (err) {
      handleEvolutionError(err, "Erro ao reconectar");
      setReconnectingId(null);
    }
  }

  function handleDialogChange(v: boolean) {
    setOpen(v);
    if (!v) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = null;
      setPendingInstanceName(null);
      setCreating(false);
      form.reset();
    }
  }

  const pendingInstance = pendingInstanceName
    ? instances.find((i) => i.evolution_instance_name === pendingInstanceName)
    : null;
  const qrData = pendingInstance?.qr_code ?? null;
  const showQr = !!pendingInstanceName;

  const reconnectInstance = reconnectingId
    ? instances.find((i) => i.id === reconnectingId)
    : null;

  const connectedCount = instances.filter((i) => i.status === "connected").length;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Smartphone className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Instâncias WhatsApp Web</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {instances.length === 0
                  ? "Nenhuma instância configurada"
                  : `${connectedCount}/${instances.length} conectada${connectedCount !== 1 ? "s" : ""}`
                }
              </CardDescription>
            </div>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["whatsapp_instances"] })}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Atualizar lista</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-0">
        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando instâncias…
          </div>
        )}

        {!isLoading && instances.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <div className="h-12 w-12 rounded-full bg-muted/30 flex items-center justify-center">
              <Smartphone className="h-5 w-5 text-muted-foreground/40" />
            </div>
            <p className="text-sm text-muted-foreground/60">Nenhuma instância cadastrada</p>
            <p className="text-xs text-muted-foreground/40">Crie uma para conectar via QR Code</p>
          </div>
        )}

        {instances.map((inst) => (
          <InstanceCard
            key={inst.id}
            instance={inst}
            onDelete={() => deleteMutation.mutate(inst)}
            onReconnect={() => handleReconnect(inst)}
            deleting={deleteMutation.isPending}
          />
        ))}

        {/* Reconnect QR dialog */}
        {reconnectInstance && reconnectInstance.status !== "connected" && (
          <Dialog open={!!reconnectingId} onOpenChange={(v) => !v && setReconnectingId(null)}>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Reconectar: {reconnectInstance.name}</DialogTitle>
                <DialogDescription>
                  Escaneie o QR Code para reconectar esta instância.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4 py-4">
                {reconnectInstance.qr_code ? (
                  <QrPreview value={reconnectInstance.qr_code} size={240} />
                ) : (
                  <div className="flex flex-col items-center gap-2" style={{ width: 240, height: 240 }}>
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Aguardando QR Code…</p>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Aguardando leitura do QR…
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* New instance dialog */}
        <Dialog open={open} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full gap-2">
              <Plus className="h-4 w-4" /> Nova Instância
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nova Instância WhatsApp</DialogTitle>
              <DialogDescription>
                Informe um nome e escaneie o QR Code para conectar.
              </DialogDescription>
            </DialogHeader>

            {!showQr ? (
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
                  <Button type="submit" className="w-full gap-2" disabled={creating}>
                    {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                    <QrCode className="h-4 w-4" />
                    Criar e gerar QR Code
                  </Button>
                </form>
              </Form>
            ) : (
              <div className="flex flex-col items-center gap-4 py-4">
                <p className="text-sm text-muted-foreground text-center">
                  Abra o WhatsApp no celular → Menu (⋮) → Aparelhos conectados → Conectar
                </p>
                {qrData ? (
                  <QrPreview value={qrData} size={256} />
                ) : (
                  <div className="flex flex-col items-center gap-2" style={{ width: 256, height: 256 }}>
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Aguardando QR Code do servidor…</p>
                  </div>
                )}
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
