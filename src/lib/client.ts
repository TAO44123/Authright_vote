export type PollInfo = {
  id: string;
  title: string;
  description: string;
  startsAt: number;
  endsAt: number;
  closedAt: number | null;
  archivedAt?: number | null;
  status: "upcoming" | "live" | "ended";
  options: { id: string; label: string; position: number }[];
};

export type Stats = {
  total: number;
  options: { id: string; label: string; position: number; votes: number; percent: number }[];
};

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { cache: "no-store", ...init });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "请求失败，请稍后再试");
  return body as T;
}

export function postJson<T>(path: string, data: unknown) {
  return api<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

let originRequest: Promise<string> | undefined;

export function publicOrigin() {
  if (!originRequest) {
    originRequest = api<{ origin: string }>("/api/config").then((value) => value.origin)
      .catch((error) => { originRequest = undefined; throw error; });
  }
  return originRequest;
}

export function randomUuid() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", timeZoneName: "short" }).format(timestamp);
}

export function formatCountdown(ms: number) {
  if (ms <= 0) return "00:00:00";
  const total = Math.ceil(ms / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const base = [hours, minutes, seconds].map((number) => String(number).padStart(2, "0")).join(":");
  return days ? `${days} 天 ${base}` : base;
}

export function message(error: unknown) {
  return error instanceof Error ? error.message : "操作失败，请稍后再试";
}

export async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(text); return; } catch { /* 在局域网 HTTP 页面回退到选择复制。 */ }
  }
  const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const field = document.createElement("textarea");
  field.value = text;
  field.style.position = "fixed";
  field.style.left = "-9999px";
  document.body.appendChild(field);
  field.focus();
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  previous?.focus();
  if (!copied) throw new Error("复制失败，请手动复制链接");
}
