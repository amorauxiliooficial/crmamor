import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useCentralFinanceira, type ParcelaBeneficio, type BoletoAmor, type ParcelaRecebimento } from "@/hooks/useCentralFinanceira";
import { useBancos } from "@/hooks/useBancos";
import type { MaeProcesso } from "@/types/mae";
import { Copy, Plus, Trash2, AlertTriangle, FileText, History, Calculator, Wallet, FileCheck2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCpf } from "@/lib/formatters";
import { useTemplates } from "@/hooks/useTemplates";
import { useAtendentesComunicado } from "@/hooks/useAtendentesComunicado";
import { AtendentesDialog } from "@/components/pagamentos/AtendentesDialog";
import { Settings } from "lucide-react";

interface Props {
  mae: MaeProcesso | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  inline?: boolean;
  hideParcelasBeneficio?: boolean;
}


const PARCELA_STATUS = [
  { value: "prevista", label: "Prevista" },
  { value: "liberada", label: "Liberada" },
  { value: "recebida", label: "Recebida" },
  { value: "a_confirmar", label: "A confirmar" },
];

const BOLETO_STATUS = [
  { value: "a_emitir", label: "A emitir" },
  { value: "enviado", label: "Enviado" },
  { value: "pago", label: "Pago" },
  { value: "vencido", label: "Vencido" },
  { value: "cancelado", label: "Cancelado" },
];

const RECEBIMENTO_STATUS = [
  { value: "prevista", label: "Prevista" },
  { value: "liberada", label: "Liberada" },
  { value: "recebida", label: "Recebida" },
  { value: "atrasada", label: "Atrasada" },
  { value: "cancelada", label: "Cancelada" },
];

const brl = (v: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v ?? 0));

const fmtDate = (d: string | null | undefined) => {
  if (!d) return "—";
  try {
    return format(new Date(d + (d.length === 10 ? "T00:00:00" : "")), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return d;
  }
};

export function CentralFinanceiraDialog({ mae, open = false, onOpenChange, inline = false, hideParcelasBeneficio = false }: Props) {
  const isActive = inline || open;
  const {
    central,
    parcelas,
    boletos,
    recebimentos,
    historico,
    isLoading,
    updateCentral,
    upsertParcela,
    deleteParcela,
    upsertBoleto,
    deleteBoleto,
    upsertRecebimento,
    deleteRecebimento,
    salvarComunicado,
  } = useCentralFinanceira(isActive ? mae?.id ?? null : null);

  const { bancos: bancosLista } = useBancos();

  const [comunicadoOpen, setComunicadoOpen] = useState(false);
  const [atendentesManagerOpen, setAtendentesManagerOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedAtendenteId, setSelectedAtendenteId] = useState<string>("");
  const { templates } = useTemplates();
  const { atendentes } = useAtendentesComunicado();

  // Cálculos
  const totalParcelas = useMemo(
    () => parcelas.reduce((s, p) => s + Number(p.valor ?? 0), 0),
    [parcelas]
  );
  const totalLiberado = useMemo(
    () =>
      parcelas
        .filter((p) => p.status === "liberada" || p.status === "recebida")
        .reduce((s, p) => s + Number(p.valor ?? 0), 0),
    [parcelas]
  );
  const totalFuturo = totalParcelas - totalLiberado;

  const valorPrevistoManual = Number(central?.valor_previsto_beneficio ?? 0);
  const baseCalculo = totalParcelas > 0 ? totalParcelas : valorPrevistoManual;
  const percentual = Number(central?.percentual_honorarios ?? 0);
  const taxa = Number(central?.taxa_administrativa ?? 0);
  const honorarios = baseCalculo * (percentual / 100);
  const totalAmor = honorarios + taxa;

  const totalBoletos = useMemo(
    () => boletos.reduce((s, b) => s + Number(b.valor ?? 0), 0),
    [boletos]
  );
  const boletosPagos = useMemo(
    () => boletos.filter((b) => b.status === "pago").reduce((s, b) => s + Number(b.valor ?? 0), 0),
    [boletos]
  );
  const boletosAberto = totalBoletos - boletosPagos;
  const diferencaBoletos = totalAmor - totalBoletos;

  const totalRecebimentos = useMemo(
    () => recebimentos.reduce((s, r) => s + Number(r.valor ?? 0), 0),
    [recebimentos]
  );
  const totalRecebido = useMemo(
    () => recebimentos.filter((r) => r.status === "recebida").reduce((s, r) => s + Number(r.valor ?? 0), 0),
    [recebimentos]
  );
  const recebimentosAberto = totalRecebimentos - totalRecebido;
  const liquidoCliente = totalRecebimentos > 0 ? totalRecebimentos : baseCalculo - totalAmor;

  const alertas: string[] = [];
  if (Math.abs(diferencaBoletos) > 0.01 && totalBoletos > 0)
    alertas.push("A soma dos boletos não bate com o total da Amor.");
  if (boletosAberto > 0.01) alertas.push("Existe saldo em aberto nos boletos.");
  if (central?.observacoes_valores_futuros && central.observacoes_valores_futuros.trim().length > 0)
    alertas.push("Existe valor futuro registrado em observações.");

  const handleAddParcela = () => {
    const prox = (parcelas[parcelas.length - 1]?.numero_parcela ?? 0) + 1;
    if (prox > 5) {
      toast.error("Máximo de 5 parcelas");
      return;
    }
    upsertParcela.mutate({ numero_parcela: prox, status: "prevista", valor: 0 });
  };

  const handleAddBoleto = () => {
    upsertBoleto.mutate({ status: "a_emitir", valor: 0 });
  };

  const buildComunicado = () => {
    const linhasParc = parcelas
      .map(
        (p) =>
          `  • Parcela ${p.numero_parcela}: ${brl(p.valor)} — ${fmtDate(p.data_parcela)} (${
            PARCELA_STATUS.find((s) => s.value === p.status)?.label
          })`
      )
      .join("\n");

    const linhasBoletos = boletos
      .slice()
      .sort((a, b) => (a.vencimento ?? "9999-12-31").localeCompare(b.vencimento ?? "9999-12-31"))
      .map((b, i) =>
        i === 0
          ? `  • Boleto ${b.numero_boleto ?? "—"}: ${brl(b.valor)} — venc. ${fmtDate(b.vencimento)} (${
              BOLETO_STATUS.find((s) => s.value === b.status)?.label
            })`
          : `  • Boleto ${i + 1}: A confirmar`
      )
      .join("\n");

    const txt =
`Olá, ${mae?.nome_mae ?? ""}! Tudo bem? Aqui é a equipe financeira da Amor Auxílio Maternidade. 💛

📄 *Dados do saque*
Banco: ${central?.banco_saque ?? "—"}
Agência: ${central?.agencia_saque ?? "—"}
Endereço: ${central?.endereco_saque ?? "—"}
Data: ${fmtDate(central?.data_saque)} ${central?.horario_saque ? `às ${central.horario_saque}` : ""}
${central?.observacao_saque ? `Obs.: ${central.observacao_saque}` : ""}

🆔 Número do benefício: ${central?.numero_beneficio ?? "—"}

💰 *Projeção do benefício*
Valor total previsto: ${brl(totalParcelas)}
Já liberado: ${brl(totalLiberado)}
Valor futuro previsto: ${brl(totalFuturo)}

Parcelas:
${linhasParc || "  • —"}

📑 *Honorários e taxas da Amor*
Honorários (${percentual}%): ${brl(honorarios)}
Taxa administrativa: ${brl(taxa)}
Total Amor: ${brl(totalAmor)}

🧾 *Boletos*
${linhasBoletos || "  • —"}
Total dos boletos: ${brl(totalBoletos)}
Saldo em aberto: ${brl(boletosAberto)}

${central?.observacoes_valores_futuros ? `⚠️ Atenção: ${central.observacoes_valores_futuros}\n` : ""}
Assim que efetuar o pagamento, por favor envie o comprovante por aqui para registrarmos. 🙏

Qualquer dúvida estamos à disposição!`;

    return txt;
  };

  const getSaudacao = () => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  };
  const getPrimeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] ?? nome;

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const selectedAtendente = atendentes.find((a) => a.id === selectedAtendenteId);

  const renderFromTemplate = (): string => {
    if (!selectedTemplate) return buildComunicado();
    const listaParcelas = parcelas.length
      ? parcelas
          .slice()
          .sort((a, b) => a.numero_parcela - b.numero_parcela)
          .map(
            (p) => `${p.numero_parcela}ª parcela – ${brl(p.valor)} – ${fmtDate(p.data_parcela)}`
          )
          .join("\n")
      : "(Nenhuma parcela cadastrada)";
    const boletosOrdenados = boletos
      .slice()
      .sort((a, b) => {
        const da = a.vencimento ?? "9999-12-31";
        const db = b.vencimento ?? "9999-12-31";
        return da.localeCompare(db);
      });
    const listaBoletos = boletosOrdenados.length
      ? boletosOrdenados
          .map((b, i) =>
            i === 0
              ? `${i + 1}º boleto – ${brl(b.valor)} – vencimento ${fmtDate(b.vencimento)}`
              : `${i + 1}º boleto – A confirmar`
          )
          .join("\n")
      : "(Nenhum boleto cadastrado)";
    const bancoEndereco = central?.endereco_saque?.trim() || "[Endereço não informado]";

    const replacements: Record<string, string> = {
      "{{SAUDACAO}}": getSaudacao(),
      "{{NOME_MAE}}": mae?.nome_mae ?? "",
      "{{PRIMEIRO_NOME_MAE}}": getPrimeiroNome(mae?.nome_mae ?? ""),
      "{{CPF}}": mae?.cpf ? formatCpf(mae.cpf) : "",
      "{{CEP}}": mae?.cep || "[CEP não informado]",
      "{{NOME_ATENDENTE}}": selectedAtendente?.nome || "[Selecione um atendente]",
      "{{CARGO_ATENDENTE}}": selectedAtendente?.cargo || "",
      "{{NUMERO_BENEFICIO}}": central?.numero_beneficio || "[Nº do benefício não informado]",
      "{{BANCO_NOME}}": central?.banco_saque || "[Banco não informado]",
      "{{BANCO_ENDERECO}}": bancoEndereco,
      "{{DATA_SAQUE}}": fmtDate(central?.data_saque),
      "{{HORA_SAQUE}}": central?.horario_saque || "(Horário a confirmar)",
      "{{VALOR_TOTAL_BENEFICIO}}": brl(totalParcelas || valorPrevistoManual),
      "{{LISTA_PARCELAS_BENEFICIO}}": listaParcelas,
      "{{LISTA_BOLETOS_AMOR}}": listaBoletos,
      "{{HONORARIOS}}": brl(honorarios),
      "{{PERCENTUAL_HONORARIOS}}": percentual ? `${percentual}%` : "",
      "{{TAXA_ADMINISTRATIVA}}": taxa > 0 ? brl(taxa) : "ISENTO",
      "{{TOTAL_HONORARIOS}}": brl(totalAmor),
    };
    let text = selectedTemplate.conteudo;
    Object.entries(replacements).forEach(([k, v]) => {
      text = text.replace(new RegExp(k.replace(/[{}]/g, "\\$&"), "g"), v);
    });
    return text;
  };

  const comunicadoTexto = useMemo(
    () => (comunicadoOpen ? renderFromTemplate() : ""),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [comunicadoOpen, selectedTemplateId, selectedAtendenteId, templates, atendentes, central, parcelas, boletos, mae]
  );

  const handleGerarComunicado = () => {
    // Auto-selecionar primeiro template/atendente ativo
    if (!selectedTemplateId && templates.length > 0) setSelectedTemplateId(templates[0].id);
    if (!selectedAtendenteId) {
      const ativos = atendentes.filter((a) => a.ativo);
      if (ativos.length > 0) setSelectedAtendenteId(ativos[0].id);
    }
    setComunicadoOpen(true);
  };

  // Salvar histórico ao abrir (com o texto final calculado)
  const handleSalvarHistorico = () => {
    if (!comunicadoTexto) return;
    salvarComunicado.mutate({
      texto: comunicadoTexto,
      snapshot: {
        totalParcelas, totalLiberado, totalFuturo, honorarios, taxa, totalAmor,
        liquidoCliente, totalBoletos, boletosAberto, parcelas, boletos,
        template: selectedTemplate?.nome, atendente: selectedAtendente?.nome,
      },
    });
  };

  const handleCopyComunicado = async () => {
    try {
      await navigator.clipboard.writeText(comunicadoTexto);
      handleSalvarHistorico();
      toast.success("Comunicado copiado!");
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  if (!mae) return null;

  const body = (
    <>
      <div className={inline ? "mb-4" : "px-6 pt-6 pb-2"}>
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Wallet className="h-5 w-5 text-primary" />
          Central Financeira da Amor — {mae.nome_mae}
        </h2>
        <p className="text-sm text-muted-foreground">
          Calculadora, projeção de saque, boletos e comunicados da mãe.
        </p>
      </div>

      <div
        className={
          inline
            ? "grid lg:grid-cols-[1fr_360px] gap-4"
            : "grid lg:grid-cols-[1fr_360px] gap-4 px-6 pb-6 overflow-y-auto max-h-[calc(95vh-80px)]"
        }
      >
        {/* PRINCIPAL */}
        <div className="space-y-4">
          {/* Dados da cliente */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Dados da cliente</CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-3 text-sm">
                <Info label="Nome" value={mae.nome_mae} />
                <Info label="CPF" value={formatCpf(mae.cpf)} mono />
                <Info label="Telefone" value={mae.telefone || "—"} />
                <Info label="Status" value={mae.status_processo} />
                <div className="md:col-span-2">
                  <Label className="text-xs text-muted-foreground">Número do benefício</Label>
                  <Input
                    defaultValue={central?.numero_beneficio ?? ""}
                    onBlur={(e) => {
                      if (e.target.value !== (central?.numero_beneficio ?? ""))
                        updateCentral.mutate({ numero_beneficio: e.target.value });
                    }}
                    placeholder="Ex.: 1234567890"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Dados do saque */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Dados do saque</CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Banco</Label>
                  <Select value={central?.banco_saque ?? ""} onValueChange={(v) => updateCentral.mutate({ banco_saque: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o banco" />
                    </SelectTrigger>
                    <SelectContent className="z-[100]">
                      {bancosLista.map((b) => (
                        <SelectItem key={b.id} value={b.nome}>{b.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <FieldInput label="Agência" value={central?.agencia_saque ?? ""} onSave={(v) => updateCentral.mutate({ agencia_saque: v })} />
                <div className="md:col-span-2">
                  <FieldInput label="Endereço" value={central?.endereco_saque ?? ""} onSave={(v) => updateCentral.mutate({ endereco_saque: v })} />
                </div>
                <FieldInput label="Data do saque" type="date" value={central?.data_saque ?? ""} onSave={(v) => updateCentral.mutate({ data_saque: v || null })} />
                <FieldInput label="Horário" value={central?.horario_saque ?? ""} onSave={(v) => updateCentral.mutate({ horario_saque: v })} placeholder="08:00" />
                <div className="md:col-span-2">
                  <Label className="text-xs text-muted-foreground">Observação</Label>
                  <Textarea
                    defaultValue={central?.observacao_saque ?? ""}
                    onBlur={(e) => {
                      if (e.target.value !== (central?.observacao_saque ?? ""))
                        updateCentral.mutate({ observacao_saque: e.target.value });
                    }}
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Parcelas */}
            {!hideParcelasBeneficio && (
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Parcelas do benefício</CardTitle>
                <Button size="sm" variant="outline" onClick={handleAddParcela} disabled={parcelas.length >= 5}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {parcelas.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhuma parcela cadastrada.</p>
                )}
                {parcelas.map((p) => (
                  <ParcelaRow
                    key={p.id}
                    p={p}
                    onSave={(patch) => upsertParcela.mutate({ ...patch, numero_parcela: p.numero_parcela })}
                    onDelete={() => deleteParcela.mutate(p.id)}
                  />
                ))}
                <div className="grid grid-cols-3 gap-2 pt-2 text-sm">
                  <SmallStat label="Total previsto" value={brl(totalParcelas)} />
                  <SmallStat label="Já liberado" value={brl(totalLiberado)} />
                  <SmallStat label="Futuro previsto" value={brl(totalFuturo)} />
                </div>
              </CardContent>
            </Card>
            )}


            {/* Cobrança da Amor */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Cobrança da Amor</CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-3">
                <div className="md:col-span-2 grid grid-cols-3 gap-2 text-sm">
                  <SmallStat label="Total previsto" value={brl(baseCalculo)} />
                  <SmallStat label="Já liberado" value={brl(totalLiberado)} />
                  <SmallStat label="Futuro previsto" value={brl(totalFuturo)} />
                </div>
                {totalParcelas === 0 && (
                  <div className="md:col-span-2">
                    <FieldInput
                      label="Valor previsto do benefício (R$)"
                      type="number"
                      value={String(central?.valor_previsto_beneficio ?? "")}
                      onSave={(v) => updateCentral.mutate({ valor_previsto_beneficio: v === "" ? null : Number(v) } as any)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Preencha aqui quando ainda não houver parcelas do benefício cadastradas.
                    </p>
                  </div>
                )}
                <FieldInput
                  label="Percentual de honorários (%)"
                  type="number"
                  value={String(central?.percentual_honorarios ?? "")}
                  onSave={(v) => updateCentral.mutate({ percentual_honorarios: v === "" ? 0 : Number(v) })}
                />
                <FieldInput
                  label="Taxa administrativa (R$)"
                  type="number"
                  value={String(central?.taxa_administrativa ?? "")}
                  onSave={(v) => updateCentral.mutate({ taxa_administrativa: v === "" ? 0 : Number(v) })}
                />
                <SmallStat label="Honorários" value={brl(honorarios)} />
                <SmallStat label="Total Amor" value={brl(totalAmor)} highlight />
                <div className="md:col-span-2">
                  <SmallStat label="Valor líquido estimado da cliente" value={brl(liquidoCliente)} highlight={totalRecebimentos > 0} />
                </div>

              </CardContent>
            </Card>

            {/* Recebimentos da cliente */}
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Parcelas a receber pela cliente</CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const prox = (recebimentos[recebimentos.length - 1]?.numero_parcela ?? 0) + 1;
                    upsertRecebimento.mutate({ numero_parcela: prox, status: "prevista", valor: 0 });
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {recebimentos.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhuma parcela de recebimento cadastrada.</p>
                )}
                {recebimentos.map((r) => (
                  <RecebimentoRow
                    key={r.id}
                    r={r}
                    onSave={(patch) => upsertRecebimento.mutate({ id: r.id, ...patch })}
                    onDelete={() => deleteRecebimento.mutate(r.id)}
                  />
                ))}
                <div className="grid grid-cols-3 gap-2 pt-2 text-sm">
                  <SmallStat label="Total previsto" value={brl(totalRecebimentos)} />
                  <SmallStat label="Já recebido" value={brl(totalRecebido)} />
                  <SmallStat label="Em aberto" value={brl(recebimentosAberto)} />
                </div>
              </CardContent>
            </Card>

            {/* Boletos */}
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Boletos</CardTitle>
                <Button size="sm" variant="outline" onClick={handleAddBoleto}>
                  <Plus className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {boletos.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum boleto cadastrado.</p>
                )}
                {boletos.map((b) => (
                  <BoletoRow
                    key={b.id}
                    b={b}
                    onSave={(patch) => upsertBoleto.mutate({ id: b.id, ...patch })}
                    onDelete={() => deleteBoleto.mutate(b.id)}
                  />
                ))}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 text-sm">
                  <SmallStat label="Total" value={brl(totalBoletos)} />
                  <SmallStat label="Pago" value={brl(boletosPagos)} />
                  <SmallStat label="Em aberto" value={brl(boletosAberto)} />
                  <SmallStat
                    label="Diferença vs Amor"
                    value={brl(diferencaBoletos)}
                    highlight={Math.abs(diferencaBoletos) > 0.01}
                  />
                </div>
                {Math.abs(diferencaBoletos) > 0.01 && totalBoletos > 0 && (
                  <div className="flex items-center gap-2 text-xs text-destructive pt-1">
                    <AlertTriangle className="h-4 w-4" />
                    A soma dos boletos não bate com o Total Amor.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Valores futuros */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Valores futuros (observação)</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  rows={3}
                  defaultValue={central?.observacoes_valores_futuros ?? ""}
                  onBlur={(e) => {
                    if (e.target.value !== (central?.observacoes_valores_futuros ?? ""))
                      updateCentral.mutate({ observacoes_valores_futuros: e.target.value });
                  }}
                  placeholder="13º salário, diferença de cálculo, revisão, retroativo, valores ainda não liberados…"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Estes valores não entram automaticamente no cálculo principal, apenas como observação.
                </p>
              </CardContent>
            </Card>

            {/* Histórico */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="h-4 w-4" /> Histórico de comunicados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-72 overflow-y-auto">
                {historico.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum comunicado gerado ainda.</p>
                )}
                {historico.map((h) => (
                  <details key={h.id} className="border rounded p-2">
                    <summary className="text-xs cursor-pointer">
                      {format(new Date(h.created_at), "dd/MM/yyyy HH:mm")}
                    </summary>
                    <pre className="text-xs whitespace-pre-wrap mt-2 bg-muted p-2 rounded">{h.texto}</pre>
                  </details>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* CALCULADORA LATERAL */}
          <aside className="space-y-3 lg:sticky lg:top-0 lg:self-start">
            <Card className="border-primary/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-primary" /> Calculadora de Apoio
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Total previsto" value={brl(totalParcelas)} />
                <Row label="Já liberado" value={brl(totalLiberado)} />
                <Row label="Futuro previsto" value={brl(totalFuturo)} />
                <Separator className="my-2" />
                <Row label={`Honorários (${percentual}%)`} value={brl(honorarios)} />
                <Row label="Taxa administrativa" value={brl(taxa)} />
                <Row label="Total Amor" value={brl(totalAmor)} strong />
                <Separator className="my-2" />
                <Row label="Líquido cliente" value={brl(liquidoCliente)} strong />
                <Separator className="my-2" />
                <Row label="Total dos boletos" value={brl(totalBoletos)} />
                <Row label="Saldo em aberto" value={brl(boletosAberto)} />
                <Row
                  label="Diferença"
                  value={brl(diferencaBoletos)}
                  strong
                  danger={Math.abs(diferencaBoletos) > 0.01 && totalBoletos > 0}
                />
              </CardContent>
            </Card>

            {alertas.length > 0 && (
              <Card className="border-destructive/40 bg-destructive/5">
                <CardContent className="pt-4 space-y-1 text-xs text-destructive">
                  {alertas.map((a, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      {a}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Button className="w-full" onClick={handleGerarComunicado} disabled={isLoading}>
              <FileText className="h-4 w-4 mr-2" /> Gerar comunicado WhatsApp
            </Button>
          </aside>
        </div>

        {/* Dialog do comunicado gerado */}
        <Dialog open={comunicadoOpen} onOpenChange={setComunicadoOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileCheck2 className="h-5 w-5" /> Comunicado WhatsApp
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Template</Label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger><SelectValue placeholder="Modelo padrão" /></SelectTrigger>
                  <SelectContent className="z-[100]">
                    {templates.length === 0 ? (
                      <div className="p-2 text-xs text-muted-foreground text-center">Nenhum template cadastrado</div>
                    ) : (
                      templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Atendente</Label>
                <Select value={selectedAtendenteId} onValueChange={setSelectedAtendenteId}>
                  <SelectTrigger><SelectValue placeholder="Selecione o atendente" /></SelectTrigger>
                  <SelectContent className="z-[100]">
                    {atendentes.filter((a) => a.ativo).length === 0 ? (
                      <div className="p-2 text-xs text-muted-foreground text-center">Nenhum atendente cadastrado</div>
                    ) : (
                      atendentes.filter((a) => a.ativo).map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.nome}{a.cargo ? ` — ${a.cargo}` : ""}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Textarea value={comunicadoTexto} readOnly className="min-h-[380px] font-mono text-xs whitespace-pre-wrap" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setComunicadoOpen(false)}>Fechar</Button>
              <Button onClick={handleCopyComunicado}>
                <Copy className="h-4 w-4 mr-1" /> Copiar comunicado
              </Button>
            </div>
          </DialogContent>
        </Dialog>
    </>
  );

  if (inline) {
    return <div className="w-full">{body}</div>;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl w-[98vw] max-h-[95vh] overflow-hidden p-0">
        {body}
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Subcomponents ---------- */

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <p className={mono ? "font-mono text-sm" : "text-sm"}>{value}</p>
    </div>
  );
}

function FieldInput({
  label,
  value,
  onSave,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        defaultValue={value}
        type={type}
        placeholder={placeholder}
        onBlur={(e) => {
          if (e.target.value !== value) onSave(e.target.value);
        }}
      />
    </div>
  );
}

function SmallStat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded border p-2 ${highlight ? "border-primary/50 bg-primary/5" : ""}`}>
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
  danger,
}: {
  label: string;
  value: string;
  strong?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-muted-foreground">{label}</span>
      <span className={`${strong ? "font-semibold" : ""} ${danger ? "text-destructive" : ""}`}>
        {value}
      </span>
    </div>
  );
}

export function ParcelaRow({
  p,
  onSave,
  onDelete,
}: {
  p: ParcelaBeneficio;
  onSave: (patch: Partial<ParcelaBeneficio>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="grid grid-cols-12 gap-2 items-end border rounded p-2">
      <div className="col-span-1">
        <Label className="text-[10px] text-muted-foreground">Nº</Label>
        <div className="font-semibold text-sm h-9 flex items-center">{p.numero_parcela}</div>
      </div>
      <div className="col-span-3">
        <Label className="text-[10px] text-muted-foreground">Valor</Label>
        <Input
          type="number"
          defaultValue={p.valor ?? ""}
          onBlur={(e) => {
            const v = e.target.value === "" ? null : Number(e.target.value);
            if (v !== p.valor) onSave({ valor: v });
          }}
        />
      </div>
      <div className="col-span-3">
        <Label className="text-[10px] text-muted-foreground">Data</Label>
        <Input
          type="date"
          defaultValue={p.data_parcela ?? ""}
          onBlur={(e) => {
            const v = e.target.value || null;
            if (v !== p.data_parcela) onSave({ data_parcela: v });
          }}
        />
      </div>
      <div className="col-span-4">
        <Label className="text-[10px] text-muted-foreground">Status</Label>
        <Select value={p.status} onValueChange={(v: any) => onSave({ status: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[100]">
            {PARCELA_STATUS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-1">
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

function BoletoRow({
  b,
  onSave,
  onDelete,
}: {
  b: BoletoAmor;
  onSave: (patch: Partial<BoletoAmor>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="grid grid-cols-12 gap-2 items-end border rounded p-2">
      <div className="col-span-3">
        <Label className="text-[10px] text-muted-foreground">Nº boleto</Label>
        <Input
          defaultValue={b.numero_boleto ?? ""}
          onBlur={(e) => {
            if (e.target.value !== (b.numero_boleto ?? "")) onSave({ numero_boleto: e.target.value });
          }}
        />
      </div>
      <div className="col-span-2">
        <Label className="text-[10px] text-muted-foreground">Valor</Label>
        <Input
          type="number"
          defaultValue={b.valor ?? ""}
          onBlur={(e) => {
            const v = e.target.value === "" ? null : Number(e.target.value);
            if (v !== b.valor) onSave({ valor: v });
          }}
        />
      </div>
      <div className="col-span-3">
        <Label className="text-[10px] text-muted-foreground">Vencimento</Label>
        <Input
          type="date"
          defaultValue={b.vencimento ?? ""}
          onBlur={(e) => {
            const v = e.target.value || null;
            if (v !== b.vencimento) onSave({ vencimento: v });
          }}
        />
      </div>
      <div className="col-span-3">
        <Label className="text-[10px] text-muted-foreground">Status</Label>
        <Select value={b.status} onValueChange={(v: any) => onSave({ status: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[100]">
            {BOLETO_STATUS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-1">
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

function RecebimentoRow({
  r,
  onSave,
  onDelete,
}: {
  r: ParcelaRecebimento;
  onSave: (patch: Partial<ParcelaRecebimento>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="grid grid-cols-12 gap-2 items-end border rounded p-2">
      <div className="col-span-1">
        <Label className="text-[10px] text-muted-foreground">Nº</Label>
        <div className="font-semibold text-sm h-9 flex items-center">{r.numero_parcela}</div>
      </div>
      <div className="col-span-3">
        <Label className="text-[10px] text-muted-foreground">Valor</Label>
        <Input
          type="number"
          defaultValue={r.valor ?? ""}
          onBlur={(e) => {
            const v = e.target.value === "" ? null : Number(e.target.value);
            if (v !== r.valor) onSave({ valor: v });
          }}
        />
      </div>
      <div className="col-span-3">
        <Label className="text-[10px] text-muted-foreground">Data prevista</Label>
        <Input
          type="date"
          defaultValue={r.data_prevista ?? ""}
          onBlur={(e) => {
            const v = e.target.value || null;
            if (v !== r.data_prevista) onSave({ data_prevista: v });
          }}
        />
      </div>
      <div className="col-span-4">
        <Label className="text-[10px] text-muted-foreground">Status</Label>
        <Select value={r.status} onValueChange={(v: any) => onSave({ status: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[100]">
            {RECEBIMENTO_STATUS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-1">
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
