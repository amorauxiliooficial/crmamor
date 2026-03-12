

## Plano: Template padrão "retomar_atendimento" com auto-preenchimento

### Resumo
Transformar o `SendTemplateDialog` para que, ao abrir, já selecione automaticamente o template `retomar_atendimento` (pt_BR), resolva o primeiro nome do contato, e envie com apenas 1 variável — sem exigir seleção manual nem campo extra.

### Mudanças

**1. `SendTemplateDialog.tsx` — Refatorar para fluxo direto**
- Adicionar prop `waName?: string | null` para receber o nome do contato da conversa.
- Ao abrir o dialog (`open` = true), buscar o `lead_intake` pelo `conversationId` para obter `lead_intake.name`.
- Resolver `primeiroNome`: `lead_intake.name?.split(" ")[0]` → `waName?.split(" ")[0]` → `"tudo bem"`.
- Pré-preencher a variável `{{1}}` com o `primeiroNome` resolvido (editável pelo usuário).
- Remover a etapa de seleção de template — ir direto para a tela de preenchimento/envio.
- Mostrar apenas 1 campo de variável (`{{1}}`).
- No `handleSend`, chamar `whatsapp-send` com payload fixo:
  ```json
  {
    "type": "template",
    "template_name": "retomar_atendimento",
    "template_language": "pt_BR",
    "variables": ["<primeiro_nome>"],
    "to": "<phone>",
    "conversation_id": "<id>"
  }
  ```
- Manter botão "Outros templates" para caso o usuário queira selecionar outro template (preservar funcionalidade atual como fallback).

**2. `ChatPanel.tsx` — Passar `waName`**
- Adicionar `waName={conversa?.waName}` na invocação do `<SendTemplateDialog>`.

**3. `useSendTemplate` (useWaTemplates.ts) — Suportar campo `variables`**
- Atualizar o `mutationFn` para aceitar `variables` como alternativa a `template_components`, passando-o diretamente ao `whatsapp-send`.

**4. `whatsapp-send` edge function — Verificar suporte a `variables`**
- Confirmar que a edge function já suporta receber `variables` array para templates, ou ajustar para construir o payload Meta a partir dele.

### Fluxo do usuário
1. Clica em "Enviar Template" → Dialog abre já com preview do template `retomar_atendimento`
2. Campo `{{1}}` pré-preenchido com o primeiro nome
3. Clica "Enviar" → template enviado
4. Opção de "Outros templates" disponível se precisar de outro

