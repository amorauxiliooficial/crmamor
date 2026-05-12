## Mudanças na Conferência INSS

### 1. Incluir mães "Aprovada" na lista
Em `src/pages/Conferencia.tsx`:
- Trocar o filtro `eq("status_processo", "Em Análise")` por `in("status_processo", ["Em Análise", "Aprovada"])`.
- Buscar também `senha_gov` no select de `mae_processo`.
- Propagar `senha_gov` na interface `MaeEmAnalise` e nos handlers que abrem o `ConferenciaDialog`.
- Mostrar um pequeno badge/etiqueta na linha (tabela e card mobile) indicando o status (Em Análise / Aprovada) para o atendente saber qual fluxo está conferindo.

Observação: o intervalo de 2 dias e a lógica de "pendente / em dia" continuam iguais para os dois status.

### 2. Copiar CPF e Senha Gov.br no diálogo de conferência
Em `src/components/conferencia/ConferenciaDialog.tsx`:
- Aceitar novas props: `cpf: string` e `senhaGov?: string | null`.
- Logo abaixo do nome da mãe, adicionar dois "chips" / linhas com:
  - **CPF**: valor formatado (XXX.XXX.XXX-XX) + botão ícone `Copy` que copia o CPF limpo (via `navigator.clipboard`) e dispara um `toast` de sucesso.
  - **Senha Gov.br**: valor + botão `Copy` (mesmo padrão usado em `MaeDetailDialog`/`SenhaGovCard`). Se `senhaGov` estiver vazio, mostrar texto "Senha não cadastrada" e desabilitar o botão.
- Usar os mesmos estilos do design system (tokens primary/muted, ícone `Copy` do lucide-react). Sem cores hard-coded.

Em `src/pages/Conferencia.tsx`:
- Passar `cpf={selectedMae.cpf}` e `senhaGov={selectedMae.senha_gov}` ao renderizar o `ConferenciaDialog`.

### Resumo técnico
- Arquivos editados: `src/pages/Conferencia.tsx`, `src/components/conferencia/ConferenciaDialog.tsx`.
- Sem alterações de banco / RLS / edge functions.
- Mantém mobile-first (chips empilham em telas pequenas).