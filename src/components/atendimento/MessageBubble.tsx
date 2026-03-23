import { useState, memo } from "react";
import {
  User, RotateCcw, MoreVertical, Pencil,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageStatusIcon } from "@/components/atendimento/MessageStatusIcon";
import { MediaBubble } from "@/components/atendimento/MediaBubble";
import { cn } from "@/lib/utils";
import type { Mensagem } from "@/data/atendimentoMock";

// ── Helpers ──

export function formatDayLabel(d: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Hoje";
  if (d.toDateString() === yesterday.toDateString()) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export function shouldShowTimestamp(current: Mensagem, prev: Mensagem | null): boolean {
  if (!prev) return true;
  return current.horario.getTime() - prev.horario.getTime() > 5 * 60000;
}

export function isSameAuthorGroup(current: Mensagem, prev: Mensagem | null): boolean {
  if (!prev) return false;
  return current.de === prev.de
    && current.sentByAgentId === prev.sentByAgentId
    && current.horario.getTime() - prev.horario.getTime() < 2 * 60000;
}

export type BubblePosition = "solo" | "first" | "middle" | "last";

export function getBubblePosition(
  msg: Mensagem,
  prev: Mensagem | null,
  next: Mensagem | null,
): BubblePosition {
  const groupedWithPrev = isSameAuthorGroup(msg, prev);
  const groupedWithNext = next ? isSameAuthorGroup(next, msg) : false;
  if (!groupedWithPrev && !groupedWithNext) return "solo";
  if (!groupedWithPrev && groupedWithNext) return "first";
  if (groupedWithPrev && groupedWithNext) return "middle";
  return "last";
}

function getBubbleRounding(isMe: boolean, pos: BubblePosition): string {
  if (pos === "solo") return isMe ? "rounded-[8px] rounded-br-[3px]" : "rounded-[8px] rounded-bl-[3px]";
  if (pos === "first") return isMe ? "rounded-[8px] rounded-br-[3px]" : "rounded-[8px] rounded-bl-[3px]";
  if (pos === "middle") return isMe ? "rounded-[8px] rounded-r-[3px]" : "rounded-[8px] rounded-l-[3px]";
  return isMe ? "rounded-[8px] rounded-tr-[3px]" : "rounded-[8px] rounded-tl-[3px]";
}

function renderTextWithLinks(text: string) {
  const urlRegex = /(https?:\/\/[^\s<]+)/g;
  const parts = text.split(urlRegex);
  if (parts.length === 1) return text;
  return parts.map((part, i) => {
    if (urlRegex.test(part)) {
      urlRegex.lastIndex = 0;
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:opacity-80 break-all">
          {part}
        </a>
      );
    }
    return part;
  });
}

const EDIT_TIME_LIMIT_MIN = 15;

// ── Component ──

export interface MessageBubbleProps {
  message: Mensagem;
  position: BubblePosition;
  showTime: boolean;
  showAuthorLabel: boolean;
  showAvatar: boolean;
  onRetry?: (m: Mensagem) => void;
  currentUserId?: string | null;
  onEditMessage?: (messageId: string, newBody: string) => void;
  profileMap?: Map<string, string>;
}

export const MessageBubble = memo(function MessageBubble({
  message: m,
  position,
  showTime,
  showAuthorLabel,
  showAvatar,
  onRetry,
  currentUserId,
  onEditMessage,
  profileMap,
}: MessageBubbleProps) {
  const isMe = m.de === "atendente";
  const MEDIA_TYPES = ["image", "audio", "video", "document", "sticker"];
  const isMedia = m.msgType ? MEDIA_TYPES.includes(m.msgType) : false;
  const isFailed = isMe && m.status === "failed";
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(m.texto);
  const [menuOpen, setMenuOpen] = useState(false);

  const canEdit = isMe
    && m.sentByAgentId === currentUserId
    && m.msgType === "text"
    && !isFailed
    && (Date.now() - m.horario.getTime()) < EDIT_TIME_LIMIT_MIN * 60 * 1000;

  const handleSaveEdit = () => {
    if (editText.trim() && editText.trim() !== m.texto && onEditMessage) {
      onEditMessage(m.id, editText.trim());
    }
    setEditing(false);
  };

  const isGrouped = position === "middle" || position === "last";
  const rounding = getBubbleRounding(isMe, position);

  const avatarInitial = isMe
    ? (m.sentByAgentName ? m.sentByAgentName.charAt(0).toUpperCase() : null)
    : null;

  return (
    <div
      className={cn(
        "flex w-full min-w-0 overflow-hidden group",
        isMe ? "justify-end" : "justify-start",
        isGrouped ? "mt-0.5" : "mt-3"
      )}
    >
      {/* Left avatar slot */}
      {!isMe && (
        <div className="w-7 shrink-0 flex flex-col justify-end mr-1">
          {showAvatar && (
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[10px] font-semibold bg-muted/30 text-foreground/50">
                <User className="h-3 w-3" />
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      )}

      <div className={cn("max-w-[85%] sm:max-w-[65%] overflow-hidden min-w-0 flex flex-col", isMe ? "items-end" : "items-start")}>
        {showAuthorLabel && isMe && m.sentByAgentName && (
          <p className="text-[10px] text-muted-foreground/40 font-medium mb-0.5 px-2">
            {m.sentByAgentName} • atendente
          </p>
        )}

        {editing ? (
          <div className="flex flex-col gap-1.5 w-full min-w-[200px]">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="text-[14px] leading-relaxed p-2.5 rounded-xl bg-muted/30 border border-border/30 text-foreground resize-none min-h-[44px] focus:outline-none focus:ring-1 focus:ring-primary/30"
              rows={2}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSaveEdit(); }
                if (e.key === "Escape") { setEditing(false); setEditText(m.texto); }
              }}
            />
            <div className="flex gap-1 justify-end">
              <button onClick={() => { setEditing(false); setEditText(m.texto); }} className="text-[10px] px-2.5 py-1 rounded-lg text-muted-foreground hover:bg-muted/30 transition-colors">Cancelar</button>
              <button onClick={handleSaveEdit} disabled={!editText.trim() || editText.trim() === m.texto} className="text-[10px] px-2.5 py-1 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">Salvar</button>
            </div>
          </div>
        ) : (
          <div className="relative">
            {canEdit && onEditMessage && (
              <div className={cn("absolute z-10", isMe ? "right-1 top-1" : "left-1 top-1", "opacity-0 group-hover:opacity-100 transition-opacity")}>
                <Popover open={menuOpen} onOpenChange={setMenuOpen}>
                  <PopoverTrigger asChild>
                    <button className="h-6 w-6 flex items-center justify-center rounded-full hover:bg-muted/40 text-muted-foreground/30 hover:text-muted-foreground transition-colors">
                      <MoreVertical className="h-3.5 w-3.5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-32 p-1" align={isMe ? "start" : "end"} side="top">
                    <button className="w-full flex items-center gap-2 px-2.5 py-2 text-xs hover:bg-accent/30 rounded-lg transition-colors" onClick={() => { setEditing(true); setMenuOpen(false); }}>
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </button>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <div
              className={cn(
                "relative overflow-hidden break-words min-w-0 shadow-[0_1px_0.5px_rgba(0,0,0,0.06)]",
                isMedia ? "p-[3px]" : "px-[9px] py-[6px]",
                isMe ? cn("bg-chat-outbound text-chat-outbound-foreground", rounding) : cn("bg-chat-inbound text-chat-inbound-foreground", rounding),
                isFailed && "ring-1 ring-destructive/30"
              )}
              style={{ fontFamily: "var(--chat-font, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif)" }}
            >
              {isMedia ? (
                <MediaBubble
                  msgType={m.msgType!}
                  mediaUrl={m.mediaUrl ?? null}
                  mediaMime={m.mediaMime ?? null}
                  mediaFilename={m.mediaFilename ?? null}
                  mediaSize={m.mediaSize ?? null}
                  mediaDuration={m.mediaDuration ?? null}
                  caption={m.texto !== `[${m.msgType}]` ? m.texto : null}
                  isMe={isMe}
                />
              ) : (
                <span className="text-[14.2px] leading-[19px] whitespace-pre-wrap" style={{ wordBreak: "break-word", overflowWrap: "break-word" }}>
                  {m.msgType === "reaction" ? "❤️" : m.msgType === "unsupported" ? "⚠️ Mensagem não suportada" : /^\[.+\]$/.test(m.texto.trim()) ? "" : renderTextWithLinks(m.texto)}
                </span>
              )}

              <span className={cn("inline-flex items-center gap-0.5 float-right ml-2 mt-[3px] relative -mb-[3px]", isMedia ? "px-1.5 pb-0.5" : "")}>
                {m.editedAt && <span className="text-[11px] italic text-chat-meta/40 mr-0.5">editada</span>}
                <span className="text-[11px] tabular-nums text-chat-meta/55">
                  {m.horario.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
                {m.channel && (
                  <span style={{ fontSize: '9px', opacity: 0.4, marginLeft: '4px' }}>
                    {m.channel === 'whatsapp_web' ? 'Web' : m.channel === 'system' ? 'Sistema' : 'Meta'}
                  </span>
                )}
                {isMe && <MessageStatusIcon status={m.status} errorMessage={m.errorMessage} className="!h-[14px] !w-[14px]" />}
              </span>
            </div>
          </div>
        )}

        {isFailed && onRetry && (
          <button onClick={() => onRetry(m)} className="flex items-center gap-1 mt-1 px-2 py-1 text-[10px] text-destructive hover:text-destructive/80 hover:bg-destructive/5 rounded-md transition-colors">
            <RotateCcw className="h-3 w-3" /> Reenviar
          </button>
        )}
      </div>

      {/* Right avatar slot */}
      {isMe && (
        <div className="w-7 shrink-0 flex flex-col justify-end ml-1">
          {showAvatar && (
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary/70">
                {avatarInitial || <User className="h-3 w-3" />}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      )}
    </div>
  );
});

// ── Inline Event ──

export const EVENT_LABELS: Record<string, { icon: string; label: string }> = {
  assumed: { icon: "👤", label: "assumiu a conversa" },
  transfer: { icon: "↗️", label: "transferiu a conversa" },
  closed: { icon: "✅", label: "encerrou a conversa" },
  reopened: { icon: "🔄", label: "reabriu a conversa" },
  status_change: { icon: "📋", label: "alterou o status" },
  ai_replied: { icon: "🤖", label: "IA respondeu" },
  ai_handoff: { icon: "🤝", label: "IA transferiu para humano" },
  ai_error: { icon: "⚠️", label: "erro na IA" },
  channel_to_web: { icon: "🌐", label: "transferiu para Web" },
  channel_to_official: { icon: "📱", label: "voltou para Oficial" },
  agent_note: { icon: "📝", label: "nota" },
};

export function InlineEvent({ event, profileMap }: { event: import("@/hooks/useConversationEvents").ConversationEvent; profileMap?: Map<string, string> }) {
  const info = EVENT_LABELS[event.event_type] || { icon: "📌", label: event.event_type };
  const agentName = event.created_by_agent_id && profileMap ? profileMap.get(event.created_by_agent_id) ?? "Agente" : "Sistema";
  const toAgent = event.to_agent_id && profileMap ? profileMap.get(event.to_agent_id) : null;
  const reason = (event.meta as any)?.reason;
  const note = (event.meta as any)?.note;

  if (event.event_type === "agent_note" && note) {
    return (
      <div className="flex items-center justify-center my-3">
        <div className="inline-flex flex-col gap-1 px-3 py-2 rounded-xl bg-amber-500/5 border border-amber-500/10 text-[11px] text-muted-foreground/60 max-w-[80%]">
          <div className="flex items-center gap-1.5">
            <span>📝</span>
            <span className="font-medium">{agentName}</span>
            <span className="text-muted-foreground/25 ml-auto">
              {new Date(event.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <p className="text-xs whitespace-pre-line text-foreground/60">{note}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center my-3">
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/15 text-[11px] text-muted-foreground/50 max-w-[80%]">
        <span>{info.icon}</span>
        <span className="font-medium">{agentName}</span>
        <span>{info.label}</span>
        {toAgent && <span>para <span className="font-medium">{toAgent}</span></span>}
        {reason && <span className="italic truncate max-w-[120px]">• {reason}</span>}
        <span className="text-muted-foreground/25 ml-1">
          {new Date(event.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

// ── Skeleton ──

export function MessageSkeleton() {
  return (
    <div className="px-6 py-4 space-y-4 max-w-3xl mx-auto">
      {[1, 2, 3].map((i) => (
        <div key={i} className={cn("flex", i % 2 === 0 ? "justify-end" : "justify-start")}>
          <div className="space-y-1.5">
            <div className={cn("h-10 rounded-2xl bg-muted/20 animate-pulse", i % 2 === 0 ? "w-56" : "w-64")} />
            <div className="h-3 w-12 bg-muted/20 animate-pulse rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
