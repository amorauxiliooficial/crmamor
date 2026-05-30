# Plano: preview real do Modo TV no forecast

Vou substituir a ideia de mockup interrompido por um preview navegável de verdade dentro do sistema, usando o visual que já existe hoje.

## O que vou construir

1. Criar uma nova tela `/forecast/tv`
   - Tela pensada para TV/monitor
   - Mesmo tema atual do sistema: carvão, magenta, bordas sutis, Poppins + JetBrains Mono
   - Sem estética sci-fi exagerada

2. Montar a hierarquia visual focada em meta
   - Hero principal com “quanto falta para bater a meta”
   - Barra de progresso da meta total
   - Leitura imediata de realizado, meta e projeção

3. Destacar as 4 etapas do funil
   - Gestantes
   - Entradas do Mês
   - Aguardando Análise INSS
   - Aprovada
   
   Cada etapa terá:
   - quantidade atual
   - valor atual
   - meta da etapa
   - quanto falta para bater a meta
   - percentual de atingimento

4. Dar acesso fácil ao preview
   - Adicionar um botão “Modo TV” na página `/forecast`
   - Abrir a rota nova para você visualizar imediatamente

## Direção visual

- Mantém os tokens já existentes do sistema
- Cards no padrão atual, sem tabelas densas
- Contraste forte no número principal de gap
- Destaque magenta para o que falta atingir
- Verde apenas onde já estiver batido ou muito próximo

## Arquivos que devo mexer

- `src/App.tsx`
- `src/pages/ForecastDashboard.tsx`
- `src/pages/ForecastTV.tsx` (novo)

## Detalhes técnicos

- Vou reaproveitar `usePipelineForecast()` para usar os dados reais já calculados
- Não preciso mexer no backend nem nas regras de negócio
- O cálculo de gap, meta e atingimento virá da estrutura atual do forecast
- A tela será otimizada para leitura rápida em viewport larga

## Resultado esperado

Você vai conseguir entrar no preview real do Modo TV e avaliar o layout antes de qualquer refinamento visual adicional.