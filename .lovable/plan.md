
# Forecast TV — Padrão Corporativo AAM

Objetivo: transformar `/forecast/tv` em um painel que pareça de uma empresa grande (tipo war room da Bloomberg / Stripe / Linear), usando a identidade visual que já existe no resto do sistema. Vira referência prática: "é assim que a AAM mostra resultado".

---

## 1. Identidade visual (alinhar com o resto do app)

Hoje o TV usa rose/amber/sky/emerald genéricos e `font-serif`. Vamos puxar o que já existe no `index.css`:

- **Cor primária**: Magenta AAM (`hsl(333 71% 50%)`) como única cor de marca. Aparece em: número do gap, barra de progresso da meta, "AO VIVO", acento da fase ativa.
- **Tons de fase**: trocar rose/amber/sky/emerald por tokens semânticos do app (`--muted`, `--primary`, `--success` etc.) com opacidade. Mantém hierarquia sem ficar parecendo arco-íris.
- **Tipografia**:
  - Display (número do gap, métricas grandes) → **Merriweather** (já usado em headings premium do CRM).
  - UI/labels → **Poppins**.
  - Números, timestamps, IDs, deltas → **JetBrains Mono** (sensação de terminal financeiro).
- **Logo AAM** discreto no header (canto esquerdo, ao lado de "Forecast · Modo TV"), reforçando que é um painel oficial da empresa.

## 2. Elementos novos de "empresa grande"

Coisas que painéis corporativos sérios têm e que dão credibilidade:

### a) Cabeçalho institucional
- Logo AAM + nome do painel + "Sala de Operações" (subtítulo).
- Versão do painel + ID da sessão em mono (ex.: `FORECAST v2.3 · SID 8F2A`).
- Timestamp completo com timezone (`30 mai 2026 · 14:32:07 BRT`).
- "AO VIVO" com LED magenta pulsando + frequência de atualização (`refresh 30s`).

### b) Barra de meta do mês (faltava)
- Barra horizontal grande logo abaixo do hero: `realizado / meta` com % e ETA.
- Marcador de "onde deveríamos estar hoje" (linha vertical pace) — visual de gestão por OKR.

### c) Tira de KPIs executivos
Trocar os 4 mini-cards atuais por uma régua editorial (estilo painel de aeroporto):
- **Pipeline ajustado** (valor ponderado por probabilidade)
- **Velocidade** (R$/dia nos últimos 7d) com delta vs 7d anteriores
- **Conversão Entrada → Aprovada** (%)
- **Tempo médio em análise INSS** (dias)
- **Ticket médio** aprovado no mês

Cada KPI com mini-delta em mono (`▲ 12,4%` / `▼ 3,1%`) e cor semântica suave.

### d) Cards de fase (manter, refinar)
- Borda gradiente sutil só na fase ativa/destaque.
- Adicionar "responsável" implícito: contagem de mães + ticket médio da fase.
- Sparkline em magenta translúcido (não 4 cores diferentes).

### e) Rodapé corporativo
- "Amor Auxílio Maternidade · Painel de Comando" + status do sistema (`ops · nominal`) + última sincronização.
- Aviso: "Dados internos — não compartilhar".

### f) Rotação / modo apresentação (opcional, fora deste plano)
Anotado para depois: rotação automática entre views (forecast → ranking → SLA). Não entra agora.

## 3. Movimento e ritmo

- Transição entre valores: 600ms `cubic-bezier(0.22, 1, 0.36, 1)` (já tem).
- Aurora de fundo: manter, **trocar para magenta + carvão** (hoje usa magenta + charcoal genérico, vamos amarrar com `--primary` do tema).
- Pulse do "AO VIVO": magenta, não verde — assina a marca.
- Sem scanline (já removida).

## 4. Escopo técnico

**Arquivo único**: `src/pages/ForecastTV.tsx`.

- Substituir paleta hardcoded (`rose-400`, `amber-400`, etc.) por classes baseadas em tokens (`text-primary`, `text-muted-foreground`, `bg-primary/10`).
- Trocar `font-serif` por `font-serif` confirmando que aponta pra Merriweather no `tailwind.config.ts` (verificar) e usar `font-mono` (JetBrains) nos números pequenos/deltas/timestamps.
- Adicionar componentes locais:
  - `<GoalBar realizado meta />`
  - `<KpiStrip items={[...]} />` (5 KPIs)
  - `<BrandHeader />` com logo
  - `<BrandFooter />`
- Importar logo de `src/assets/logo-aam.png` (verificar caminho real).
- Cálculos dos novos KPIs (velocidade, conversão, ticket médio, tempo médio INSS) saem do mesmo `usePipelineForecast()` — se faltar campo, deixar placeholder com `—` e nota `// TODO: hook expor X` (sem mexer no hook agora).

**Fora de escopo**:
- Mudar dados/backend.
- Rotação automática de views.
- Criar um "modo TV" para outras telas (vira projeto separado depois).

---

Confirma que faz sentido assim que eu implemento. Se quiser cortar algum item (ex.: KPI strip com 5 itens é muito), me diz qual fica de fora.
