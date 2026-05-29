# Forecast Pipeline — Nova Modelagem

## Visão geral

Refatorar `ForecastDashboard.tsx` para um layout tipo **cockpit executivo** com foco em **risco**, mantendo intactos hook, cálculos e dados (`usePipelineForecast`).

## Estrutura da tela

```text
┌──────────────────────────────────────────────────────────────┐
│  Header: título + status "ao vivo" + Premissas               │
├──────────────────────────────────────────────────────────────┤
│  Faixa de alerta (banner) — Risco total destacado            │
│  Ex: "R$ 84k em risco · 3 fases acima do limite"             │
├──────────────────────────────────────┬───────────────────────┤
│                                      │  SIDEBAR INSIGHTS     │
│   FUNIL VERTICAL (SVG real)          │                       │
│   - Forma de funil de verdade        │  ▸ Top 3 Riscos       │
│   - Cada fase = trapézio horizontal  │    (fase, valor, %)   │
│     com largura proporcional         │                       │
│   - Cor semântica por risco          │  ▸ Próximas conversões│
│   - Hover destaca + mostra detalhes  │    (curto prazo)      │
│   - Label lateral: fase, qtd,        │                       │
│     bruto, ajustado, prob.           │  ▸ Gap vs Meta        │
│                                      │    por fase (lista)   │
│                                      │                       │
│                                      │  ▸ KPIs compactos     │
│                                      │    Bruto / Ajustado / │
│                                      │    Curto Prazo        │
├──────────────────────────────────────┴───────────────────────┤
│  Tabela analítica (mantida, mais enxuta)                     │
└──────────────────────────────────────────────────────────────┘
```

## Princípios visuais

- **Risco como protagonista**: banner superior + sidebar dedicada destacam inadimplência, renegociação e gaps de meta antes de qualquer outro número.
- **Funil real em SVG**: trapézios encaixados verticalmente formando o contorno clássico de funil (não mais blocos retangulares centralizados). Largura do trapézio = `valorBruto / maxBruto`.
- **Sidebar fixa à direita** (desktop) com 4 blocos: Top Riscos, Próximas Conversões, Gap por Fase, KPIs compactos.
- **Mobile**: sidebar vira seção empilhada abaixo do funil; funil mantém forma mas reduz altura.

## Componentes (frontend apenas)

1. `ForecastDashboard.tsx` — refatorado, orquestra layout grid `lg:grid-cols-[1fr_340px]`.
2. `components/forecast/RiskBanner.tsx` — faixa superior com valor em risco, contagem de fases críticas, ícone pulsante.
3. `components/forecast/FunnelSVG.tsx` — SVG do funil vertical, trapézios proporcionais, tooltip on hover, animação de entrada por fase.
4. `components/forecast/InsightsSidebar.tsx` — agrupa Top Riscos, Próximas Conversões, Gap por Fase, KPIs compactos.
5. `components/forecast/InsightBlock.tsx` — bloco reutilizável (título + lista de linhas com label/valor/cor).

## Detalhes técnicos

- **Sem mudanças** em `usePipelineForecast.ts`, banco, tipos ou rotas.
- Cálculos derivados (já disponíveis no hook): `risco`, `curtoPrazo`, `fases[].valorAjustado`, `gapMeta`.
- Top Riscos = fases com tone `vermelho` ou `laranja`, ordenadas por `valorBruto` desc, top 3.
- Próximas Conversões = fases `Aprovada` + `Aguardando Análise INSS`, ordenadas por `valorAjustado`.
- Gap por Fase = `(valorBruto * 0.8 * taxaPagamento) - valorAjustado`, mostra só fases com gap positivo.
- SVG funil: cada fase renderiza um `<polygon>` trapezoidal; coordenadas calculadas a partir das larguras proporcionais acumuladas verticalmente.
- Tokens semânticos do design system (verde/âmbar/vermelho via HSL em `index.css`) — sem cores hardcoded.
- Mobile-first: grid colapsa para uma coluna abaixo de `lg`.

## Fora de escopo

- Novas tabelas, hooks, edge functions.
- Alterações em fases do funil ou probabilidades.
- Gráficos de tendência histórica (não há dado temporal hoje).
