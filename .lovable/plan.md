# Plano: Modo TV — refinamento premium

Inspiração: padrão Linear + Apple + Stripe — escuro, denso de informação onde precisa, generoso onde importa, motion lento e contido.

## 1. Remover a scanline

Sai a linha animada magenta atravessando a tela. Fica grid técnico (mais sutil ainda) e glow do hero.

## 2. Fundo "aurora" (substitui a scanline)

- Camada de gradiente mesh: 2-3 manchas grandes desfocadas em magenta + carvão, posicionadas atrás do hero
- Movimento lento (60s+), quase imperceptível, dá sensação de "vivo" sem distrair
- Grid técnico vai pra 2% de opacidade, com vinheta radial mais forte para sumir nas bordas
- Ruído fino monocromático (film grain) bem leve por cima de tudo — clássico premium

## 3. Tipografia premium

- Número grande do gap em **Merriweather** (serif já no sistema) ao invés de mono — dá ar editorial, tipo Apple keynote
- Subir tamanho do gap para `text-[10rem]` em telas grandes
- Letter-spacing ajustado para negativo no display, kerning premium
- Labels minúsculas em mono mantêm o lado técnico

## 4. Hierarquia + respiro

- Hero ganha mais ar (padding maior, sem disputa com mini-cards do lado)
- Mini-cards de "dias restantes / projeção / pipeline ajustado" viram uma **faixa horizontal fina** logo abaixo do hero, separada por divisores verticais, estilo barra de estatísticas de aeroporto/bolsa
- 4 cards de fase ganham padding interno maior, sombra suave em vez de fundo tonal

## 5. Profundidade refinada

- Cards com borda em **gradiente** (`border-image`) bem sutil — magenta no topo desvanecendo para transparente
- Sombra realista em camadas (Linear-style): `0 1px 0 white/5, 0 10px 30px black/40`
- Hover/destaque com leve elevação (sem escala, só shadow)
- Glassmorphism no header e rodapé (já tem backdrop-blur, intensificar)

## 6. Motion premium

- Tudo com easing customizado (cubic-bezier suave, 600-900ms)
- Hero entra com fade + leve subida 8px ao montar
- Cards entram em cascata (stagger 80ms)
- Barra de progresso anima da esquerda em 1.2s
- Aurora respira em 60s loop

## 7. Detalhes que comunicam "premium"

- LED "AO VIVO" mais discreto: ponto verde minúsculo + texto fininho, sem badge cheio
- Brackets nos cantos saem (eram HUD demais) — bordas finas em gradiente substituem
- Rodapé técnico mantém, mas menor e mais espaçado
- Status do ritmo vira chip único centralizado: linha fina + tipografia maiúscula com tracking generoso

## Fora de escopo desta etapa

- Não mexo no botão "Modo TV" do dashboard
- Não toco em dados/backend (sparkline continua sintético até decidirmos)
- Mantém estrutura: hero + faixa de stats + 4 cards de fase

## Arquivos

- `src/pages/ForecastTV.tsx` (refatoração visual completa, mesma estrutura de dados)

## Detalhes técnicos

- Aurora via 2-3 `div` com `radial-gradient` + `blur-3xl` + animação CSS lenta
- Film grain via SVG inline com `feTurbulence` aplicado como background fixo de baixíssima opacidade
- Bordas em gradiente via `border-image` ou pseudo-elemento com `mask-composite`
- Easing customizado declarado uma vez via classe utilitária inline
- Sem libs novas, sem framer-motion adicional

## Resultado esperado

Sensação de "produto de empresa grande, atualizando ao vivo, com confiança" — menos arcade, mais sala de controle de companhia aérea/banco premium.