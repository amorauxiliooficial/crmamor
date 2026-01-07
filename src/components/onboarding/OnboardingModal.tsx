import { useState, useEffect, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { 
  ClipboardList, 
  BookOpen, 
  FileText, 
  Play,
  FileCheck,
  PenLine,
  Download,
  Clock,
  CheckCircle2,
  Trophy,
  ArrowRight,
  ExternalLink,
  KeyRound,
  X,
  Eye,
  EyeOff,
  Maximize2
} from "lucide-react";
import { OnboardingItem, OnboardingProgresso } from "@/types/onboarding";
import confetti from "canvas-confetti";

interface OnboardingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OnboardingModal({ open, onOpenChange }: OnboardingModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<OnboardingItem[]>([]);
  const [progresso, setProgresso] = useState<OnboardingProgresso[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasShownConfetti, setHasShownConfetti] = useState(false);
  const [hasNotifiedComplete, setHasNotifiedComplete] = useState(false);
  const prevCompleteRef = useRef(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<"pdf" | "video" | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>("");
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const fetchData = async () => {
    if (!user) return;

    setLoading(true);

    const { data: itemsData, error: itemsError } = await supabase
      .from("onboarding_items")
      .select("*")
      .eq("ativo", true)
      .order("ordem", { ascending: true });

    if (itemsError) {
      console.error("Error fetching onboarding items:", itemsError);
    } else {
      setItems(itemsData as OnboardingItem[]);
    }

    const { data: progressoData, error: progressoError } = await supabase
      .from("onboarding_progresso")
      .select("*")
      .eq("user_id", user.id);

    if (progressoError) {
      console.error("Error fetching progress:", progressoError);
    } else {
      setProgresso(progressoData as OnboardingProgresso[]);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open, user]);

  const handleToggle = async (itemId: string, isCompleted: boolean) => {
    if (!user) return;

    const existingProgress = progresso.find((p) => p.item_id === itemId);

    if (existingProgress) {
      const { error } = await supabase
        .from("onboarding_progresso")
        .update({
          concluido: isCompleted,
          concluido_em: isCompleted ? new Date().toISOString() : null,
        })
        .eq("id", existingProgress.id);

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro ao atualizar",
          description: "Não foi possível atualizar o progresso.",
        });
        return;
      }
    } else {
      const { error } = await supabase.from("onboarding_progresso").insert({
        user_id: user.id,
        item_id: itemId,
        concluido: isCompleted,
        concluido_em: isCompleted ? new Date().toISOString() : null,
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro ao salvar",
          description: "Não foi possível salvar o progresso.",
        });
        return;
      }
    }

    await fetchData();
    window.dispatchEvent(new CustomEvent("onboarding-progress-updated"));
    if (isCompleted) {
      toast({
        title: "Item concluído!",
        description: "Seu progresso foi salvo.",
      });
    }
  };

  const isItemCompleted = (itemId: string) => {
    return progresso.some((p) => p.item_id === itemId && p.concluido);
  };

  const completedCount = useMemo(() => {
    return items.filter((item) => isItemCompleted(item.id)).length;
  }, [items, progresso]);

  const remainingCount = items.length - completedCount;
  const progressPercentage = items.length > 0 ? (completedCount / items.length) * 100 : 0;
  const isComplete = progressPercentage === 100 && items.length > 0;

  // Send email notification when completing 100%
  const sendCompletionEmail = async () => {
    if (!user) return;
    
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", user.id)
        .single();

      const response = await supabase.functions.invoke("send-onboarding-complete-email", {
        body: {
          user_id: user.id,
          user_name: profile?.full_name || user.email?.split("@")[0] || "Colaborador",
          user_email: profile?.email || user.email,
        },
      });

      if (response.error) {
        console.error("Error sending completion email:", response.error);
      } else {
        console.log("Completion email sent successfully");
      }
    } catch (error) {
      console.error("Error calling email function:", error);
    }
  };

  // Trigger confetti and email when completing 100%
  useEffect(() => {
    if (isComplete && !hasShownConfetti && prevCompleteRef.current === false) {
      setHasShownConfetti(true);
      
      // Send email notification
      if (!hasNotifiedComplete) {
        setHasNotifiedComplete(true);
        sendCompletionEmail();
      }
      
      // Fire confetti from both sides
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) {
          return clearInterval(interval);
        }
        const particleCount = 50 * (timeLeft / duration);
        
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);
    }
    prevCompleteRef.current = isComplete;
  }, [isComplete, hasShownConfetti, hasNotifiedComplete]);

  const estimatedMinutes = useMemo(() => {
    return items
      .filter((item) => !isItemCompleted(item.id))
      .reduce((total, item) => total + (item.tempo_estimado || 5), 0);
  }, [items, progresso]);

  const formatEstimatedTime = (minutes: number) => {
    if (minutes === 0) return "Concluído!";
    if (minutes < 60) return `~${minutes} min restantes`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `~${hours}h ${mins > 0 ? `${mins}min` : ""} restantes`;
  };

  const treinamentos = items.filter((i) => i.categoria === "treinamento");
  const documentacao = items.filter((i) => i.categoria === "documentacao");
  const geral = items.filter((i) => i.categoria === "geral");

  const getTypeIcon = (tipo: string) => {
    switch (tipo) {
      case "video":
        return <Play className="h-4 w-4 text-red-500" />;
      case "documento":
        return <FileText className="h-4 w-4 text-blue-500" />;
      case "assinatura":
        return <PenLine className="h-4 w-4 text-purple-500" />;
      case "acesso_sistema":
        return <KeyRound className="h-4 w-4 text-green-500" />;
      default:
        return <FileCheck className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getCategoryIcon = (categoria: string) => {
    switch (categoria) {
      case "treinamento":
        return <BookOpen className="h-4 w-4" />;
      case "documentacao":
        return <FileText className="h-4 w-4" />;
      default:
        return <ClipboardList className="h-4 w-4" />;
    }
  };

  const togglePasswordVisibility = (itemId: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const toggleItemExpanded = (itemId: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const renderItemActions = (item: OnboardingItem) => {
    const actions = [];

    if (item.url_video) {
      actions.push(
        <Button
          key="video"
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            window.open(item.url_video, "_blank");
          }}
          className="h-7 text-xs gap-1"
        >
          <Play className="h-3 w-3" />
          Assistir
        </Button>
      );
    }

    if (item.arquivo_url) {
      actions.push(
        <Button
          key="arquivo"
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            window.open(item.arquivo_url, "_blank");
          }}
          className="h-7 text-xs gap-1"
        >
          <Download className="h-3 w-3" />
          Baixar
        </Button>
      );
    }

    return actions.length > 0 ? (
      <div className="flex items-center gap-1 mt-1">{actions}</div>
    ) : null;
  };

  const renderItems = (categoryItems: OnboardingItem[], title: string) => {
    if (categoryItems.length === 0) return null;

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {getCategoryIcon(categoryItems[0]?.categoria)}
          <span>{title}</span>
        </div>
        <div className="space-y-2 pl-4">
          {categoryItems.map((item) => {
            const completed = isItemCompleted(item.id);
            const isExpanded = expandedItems[item.id];
            const hasDetails = item.descricao || item.url_video || item.arquivo_url || item.url_sistema ||
              (item.tipo === "acesso_sistema" && item.login_sistema);
            
            return (
              <div
                key={item.id}
                className={`rounded-md border transition-colors ${
                  completed ? "bg-primary/5 border-primary/20" : "border-border"
                }`}
              >
                {/* Header - always visible */}
                <div 
                  className={`flex items-start gap-3 p-3 ${hasDetails ? "cursor-pointer hover:bg-muted/50" : ""}`}
                  onClick={() => hasDetails && toggleItemExpanded(item.id)}
                >
                  <Checkbox
                    id={item.id}
                    checked={completed}
                    onCheckedChange={(checked) => handleToggle(item.id, !!checked)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <label
                        className={`flex items-center gap-2 text-sm ${
                          completed ? "line-through text-muted-foreground" : ""
                        } ${hasDetails ? "cursor-pointer" : ""}`}
                      >
                        {getTypeIcon(item.tipo)}
                        <span className="font-medium">{item.titulo}</span>
                        {item.tempo_estimado && (
                          <span className="text-xs text-muted-foreground">({item.tempo_estimado} min)</span>
                        )}
                        {item.requer_assinatura && (
                          <Badge variant="outline" className="text-xs">
                            Requer assinatura
                          </Badge>
                        )}
                      </label>
                      {hasDetails && (
                        <ArrowRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Expandable content */}
                {isExpanded && hasDetails && (
                  <div className="px-3 pb-3 pt-0 ml-9 space-y-3 border-t">
                    {item.descricao && (
                      <p className="text-xs text-muted-foreground pt-3">{item.descricao}</p>
                    )}
                    
                    {/* Links section */}
                    {(item.url_video || item.arquivo_url || (item.tipo !== "acesso_sistema" && item.url_sistema)) && (
                      <div className="p-2 sm:p-3 bg-muted/50 rounded-lg border max-w-full space-y-2">
                        {item.tipo === "video" && (
                          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                            <Play className="h-3 w-3 text-red-500 flex-shrink-0" />
                            Acesso ao Vídeo
                          </p>
                        )}
                        {(item.tipo === "documento" || item.tipo === "assinatura") && (
                          <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                            <FileText className="h-3 w-3 text-blue-500 flex-shrink-0" />
                            Acesso ao Documento
                          </p>
                        )}
                        {item.url_video && (
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-xs text-muted-foreground w-12 flex-shrink-0">Link:</span>
                            <a
                              href={item.url_video}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs text-primary hover:underline flex items-center gap-1 break-all flex-1 min-w-0"
                            >
                              <ExternalLink className="h-3 w-3 flex-shrink-0" />
                              Assistir Vídeo
                            </a>
                          </div>
                        )}
                        {item.tipo !== "acesso_sistema" && item.url_sistema && (
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-xs text-muted-foreground w-12 flex-shrink-0">Link:</span>
                            <a
                              href={item.url_sistema}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs text-primary hover:underline flex items-center gap-1 break-all flex-1 min-w-0"
                            >
                              <ExternalLink className="h-3 w-3 flex-shrink-0" />
                              Acessar Documento
                            </a>
                          </div>
                        )}
                        {item.arquivo_url && (
                          <div className="flex items-start gap-2 min-w-0">
                            <span className="text-xs text-muted-foreground w-12 flex-shrink-0">PDF:</span>
                            <a
                              href={item.arquivo_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs text-primary hover:underline flex items-center gap-1 break-all flex-1 min-w-0"
                            >
                              <ExternalLink className="h-3 w-3 flex-shrink-0" />
                              Ver PDF
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Credenciais do sistema */}
                    {item.tipo === "acesso_sistema" && (item.login_sistema || item.url_sistema) && (
                      <div className="p-2 sm:p-3 bg-muted/50 rounded-lg border max-w-full">
                        <p className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                          <KeyRound className="h-3 w-3 flex-shrink-0" />
                          Suas Credenciais
                        </p>
                        <div className="space-y-2 min-w-0">
                          {item.url_sistema && (
                            <div className="flex items-start gap-2 min-w-0">
                              <span className="text-xs text-muted-foreground w-12 flex-shrink-0">Link:</span>
                              <a
                                href={item.url_sistema}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-xs text-primary hover:underline flex items-center gap-1 break-all flex-1 min-w-0"
                              >
                                <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                Acessar Sistema
                              </a>
                            </div>
                          )}
                          {item.login_sistema && (
                            <div className="flex items-start gap-2 min-w-0">
                              <span className="text-xs text-muted-foreground w-12 flex-shrink-0">Login:</span>
                              <code className="text-xs bg-background px-2 py-1 rounded border font-mono break-all flex-1 min-w-0 overflow-x-auto">
                                {item.login_sistema}
                              </code>
                            </div>
                          )}
                          {item.senha_sistema && (
                            <div className="flex items-start gap-2 min-w-0 flex-wrap">
                              <span className="text-xs text-muted-foreground w-12 flex-shrink-0">Senha:</span>
                              <code className="text-xs bg-background px-2 py-1 rounded border font-mono break-all flex-1 min-w-0 overflow-x-auto">
                                {visiblePasswords[item.id] ? item.senha_sistema : "••••••••"}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  togglePasswordVisibility(item.id);
                                }}
                                className="h-6 px-2 text-xs gap-1 flex-shrink-0"
                              >
                                {visiblePasswords[item.id] ? (
                                  <EyeOff className="h-3 w-3" />
                                ) : (
                                  <Eye className="h-3 w-3" />
                                )}
                                {visiblePasswords[item.id] ? "Ocultar" : "Ver"}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(96vw,56rem)] max-w-none max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-3">
            {isComplete ? (
              <Trophy className="h-8 w-8 text-yellow-500" />
            ) : (
              <ClipboardList className="h-8 w-8 text-primary" />
            )}
            <div>
              <DialogTitle className="text-xl">
                {isComplete ? "🎉 Onboarding Concluído!" : "Bem-vindo(a) ao Sistema!"}
              </DialogTitle>
              <DialogDescription>
                {isComplete
                  ? "Parabéns! Você completou todo o onboarding."
                  : "Complete os itens abaixo para começar a usar o sistema."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Progress Section */}
        <div className="flex-shrink-0 space-y-3 py-4 border-b">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="font-medium">{completedCount}</span>
                <span className="text-muted-foreground">de {items.length} itens</span>
              </div>
              <Badge variant={isComplete ? "default" : "secondary"} className="font-mono">
                {Math.round(progressPercentage)}%
              </Badge>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-xs">{formatEstimatedTime(estimatedMinutes)}</span>
            </div>
          </div>
          <Progress value={progressPercentage} className="h-3" />
        </div>

        {/* Items List with visible scrollbar */}
        <div className="flex-1 min-h-0 py-4 overflow-y-auto overflow-x-hidden scrollbar-always-visible pr-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="space-y-6 pr-2">
              {renderItems(treinamentos, "Treinamentos")}
              {renderItems(documentacao, "Documentação")}
              {renderItems(geral, "Geral")}
              {items.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum item de onboarding disponível.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 pt-4 border-t">
          <Button 
            onClick={() => onOpenChange(false)} 
            className="w-full gap-2"
            variant={isComplete ? "default" : "outline"}
          >
            {isComplete ? (
              <>
                Começar a usar o sistema
                <ArrowRight className="h-4 w-4" />
              </>
            ) : (
              "Continuar depois"
            )}
          </Button>
          {!isComplete && (
            <p className="text-xs text-center text-muted-foreground mt-2">
              Você pode acessar o onboarding a qualquer momento pelo botão no topo da página
            </p>
          )}
        </div>
      </DialogContent>

      {/* Preview Modal */}
      <Dialog open={!!previewUrl} onOpenChange={(open) => !open && setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0" aria-describedby={undefined}>
          <div className="p-4 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{previewTitle}</h2>
              <div className="flex items-center gap-2">
                {previewUrl && (
                  <>
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                      Abrir em nova aba
                    </a>
                    {previewType === "pdf" && (
                      <a
                        href={previewUrl}
                        download
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Baixar
                      </a>
                    )}
                  </>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPreviewUrl(null)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex-1 min-h-0 bg-muted/30">
            {previewType === "pdf" && previewUrl && (
              <iframe
                src={`${previewUrl}#toolbar=1&navpanes=0`}
                className="w-full h-full border-0"
                title={previewTitle}
              />
            )}
            {previewType === "video" && previewUrl && (
              <div className="w-full h-full flex items-center justify-center p-4">
                {previewUrl.includes("youtube.com") || previewUrl.includes("youtu.be") ? (
                  <iframe
                    src={getYouTubeEmbedUrl(previewUrl)}
                    className="w-full h-full rounded-lg"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={previewTitle}
                  />
                ) : previewUrl.includes("vimeo.com") ? (
                  <iframe
                    src={getVimeoEmbedUrl(previewUrl)}
                    className="w-full h-full rounded-lg"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    title={previewTitle}
                  />
                ) : (
                  <div className="text-center space-y-4">
                    <p className="text-muted-foreground">
                      Visualização não disponível para este tipo de vídeo.
                    </p>
                    <a
                      href={previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-primary hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Abrir vídeo em nova aba
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );

  function getYouTubeEmbedUrl(url: string): string {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    const videoId = match && match[2].length === 11 ? match[2] : null;
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  }

  function getVimeoEmbedUrl(url: string): string {
    const regExp = /vimeo\.com\/(\d+)/;
    const match = url.match(regExp);
    const videoId = match ? match[1] : null;
    return videoId ? `https://player.vimeo.com/video/${videoId}` : url;
  }
}