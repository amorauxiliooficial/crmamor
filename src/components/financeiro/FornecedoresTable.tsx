import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Edit, Trash2, Plus, Building2 } from "lucide-react";
import { useFornecedores } from "@/hooks/useFornecedores";
import { FornecedorFormDialog } from "./FornecedorFormDialog";
import type { Fornecedor } from "@/types/fornecedor";

export function FornecedoresTable() {
  const { fornecedores, deleteFornecedor, isLoading } = useFornecedores();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFornecedor, setEditingFornecedor] = useState<Fornecedor | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fornecedorToDelete, setFornecedorToDelete] = useState<string | null>(null);

  const handleEdit = (fornecedor: Fornecedor) => {
    setEditingFornecedor(fornecedor);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!fornecedorToDelete) return;
    await deleteFornecedor.mutateAsync(fornecedorToDelete);
    setDeleteDialogOpen(false);
    setFornecedorToDelete(null);
  };

  const handleNew = () => {
    setEditingFornecedor(null);
    setDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Fornecedores
          </CardTitle>
          <Button size="sm" onClick={handleNew}>
            <Plus className="h-4 w-4 mr-1" />
            Novo Fornecedor
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CNPJ/CPF</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : fornecedores.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum fornecedor cadastrado
                    </TableCell>
                  </TableRow>
                ) : (
                  fornecedores.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell className="font-medium">{f.nome}</TableCell>
                      <TableCell>{f.cnpj_cpf || "-"}</TableCell>
                      <TableCell>{f.telefone || "-"}</TableCell>
                      <TableCell>{f.email || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={f.ativo ? "default" : "secondary"}>
                          {f.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(f)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setFornecedorToDelete(f.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y">
            {isLoading ? (
              <div className="text-center py-8">Carregando...</div>
            ) : fornecedores.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum fornecedor cadastrado
              </div>
            ) : (
              fornecedores.map((f) => (
                <div key={f.id} className="p-3 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{f.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {f.cnpj_cpf || "Sem CNPJ/CPF"}
                      </p>
                    </div>
                    <Badge variant={f.ativo ? "default" : "secondary"} className="text-xs">
                      {f.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  {(f.telefone || f.email) && (
                    <div className="text-xs text-muted-foreground">
                      {f.telefone && <span>{f.telefone}</span>}
                      {f.telefone && f.email && <span> • </span>}
                      {f.email && <span>{f.email}</span>}
                    </div>
                  )}
                  <div className="flex justify-end gap-1 pt-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(f)}>
                      <Edit className="h-3.5 w-3.5 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFornecedorToDelete(f.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1 text-destructive" />
                      Excluir
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <FornecedorFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        fornecedor={editingFornecedor}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Fornecedor</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este fornecedor? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
