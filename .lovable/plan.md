## Bug: barra de rolagem do drill-down (e dialogs) não funciona

Quando você clica numa etapa do funil e o painel abre, o conteúdo ultrapassa a altura disponível mas a roda do mouse / a barra de rolagem não respondem. O mesmo ocorre no dialog "Configurar Metas".

### Causa
O `ResponsiveOverlay` envolve o conteúdo num `ScrollArea` (Radix) dentro de um `DialogContent`/`SheetContent` que usa `flex flex-col overflow-hidden` + `flex-1 min-h-0`. Em alguns cenários (especialmente quando há grids/inputs aninhados), o viewport interno do Radix `ScrollArea` deixa de calcular altura corretamente — a área cresce além do container e o scroll nativo é bloqueado pelo `overflow-hidden` do pai.

### Fix (apenas frontend, sem mudar comportamento de outros componentes)
Em `src/components/ui/responsive-overlay.tsx`:

- Substituir os dois `ScrollArea` (mobile Sheet e desktop Dialog) por um `<div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">`.
- Manter o padding interno (`px-4 pb-4` / `px-6 pb-4`).
- Manter `flex-col` + `min-h-0` + `overflow-hidden` no container externo para que o footer continue fixo.

Isso usa scroll nativo, que funciona de forma confiável tanto no Sheet (mobile) quanto no Dialog (desktop), em todas as telas do app que usam `ResponsiveOverlay` (drill-down do Forecast, MetasFaseConfigDialog, e demais).

Sem migrações, sem mudança de lógica, sem alteração visual além do scrollbar ser o nativo do navegador.
