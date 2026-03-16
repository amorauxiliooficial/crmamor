const BASE_URL = import.meta.env.VITE_EVOLUTION_API_URL as string;
const API_KEY = import.meta.env.VITE_EVOLUTION_API_KEY as string;

function headers(): HeadersInit {
  return {
    "Content-Type": "application/json",
    apikey: API_KEY,
    Authorization: `Bearer ${API_KEY}`,
  };
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, { ...init, headers: headers() });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Evolution API erro ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export async function createInstance(instanceName: string): Promise<void> {
  await request("/instance/create", {
    method: "POST",
    body: JSON.stringify({ instanceName }),
  });
}

export async function getQRCode(instanceName: string): Promise<{ qrcode: string }> {
  return request<{ qrcode: string }>(`/instance/connect/${instanceName}`);
}

export async function getInstanceStatus(instanceName: string): Promise<{ status: string }> {
  const data = await request<{ instance?: { state?: string }; state?: string }>(
    `/instance/connectionState/${instanceName}`
  );
  return { status: data.instance?.state ?? data.state ?? "unknown" };
}

export async function sendTextMessage(
  instanceName: string,
  phone: string,
  message: string
): Promise<void> {
  await request(`/message/sendText/${instanceName}`, {
    method: "POST",
    body: JSON.stringify({ number: phone, text: message }),
  });
}

export async function deleteInstance(instanceName: string): Promise<void> {
  await request(`/instance/delete/${instanceName}`, { method: "DELETE" });
}
