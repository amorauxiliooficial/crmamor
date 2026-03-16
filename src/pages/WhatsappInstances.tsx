import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Plus, Trash2, Loader2, Smartphone } from "lucide-react";

import {
  createInstance,
  getQRCode,
  getInstanceStatus,
  deleteInstance,
} from "@/services/evolutionApi";

// ---------- types ----------
interface WaInstance {
  id: string;
  name: string;
  phone: string | null;
  status: string;
  qr_code: string | null;
  evolution_instance_name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ---------- schema ----------
const formSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
});
type FormValues = z.infer<typeof formSchema>;

// ---------- helpers ----------
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
      return <Badge className="bg-primary text-primary-foreground">🟢 Conectado</Badge>;
    case "qr_pending":
      return <Badge className="bg-accent text-accent-foreground">🟡 Aguardando QR</Badge>;
    default:
      return <Badge variant="destructive">🔴 Desconectado</Badge>;
  }
}

// ---------- component ----------
export default function WhatsappInstances() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);
  const [creatingName, setCreatingName] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "" },
  });

  // Fetch instances
  const { data: instances = [], isLoading } = useQuery<WaInstance[]>({
    queryKey: ["whatsapp-instances"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_instances")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as WaInstance[];
    },
  });

  // Stop polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!user) throw new Error("Usuário não autenticado");
      const evolutionName = `${slugify(values.name)}-${Date.now()}`;

      await createInstance(evolutionName);
      const { qrcode } = await getQRCode(evolutionName);

      const { error } = await supabase.from("whatsapp_instances").insert([{
        name: values.name,
        status: "qr_pending",
        qr_code: qrcode,
        evolution_instance_name: evolutionName,
        created_by: user.id,
      }]);
      if (error) throw error;

      setQrData(qrcode);
      setCreatingName(evolutionName);
      startPolling(evolutionName);
      toast.success("Instância criada! Escaneie o QR Code.");
    },
    onError: (err: Error) => {
      toast.error(`Erro ao criar instância: ${err.message}`);
    },
  });

  function startPolling(evolutionName: string) {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const { status } = await getInstanceStatus(evolutionName);
        if (status === "open") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          pollingRef.current = null;

          await supabase
            .from("whatsapp_instances")
            .update({ status: "connected", qr_code: null } as Record<string, unknown>)
            .eq("evolution_instance_name", evolutionName);

          setDialogOpen(false);
          setQrData(null);
          setCreatingName(null);
          form.reset();
          queryClient.invalidateQueries({ queryKey: ["whatsapp-instances"] });
          toast.success("WhatsApp conectado com sucesso!");
        }
      } catch {
        // keep polling
      }
    }, 3000);
  }

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (instance: WaInstance) => {
      await deleteInstance(instance.evolution_instance_name);
      const { error } = await supabase
        .from("whatsapp_instances")
        .delete()
        .eq("id", instance.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-instances"] });
      toast.success("Instância removida.");
    },
    onError: (err: Error) => {
      toast.error(`Erro ao deletar: ${err.message}`);
    },
  });

  function handleDialogClose() {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = null;
    setDialogOpen(false);
    setQrData(null);
    setCreatingName(null);
    form.reset();
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Smartphone className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Instâncias WhatsApp</h1>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Nova Instância
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Instâncias cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : instances.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Nenhuma instância cadastrada.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {instances.map((inst) => (
                  <TableRow key={inst.id}>
                    <TableCell className="font-medium">{inst.name}</TableCell>
                    <TableCell>{inst.phone ?? "—"}</TableCell>
                    <TableCell>{statusBadge(inst.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(inst)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog Nova Instância */}
      <Dialog open={dialogOpen} onOpenChange={(o) => !o && handleDialogClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Instância WhatsApp</DialogTitle>
            <DialogDescription>
              Informe um nome e escaneie o QR Code para conectar.
            </DialogDescription>
          </DialogHeader>

          {!qrData ? (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((v) => createMutation.mutate(v))}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome da instância</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Atendimento principal" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending && (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    )}
                    Criar e gerar QR
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          ) : (
            <div className="flex flex-col items-center gap-4 py-4">
              <img
                src={qrData}
                alt="QR Code WhatsApp"
                className="w-64 h-64 rounded-lg border"
              />
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Aguardando conexão…
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
