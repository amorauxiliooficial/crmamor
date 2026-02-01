import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useFornecedores } from "@/hooks/useFornecedores";
import type { Fornecedor } from "@/types/fornecedor";

interface FornecedorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fornecedor?: Fornecedor | null;
}

export function FornecedorFormDialog({ open, onOpenChange, fornecedor }: FornecedorFormDialogProps) {
  const { user } = useAuth();
  const { createFornecedor, updateFornecedor } = useFornecedores();
  
  const [nome, setNome] = useState("");
  const [cnpjCpf, setCnpjCpf] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [endereco, setEndereco] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [ativo, setAtivo] = useState(true);

  useEffect(() => {
    if (open) {
      if (fornecedor) {
        setNome(fornecedor.nome);
        setCnpjCpf(fornecedor.cnpj_cpf || "");
        setTelefone(fornecedor.telefone || "");
        setEmail(fornecedor.email || "");
        setEndereco(fornecedor.endereco || "");
        setObservacoes(fornecedor.observacoes || "");
        setAtivo(fornecedor.ativo);
      } else {
        setNome("");
        setCnpjCpf("");
        setTelefone("");
        setEmail("");
        setEndereco("");
        setObservacoes("");
        setAtivo(true);
      }
    }
  }, [open, fornecedor]);

  const handleSave = async () => {
    if (!user || !nome.trim()) return;

    const payload = {
      user_id: user.id,
      nome: nome.trim(),
      cnpj_cpf: cnpjCpf || null,
      telefone: telefone || null,
      email: email || null,
      endereco: endereco || null,
      observacoes: observacoes || null,
      ativo,
    };

    if (fornecedor) {
      await updateFornecedor.mutateAsync({ id: fornecedor.id, ...payload });
    } else {
      await createFornecedor.mutateAsync(payload);
    }

    onOpenChange(false);
  };

  const isLoading = createFornecedor.isPending || updateFornecedor.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{fornecedor ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome do fornecedor"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>CNPJ/CPF</Label>
              <Input
                value={cnpjCpf}
                onChange={(e) => setCnpjCpf(e.target.value)}
                placeholder="00.000.000/0000-00"
              />
            </div>

            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
            />
          </div>

          <div className="space-y-2">
            <Label>Endereço</Label>
            <Input
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              placeholder="Endereço completo"
            />
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Informações adicionais..."
              rows={3}
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={ativo} onCheckedChange={setAtivo} />
            <Label>Fornecedor ativo</Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isLoading || !nome.trim()}
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
