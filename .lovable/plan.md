
# Histórico de Observações da Mãe

Substituir o campo único "Observações" (texto solto + modal) por um **histórico cronológico de anotações** exibido direto na tela de detalhes da mãe, sem abrir modal.

## O que muda na experiência

1. **Sem modal**: bloco "Observações & Histórico" passa a ficar embutido na própria página de detalhes da mãe (logo abaixo dos dados, como na imagem que você mandou), expandindo conforme o histórico cresce.
2. **Cada anotação é uma entrada independente** com:
   - Texto da observação
   - Autor (atendente que escreveu)
   - Data e hora exatas
   - Tag/categoria (Ligação, WhatsApp, Documento, Reunião, Outro)
   - Indicador "📌 Fixada" quando marcada como importante
3. **Campo de nova anotação** sempre visível no topo: caixa de texto + seletor de categoria + botão "Adicionar". Nada sobrescreve o histórico — cada clique gera nova entrada com timestamp.
4. **Anotações fixadas aparecem no topo** (acima do feed cronológico), com destaque visual, para informações críticas que o time precisa ver primeiro.
5. **Editar / excluir** com log: ao editar, fica registrado "editado por X em DD/MM HH:MM"; ao excluir, soft-delete preservando o registro de quem apagou.
6. **Busca e filtros** no topo do histórico:
   - Campo de busca textual
   - Filtro por categoria (tags)
   - Filtro por autor
   - Filtro por período (data inicial/final)

## Layout proposto (inline, sem modal)

```text
┌─ Observações & Histórico ──────────────────────────┐
│ [+ Nova anotação ▾ Categoria ] [Adicionar]        │
│                                                    │
│ 🔎 Buscar...  [Categoria ▾] [Autor ▾] [Período ▾] │
│                                                    │
│ ── 📌 Fixadas ─────────────────────────────────── │
│ 📌 [WhatsApp] Cliente confirmou docs              │
│    Maria Silva · 18/06/2026 14:32     [✏️] [🗑️] │
│                                                    │
│ ── Histórico ──────────────────────────────────── │
│ [Ligação] Liguei para cliente dia 19/04           │
│    João · 17/06/2026 09:15 (editado)  [✏️] [🗑️] │
│ [Documento] Recebi CNIS por e-mail                │
│    Ana · 15/06/2026 16:40             [✏️] [🗑️] │
│ ...                                                │
└────────────────────────────────────────────────────┘
```

Antes de salvar uma edição/exclusão, mostro um pequeno preview/confirmação (atendendo seu pedido de "ver a tela antes de alterar").

## Migração dos dados atuais

O texto atual no campo `observacoes` da `mae_processo` será convertido automaticamente em **uma primeira entrada de histórico** por mãe, com:
- Categoria: "Importado"
- Autor: "Sistema" (já que não temos o autor original)
- Data: `data_ultima_atualizacao` da mãe
Assim nada se perde.

## Detalhes técnicos

- **Nova tabela** `mae_observacoes`:
  - `mae_id` (FK), `autor_id` (FK profiles), `autor_nome` (snapshot),
  - `texto`, `categoria` (enum: ligacao, whatsapp, documento, reuniao, importado, outro),
  - `fixada` (bool), `editada_em`, `editada_por`,
  - `excluida_em`, `excluida_por` (soft delete),
  - `created_at`, `updated_at`.
  - RLS: leitura para `authenticated` (mantém "todo mundo vê tudo"); insert/update apenas pelo próprio autor ou admin; service_role total.
  - GRANTs padrão (`authenticated`, `service_role`).
  - Trigger `update_mae_ultima_atividade` reaproveitada para refletir atividade na mãe.
- **Backfill** via migration: insere 1 linha em `mae_observacoes` para cada `mae_processo` com `observacoes` não vazio.
- **Componente novo** `src/components/mae/ObservacoesHistorico.tsx` (inline, sem Dialog), substituindo o uso atual do modal de observações dentro de `MaeDetailDialog`/`MaeEditDialog`.
- Hooks: `useMaeObservacoes(maeId)` com React Query + realtime subscription, seguindo o padrão já usado no projeto.
- Campo legado `mae_processo.observacoes` permanece por enquanto (apenas leitura, oculto da UI) para não quebrar nada — pode ser removido depois.

## Fora de escopo (posso fazer depois se quiser)

- Anexar arquivos/imagens nas anotações
- Menções @atendente com notificação
- Exportar histórico em PDF
