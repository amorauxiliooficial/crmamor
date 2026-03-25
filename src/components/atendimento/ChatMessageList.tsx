import { useRef, useEffect, useCallback, useMemo, useState } from "react";
import { Pin, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { MessageContextMenu } from "@/components/atendimento/MessageContextMenu";
import {
  MessageBubble,
  MessageSkeleton,
  InlineEvent,
  formatDayLabel,
  shouldShowTimestamp,
  getBubblePosition,
} from "@/components/atendimento/MessageBubble";
import type { Mensagem } from "@/data/atendimentoMock";
import type { ConversationEvent } from "@/hooks/useConversationEvents";

const MESSAGES_PER_PAGE = 50;

interface ChatMessageListProps {
  conversationId: string;
  mensagens: Mensagem[];
  isMobile: boolean;
  isLoadingMessages: boolean;
  currentUserId?: string | null;
  onEditMessage?: (messageId: string, newBody: string) => void;
  onRetry?: (
    messageId: string,
    body: string,
    msgType?: string,
    mediaUrl?: string,
    mediaMime?: string,
    mediaFilename?: string,
  ) => void;
  conversationEvents: ConversationEvent[];
  profileMap?: Map<string, string>;
  onReply: (msg: Mensagem) => void;
}

export function ChatMessageList({
  conversationId,
  mensagens,
  isMobile,
  isLoadingMessages,
  currentUserId,
  onEditMessage,
  onRetry,
  conversationEvents,
  profileMap,
  onReply,
}: ChatMessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const prevConversationIdRef = useRef<string | null>(null);
  const prevMsgCountRef = useRef(0);
  const { toast } = useToast();

  const [visibleCount, setVisibleCount] = useState(MESSAGES_PER_PAGE);
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => {
    try {
      const v = localStorage.getItem("atd_pinned");
      return v ? new Set(JSON.parse(v)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [favoritedIds, setFavoritedIds] = useState<Set<string>>(() => {
    try {
      const v = localStorage.getItem("atd_favorited");
      return v ? new Set(JSON.parse(v)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Scroll helpers
  const scrollToBottom = useCallback((instant = false) => {
    const vp = scrollViewportRef.current;
    if (vp) {
      if (instant) vp.scrollTop = vp.scrollHeight;
      else vp.scrollTo({ top: vp.scrollHeight, behavior: "smooth" });
    }
  }, []);

  useEffect(() => {
    const vp = scrollViewportRef.current;
    if (!vp) return;
    const handleScroll = () => {
      isNearBottomRef.current = vp.scrollHeight - vp.scrollTop - vp.clientHeight < 150;
    };
    vp.addEventListener("scroll", handleScroll, { passive: true });
    return () => vp.removeEventListener("scroll", handleScroll);
  }, [conversationId]);

  useEffect(() => {
    if (conversationId !== prevConversationIdRef.current) {
      prevConversationIdRef.current = conversationId;
      isNearBottomRef.current = true;
      setVisibleCount(MESSAGES_PER_PAGE);
      setShowFavoritesOnly(false);
      prevMsgCountRef.current = 0;
      requestAnimationFrame(() => {
        scrollToBottom(true);
        setTimeout(() => scrollToBottom(true), 100);
      });
    }
  }, [conversationId, scrollToBottom]);

  useEffect(() => {
    if (mensagens.length > 0 && mensagens.length !== prevMsgCountRef.current) {
      const isInitialLoad = prevMsgCountRef.current === 0;
      prevMsgCountRef.current = mensagens.length;
      if (isInitialLoad || isNearBottomRef.current) {
        requestAnimationFrame(() => scrollToBottom(isInitialLoad));
      }
    }
  }, [mensagens.length, scrollToBottom]);

  const handlePin = useCallback(
    (m: Mensagem) => {
      setPinnedIds((prev) => {
        const next = new Set(prev);
        if (next.has(m.id)) {
          next.delete(m.id);
          toast({ title: "Mensagem desafixada" });
        } else {
          next.add(m.id);
          toast({ title: "Mensagem fixada 📌" });
        }
        localStorage.setItem("atd_pinned", JSON.stringify([...next]));
        return next;
      });
    },
    [toast],
  );

  const handleFavorite = useCallback(
    (m: Mensagem) => {
      setFavoritedIds((prev) => {
        const next = new Set(prev);
        if (next.has(m.id)) {
          next.delete(m.id);
          toast({ title: "Removido dos favoritos" });
        } else {
          next.add(m.id);
          toast({ title: "Mensagem favoritada ⭐" });
        }
        localStorage.setItem("atd_favorited", JSON.stringify([...next]));
        return next;
      });
    },
    [toast],
  );

  const handleDeleteMessage = useCallback(
    (m: Mensagem) => {
      toast({ title: "Mensagem apagada 🗑️", description: "Apenas local" });
    },
    [toast],
  );

  // Pagination
  const paginatedMessages = useMemo(() => {
    if (mensagens.length <= visibleCount) return mensagens;
    return mensagens.slice(mensagens.length - visibleCount);
  }, [mensagens, visibleCount]);

  const hasMore = mensagens.length > visibleCount;

  const messageGroups = useMemo(() => {
    const groups: { label: string; messages: Mensagem[] }[] = [];
    let currentLabel = "";
    paginatedMessages.forEach((m) => {
      const label = formatDayLabel(m.horario);
      if (label !== currentLabel) {
        currentLabel = label;
        groups.push({ label, messages: [m] });
      } else {
        groups[groups.length - 1].messages.push(m);
      }
    });
    return groups;
  }, [paginatedMessages]);

  return (
    <ScrollArea
      className="flex-1 w-full overflow-x-hidden bg-chat-bg"
      ref={(node) => {
        if (node) {
          const viewport = node.querySelector("[data-radix-scroll-area-viewport]") as HTMLDivElement | null;
          if (viewport) scrollViewportRef.current = viewport;
        }
      }}
    >
      <div className="px-3 sm:px-4 md:px-6 py-3 space-y-1.5 max-w-[820px] mx-auto w-full overflow-x-hidden">
        {hasMore && (
          <div className="flex justify-center py-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground/40 hover:text-foreground"
              onClick={() => setVisibleCount((v) => v + MESSAGES_PER_PAGE)}
            >
              Carregar mais ({mensagens.length - visibleCount} anteriores)
            </Button>
          </div>
        )}

        {/* Pinned messages bar */}
        {(() => {
          const pinnedMsgs = mensagens.filter((m) => pinnedIds.has(m.id));
          if (pinnedMsgs.length === 0) return null;
          return (
            <div className="mx-auto w-full max-w-3xl mb-2">
              <div className="bg-muted/10 rounded-lg p-2 flex items-center gap-2">
                <Pin className="h-3 w-3 text-muted-foreground/40 shrink-0" />
                <span className="text-[11px] text-muted-foreground/50">
                  {pinnedMsgs.length} fixada{pinnedMsgs.length > 1 ? "s" : ""}
                </span>
                <p className="text-[11px] text-muted-foreground/35 truncate flex-1">
                  {pinnedMsgs[pinnedMsgs.length - 1]?.texto}
                </p>
              </div>
            </div>
          );
        })()}

        {/* Favorites filter */}
        {favoritedIds.size > 0 && (
          <div className="flex justify-center mb-2">
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={cn(
                "flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-full transition-all",
                showFavoritesOnly
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground/40 hover:text-foreground",
              )}
            >
              <Star className="h-3 w-3" />
              {showFavoritesOnly
                ? "Mostrando favoritas"
                : `${favoritedIds.size} favorita${favoritedIds.size > 1 ? "s" : ""}`}
            </button>
          </div>
        )}

        {isLoadingMessages ? (
          <MessageSkeleton />
        ) : (
          messageGroups.map((group) => (
            <div key={group.label}>
              <div className="flex items-center justify-center my-4">
                <span className="text-[10px] font-medium text-muted-foreground/30 bg-muted/10 px-3 py-1 rounded-full">
                  {group.label}
                </span>
              </div>

              {(() => {
                const filtered = group.messages.filter((m) => !showFavoritesOnly || favoritedIds.has(m.id));
                const agentIds = new Set(
                  filtered
                    .filter((m) => m.de === "atendente")
                    .map((m) => m.sentByAgentId)
                    .filter(Boolean),
                );
                const multiAgent = agentIds.size > 1;

                return filtered.map((m, idx) => {
                  const prev = idx > 0 ? filtered[idx - 1] : null;
                  const next = idx < filtered.length - 1 ? filtered[idx + 1] : null;
                  const position = getBubblePosition(m, prev, next);
                  const showTime = shouldShowTimestamp(m, prev);
                  const isMe = m.de === "atendente";
                  const showAvatar = position === "last" || position === "solo";
                  const showAuthorLabel = multiAgent && (position === "first" || position === "solo");

                  const eventsBeforeThis = conversationEvents.filter((ev) => {
                    const evTime = new Date(ev.created_at).getTime();
                    const prevTime = prev ? prev.horario.getTime() : 0;
                    return evTime > prevTime && evTime <= m.horario.getTime();
                  });

                  return (
                    <div key={m.id}>
                      {eventsBeforeThis.map((ev) => (
                        <InlineEvent key={ev.id} event={ev} profileMap={profileMap} />
                      ))}
                      <MessageContextMenu
                        message={m}
                        isMe={isMe}
                        isMobile={isMobile}
                        onReply={onReply}
                        onPin={handlePin}
                        onFavorite={handleFavorite}
                        onDelete={handleDeleteMessage}
                        isPinned={pinnedIds.has(m.id)}
                        isFavorited={favoritedIds.has(m.id)}
                      >
                        <div className="relative">
                          {(pinnedIds.has(m.id) || favoritedIds.has(m.id)) && (
                            <div className={cn("absolute -top-1 z-10 flex gap-0.5", isMe ? "right-10" : "left-10")}>
                              {pinnedIds.has(m.id) && <Pin className="h-2.5 w-2.5 text-muted-foreground/30" />}
                              {favoritedIds.has(m.id) && <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />}
                            </div>
                          )}
                          <MessageBubble
                            message={m}
                            position={position}
                            showTime={showTime}
                            showAuthorLabel={showAuthorLabel}
                            showAvatar={showAvatar}
                            onRetry={
                              onRetry
                                ? (msg) =>
                                    onRetry(
                                      msg.id,
                                      msg.texto,
                                      msg.msgType,
                                      msg.mediaUrl ?? undefined,
                                      msg.mediaMime ?? undefined,
                                      msg.mediaFilename ?? undefined,
                                    )
                                : undefined
                            }
                            currentUserId={currentUserId}
                            onEditMessage={onEditMessage}
                            profileMap={profileMap}
                          />
                        </div>
                      </MessageContextMenu>
                    </div>
                  );
                });
              })()}
              {(() => {
                const lastMsgTime = group.messages[group.messages.length - 1]?.horario.getTime() ?? 0;
                const trailingEvents = conversationEvents.filter(
                  (ev) => new Date(ev.created_at).getTime() > lastMsgTime,
                );
                return trailingEvents.map((ev) => <InlineEvent key={ev.id} event={ev} profileMap={profileMap} />);
              })()}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
}
