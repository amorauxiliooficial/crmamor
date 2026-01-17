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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTiposConteudo, useCreateCriativo, useUpdateCriativo } from "@/hooks/useMarketing";
import { Criativo, TipoInstagram } from "@/types/marketing";
import { format } from "date-fns";

interface CriativoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  criativo?: Criativo | null;
  selectedDate?: Date | null;
}

export function CriativoDialog({
  open,
  onOpenChange,
  criativo,
  selectedDate,
}: CriativoDialogProps) {
  const { data: tiposConteudo = [] } = useTiposConteudo();
  const createCriativo = useCreateCriativo();
  const updateCriativo = useUpdateCriativo();

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipoConteudoId, setTipoConteudoId] = useState<string>("");
  const [tipoInstagram, setTipoInstagram] = useState<TipoInstagram>("feed");
  const [dataPostagem, setDataPostagem] = useState("");
  const [horarioPostagem, setHorarioPostagem] = useState("");
  const [legenda, setLegenda] = useState("");
  const [status, setStatus] = useState<string>("agendado");

  useEffect(() => {
    if (criativo) {
      setTitulo(criativo.titulo);
      setDescricao(criativo.descricao || "");
      setTipoConteudoId(criativo.tipo_conteudo_id || "");
      setTipoInstagram(criativo.tipo_instagram);
      setDataPostagem(criativo.data_postagem);
      setHorarioPostagem(criativo.horario_postagem || "");
      setLegenda(criativo.legenda || "");
      setStatus(criativo.status);
    } else {
      setTitulo("");
      setDescricao("");
      setTipoConteudoId("");
      setTipoInstagram("feed");
      setDataPostagem(selectedDate ? format(selectedDate, "yyyy-MM-dd") : "");
      setHorarioPostagem("");
      setLegenda("");
      setStatus("agendado");
    }
  }, [criativo, selectedDate, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data = {
      titulo,
      descricao: descricao || undefined,
      tipo_conteudo_id: tipoConteudoId || undefined,
      tipo_instagram: tipoInstagram,
      data_postagem: dataPostagem,
      horario_postagem: horarioPostagem || undefined,
      legenda: legenda || undefined,
      status,
    };

    if (criativo) {
      await updateCriativo.mutateAsync({ id: criativo.id, ...data });
    } else {
      await createCriativo.mutateAsync(data);
    }

    onOpenChange(false);
  };

  const isLoading = createCriativo.isPending || updateCriativo.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {criativo ? "Editar Criativo" : "Novo Criativo"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Post sobre auxílio maternidade"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo-instagram">Formato Instagram *</Label>
              <Select value={tipoInstagram} onValueChange={(v) => setTipoInstagram(v as TipoInstagram)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="feed">Feed</SelectItem>
                  <SelectItem value="stories">Stories</SelectItem>
                  <SelectItem value="reels">Reels</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo-conteudo">Tipo de Conteúdo</Label>
              <Select value={tipoConteudoId} onValueChange={setTipoConteudoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {tiposConteudo.map((tipo) => (
                    <SelectItem key={tipo.id} value={tipo.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tipo.cor }}
                        />
                        {tipo.nome}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="data">Data de Postagem *</Label>
              <Input
                id="data"
                type="date"
                value={dataPostagem}
                onChange={(e) => setDataPostagem(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="horario">Horário</Label>
              <Input
                id="horario"
                type="time"
                value={horarioPostagem}
                onChange={(e) => setHorarioPostagem(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Breve descrição do conteúdo..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="legenda">Legenda do Post</Label>
            <Textarea
              id="legenda"
              value={legenda}
              onChange={(e) => setLegenda(e.target.value)}
              placeholder="Digite a legenda completa aqui..."
              rows={4}
            />
          </div>

          {criativo && (
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="agendado">Agendado</SelectItem>
                  <SelectItem value="postado">Postado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Salvando..." : criativo ? "Salvar" : "Agendar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
