import { useState } from "react";
import {
  Settings, User, Shield, MessageSquare, Bell, Volume2,
  ChevronRight, Moon, Sun, Globe, Clock, Eye, EyeOff,
  Check, X,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type Section = "main" | "geral" | "conta" | "privacidade" | "conversas" | "audio";

const SECTIONS = [
  { id: "geral" as const, label: "Geral", icon: Settings, desc: "Idioma, tema, notificações" },
  { id: "conta" as const, label: "Conta", icon: User, desc: "Perfil e informações" },
  { id: "privacidade" as const, label: "Privacidade", icon: Shield, desc: "Leitura, online, bloqueio" },
  { id: "conversas" as const, label: "Conversas", icon: MessageSquare, desc: "Wallpaper, fontes, histórico" },
  { id: "audio" as const, label: "Áudio e Notificações", icon: Bell, desc: "Sons, vibração, alertas" },
];

function getFromStorage(key: string, fallback: boolean) {
  try {
    const v = localStorage.getItem(`atd_settings_${key}`);
    return v !== null ? v === "true" : fallback;
  } catch { return fallback; }
}
function setToStorage(key: string, value: boolean) {
  try { localStorage.setItem(`atd_settings_${key}`, String(value)); } catch {}
}

interface SettingsDrawerProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function SettingsDrawer({ open, onOpenChange }: SettingsDrawerProps) {
  const [section, setSection] = useState<Section>("main");

  // Geral
  const [enterToSend, setEnterToSend] = useState(() => getFromStorage("enter_send", true));
  const [compactMode, setCompactMode] = useState(() => getFromStorage("compact", false));
  const [autoAssign, setAutoAssign] = useState(() => getFromStorage("auto_assign", false));

  // Privacidade
  const [showRead, setShowRead] = useState(() => getFromStorage("show_read", true));
  const [showOnline, setShowOnline] = useState(() => getFromStorage("show_online", true));

  // Conversas
  const [fontSize, setFontSize] = useState(() => {
    try { return localStorage.getItem("atd_settings_font_size") || "normal"; } catch { return "normal"; }
  });

  // Audio
  const [msgSound, setMsgSound] = useState(() => getFromStorage("msg_sound", true));
  const [notifDesktop, setNotifDesktop] = useState(() => getFromStorage("notif_desktop", true));
  const [notifPreview, setNotifPreview] = useState(() => getFromStorage("notif_preview", true));

  const toggleSetting = (key: string, value: boolean, setter: (v: boolean) => void) => {
    setter(value);
    setToStorage(key, value);
  };

  const goBack = () => setSection("main");

  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setSection("main"); }}>
      <SheetContent side="left" className="w-full sm:w-[380px] p-0">
        <div className="flex flex-col h-full">
          {section === "main" ? (
            <>
              <SheetHeader className="px-5 pt-5 pb-3">
                <SheetTitle className="text-lg font-semibold">Configurações</SheetTitle>
              </SheetHeader>
              <ScrollArea className="flex-1">
                <div className="px-3 pb-6 space-y-1">
                  {SECTIONS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSection(s.id)}
                      className="w-full flex items-center gap-3 px-3 py-3.5 rounded-xl hover:bg-muted/30 transition-colors group"
                    >
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <s.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-medium">{s.label}</p>
                        <p className="text-xs text-muted-foreground/60 truncate">{s.desc}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </>
          ) : (
            <>
              <div className="px-4 pt-4 pb-3 flex items-center gap-3 border-b border-border/20">
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg" onClick={goBack}>
                  <X className="h-4 w-4" />
                </Button>
                <h2 className="text-base font-semibold">
                  {SECTIONS.find((s) => s.id === section)?.label}
                </h2>
              </div>
              <ScrollArea className="flex-1">
                <div className="px-5 py-4 space-y-6">
                  {section === "geral" && (
                    <>
                      <SettingRow
                        label="Enter para enviar"
                        desc="Enviar mensagem ao pressionar Enter"
                        checked={enterToSend}
                        onChange={(v) => toggleSetting("enter_send", v, setEnterToSend)}
                      />
                      <SettingRow
                        label="Modo compacto"
                        desc="Reduzir espaçamento entre mensagens"
                        checked={compactMode}
                        onChange={(v) => toggleSetting("compact", v, setCompactMode)}
                      />
                      <SettingRow
                        label="Auto-atribuir novos atendimentos"
                        desc="Atribuir automaticamente conversas novas a você"
                        checked={autoAssign}
                        onChange={(v) => toggleSetting("auto_assign", v, setAutoAssign)}
                      />
                      <Separator className="bg-border/10" />
                      <div>
                        <Label className="text-sm font-medium">Tamanho da fonte</Label>
                        <p className="text-xs text-muted-foreground/60 mb-3">Tamanho do texto nas mensagens</p>
                        <div className="flex gap-2">
                          {["small", "normal", "large"].map((size) => (
                            <button
                              key={size}
                              onClick={() => {
                                setFontSize(size);
                                localStorage.setItem("atd_settings_font_size", size);
                              }}
                              className={cn(
                                "flex-1 py-2.5 rounded-xl text-xs font-medium border transition-all",
                                fontSize === size
                                  ? "bg-primary/10 border-primary/30 text-primary"
                                  : "border-border/20 text-muted-foreground hover:bg-muted/20"
                              )}
                            >
                              {size === "small" ? "Pequena" : size === "normal" ? "Normal" : "Grande"}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {section === "conta" && (
                    <>
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                          <User className="h-7 w-7 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Seu perfil</p>
                          <p className="text-xs text-muted-foreground/60">Atendente</p>
                        </div>
                      </div>
                      <Separator className="bg-border/10" />
                      <p className="text-xs text-muted-foreground/50">
                        Configurações da conta são gerenciadas pelo administrador no painel de configurações.
                      </p>
                    </>
                  )}

                  {section === "privacidade" && (
                    <>
                      <SettingRow
                        label="Confirmação de leitura"
                        desc="Enviar confirmação quando ler mensagens"
                        checked={showRead}
                        onChange={(v) => toggleSetting("show_read", v, setShowRead)}
                      />
                      <SettingRow
                        label="Visibilidade online"
                        desc="Mostrar quando estiver online"
                        checked={showOnline}
                        onChange={(v) => toggleSetting("show_online", v, setShowOnline)}
                      />
                    </>
                  )}

                  {section === "conversas" && (
                    <>
                      <div>
                        <Label className="text-sm font-medium">Histórico</Label>
                        <p className="text-xs text-muted-foreground/60 mt-1">
                          As conversas são armazenadas no servidor. Mensagens antigas podem ser carregadas sob demanda.
                        </p>
                      </div>
                      <Separator className="bg-border/10" />
                      <div>
                        <Label className="text-sm font-medium">Atalhos de teclado</Label>
                        <div className="mt-3 space-y-2">
                          {[
                            { keys: "Enter", desc: "Enviar mensagem" },
                            { keys: "Shift+Enter", desc: "Nova linha" },
                            { keys: "/", desc: "Templates rápidos" },
                            { keys: "⌘K", desc: "Buscar conversa" },
                          ].map((s) => (
                            <div key={s.keys} className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground/60">{s.desc}</span>
                              <kbd className="text-[10px] font-mono bg-muted/20 border border-border/30 rounded px-1.5 py-0.5 text-muted-foreground/60">
                                {s.keys}
                              </kbd>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {section === "audio" && (
                    <>
                      <SettingRow
                        label="Som de mensagem"
                        desc="Tocar som ao receber nova mensagem"
                        checked={msgSound}
                        onChange={(v) => toggleSetting("msg_sound", v, setMsgSound)}
                      />
                      <div>
                        <Label className="text-sm font-medium">Intensidade do som</Label>
                        <p className="text-xs text-muted-foreground/60 mb-3">Volume e comportamento do alerta sonoro</p>
                        <div className="flex gap-2">
                          {(["normal", "discreto"] as const).map((level) => (
                            <button
                              key={level}
                              onClick={() => {
                                const val = level;
                                localStorage.setItem("atendimento_sound_intensity", val);
                                // Force re-render won't affect the hook, but localStorage persists
                              }}
                              className={cn(
                                "flex-1 py-2.5 rounded-xl text-xs font-medium border transition-all",
                                (localStorage.getItem("atendimento_sound_intensity") || "normal") === level
                                  ? "bg-primary/10 border-primary/30 text-primary"
                                  : "border-border/20 text-muted-foreground hover:bg-muted/20"
                              )}
                            >
                              {level === "normal" ? "Normal" : "Discreto"}
                            </button>
                          ))}
                        </div>
                      </div>
                      <Separator className="bg-border/10" />
                      <SettingRow
                        label="Notificações desktop"
                        desc="Exibir notificações do navegador"
                        checked={notifDesktop}
                        onChange={(v) => toggleSetting("notif_desktop", v, setNotifDesktop)}
                      />
                      <SettingRow
                        label="Pré-visualização"
                        desc="Mostrar conteúdo na notificação"
                        checked={notifPreview}
                        onChange={(v) => toggleSetting("notif_preview", v, setNotifPreview)}
                      />
                    </>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SettingRow({ label, desc, checked, onChange }: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground/60">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
