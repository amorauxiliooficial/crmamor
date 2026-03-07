

## Mapeamento do Projeto

### 1. Entidade/Tabela da Mãe
- **Tabela**: `mae_processo`
- **Campos de telefone atuais**: `telefone` (texto livre), `telefone_e164` (normalizado E.164)
- Apenas **1 telefone** é suportado hoje

### 2. Modal "Editar Pagamento"
- **Componente**: `src/components/pagamentos/PagamentoDialog.tsx`
- Recebe `maeId` e `maeNome` como props — não exibe/edita telefones da mãe atualmente

### 3. Onde dados da mãe são carregados/salvos
- **Cadastro**: `src/components/mae/MaeFormDialog.tsx` — insere em `mae_processo`
- **Edição**: `src/components/mae/MaeEditDialog.tsx` — atualiza `mae_processo`
- **Listagem**: `src/hooks/useMaesData.ts` — fetch de `mae_processo`
- **Contatos multi-canal**: já existe `src/hooks/useMotherContacts.ts` com tabela `mother_contacts` (WhatsApp/phone/email, com `is_primary`, `active`, `mae_id`)

### 4. Recomendação de Modelagem

**Usar a tabela `mother_contacts` já existente** — ela já suporta múltiplos contatos por mãe com tipo, prioridade e status ativo. Não é necessário criar colunas extras nem tabelas novas.

---

## Plano de Implementação

### Passo 1 — Nenhuma mudança no banco
A tabela `mother_contacts` já existe com os campos necessários (`mae_id`, `contact_type`, `value_e164`, `is_primary`, `active`). RLS já está configurada para CRUD por usuários autenticados.

### Passo 2 — MaeFormDialog: cadastro com até 3 telefones
- Adicionar array de até 3 campos de telefone no formulário (o primeiro é obrigatório, os demais opcionais)
- Após inserir em `mae_processo`, inserir os telefones na tabela `mother_contacts` usando o hook `useMotherContactActions().addContact`
- O primeiro telefone será `is_primary: true`
- Manter o campo `telefone` / `telefone_e164` em `mae_processo` sincronizado com o telefone primário (backward compatibility)

### Passo 3 — MaeEditDialog: edição dos telefones
- Carregar contatos existentes via `useMotherContacts(mae.id)`
- Exibir até 3 campos editáveis com botão de adicionar/remover
- Ao salvar, sincronizar: adicionar novos, desativar removidos, atualizar primário
- Atualizar `mae_processo.telefone` e `telefone_e164` com o contato primário

### Passo 4 — PagamentoDialog: exibir/editar telefones na conferência
- Carregar `useMotherContacts(maeId)` dentro do `PagamentoDialog`
- Exibir seção "Telefones de Contato" no header do dialog (junto com `maeNome`)
- Permitir edição inline dos telefones (adicionar/remover/marcar primário)
- Usar os mesmos hooks `useMotherContactActions` para persistir

### Passo 5 — Validação
- Usar `normalizePhoneToE164BR` (de `src/lib/phoneUtils.ts`) para validar cada telefone antes de salvar
- Impedir duplicatas (mesmo número para mesma mãe)
- Limitar a 3 contatos telefônicos por mãe no frontend
- Máscara de formatação `(DD) XXXXX-XXXX` nos inputs

### Passo 6 — Componente reutilizável
- Criar `src/components/mae/PhoneContactsEditor.tsx` — componente com até 3 inputs de telefone, estrela para primário, botão remover
- Reutilizar em `MaeFormDialog`, `MaeEditDialog` e `PagamentoDialog`

