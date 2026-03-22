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

/**
 * Returns the request Origin if it matches one of the allowed origins,
 * otherwise returns the first allowed origin as a safe default.
 */
export function getAllowedOrigin(req: Request): string {
  const allowedRaw = Deno.env.get("ALLOWED_ORIGINS") || "";
  const allowedList = allowedRaw
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  if (allowedList.length === 0) {
    // Fallback: if env var is not set, deny by returning empty
    return "";
  }

  const origin = req.headers.get("Origin") || "";
  if (allowedList.includes(origin)) {
    return origin;
  }

  return allowedList[0];
}

/**
 * Build CORS headers with the dynamic allowed origin.
 */
export function buildCorsHeaders(req: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": getAllowedOrigin(req),
    "Access-Control-Allow-Headers": DEFAULT_ALLOWED_HEADERS,
  };
}

/**
 * Public CORS headers — keeps wildcard origin for public endpoints.
 */
export function publicCorsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": DEFAULT_ALLOWED_HEADERS,
  };
}
