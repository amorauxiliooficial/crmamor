# Forecast Pipeline v2 — Metas por fase, drill-down e tempo no funil

## Visão geral

Evoluir o `/forecast` para um **dashboard operacional do pipeline** onde cada fase é clicável, mostra metas configuráveis, gap em valor e quantidade, lista das mães naquela fase e tempo que cada uma já está parada.

## O que muda

### 1. Banco — novas estruturas

**Tabela `mae_status_history`** — registra cada transição de `status_processo`:
- `mae_id`, `status_anterior`, `status_novo`, `changed_at`, `changed_by`
- **Trigger** `mae_status_change_trigger` em `mae_processo` AFTER UPDATE: quando `status_processo` muda, insere linha em `mae_status_history` e mantém `data_ultima_atualizacao = now()`.
- **Backfill**: registro inicial para cada mãe existente usando `created_at` como `changed_at` e `status_processo` atual como `status_novo` (assim já existe um ponto de partida para o cálculo "dias na fase atual").
- RLS: SELECT/INSERT para `authenticated` (padrão do projeto: todo mundo vê tudo). Sem UPDATE/DELETE.

**Tabela `forecast_metas_fase`** — meta por fase (única linha por status):
- `status_processo` (unique), `meta_valor` (numeric), `meta_quantidade` (integer), `ticket_medio` (numeric, nullable — fallback global), `updated_at`, `updated_by`.
- Uma linha por fase do funil (seed inicial com valores zerados).
- RLS: SELECT para `authenticated`; INSERT/UPDATE apenas para `admin` (via `has_role`).
- Tabela auxiliar `forecast_premissas` (1 linha global): `ticket_medio_padrao`, `taxa_pagamento_padrao`. Reutilizada quando a fase não tem ticket próprio.

### 2. Hook `usePipelineForecast.ts`

- Carrega `forecast_metas_fase` + `forecast_premissas` (em vez de receber `ticketMedio`/`taxa` por argumento).
- Para cada fase adiciona: `metaValor`, `metaQuantidade`, `gapValor`, `gapQuantidade`, `atingimentoPct` (= `valorBruto / metaValor`).
- Continua usando realtime do `useMaesData`.

### 3. Novo hook `useMaeStatusHistory.ts`

- Função `getDiasNaFaseAtual(maeId)` e `getHistoricoFases(maeId)`.
- Para a listagem do drill-down: busca em lote `mae_status_history` das mães da fase clicada, calcula `dias_na_fase` (= `now() - max(changed_at WHERE status_novo = fase_atual)`) e `dias_total` (= `now() - min(changed_at)`).

### 4. UI — Funil + Drill-down

**Funil visual reformulado** (componente `FunnelChart.tsx`):
- SVG real em formato de funil (trapézios encaixados), **clicável por fase**.
- Cada faixa mostra: nome, quantidade, valor bruto, **barra de progresso meta vs realizado** com cor (verde ≥100%, âmbar 60–99%, vermelho <60%).
- Hover destaca; click abre painel lateral.

**Painel lateral de fase** (`FaseDrillDownSheet.tsx`, usa ResponsiveOverlay):
- Header: nome da fase, meta (valor + qtd), realizado, gap, % atingimento.
- Bloco "Mães nesta fase": tabela com nome, dias na fase (badge colorido: verde <7d, âmbar 7–14d, vermelho >14d), dias no CRM, atendente principal, ticket. Click no nome abre `MaeDetailDialog` existente.
- Bloco "Tempo médio na fase" (média entre todas as mães que já passaram por ela, do histórico).

**Configuração de metas** (`MetasFaseConfigDialog.tsx`, só admin):
- Lista todas as fases com inputs de `meta_valor`, `meta_quantidade` e `ticket_medio` (opcional).
- Botão "Premissas globais" para ajustar `ticket_medio_padrao` e `taxa_pagamento_padrao`.
- Salva em batch via upsert.

### 5. Layout do `/forecast`

```text
┌───────────────────────────────────────────────────────────┐
│ Header: título + AO VIVO + [⚙ Metas] (admin)              │
├───────────────────────────────────────────────────────────┤
│ Banner de Risco (mantido)                                 │
├──────────────────────────────┬────────────────────────────┤
│                              │ Sidebar Insights           │
│ FUNIL clicável               │ - Top Riscos               │
│ (SVG real, meta por fase)    │ - Próximas Conversões      │
│                              │ - Fases abaixo da meta     │
│                              │ - Resumo Financeiro        │
├──────────────────────────────┴────────────────────────────┤
│ Tabela analítica (com colunas Meta Valor / Meta Qtd /     │
│  Gap Valor / Gap Qtd / % Atingimento)                     │
└───────────────────────────────────────────────────────────┘
```

Click em qualquer fase (funil, sidebar ou tabela) → abre `FaseDrillDownSheet`.

## Arquivos

**Novos**
- Migration: `mae_status_history`, `forecast_metas_fase`, `forecast_premissas`, trigger + backfill.
- `src/hooks/useMaeStatusHistory.ts`
- `src/hooks/useForecastMetas.ts`
- `src/components/forecast/FunnelChart.tsx` (substitui `FunnelSVG.tsx`)
- `src/components/forecast/FaseDrillDownSheet.tsx`
- `src/components/forecast/MetasFaseConfigDialog.tsx`

**Modificados**
- `src/hooks/usePipelineForecast.ts` — passa a ler metas do banco.
- `src/pages/ForecastDashboard.tsx` — orquestra drill-down e botão de configuração.
- `src/components/forecast/InsightsSidebar.tsx` — bloco "Fases abaixo da meta" substitui "Gap vs Meta" derivado.

**Removidos**
- `src/components/forecast/FunnelSVG.tsx` (substituído por FunnelChart com interatividade).

## Fora de escopo

- Editar histórico passado manualmente.
- Alterar nomes das fases do funil.
- Histórico de mudança de metas (apenas valor corrente).
- Gráfico temporal de evolução do pipeline.

## Sequência de execução

1. Migration (tabelas + trigger + backfill + seed das fases em `forecast_metas_fase`).
2. Hooks (`useForecastMetas`, `useMaeStatusHistory`, refator `usePipelineForecast`).
3. Componentes (`FunnelChart`, `FaseDrillDownSheet`, `MetasFaseConfigDialog`).
4. Refator `ForecastDashboard` + `InsightsSidebar`.
