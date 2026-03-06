import {
  Copy, Reply, Forward, Pin, Star, CheckSquare, Trash2, Info,
} from "lucide-react";
import {
  ContextMenu, ContextMenuContent, ContextMenuItem,
  ContextMenuSeparator, ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Mensagem } from "@/data/atendimentoMock";

interface MessageContextMenuProps {
  message: Mensagem;
  isMe: boolean;
  children: React.ReactNode;
  isMobile?: boolean;
  onReply?: (msg: Mensagem) => void;
  onPin?: (msg: Mensagem) => void;
  onFavorite?: (msg: Mensagem) => void;
  onDelete?: (msg: Mensagem) => void;
  isPinned?: boolean;
  isFavorited?: boolean;
}

function MenuItems({
  message,
  isMe,
  onReply,
  onPin,
  onFavorite,
  onDelete,
  isPinned,
  isFavorited,
  onClose,
}: {
  message: Mensagem;
  isMe: boolean;
  onReply?: (msg: Mensagem) => void;
  onPin?: (msg: Mensagem) => void;
  onFavorite?: (msg: Mensagem) => void;
  onDelete?: (msg: Mensagem) => void;
  isPinned?: boolean;
  isFavorited?: boolean;
  onClose?: () => void;
}) {
  const { toast } = useToast();

  const handleCopy = () => {
    if (message.texto) {
      navigator.clipboard.writeText(message.texto);
      toast({ title: "Copiado ✅" });
    }
    onClose?.();
  };

  const handleInfo = () => {
    const info = [
      `ID: ${message.id.slice(0, 8)}...`,
      `Horário: ${message.horario.toLocaleString("pt-BR")}`,
      `Tipo: ${message.msgType || "text"}`,
      message.status ? `Status: ${message.status}` : null,
      message.sentByAgentName ? `Enviado por: ${message.sentByAgentName}` : null,
    ].filter(Boolean).join("\n");
    toast({ title: "Dados da mensagem", description: info, duration: 8000 });
    onClose?.();
  };

  return (
    <>
      <CtxItem icon={Info} label="Dados da mensagem" onClick={handleInfo} />
      {onReply && <CtxItem icon={Reply} label="Responder" onClick={() => { onReply(message); onClose?.(); }} />}
      {message.texto && message.msgType === "text" && (
        <CtxItem icon={Copy} label="Copiar" onClick={handleCopy} />
      )}
      <CtxItem icon={Forward} label="Encaminhar" onClick={() => { toast({ title: "Encaminhar — em breve" }); onClose?.(); }} />
      <CtxSep />
      {onPin && (
        <CtxItem icon={Pin} label={isPinned ? "Desafixar" : "Fixar"} onClick={() => { onPin(message); onClose?.(); }} />
      )}
      {onFavorite && (
        <CtxItem icon={Star} label={isFavorited ? "Desfavoritar" : "Favoritar"} onClick={() => { onFavorite(message); onClose?.(); }} />
      )}
      <CtxItem icon={CheckSquare} label="Selecionar" onClick={() => { toast({ title: "Seleção — em breve" }); onClose?.(); }} />
      <CtxSep />
      {onDelete && (
        <CtxItem icon={Trash2} label="Apagar" onClick={() => { onDelete(message); onClose?.(); }} destructive />
      )}
    </>
  );
}

function CtxItem({ icon: Icon, label, onClick, destructive }: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  // This is used inside both Context and Dropdown menus
  // The parent wraps it with the correct menu item component
  return null; // placeholder - actual rendering is inline below
}

function CtxSep() {
  return null; // placeholder
}

export function MessageContextMenu({
  message,
  isMe,
  children,
  isMobile,
  onReply,
  onPin,
  onFavorite,
  onDelete,
  isPinned,
  isFavorited,
}: MessageContextMenuProps) {
  const { toast } = useToast();

  const handleCopy = () => {
    if (message.texto) {
      navigator.clipboard.writeText(message.texto);
      toast({ title: "Copiado ✅" });
    }
  };

  const handleInfo = () => {
    const info = [
      `ID: ${message.id.slice(0, 8)}...`,
      `Horário: ${message.horario.toLocaleString("pt-BR")}`,
      `Tipo: ${message.msgType || "text"}`,
      message.status ? `Status: ${message.status}` : null,
      message.sentByAgentName ? `Enviado por: ${message.sentByAgentName}` : null,
    ].filter(Boolean).join("\n");
    toast({ title: "Dados da mensagem", description: info, duration: 8000 });
  };

  const menuItems = (
    <>
      <MItem icon={Info} label="Dados da mensagem" onClick={handleInfo} type={isMobile ? "dropdown" : "context"} />
      {onReply && <MItem icon={Reply} label="Responder" onClick={() => onReply(message)} type={isMobile ? "dropdown" : "context"} />}
      {message.texto && (message.msgType === "text" || !message.msgType) && (
        <MItem icon={Copy} label="Copiar" onClick={handleCopy} type={isMobile ? "dropdown" : "context"} />
      )}
      <MItem icon={Forward} label="Encaminhar" onClick={() => toast({ title: "Encaminhar — em breve" })} type={isMobile ? "dropdown" : "context"} />
      {isMobile ? <DropdownMenuSeparator /> : <ContextMenuSeparator />}
      {onPin && (
        <MItem icon={Pin} label={isPinned ? "Desafixar" : "Fixar"} onClick={() => onPin(message)} type={isMobile ? "dropdown" : "context"} />
      )}
      {onFavorite && (
        <MItem icon={Star} label={isFavorited ? "Desfavoritar" : "Favoritar"} onClick={() => onFavorite(message)} type={isMobile ? "dropdown" : "context"} className={isFavorited ? "text-amber-500" : ""} />
      )}
      <MItem icon={CheckSquare} label="Selecionar" onClick={() => toast({ title: "Seleção — em breve" })} type={isMobile ? "dropdown" : "context"} />
      {isMobile ? <DropdownMenuSeparator /> : <ContextMenuSeparator />}
      {onDelete && (
        <MItem icon={Trash2} label="Apagar" onClick={() => onDelete(message)} type={isMobile ? "dropdown" : "context"} destructive />
      )}
    </>
  );

  // Desktop: right-click context menu
  if (!isMobile) {
    return (
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-48">{menuItems}</ContextMenuContent>
      </ContextMenu>
    );
  }

  // Mobile: dropdown via "..." button overlayed
  return (
    <div className="relative group">
      {children}
      <div className={cn(
        "absolute top-1 opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity z-10",
        isMe ? "left-1" : "right-1"
      )}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-6 w-6 rounded-full bg-background/60 backdrop-blur-sm shadow-sm">
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-48" align={isMe ? "start" : "end"}>
            {menuItems}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function MItem({ icon: Icon, label, onClick, type, destructive, className }: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  type: "context" | "dropdown";
  destructive?: boolean;
  className?: string;
}) {
  const cls = cn(
    "flex items-center gap-2.5 text-xs",
    destructive && "text-destructive",
    className
  );

  if (type === "dropdown") {
    return (
      <DropdownMenuItem onClick={onClick} className={cls}>
        <Icon className="h-3.5 w-3.5" /> {label}
      </DropdownMenuItem>
    );
  }

  return (
    <ContextMenuItem onClick={onClick} className={cls}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </ContextMenuItem>
  );
}
