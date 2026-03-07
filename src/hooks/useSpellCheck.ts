import { useState, useEffect, useRef, useCallback } from "react";
import Typo from "typo-js";

interface MisspelledWord {
  word: string;
  index: number;
  suggestions: string[];
}

let dictionaryPromise: Promise<Typo> | null = null;

function loadDictionary(): Promise<Typo> {
  if (!dictionaryPromise) {
    dictionaryPromise = Promise.all([
      fetch("/dictionaries/pt_BR.aff").then((r) => r.text()),
      fetch("/dictionaries/pt_BR.dic").then((r) => r.text()),
    ]).then(
      ([aff, dic]) =>
        new Typo("pt_BR", aff, dic, { platform: "any" })
    );
  }
  return dictionaryPromise;
}

// Preload dictionary on import
loadDictionary();

const WORD_REGEX = /[a-zA-ZÀ-ÿ]+/g;
const MIN_WORD_LENGTH = 2;

export function useSpellCheck(text: string, debounceMs = 400) {
  const [misspelled, setMisspelled] = useState<MisspelledWord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const dictRef = useRef<Typo | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    loadDictionary().then((d) => {
      dictRef.current = d;
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (isLoading || !dictRef.current) return;
    if (!text.trim()) {
      setMisspelled([]);
      return;
    }

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const dict = dictRef.current!;
      const results: MisspelledWord[] = [];
      let match: RegExpExecArray | null;
      
      WORD_REGEX.lastIndex = 0;
      while ((match = WORD_REGEX.exec(text)) !== null) {
        const word = match[0];
        if (word.length < MIN_WORD_LENGTH) continue;
        // Skip ALL CAPS words (acronyms)
        if (word === word.toUpperCase()) continue;
        
        if (!dict.check(word)) {
          const suggestions = dict.suggest(word, 3);
          results.push({ word, index: match.index, suggestions });
        }
      }
      
      setMisspelled(results);
    }, debounceMs);

    return () => clearTimeout(timerRef.current);
  }, [text, isLoading, debounceMs]);

  const applySuggestion = useCallback(
    (original: string, suggestion: string, currentText: string): string => {
      // Replace first occurrence of the misspelled word
      const regex = new RegExp(`\\b${original}\\b`, "i");
      return currentText.replace(regex, suggestion);
    },
    []
  );

  return { misspelled, isLoading, applySuggestion };
}
