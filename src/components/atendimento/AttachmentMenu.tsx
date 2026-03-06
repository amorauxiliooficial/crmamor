import { useRef } from "react";
import {
  Plus, FileText, Image as ImageIcon, Camera, Mic, Contact,
  BarChart3, Calendar, Sticker,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const MENU_ITEMS = [
  { id: "document", label: "Documento", icon: FileText, color: "text-violet-500", accept: ".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" },
  { id: "photo_video", label: "Fotos e vídeos", icon: ImageIcon, color: "text-blue-500", accept: "image/*,video/*" },
  { id: "camera", label: "Câmera", icon: Camera, color: "text-rose-500", accept: null },
  { id: "audio", label: "Áudio", icon: Mic, color: "text-orange-500", accept: "audio/*" },
  { id: "contact", label: "Contato", icon: Contact, color: "text-cyan-500", accept: null },
  { id: "poll", label: "Enquete", icon: BarChart3, color: "text-emerald-500", accept: null },
  { id: "event", label: "Evento", icon: Calendar, color: "text-amber-500", accept: null },
  { id: "sticker", label: "Nova figurinha", icon: Sticker, color: "text-pink-500", accept: null },
] as const;

interface AttachmentMenuProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

export function AttachmentMenu({ onFileSelected, disabled }: AttachmentMenuProps) {
  const docRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleClick = (id: string) => {
    switch (id) {
      case "document":
        docRef.current?.click();
        break;
      case "photo_video":
        photoRef.current?.click();
        break;
      case "camera":
        // Try to open camera via file input
        photoRef.current?.click();
        break;
      case "audio":
        audioRef.current?.click();
        break;
      default:
        toast({ title: `${MENU_ITEMS.find(i => i.id === id)?.label}`, description: "Em breve disponível" });
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
    e.target.value = "";
  };

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="h-10 w-10 rounded-xl text-muted-foreground/50 hover:text-foreground hover:bg-primary/10 transition-all"
            disabled={disabled}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-52 p-1.5"
          align="start"
          side="top"
          sideOffset={8}
        >
          <div className="space-y-0.5">
            {MENU_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => handleClick(item.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-accent/30 transition-colors min-h-[40px] text-left"
              >
                <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center bg-muted/20", item.color)}>
                  <item.icon className="h-4 w-4" />
                </div>
                <span className="text-sm">{item.label}</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Hidden file inputs */}
      <input ref={docRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt" onChange={handleFile} />
      <input ref={photoRef} type="file" className="hidden" accept="image/*,video/*" capture="environment" onChange={handleFile} />
      <input ref={audioRef} type="file" className="hidden" accept="audio/*" onChange={handleFile} />
    </>
  );
}
