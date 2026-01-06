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
  ExternalLink
} from "lucide-react";
import { OnboardingItem, OnboardingProgresso } from "@/types/onboarding";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
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

    fetchData();

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
            return (
              <div
                key={item.id}
                className={`flex items-start gap-3 p-3 rounded-md border transition-colors ${
                  completed ? "bg-primary/5 border-primary/20" : "hover:bg-muted/50 border-border"
                }`}
              >
                <Checkbox
                  id={item.id}
                  checked={completed}
                  onCheckedChange={(checked) => handleToggle(item.id, !!checked)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <label
                      htmlFor={item.id}
                      className={`flex items-center gap-2 cursor-pointer text-sm ${
                        completed ? "line-through text-muted-foreground" : ""
                      }`}
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
                    {/* Quick action buttons */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {item.url_video && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(item.url_video, "_blank");
                          }}
                          className="h-7 px-2 text-xs gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Play className="h-3.5 w-3.5" />
                          Assistir
                        </Button>
                      )}
                      {item.arquivo_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(item.arquivo_url, "_blank");
                          }}
                          className="h-7 px-2 text-xs gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Baixar PDF
                        </Button>
                      )}
                    </div>
                  </div>
                  {item.descricao && (
                    <p className="text-xs text-muted-foreground mt-1 ml-6">{item.descricao}</p>
                  )}
                  {/* Show clickable links below description */}
                  {(item.url_video || item.arquivo_url) && (
                    <div className="ml-6 mt-2 flex flex-wrap gap-2">
                      {item.url_video && (
                        <a
                          href={item.url_video}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-3 w-3" />
                          {item.url_video.length > 40 ? item.url_video.substring(0, 40) + "..." : item.url_video}
                        </a>
                      )}
                      {item.arquivo_url && (
                        <a
                          href={item.arquivo_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FileText className="h-3 w-3" />
                          {item.arquivo_url.includes('/') 
                            ? item.arquivo_url.split('/').pop() 
                            : item.arquivo_url.substring(0, 30)}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
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
        <ScrollArea className="flex-1 min-h-0 max-h-[400px] py-4 relative">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="space-y-6 pr-6">
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
          <ScrollBar orientation="vertical" alwaysVisible className="bg-muted/50 w-2" />
        </ScrollArea>

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
    </Dialog>
  );
}