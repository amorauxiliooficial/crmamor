export type EvolutionEnv = {
  baseUrl: string;
  apiKey: string;
};

export class MissingEvolutionEnvError extends Error {
  readonly code = "MISSING_EVOLUTION_ENV" as const;
  readonly missingKeys: string[];

  constructor(missingKeys: string[]) {
    super(
      `Variáveis de ambiente ausentes: ${missingKeys.join(", ")}. Configure-as antes de usar a Evolution API.`
    );
    this.name = "MissingEvolutionEnvError";
    this.missingKeys = missingKeys;
  }
}

export function getEvolutionEnv(): EvolutionEnv {
  const rawUrl = import.meta.env.VITE_EVOLUTION_API_URL as string | undefined;
  const rawKey = import.meta.env.VITE_EVOLUTION_API_KEY as string | undefined;

  const missing: string[] = [];
  if (!rawUrl) missing.push("VITE_EVOLUTION_API_URL");
  if (!rawKey) missing.push("VITE_EVOLUTION_API_KEY");

  if (missing.length > 0) {
    throw new MissingEvolutionEnvError(missing);
  }

  return {
    baseUrl: rawUrl.replace(/\/+$/, ""),
    apiKey: rawKey,
  };
}
