import { useState, useEffect, useRef, useCallback } from "react";

interface MisspelledWord {
  word: string;
  index: number;
  suggestions: string[];
}

// Common Portuguese words that are frequently misspelled (without accents)
// Maps misspelling -> correct forms
const COMMON_CORRECTIONS: Record<string, string[]> = {
  // Missing accents
  "voce": ["você"],
  "voces": ["vocês"],
  "nos": ["nós"],
  "ate": ["até"],
  "ja": ["já"],
  "so": ["só"],
  "ai": ["aí"],
  "entao": ["então"],
  "nao": ["não"],
  "tambem": ["também"],
  "obrigacao": ["obrigação"],
  "informacao": ["informação"],
  "situacao": ["situação"],
  "atencao": ["atenção"],
  "opcao": ["opção"],
  "autorizacao": ["autorização"],
  "documentacao": ["documentação"],
  "previdenciario": ["previdenciário"],
  "necessario": ["necessário"],
  "salario": ["salário"],
  "maternidade": [], // correct
  "beneficio": ["benefício"],
  "possivel": ["possível"],
  "disponivel": ["disponível"],
  "horario": ["horário"],
  "obrigado": [], // correct  
  "obrigada": [], // correct
  "esta": ["está"],
  "e": ["é"],
  "sera": ["será"],
  "numero": ["número"],
  "telefone": [], // correct
  "analise": ["análise"],
  "mae": ["mãe"],
  "maes": ["mães"],
  "tera": ["terá"],
  "alguem": ["alguém"],
  "ninguem": ["ninguém"],
  // "tambem" already defined above
  "alem": ["além"],
  "porem": ["porém"],
  "atraves": ["através"],
  "duvida": ["dúvida"],
  "duvidas": ["dúvidas"],
  "pagina": ["página"],
  "ultimo": ["último"],
  "ultima": ["última"],
  "proxima": ["próxima"],
  "proximo": ["próximo"],
  "sabado": ["sábado"],
  "periodo": ["período"],
  "inicio": ["início"],
  "apos": ["após"],
  "valido": ["válido"],
  "valida": ["válida"],
  "unico": ["único"],
  "unica": ["única"],
  "otimo": ["ótimo"],
  "otima": ["ótima"],
  "obrigatorio": ["obrigatório"],
  "obrigatoria": ["obrigatória"],
  "solicitacao": ["solicitação"],
  "anexacao": ["anexação"],
  "verificacao": ["verificação"],
  "comprovacao": ["comprovação"],
  "contribuicao": ["contribuição"],
  "contribuicoes": ["contribuições"],
  "resolucao": ["resolução"],
  "pendencia": ["pendência"],
  "pendencias": ["pendências"],
  "referencia": ["referência"],
  "consequencia": ["consequência"],
  "experiencia": ["experiência"],
  "audiencia": ["audiência"],
  "exigencia": ["exigência"],
  "urgencia": ["urgência"],
  "frequencia": ["frequência"],
  "transferencia": ["transferência"],
  "diferenca": ["diferença"],
  "licenca": ["licença"],
  "aguardem": [], // correct
  "previdencia": ["previdência"],
  "providencia": ["providência"],
  "permanencia": ["permanência"],
  
  // Common typos / letter swaps
  "cmo": ["como"],
  "qeu": ["que"],
  "qeuro": ["quero"],
  "ola": ["olá"],
  "oq": ["o que", "o quê"],
  "pq": ["por que", "porque"],
  "tb": ["também"],
  "tbm": ["também"],
  "vc": ["você"],
  "vcs": ["vocês"],
  "hj": ["hoje"],
  "msg": ["mensagem"],
  "qdo": ["quando"],
  "qnd": ["quando"],
  "td": ["tudo"],
  "tdo": ["tudo"],
  "mto": ["muito"],
  "mt": ["muito"],
  "obrg": ["obrigado", "obrigada"],
  "obg": ["obrigado", "obrigada"],
  "blz": ["beleza"],
  "flw": ["falou"],
  "cmg": ["comigo"],
  "ctg": ["contigo"],
  "dps": ["depois"],
  "msm": ["mesmo"],
  "ngm": ["ninguém"],
  "agr": ["agora"],
  "tmb": ["também"],
  "dnv": ["de novo"],
  "pfv": ["por favor"],
  "pfvr": ["por favor"],
  "nd": ["nada"],
  "bom dia": [], // correct
  
  // More accent errors
  "mae maternidade": [], // skip compound
  "elegivel": ["elegível"],
  "inelegivel": ["inelegível"],
  "indeferida": [], // correct
  "protocolo": [], // correct
  "recurso": [], // correct
  "judicial": [], // correct
  "encerrado": [], // correct
  "rescisao": ["rescisão"],
  "contrato": [], // correct
  "comissao": ["comissão"],
  "financeiro": [], // correct
  "orcamento": ["orçamento"],
  "servico": ["serviço"],
  "servicos": ["serviços"],
  "preco": ["preço"],
  "precos": ["preços"],
  "acoes": ["ações"],
  "condicao": ["condição"],
  "condicoes": ["condições"],
  "excecao": ["exceção"],
  "instrucao": ["instrução"],
  "instrucoes": ["instruções"],
  "protecao": ["proteção"],
  "producao": ["produção"],
};

// Build a Set of known-good words (Portuguese)
const KNOWN_GOOD = new Set([
  "a", "o", "e", "de", "do", "da", "em", "um", "uma", "os", "as", "no", "na",
  "por", "com", "para", "se", "que", "ou", "ao", "dos", "das", "nos", "nas",
  "seu", "sua", "ele", "ela", "eu", "me", "te", "lo", "la", "lhe",
  "sim", "ok", "oi", "ei", "ah", "oh",
]);

const WORD_REGEX = /[a-zA-ZÀ-ÿ]+/g;
const MIN_WORD_LENGTH = 2;

export function useSpellCheck(text: string, debounceMs = 300) {
  const [misspelled, setMisspelled] = useState<MisspelledWord[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!text.trim()) {
      setMisspelled([]);
      return;
    }

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const results: MisspelledWord[] = [];
      let match: RegExpExecArray | null;
      
      WORD_REGEX.lastIndex = 0;
      while ((match = WORD_REGEX.exec(text)) !== null) {
        const word = match[0];
        if (word.length < MIN_WORD_LENGTH) continue;
        if (word === word.toUpperCase()) continue; // skip acronyms
        
        const lower = word.toLowerCase();
        if (KNOWN_GOOD.has(lower)) continue;
        
        const corrections = COMMON_CORRECTIONS[lower];
        if (corrections !== undefined && corrections.length > 0) {
          results.push({ word, index: match.index, suggestions: corrections });
        }
      }
      
      setMisspelled(results);
    }, debounceMs);

    return () => clearTimeout(timerRef.current);
  }, [text, debounceMs]);

  const applySuggestion = useCallback(
    (original: string, suggestion: string, currentText: string): string => {
      const regex = new RegExp(`\\b${original}\\b`, "i");
      return currentText.replace(regex, suggestion);
    },
    []
  );

  return { misspelled, isLoading: false, applySuggestion };
}
