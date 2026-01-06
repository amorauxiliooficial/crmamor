import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  ChevronDown, 
  ChevronUp, 
  Settings,
  Play,
  FileCheck,
  PenLine,
  Download,
  Clock,
  CheckCircle2,
  Trophy
} from "lucide-react";
import { OnboardingItem, OnboardingProgresso } from "@/types/onboarding";
import { OnboardingAdminDialog } from "./OnboardingAdminDialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export function OnboardingCard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<OnboardingItem[]>([]);
  const [progresso, setProgresso] = useState<OnboardingProgresso[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminDialogOpen, setAdminDialogOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  const fetchData = async () => {
    if (!user) return;

    setLoading(true);
    
    // Check if user is admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    
    setIsAdmin(!!roleData);

    // Fetch onboarding items
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

    // Fetch user's progress
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
    fetchData();
  }, [user]);

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
  
  // Soma o tempo estimado dos itens não concluídos
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
        <div className="space-y-2 pl-6">
          {categoryItems.map((item) => {
            const completed = isItemCompleted(item.id);
            return (
              <div
                key={item.id}
                className={`flex items-start gap-3 p-3 rounded-md border transition-colors ${
                  completed ? "bg-primary/5 border-primary/20" : "hover:bg-muted/50 border-transparent"
                }`}
              >
                <Checkbox
                  id={item.id}
                  checked={completed}
                  onCheckedChange={(checked) => handleToggle(item.id, !!checked)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <label
                    htmlFor={item.id}
                    className={`flex items-center gap-2 cursor-pointer text-sm ${
                      completed ? "line-through text-muted-foreground" : ""
                    }`}
                  >
                    {getTypeIcon(item.tipo)}
                    <span className="font-medium">{item.titulo}</span>
                    {item.requer_assinatura && (
                      <Badge variant="outline" className="text-xs">
                        Requer assinatura
                      </Badge>
                    )}
                  </label>
                  {item.descricao && (
                    <p className="text-xs text-muted-foreground mt-1 ml-6">{item.descricao}</p>
                  )}
                  <div className="ml-6">
                    {renderItemActions(item)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading || items.length === 0) {
    return null;
  }

  return (
    <>
      <Card>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {progressPercentage === 100 ? (
                  <Trophy className="h-5 w-5 text-yellow-500" />
                ) : (
                  <ClipboardList className="h-5 w-5 text-primary" />
                )}
                <CardTitle className="text-lg">Onboarding</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setAdminDialogOpen(true)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                )}
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon">
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
            
            {/* Progress Section */}
            <div className="mt-4 space-y-3">
              {/* Stats Row */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span className="font-medium">{completedCount}</span>
                    <span className="text-muted-foreground">de {items.length} itens</span>
                  </div>
                  <Badge variant={progressPercentage === 100 ? "default" : "secondary"} className="font-mono">
                    {Math.round(progressPercentage)}%
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs">{formatEstimatedTime(estimatedMinutes)}</span>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="relative">
                <Progress value={progressPercentage} className="h-3" />
                {progressPercentage > 0 && progressPercentage < 100 && (
                  <div 
                    className="absolute top-0 h-3 flex items-center justify-end pr-1"
                    style={{ width: `${Math.max(progressPercentage, 10)}%` }}
                  >
                    <span className="text-[10px] font-bold text-primary-foreground">
                      {Math.round(progressPercentage)}%
                    </span>
                  </div>
                )}
              </div>
              
              {/* Description */}
              <CardDescription className="text-xs">
                {progressPercentage === 100 
                  ? "🎉 Parabéns! Você completou todo o onboarding!"
                  : `Complete os ${remainingCount} ${remainingCount === 1 ? 'item restante' : 'itens restantes'} para finalizar sua integração`
                }
              </CardDescription>
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {renderItems(treinamentos, "Treinamentos")}
              {renderItems(documentacao, "Documentação")}
              {renderItems(geral, "Geral")}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {isAdmin && (
        <OnboardingAdminDialog
          open={adminDialogOpen}
          onOpenChange={setAdminDialogOpen}
          onRefresh={fetchData}
        />
      )}
    </>
  );
}
