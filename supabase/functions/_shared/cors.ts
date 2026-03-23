const DEFAULT_ALLOWED_HEADERS = [
  "authorization",
  "x-client-info",
  "apikey",
  "content-type",
  "x-internal-token",
  "x-webhook-secret",
  "x-supabase-client-platform",
  "x-supabase-client-platform-version",
  "x-supabase-client-runtime",
  "x-supabase-client-runtime-version",
].join(", ");

export function getAllowedOrigin(req: Request): string {
  const allowedRaw = Deno.env.get("ALLOWED_ORIGINS") || "";
  const allowedList = allowedRaw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  if (allowedList.length === 0) {
    return "*";
  }

  const origin = req.headers.get("Origin") || "";
  if (allowedList.includes(origin)) {
    return origin;
  }

  return allowedList[0];
}

export function buildCorsHeaders(req: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": getAllowedOrigin(req),
    "Access-Control-Allow-Headers": DEFAULT_ALLOWED_HEADERS,
  };
}

export function publicCorsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": DEFAULT_ALLOWED_HEADERS,
  };
}
