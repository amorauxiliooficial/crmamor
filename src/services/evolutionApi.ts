import { getEvolutionEnv } from "@/config/evolutionEnv";

function headers(apiKey: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    apikey: apiKey,
    Authorization: `Bearer ${apiKey}`,
  };
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const { baseUrl, apiKey } = getEvolutionEnv();
  const res = await fetch(`${baseUrl}${url}`, {
    ...init,
    headers: { ...headers(apiKey), ...(init?.headers ?? {}) },
  });

  const text = await res.text().catch(() => "");
  const json = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    const msg =
      typeof json === "object" && json && "message" in json
        ? String((json as { message?: unknown }).message)
        : text || res.statusText;
    throw new Error(`Evolution API erro ${res.status}: ${msg}`);
  }

  return json as T;
}

export async function fetchInstances(): Promise<any[]> {
  const data = await request<any[]>("/instance/fetchInstances");
  return Array.isArray(data) ? data : [];
}

export async function createInstance(instanceName: string): Promise<void> {
  await request<unknown>("/instance/create", {
    method: "POST",
    body: JSON.stringify({
      instanceName,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
    }),
  });
}

export async function getQRCode(instanceName: string): Promise<{ qrcode: string }> {
  const data = await request<{ qrcode?: string; code?: string; pairingCode?: string }>(
    `/instance/connect/${encodeURIComponent(instanceName)}`,
  );
  return { qrcode: data.qrcode ?? data.code ?? data.pairingCode ?? "" };
}

export async function getInstanceStatus(instanceName: string): Promise<{ status: string }> {
  const data = await request<{ instance?: { state?: string }; state?: string }>(
    `/instance/connectionState/${encodeURIComponent(instanceName)}`,
  );
  return { status: data.instance?.state ?? data.state ?? "unknown" };
}

export async function sendTextMessage(instanceName: string, phone: string, message: string): Promise<void> {
  await request<unknown>(`/message/sendText/${encodeURIComponent(instanceName)}`, {
    method: "POST",
    body: JSON.stringify({
      number: phone.replace(/^\+/, ""),
      textMessage: { text: message },
    }),
  });
}

export async function deleteInstance(instanceName: string): Promise<void> {
  await request<unknown>(`/instance/delete/${encodeURIComponent(instanceName)}`, {
    method: "DELETE",
  });
}
