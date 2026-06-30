
# Unificação Pagamentos + Central Financeira da Amor

## Recomendação

A forma mais segura é a **opção 1 (abas internas por mãe)**. Motivos:

- Os dois módulos resolvem coisas diferentes mas **da mesma mãe**: honorários que a Amor cobra (Pagamentos) e benefício do INSS que a mãe vai receber (Central). Hoje o time precisa abrir duas telas e cruzar na cabeça.
- Não mexe em banco, não mexe em Forecast, não mexe em cálculo de comissão. Zero risco de perder histórico.
- Resolve a dor real: ver tudo da mãe em um lugar só.

A opção 2 (boletos viram pagamentos) seria mais "limpa" no futuro, mas exige migração de dados, reescrita do Forecast/Comissões/Financeiro e tem alto risco de quebrar relatórios. **Não recomendo agora** — pode virar uma evolução depois que a equipe estiver usando a tela unificada.

## O que muda na navegação

**Antes (hoje):**
```text
[Central Financeira] aba topo
   ├── Sub-aba: Pagamentos    (lista geral de pagamentos)
   └── Sub-aba: Central da Amor (lista de aprovadas → card da mãe)
```

**Depois:**
```text
[Financeiro] aba topo
   ├── Visão geral (KPIs + lista de mães aprovadas/rescisão)
   │     • cards mostram: status honorários + status benefício juntos
   │     • clica na mãe → abre tela detalhada
   │
   └── Tela detalhada da mãe (com abas internas)
         ├── Resumo               (visão consolidada: total a receber, recebido, em aberto, próximo vencimento)
         ├── Honorários da Amor   (= conteúdo atual de "Pagamentos" focado naquela mãe)
         ├── Benefício INSS       (= conteúdo atual da Central da Amor: saque, parcelas do benefício, valores futuros)
         ├── Boletos              (boletos_amor da mãe)
         └── Comunicado           (gerador de WhatsApp + histórico)
```

A aba antiga `Pagamentos` (lista geral com filtro por mês "Recebido em…") **continua existindo** dentro de "Visão geral" como um painel/relatório, porque o time usa pra fechar o mês. Só deixa de ser uma sub-aba separada.

## Detalhes por seção

### 1. Visão geral (substitui as duas sub-abas atuais)
- Mantém os 5 KPIs de cima do `PagamentosTab` (Mães, Total parcelas, Pagas, Pendentes, Inadimplentes) e o card "Recebido em [mês]" intactos.
- Mantém o relatório por mês/ano do `PagamentosTab` como um bloco recolhível "Recebimentos do mês".
- Lista única de mães aprovadas + rescisão (mesmo filtro de hoje). Cada card mostra duas badges:
  - **Honorários:** vínculo pendente / pendente / inadimplente / pago (vem de `pagamentos_mae`)
  - **Benefício:** sem cadastro / em aberto / fechado (vem de `central_financeira` + `boletos_amor`)
- Botão "Gerenciar bancos" continua no topo.

### 2. Tela detalhada da mãe
Substitui o atual `CentralFinanceiraDialog inline` por uma tela com abas internas (shadcn `Tabs`), mantendo o conteúdo já existente:

- **Resumo** *(novo, apenas leitura)*: cartões com:
  - Honorários: total contratado, recebido, em aberto, próxima parcela
  - Benefício: total previsto, já liberado, futuro previsto
  - Boletos: total, pago, em aberto, diferença vs Amor
- **Honorários da Amor**: reaproveita `PagamentoDialog` / `PagamentoDetailDrawer` no formato embutido, filtrado por essa mãe. CRUD igual ao atual.
- **Benefício INSS**: blocos atuais do `CentralFinanceiraDialog` — Dados da cliente, Dados do saque, Parcelas do benefício, Cobrança da Amor, Valores futuros.
- **Boletos**: bloco de boletos já existente.
- **Comunicado**: calculadora lateral + botão "Gerar comunicado" + histórico. Sem mudança de comportamento.

### 3. Mobile
- "Visão geral" vira lista de cards (já é).
- Tela detalhada: abas internas viram `Select` no topo (mesmo padrão do `MobileViewSelector`) pra não estourar largura.

## O que NÃO muda

- Tabelas `pagamentos_mae`, `parcelas_pagamento`, `central_financeira`, `parcelas_beneficio`, `boletos_amor`, `central_comunicados_historico` continuam exatamente como estão.
- Hooks `usePagamentos`, `useCentralFinanceira`, `useBancos` continuam.
- `ForecastDashboard`, `Financeiro`, comissões, recebimentos do mês continuam lendo de `pagamentos_mae` (foi a sua escolha).
- Edge functions e webhooks: nada muda.
- `MobileViewSelector` continua com a entrada "Central Financeira" — só renomeio o label pra "Financeiro".

## Arquivos afetados (técnico)

- `src/components/central-financeira/CentralFinanceiraTab.tsx` → reescrito: remove `<Tabs>` de Pagamentos/Central, vira "Visão geral" + roteamento pra tela detalhada.
- `src/components/central-financeira/CentralFinanceiraDialog.tsx` → mantém os blocos, mas é envelopado por `<Tabs>` internas; modo `inline` passa a aceitar uma `defaultSection`.
- Novo: `src/components/central-financeira/MaeFinanceiroDetail.tsx` (componente container com as abas Resumo / Honorários / Benefício / Boletos / Comunicado).
- Novo: `src/components/central-financeira/HonorariosTabContent.tsx` (extrai do `PagamentosTab` a parte de uma mãe específica — reaproveita `PagamentoDialog` e `PagamentoDetailDrawer`).
- `src/components/central-financeira/CentralFinanceiraTab.tsx` mantém os KPIs e o painel "Recebimentos do mês" recortados de `PagamentosTab`.
- `src/components/pagamentos/PagamentosTab.tsx` deixa de ser usado como aba — mas **fica no projeto** durante uma janela de segurança caso seja preciso voltar atrás. Pode ser deletado em um passo seguinte, depois que você validar.
- `src/components/layout/MobileViewSelector.tsx` → label "Central Financeira" → "Financeiro".

## Riscos e mitigação

- **Risco baixo de regressão visual**: o conteúdo dos blocos é exatamente o atual, só rearranjado.
- **Risco de duplicar lógica de fetch**: vou reaproveitar `usePagamentos` e `useCentralFinanceira` sem criar hooks novos.
- **Forecast / Financeiro**: intocados.
- Se algo der errado na "Visão geral", o caminho de rollback é restaurar 2 arquivos.

## Fora de escopo (proponho como próximo passo, não agora)

- Migrar boletos ↔ pagamentos_mae numa única fonte.
- Sincronizar automaticamente "Total Amor" da Central com `valor_total` de `pagamentos_mae`.
- Painel financeiro consolidado da empresa cruzando os dois mundos.
