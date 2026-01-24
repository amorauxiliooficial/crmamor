import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Loader2, 
  Brain, 
  CheckCircle2, 
  XCircle, 
  Scale, 
  RotateCcw,
  FileText,
  AlertCircle,
  Sparkles,
  ArrowRight,
  User,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DocumentUploadField } from "./DocumentUploadField";
import type { ResultadoAtendente, ProximaAcaoAnalise } from "@/types/preAnalise";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface NovaPreAnaliseFormProps {
  onSuccess?: () => void;
}

const PROXIMA_ACAO_LABELS: Record<string, string> = {
  PROTOCOLO_INSS: "Seguir para protocolo INSS",
  ENCAMINHAR_JURIDICO: "Encaminhar para avaliação jurídica",
  SOLICITAR_DOCS: "Solicitar documentos faltantes",
};

const CATEGORIA_OPTIONS = [
  { value: "empregada_clt", label: "Empregada CLT" },
  { value: "contribuinte_individual", label: "Contribuinte Individual" },
  { value: "mei", label: "MEI" },
  { value: "facultativa", label: "Facultativa" },
  { value: "desempregada", label: "Desempregada" },
  { value: "segurada_especial", label: "Segurada Especial (Rural)" },
];

const EVENTO_OPTIONS = [
  { value: "parto", label: "Parto" },
  { value: "adocao", label: "Adoção" },
  { value: "guarda_judicial", label: "Guarda Judicial" },
];

export function NovaPreAnaliseForm({ onSuccess }: NovaPreAnaliseFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showDadosAvancados, setShowDadosAvancados] = useState(false);
  
  const [sessionId] = useState(() => crypto.randomUUID());
  
  // Dados da segurada
  const [dadosSegurada, setDadosSegurada] = useState({
    nome: "",
    cpf: "",
    categoria: "",
    gestante: false,
    evento: "parto",
    data_evento: "",
    ultimo_vinculo_data_fim: "",
    total_contribuicoes: 0,
    teve_120_contribuicoes: false,
    recebeu_seguro_desemprego: false,
    mei_ativo: false,
    competencias_em_atraso: false,
    observacoes_atendente: "",
  });

  const [documentos, setDocumentos] = useState<{
    cnis: string | null;
    ctps: string | null;
    certidao: string | null;
    comprov_endereco: string | null;
  }>({
    cnis: null,
    ctps: null,
    certidao: null,
    comprov_endereco: null,
  });
  
  const [resultado, setResultado] = useState<{
    resultado_atendente: ResultadoAtendente;
    motivo_curto: string;
    proxima_acao: ProximaAcaoAnalise;
    resposta_completa?: unknown;
  } | null>(null);

  // Validações: CNIS ou CTPS + Certidão obrigatórios + dados mínimos
  const hasContribuicaoDoc = documentos.cnis || documentos.ctps;
  const hasCertidao = !!documentos.certidao;
  const hasDadosMinimos = dadosSegurada.categoria !== "";
  const isReadyToAnalyze = hasContribuicaoDoc && hasCertidao && hasDadosMinimos;
  
  const docsObrigatoriosCount = [hasContribuicaoDoc, hasCertidao].filter(Boolean).length;

  const updateDadosSegurada = (field: string, value: unknown) => {
    setDadosSegurada(prev => ({ ...prev, [field]: value }));
  };

  const handleGerarAnalise = async () => {
    if (!isReadyToAnalyze) {
      const missing: string[] = [];
      if (!hasContribuicaoDoc) missing.push("CNIS ou CTPS");
      if (!hasCertidao) missing.push("Certidão");
      if (!hasDadosMinimos) missing.push("Categoria previdenciária");
      
      setResultado({
        resultado_atendente: "REPROVADO",
        motivo_curto: `Falta: ${missing.join(", ")}`,
        proxima_acao: "SOLICITAR_DOCS",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("pre-analise-elegibilidade", {
        body: {
          mae_id: null,
          dados_entrada: {
            cpf: dadosSegurada.cpf || "000.000.000-00",
            nome: dadosSegurada.nome || "Análise Avulsa",
            categoria: dadosSegurada.categoria,
            gestante: dadosSegurada.gestante,
            evento: dadosSegurada.evento,
            data_evento: dadosSegurada.data_evento || new Date().toISOString().split("T")[0],
            ultimo_vinculo_data_fim: dadosSegurada.ultimo_vinculo_data_fim || undefined,
            total_contribuicoes: dadosSegurada.total_contribuicoes,
            teve_120_contribuicoes: dadosSegurada.teve_120_contribuicoes,
            recebeu_seguro_desemprego: dadosSegurada.recebeu_seguro_desemprego,
            mei_ativo: dadosSegurada.mei_ativo,
            competencias_em_atraso: dadosSegurada.competencias_em_atraso,
            documentos: {
              cnis: !!documentos.cnis,
              ctps: !!documentos.ctps,
              certidao: !!documentos.certidao,
              comprov_endereco: !!documentos.comprov_endereco,
              outros: [],
              cnis_url: documentos.cnis || undefined,
              ctps_url: documentos.ctps || undefined,
              certidao_url: documentos.certidao || undefined,
              comprov_endereco_url: documentos.comprov_endereco || undefined,
            },
            observacoes_atendente: dadosSegurada.observacoes_atendente,
          },
          motivo_reanalise: "primeiro_registro",
          session_id: sessionId,
        },
      });

      if (error) throw error;

      if (data?.analise) {
        setResultado({
          resultado_atendente: data.analise.resultado_atendente || "JURIDICO",
          motivo_curto: data.analise.motivo_curto || "Análise realizada",
          proxima_acao: data.analise.proxima_acao || "ENCAMINHAR_JURIDICO",
          resposta_completa: data.analise.resposta_estruturada,
        });
        onSuccess?.();
      }
    } catch (error) {
      console.error("Erro na análise:", error);
      toast({
        title: "Erro na análise",
        description: "Não foi possível processar. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNovaAnalise = () => {
    setDocumentos({
      cnis: null,
      ctps: null,
      certidao: null,
      comprov_endereco: null,
    });
    setDadosSegurada({
      nome: "",
      cpf: "",
      categoria: "",
      gestante: false,
      evento: "parto",
      data_evento: "",
      ultimo_vinculo_data_fim: "",
      total_contribuicoes: 0,
      teve_120_contribuicoes: false,
      recebeu_seguro_desemprego: false,
      mei_ativo: false,
      competencias_em_atraso: false,
      observacoes_atendente: "",
    });
    setResultado(null);
    setShowDadosAvancados(false);
  };

  // ========== RESULTADO ==========
  if (resultado) {
    const resultConfig = {
      APROVADO: {
        icon: <CheckCircle2 className="h-16 w-16" />,
        label: "Elegível",
        bgClass: "bg-gradient-to-br from-primary/20 to-primary/5",
        borderClass: "border-primary/30",
        iconClass: "text-primary",
      },
      REPROVADO: {
        icon: <XCircle className="h-16 w-16" />,
        label: "Não Elegível",
        bgClass: "bg-gradient-to-br from-destructive/20 to-destructive/5",
        borderClass: "border-destructive/30",
        iconClass: "text-destructive",
      },
      JURIDICO: {
        icon: <Scale className="h-16 w-16" />,
        label: "Avaliação Jurídica",
        bgClass: "bg-gradient-to-br from-chart-1/20 to-chart-1/5",
        borderClass: "border-chart-1/30",
        iconClass: "text-chart-1",
      },
    }[resultado.resultado_atendente] || {
      icon: <Brain className="h-16 w-16" />,
      label: "Indefinido",
      bgClass: "bg-muted",
      borderClass: "border-muted",
      iconClass: "text-muted-foreground",
    };

    return (
      <Card className={`border-2 ${resultConfig.borderClass} ${resultConfig.bgClass} overflow-hidden`}>
        <CardContent className="pt-10 pb-8">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className={`${resultConfig.iconClass} animate-in zoom-in-50 duration-300`}>
              {resultConfig.icon}
            </div>
            
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight">
                {resultConfig.label}
              </h2>
              <p className="text-muted-foreground text-lg max-w-sm">
                {resultado.motivo_curto}
              </p>
            </div>

            <div className="w-full max-w-sm space-y-3">
              <Separator />
              
              <div className="bg-background/80 backdrop-blur rounded-xl p-5 border">
                <div className="flex items-center gap-2 text-sm font-medium mb-2">
                  <ArrowRight className="h-4 w-4 text-primary" />
                  Próximo passo
                </div>
                <p className="text-muted-foreground">
                  {PROXIMA_ACAO_LABELS[resultado.proxima_acao] || resultado.proxima_acao}
                </p>
              </div>
            </div>

            <Button 
              size="lg" 
              variant="outline" 
              className="gap-2 mt-2"
              onClick={handleNovaAnalise}
            >
              <RotateCcw className="h-4 w-4" />
              Nova Análise
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ========== FORMULÁRIO ==========
  return (
    <div className="space-y-6">
      {/* Hero Card */}
      <Card className="border-0 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
        <CardContent className="pt-8 pb-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Análise de Elegibilidade</h2>
              <p className="text-muted-foreground text-sm">
                Preencha os dados e anexe os documentos para verificar o direito ao salário-maternidade
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dados da Segurada */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <span className="font-medium">Dados da Segurada</span>
            <Badge variant={hasDadosMinimos ? "default" : "secondary"} className="ml-auto">
              {hasDadosMinimos ? "Preenchido" : "Obrigatório"}
            </Badge>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Nome (opcional) */}
            <div className="space-y-2">
              <Label htmlFor="nome" className="text-sm">
                Nome <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="nome"
                placeholder="Nome da segurada"
                value={dadosSegurada.nome}
                onChange={(e) => updateDadosSegurada("nome", e.target.value)}
              />
            </div>

            {/* CPF (opcional) */}
            <div className="space-y-2">
              <Label htmlFor="cpf" className="text-sm">
                CPF <span className="text-muted-foreground">(opcional)</span>
              </Label>
              <Input
                id="cpf"
                placeholder="000.000.000-00"
                value={dadosSegurada.cpf}
                onChange={(e) => updateDadosSegurada("cpf", e.target.value)}
              />
            </div>

            {/* Categoria - OBRIGATÓRIO */}
            <div className="space-y-2">
              <Label htmlFor="categoria" className="text-sm">
                Categoria Previdenciária <span className="text-destructive">*</span>
              </Label>
              <Select
                value={dadosSegurada.categoria}
                onValueChange={(value) => updateDadosSegurada("categoria", value)}
              >
                <SelectTrigger id="categoria">
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIA_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de Evento */}
            <div className="space-y-2">
              <Label htmlFor="evento" className="text-sm">
                Tipo de Evento
              </Label>
              <Select
                value={dadosSegurada.evento}
                onValueChange={(value) => updateDadosSegurada("evento", value)}
              >
                <SelectTrigger id="evento">
                  <SelectValue placeholder="Selecione o evento" />
                </SelectTrigger>
                <SelectContent>
                  {EVENTO_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data do Evento */}
            <div className="space-y-2">
              <Label htmlFor="data_evento" className="text-sm">
                Data do Evento
              </Label>
              <Input
                id="data_evento"
                type="date"
                value={dadosSegurada.data_evento}
                onChange={(e) => updateDadosSegurada("data_evento", e.target.value)}
              />
            </div>

            {/* Total de Contribuições */}
            <div className="space-y-2">
              <Label htmlFor="contribuicoes" className="text-sm">
                Total de Contribuições
              </Label>
              <Input
                id="contribuicoes"
                type="number"
                min="0"
                placeholder="0"
                value={dadosSegurada.total_contribuicoes || ""}
                onChange={(e) => updateDadosSegurada("total_contribuicoes", parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Dados avançados (colapsável) */}
          <Collapsible open={showDadosAvancados} onOpenChange={setShowDadosAvancados}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full gap-2">
                {showDadosAvancados ? (
                  <>
                    <ChevronUp className="h-4 w-4" />
                    Ocultar dados avançados
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4" />
                    Mostrar dados avançados
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              {/* Data fim último vínculo (para desempregadas) */}
              {(dadosSegurada.categoria === "desempregada" || showDadosAvancados) && (
                <div className="space-y-2">
                  <Label htmlFor="ultimo_vinculo" className="text-sm">
                    Data Fim do Último Vínculo
                  </Label>
                  <Input
                    id="ultimo_vinculo"
                    type="date"
                    value={dadosSegurada.ultimo_vinculo_data_fim}
                    onChange={(e) => updateDadosSegurada("ultimo_vinculo_data_fim", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Importante para cálculo do período de graça
                  </p>
                </div>
              )}

              {/* Checkboxes */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="gestante"
                    checked={dadosSegurada.gestante}
                    onCheckedChange={(checked) => updateDadosSegurada("gestante", checked)}
                  />
                  <Label htmlFor="gestante" className="text-sm font-normal">
                    É gestante (ainda não teve o parto)
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="teve_120"
                    checked={dadosSegurada.teve_120_contribuicoes}
                    onCheckedChange={(checked) => updateDadosSegurada("teve_120_contribuicoes", checked)}
                  />
                  <Label htmlFor="teve_120" className="text-sm font-normal">
                    Teve +120 contribuições (+12 meses de graça)
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="seguro_desemprego"
                    checked={dadosSegurada.recebeu_seguro_desemprego}
                    onCheckedChange={(checked) => updateDadosSegurada("recebeu_seguro_desemprego", checked)}
                  />
                  <Label htmlFor="seguro_desemprego" className="text-sm font-normal">
                    Recebeu seguro-desemprego (+12 meses)
                  </Label>
                </div>

                {dadosSegurada.categoria === "mei" && (
                  <>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="mei_ativo"
                        checked={dadosSegurada.mei_ativo}
                        onCheckedChange={(checked) => updateDadosSegurada("mei_ativo", checked)}
                      />
                      <Label htmlFor="mei_ativo" className="text-sm font-normal">
                        MEI ativo
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="atraso"
                        checked={dadosSegurada.competencias_em_atraso}
                        onCheckedChange={(checked) => updateDadosSegurada("competencias_em_atraso", checked)}
                      />
                      <Label htmlFor="atraso" className="text-sm font-normal text-destructive">
                        Competências em atraso
                      </Label>
                    </div>
                  </>
                )}
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <Label htmlFor="observacoes" className="text-sm">
                  Observações do Atendente
                </Label>
                <Textarea
                  id="observacoes"
                  placeholder="Informações adicionais relevantes para a análise..."
                  value={dadosSegurada.observacoes_atendente}
                  onChange={(e) => updateDadosSegurada("observacoes_atendente", e.target.value)}
                  rows={3}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>

      {/* Documentos Obrigatórios */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <span className="font-medium">Documentos Obrigatórios</span>
            </div>
            <Badge 
              variant={docsObrigatoriosCount === 2 ? "default" : "secondary"}
              className="gap-1"
            >
              {docsObrigatoriosCount}/2
            </Badge>
          </div>

          <div className="space-y-3">
            {/* Grupo: Histórico de Contribuições */}
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Histórico de Contribuições
                </span>
                <Badge variant="outline" className="text-xs">
                  CNIS ou CTPS
                </Badge>
                {hasContribuicaoDoc && (
                  <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />
                )}
              </div>
              
              <div className="grid gap-2">
                <DocumentUploadField
                  label="CNIS - Cadastro Nacional de Informações Sociais"
                  docType="cnis"
                  maeId={sessionId}
                  uploadedUrl={documentos.cnis}
                  onUpload={(url) => setDocumentos(prev => ({ ...prev, cnis: url }))}
                />
                
                <div className="flex items-center gap-2 py-1">
                  <Separator className="flex-1" />
                  <span className="text-xs text-muted-foreground px-2">ou</span>
                  <Separator className="flex-1" />
                </div>

                <DocumentUploadField
                  label="CTPS - Carteira de Trabalho"
                  docType="ctps"
                  maeId={sessionId}
                  uploadedUrl={documentos.ctps}
                  onUpload={(url) => setDocumentos(prev => ({ ...prev, ctps: url }))}
                />
              </div>
            </div>

            {/* Certidão */}
            <div className="rounded-xl border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Comprovação do Evento
                </span>
                <Badge variant="outline" className="text-xs">
                  Obrigatório
                </Badge>
                {hasCertidao && (
                  <CheckCircle2 className="h-4 w-4 text-primary ml-auto" />
                )}
              </div>

              <DocumentUploadField
                label="Certidão de Nascimento ou Termo de Adoção/Guarda"
                docType="certidao"
                maeId={sessionId}
                uploadedUrl={documentos.certidao}
                onUpload={(url) => setDocumentos(prev => ({ ...prev, certidao: url }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Documentos Opcionais */}
      <Card className="border-dashed">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium text-muted-foreground">Opcional</span>
          </div>

          <DocumentUploadField
            label="Comprovante de Endereço (apenas cadastral)"
            docType="comprov_endereco"
            maeId={sessionId}
            uploadedUrl={documentos.comprov_endereco}
            onUpload={(url) => setDocumentos(prev => ({ ...prev, comprov_endereco: url }))}
          />
          
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <AlertCircle className="h-3 w-3" />
            Não influencia na análise de elegibilidade
          </p>
        </CardContent>
      </Card>

      {/* Botão de Análise */}
      <div className="space-y-3">
        {!isReadyToAnalyze && (
          <div className="bg-muted/50 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-sm text-muted-foreground">
              {!hasDadosMinimos && !hasContribuicaoDoc && !hasCertidao 
                ? "Selecione a categoria, anexe CNIS ou CTPS e a Certidão"
                : !hasDadosMinimos 
                  ? "Selecione a categoria previdenciária"
                  : !hasContribuicaoDoc && !hasCertidao 
                    ? "Anexe CNIS ou CTPS e a Certidão para continuar"
                    : !hasContribuicaoDoc 
                      ? "Anexe o CNIS ou CTPS para continuar"
                      : "Anexe a Certidão de Nascimento/Adoção para continuar"
              }
            </p>
          </div>
        )}

        <Button
          size="lg"
          className="w-full h-14 text-lg gap-2 shadow-lg"
          onClick={handleGerarAnalise}
          disabled={isLoading || !isReadyToAnalyze}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Analisando...
            </>
          ) : (
            <>
              <Brain className="h-5 w-5" />
              Verificar Elegibilidade
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
