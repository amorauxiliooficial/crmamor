import { supabase } from "@/integrations/supabase/client";

/**
 * All Evolution API calls go through the evolution-proxy Edge Function
 * to avoid CORS issues. The Edge Function holds the API credentials.
 */
async function proxyRequest<T = unknown>(payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("evolution-proxy", {
    body: payload,
  });

  if (error) {
    // supabase.functions.invoke wraps non-2xx as FunctionsHttpError
    const msg =
      typeof data === "object" && data?.error
        ? String(data.error)
        : error.message || "Erro na Evolution API";
    throw new Error(msg);
  }

  return data as T;
}

export async function fetchInstances(): Promise<any[]> {
  const data = await proxyRequest<any[]>({ action: "fetchInstances" });
  return Array.isArray(data) ? data : [];
}

export async function createInstance(instanceName: string): Promise<void> {
  await proxyRequest({ action: "createInstance", instanceName });
}

export async function getQRCode(instanceName: string): Promise<{ qrcode: string }> {
  const data = await proxyRequest<{
    qrcode?: string;
    code?: string;
    pairingCode?: string;
    base64?: string;
  }>({ action: "connect", instanceName });

  return { qrcode: data.qrcode ?? data.base64 ?? data.code ?? data.pairingCode ?? "" };
}

export async function getInstanceStatus(instanceName: string): Promise<{ status: string }> {
  const data = await proxyRequest<{
    instance?: { state?: string };
    state?: string;
  }>({ action: "connectionState", instanceName });

  return { status: data.instance?.state ?? data.state ?? "unknown" };
}

export async function sendTextMessage(
  instanceName: string,
  phone: string,
  message: string,
): Promise<void> {
  await proxyRequest({ action: "sendText", instanceName, phone, text: message });
}

export async function deleteInstance(instanceName: string): Promise<void> {
  await proxyRequest({ action: "deleteInstance", instanceName });
}
