# Plano: camada "tecnológica" no Modo TV

Adicionar elementos de painel/telemetria à tela `/forecast/tv` sem quebrar o visual atual.

## 1. Ambiente (fundo da tela)

- Grid técnico sutil: linhas finas em magenta 4% de opacidade cobrindo o fundo inteiro
- Scanline horizontal animada bem leve, atravessando a tela a cada ~15s
- Glow pulsante atrás do número grande de gap (respira lentamente)

## 2. Header com telemetria ao vivo

- Relógio digital em fonte mono, atualizando a cada segundo
- LED verde piscando a cada sincronização do Realtime
- Texto "última atualização há Xs" ao lado, em mono cinza
- Rodapé fino na base: `SYS · FORECAST v1 · LIVE` em mono discreto

## 3. Hero da meta

- Número grande do gap com animação de contagem (count-up) ao mudar
- Linha tracejada sobre a barra de progresso marcando onde a projeção do mês vai chegar
- Badge de status do ritmo:
  - ACELERANDO (verde) se projeção ≥ meta
  - NO RITMO (âmbar) se projeção entre 90% e 100%
  - ATRASADO (magenta) se projeção < 90%
- Linha "ETA da meta no ritmo atual: DD/MM" calculada a partir da run-rate

## 4. Cards das 4 fases

- Mini sparkline embaixo do número grande (últimos 7 dias da fase)
- Delta vs ontem: `▲ +2 mães` ou `▼ −1 mãe` em verde/vermelho
- Velocidade: badge em mono `+R$ 4,2k / 24h`
- Anel de progresso circular fino ao redor do número de mães

## 5. Detalhes finos

- Corner brackets discretos nas pontas dos cards (estilo HUD)
- Animação count-up nos valores R$
- Tabular-nums já está em uso, manter

## Fora de escopo desta etapa

- Ticker rotativo de mães próximas de aprovar (precisa de query nova)
- Som ou alertas sonoros
- Comparação mês a mês

## Arquivos afetados

- `src/pages/ForecastTV.tsx` (principal)
- Possíveis utilitários novos em `src/components/forecast/tv/` para sparkline, corner brackets e count-up

## Dependências de dados

- Sparkline e delta vs ontem precisam de histórico de quantidade por fase por dia.
- **Decisão necessária:** começar com dados simulados/derivados do estado atual ou já criar a base de histórico real (snapshot diário via cron ou agregação de `mae_status_history`)?

## Detalhes técnicos

- Animações via Tailwind keyframes (já existem fade/scale) + CSS puro para scanline e pulso
- Count-up com hook próprio (requestAnimationFrame), sem libs novas
- Sparkline em SVG inline, sem dependências
- Grid de fundo via `background-image` linear-gradient repetido
- Tudo permanece em tokens do design system (magenta, charcoal, mono)