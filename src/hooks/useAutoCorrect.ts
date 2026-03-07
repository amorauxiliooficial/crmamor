import { useCallback } from "react";

// Common Portuguese words that are frequently misspelled (without accents)
// Maps misspelling -> first correction (auto-applied)
const AUTO_CORRECTIONS: Record<string, string> = {
  // Missing accents
  "voce": "você",
  "voces": "vocês",
  "ate": "até",
  "ja": "já",
  "so": "só",
  "ai": "aí",
  "entao": "então",
  "nao": "não",
  "tambem": "também",
  "obrigacao": "obrigação",
  "informacao": "informação",
  "situacao": "situação",
  "atencao": "atenção",
  "opcao": "opção",
  "autorizacao": "autorização",
  "documentacao": "documentação",
  "previdenciario": "previdenciário",
  "necessario": "necessário",
  "salario": "salário",
  "beneficio": "benefício",
  "possivel": "possível",
  "disponivel": "disponível",
  "horario": "horário",
  "esta": "está",
  "sera": "será",
  "numero": "número",
  "analise": "análise",
  "mae": "mãe",
  "maes": "mães",
  "tera": "terá",
  "alguem": "alguém",
  "ninguem": "ninguém",
  "alem": "além",
  "porem": "porém",
  "atraves": "através",
  "duvida": "dúvida",
  "duvidas": "dúvidas",
  "pagina": "página",
  "ultimo": "último",
  "ultima": "última",
  "proxima": "próxima",
  "proximo": "próximo",
  "sabado": "sábado",
  "periodo": "período",
  "inicio": "início",
  "apos": "após",
  "valido": "válido",
  "valida": "válida",
  "unico": "único",
  "unica": "única",
  "otimo": "ótimo",
  "otima": "ótima",
  "obrigatorio": "obrigatório",
  "obrigatoria": "obrigatória",
  "solicitacao": "solicitação",
  "verificacao": "verificação",
  "comprovacao": "comprovação",
  "contribuicao": "contribuição",
  "contribuicoes": "contribuições",
  "resolucao": "resolução",
  "pendencia": "pendência",
  "pendencias": "pendências",
  "referencia": "referência",
  "consequencia": "consequência",
  "experiencia": "experiência",
  "audiencia": "audiência",
  "exigencia": "exigência",
  "urgencia": "urgência",
  "frequencia": "frequência",
  "transferencia": "transferência",
  "diferenca": "diferença",
  "licenca": "licença",
  "previdencia": "previdência",
  "providencia": "providência",
  "permanencia": "permanência",
  "elegivel": "elegível",
  "inelegivel": "inelegível",
  "rescisao": "rescisão",
  "comissao": "comissão",
  "orcamento": "orçamento",
  "servico": "serviço",
  "servicos": "serviços",
  "preco": "preço",
  "precos": "preços",
  "acoes": "ações",
  "condicao": "condição",
  "condicoes": "condições",
  "excecao": "exceção",
  "instrucao": "instrução",
  "instrucoes": "instruções",
  "protecao": "proteção",
  "producao": "produção",
  "ola": "olá",

  // Abbreviations
  "vc": "você",
  "vcs": "vocês",
  "tb": "também",
  "tbm": "também",
  "tmb": "também",
  "hj": "hoje",
  "qdo": "quando",
  "qnd": "quando",
  "mto": "muito",
  "mt": "muito",
  "obg": "obrigado",
  "obrg": "obrigado",
  "pfv": "por favor",
  "pfvr": "por favor",
  "dps": "depois",
  "msm": "mesmo",
  "ngm": "ninguém",
  "agr": "agora",
  "dnv": "de novo",
  "cmg": "comigo",
  "ctg": "contigo",
  "blz": "beleza",
  "flw": "falou",
  "pq": "porque",
  "nd": "nada",
};

/**
 * Hook that auto-corrects the last typed word when a word boundary is detected
 * (space, enter, punctuation). Returns a handler to wrap onChange.
 */
export function useAutoCorrect(
  onTextChange: (text: string) => void
) {
  const handleChange = useCallback(
    (newText: string, prevText: string) => {
      // Only auto-correct when text got longer (typing, not deleting)
      if (newText.length <= prevText.length) {
        onTextChange(newText);
        return;
      }

      const lastChar = newText[newText.length - 1];
      const isWordBoundary = /[\s,.!?;:)}\]>]/.test(lastChar);

      if (!isWordBoundary) {
        onTextChange(newText);
        return;
      }

      // Extract the last word before the boundary
      const beforeBoundary = newText.slice(0, -1);
      const lastWordMatch = beforeBoundary.match(/([a-zA-ZÀ-ÿ]+)$/);

      if (!lastWordMatch) {
        onTextChange(newText);
        return;
      }

      const lastWord = lastWordMatch[0];
      const lower = lastWord.toLowerCase();
      const correction = AUTO_CORRECTIONS[lower];

      if (correction) {
        // Preserve original casing for first letter if word was capitalized
        let corrected = correction;
        if (lastWord[0] === lastWord[0].toUpperCase() && lastWord[0] !== lastWord[0].toLowerCase()) {
          corrected = correction[0].toUpperCase() + correction.slice(1);
        }

        const prefix = newText.slice(0, newText.length - 1 - lastWord.length);
        const correctedText = prefix + corrected + lastChar;
        onTextChange(correctedText);
      } else {
        onTextChange(newText);
      }
    },
    [onTextChange]
  );

  return handleChange;
}
