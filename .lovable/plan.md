## Objetivo

Limpar o card Funil Financeiro (atualmente poluído) e tornar a fase **Gestantes em Maturação** acionável, destacando mães no **7º e 8º mês** — janela crítica em que precisam entrar em contato porque estão prestes a virar caso operacional.

Direção escolhida: **v3 "Camadas com volume"** — funil real com largura afilando por etapa, fundo neutro do card, cor reservada para status e alertas, badge magenta pulsante para urgência.

## Mudanças

### 1. Redesign do `FunnelChart`

```text
┌─ Funil Financeiro ──────────────────── Forecast Pipeline ─┐
│  Largura proporcional ao volume · clique para detalhar    │
│                                                            │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ 🤰 Gestantes em Maturação    🔴 2 em 7º-8º · contato │ │
│ │ 4 mães em maturação              R$ 7.200 · sem meta │ │
│ └──────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐  │
│  │ Pendência Documental                               │  │
│  │ 2 mães aguardando docs       R$ 3.600 · ▰▰▱▱ 40% │  │
│  └────────────────────────────────────────────────────┘  │
│   ┌──────────────────────────────────────────────────┐   │
│   │ Elegível (Análise Positiva)                      │   │
│   │ 6 mães aprovadas prelim.    R$ 10.800 · ▰▰▰▰ 85%│   │
│   └──────────────────────────────────────────────────┘   │
│      ...                                                  │
│                                                            │
│ Total: 35 mães · Bruto R$ 63k                            │
└────────────────────────────────────────────────────────────┘
```

- Cada linha é altura fixa (~64px), fundo `bg-{tone}-50/40` sutil, borda fina, sem gradiente forte.
- Largura afila 5% por etapa (funil de verdade, sem distorção pelo volume).
- Métrica à direita em coluna alinhada: valor BRL grande + barra de progresso 24×6px da meta (ou label "sem meta").
- Chevron muda de cor no hover; linha desliza 1px à direita.
- Linha de rodapé compacta: total mães + bruto + ajustado.

### 2. Alerta 7º/8º mês na fase Gestantes em Maturação

- Inline na própria linha do funil: badge magenta pulsante `🔴 X em 7º-8º · precisa contato` (só aparece quando contagem > 0).
- Dentro do drill-down (`FaseDrillDownSheet`), as faixas `6–7m` e `8+m` ganham um anel magenta + microbadge "contatar".
- Cada mãe da lista nessas faixas recebe um indicador 🔔 ao lado do nome, ordenando primeiro.

### 3. Sinalização no Kanban e listas de mães

Para a flag ser útil fora do Forecast, adicionar em locais onde a mãe já aparece como gestante:

- **`KanbanCard`**: quando `is_gestante` e mês calculado ∈ {7, 8}, mostrar pílula magenta pequena "🔔 contato 7-8m" no topo do card.
- **`MaeCardList`**: mesmo indicador na linha.
- Usar o helper já existente `calcularMesGravidez` de `src/lib/gestacaoUtils.ts` — não duplicar lógica.

### 4. RiskBanner

Acrescentar um terceiro slot "Gestantes 7-8m: N precisam contato" ao lado de Pipeline em Risco e Gap vs Meta (só renderiza se N > 0).

## Detalhes técnicos

- Reescrever `src/components/forecast/FunnelChart.tsx` na estrutura v3. Manter assinatura `{ fases, onFaseClick, formatBRLShort }` + adicionar prop opcional `gestantesCriticas: number` para o badge inline.
- Criar helper `useGestantes78` em `src/hooks/useMaesData.ts` (ou util puro em `gestacaoUtils.ts`) que devolve `{ total, ids }` para mães com `is_gestante && calcularMesGravidez(m) ∈ {7,8}`.
- `ForecastDashboard.tsx`: calcular `gestantesCriticas` via memo e passar para `FunnelChart` e `RiskBanner`.
- `FaseDrillDownSheet.tsx`: no bloco `FaixasGestacionais` já existente, marcar grupos 6-7m e 8+m com tom magenta quando `qtd > 0`; reorganizar ordem da lista de mães para subir as 7-8m primeiro.
- `KanbanCard.tsx` e `MaeCardList.tsx`: pequeno componente `<GestanteCriticaBadge mae={m} />` reutilizável vivendo em `src/components/gestantes/`.
- Tokens: usar HSL do tema (`text-primary`, `bg-primary/10`, semáforo `emerald/amber/rose`). Sem cores literais.
- Animação do badge: classe Tailwind `animate-pulse` (sem framer-motion novo).

## Fora de escopo

- Notificação push/som para 7-8m (pode entrar depois).
- Mudança no Kanban da fase (continua sendo a coluna Gestantes em Maturação normal).
- Alterar os dados do banco — a flag é puramente derivada de `mes_gestacao` + DPP.
