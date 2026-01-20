import { useState, useEffect, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Indicacao, proximaAcaoLabels, ProximaAcao } from "@/types/indicacao";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Bell, Clock, Phone, AlertTriangle, UserPlus } from "lucide-react";
import { format, parseISO, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface IndicacoesNotificacaoProps {
  onSelectIndicacao?: (indicacao: Indicacao) => void;
}

export function IndicacoesNotificacao({ onSelectIndicacao }: IndicacoesNotificacaoProps) {
  const { user } = useAuth();
  const [indicacoes, setIndicacoes] = useState<Indicacao[]>([]);
  const [open, setOpen] = useState(false);
  const [novasExternas, setNovasExternas] = useState<Indicacao[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchIndicacoes = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("indicacoes")
      .select("*")
      .not("proxima_acao_data", "is", null)
      .neq("status_abordagem", "concluido")
      .order("proxima_acao_data", { ascending: true });

    if (data) {
      setIndicacoes(data as Indicacao[]);
    }
  };

  // Realtime subscription for new external referrals
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("indicacoes-externas-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "indicacoes",
          filter: "origem_indicacao=eq.externa",
        },
        (payload) => {
          const novaIndicacao = payload.new as Indicacao;
          
          // Add to new external referrals list
          setNovasExternas((prev) => [novaIndicacao, ...prev]);
          
          // Show toast notification
          toast.success("Nova indicação externa!", {
            description: `${novaIndicacao.nome_indicada} foi indicada${novaIndicacao.nome_indicadora ? ` por ${novaIndicacao.nome_indicadora}` : ""}.`,
            duration: 8000,
            icon: <UserPlus className="h-4 w-4" />,
            action: {
              label: "Ver",
              onClick: () => onSelectIndicacao?.(novaIndicacao),
            },
          });

          // Play notification sound (optional visual feedback)
          try {
            if (audioRef.current) {
              audioRef.current.currentTime = 0;
              audioRef.current.play().catch(() => {});
            }
          } catch (e) {
            // Silent fail for audio
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, onSelectIndicacao]);

  useEffect(() => {
    if (user) {
      fetchIndicacoes();
      // Atualiza a cada minuto
      const interval = setInterval(fetchIndicacoes, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Filtrar apenas ações atrasadas há mais de 5 minutos
  const atrasadas = useMemo(() => {
    const agora = new Date();
    return indicacoes.filter((ind) => {
      if (!ind.proxima_acao_data) return false;
      const dataAcao = parseISO(ind.proxima_acao_data);
      const minAtrasados = differenceInMinutes(agora, dataAcao);
      return minAtrasados >= 5; // Atrasada há 5+ minutos
    });
  }, [indicacoes]);

  const handleClick = (indicacao: Indicacao) => {
    setOpen(false);
    onSelectIndicacao?.(indicacao);
  };

  const getTempoAtraso = (dataStr: string) => {
    const dataAcao = parseISO(dataStr);
    const agora = new Date();
    const minutos = differenceInMinutes(agora, dataAcao);
    
    if (minutos < 60) {
      return `${minutos} min`;
    } else if (minutos < 1440) {
      const horas = Math.floor(minutos / 60);
      return `${horas}h`;
    } else {
      const dias = Math.floor(minutos / 1440);
      return `${dias}d`;
    }
  };

  const handleClickExterna = (indicacao: Indicacao) => {
    setOpen(false);
    // Remove from new externals list when clicked
    setNovasExternas((prev) => prev.filter((i) => i.id !== indicacao.id));
    onSelectIndicacao?.(indicacao);
  };

  const totalNotificacoes = atrasadas.length + novasExternas.length;

  return (
    <>
      {/* Hidden audio element for notification sound */}
      <audio
        ref={audioRef}
        src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH+Onp2djYB0aGp3g42YnZuUh3xwa2x2gYqQlJOOiYN+en2Af4OCgoB/fn5/gICAf39/f39/gICAf39/f39/f39/f39/f39/f39/f4B/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/"
        preload="auto"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {totalNotificacoes > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
              >
                {totalNotificacoes > 9 ? "9+" : totalNotificacoes}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <div className="p-3 border-b">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Notificações</span>
              {totalNotificacoes > 0 && (
                <Badge variant="destructive" className="ml-auto">
                  {totalNotificacoes}
                </Badge>
              )}
            </div>
          </div>
          
          <ScrollArea className="max-h-[350px]">
            {/* New external referrals section */}
            {novasExternas.length > 0 && (
              <>
                <div className="px-3 py-2 bg-primary/10 border-b">
                  <div className="flex items-center gap-2 text-xs font-medium text-primary">
                    <UserPlus className="h-3 w-3" />
                    <span>Novas indicações externas</span>
                    <Badge variant="secondary" className="ml-auto text-[10px]">
                      {novasExternas.length}
                    </Badge>
                  </div>
                </div>
                <div className="divide-y">
                  {novasExternas.map((indicacao) => (
                    <div
                      key={indicacao.id}
                      className="p-3 hover:bg-primary/5 cursor-pointer transition-colors bg-primary/5"
                      onClick={() => handleClickExterna(indicacao)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          <UserPlus className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-sm truncate">
                              {indicacao.nome_indicada}
                            </span>
                            <Badge variant="outline" className="text-[10px] shrink-0 border-primary text-primary">
                              Nova
                            </Badge>
                          </div>
                          {indicacao.nome_indicadora && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Indicada por: {indicacao.nome_indicadora}
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Clock className="h-3 w-3" />
                            <span>
                              {format(parseISO(indicacao.created_at), "dd/MM HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                          {indicacao.telefone_indicada && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <Phone className="h-3 w-3" />
                              <span>{indicacao.telefone_indicada}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Overdue actions section */}
            {atrasadas.length > 0 && novasExternas.length > 0 && (
              <div className="px-3 py-2 bg-destructive/10 border-y">
                <div className="flex items-center gap-2 text-xs font-medium text-destructive">
                  <AlertTriangle className="h-3 w-3" />
                  <span>Ações atrasadas</span>
                </div>
              </div>
            )}
            
            {atrasadas.length === 0 && novasExternas.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                Nenhuma notificação
              </div>
            ) : atrasadas.length > 0 && (
              <div className="divide-y">
                {atrasadas.map((indicacao) => (
                  <div
                    key={indicacao.id}
                    className="p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleClick(indicacao)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-sm truncate">
                            {indicacao.nome_indicada}
                          </span>
                          <Badge variant="destructive" className="text-[10px] shrink-0">
                            -{getTempoAtraso(indicacao.proxima_acao_data!)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {indicacao.proxima_acao && proximaAcaoLabels[indicacao.proxima_acao as ProximaAcao]}
                            {" - "}
                            {format(parseISO(indicacao.proxima_acao_data!), "dd/MM HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        {indicacao.telefone_indicada && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Phone className="h-3 w-3" />
                            <span>{indicacao.telefone_indicada}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </>
  );
}
