/**
 * Merkezi tanılama logcusu. Sunucuda (Server Component/Action, proxy) ve
 * tarayıcıda güvenle kullanılabilir; hiçbir zaman fırlatmaz (loglama hatası
 * uygulamayı asla çökertmemeli). Tarayıcıda ayrıca son olayları bellekte
 * tutar — Safari gibi tarayıcılarda "hangi aşamada takıldı" sorularını
 * yanıtlamak için konsoldan (`window.__turnuvaLogs()`) okunabilir.
 */

export type LogLevel = "info" | "warn" | "error";

export interface LogEntry {
  level: LogLevel;
  scope: string;
  message: string;
  detail?: unknown;
  at: number;
}

const MAX_BUFFER = 60;
const buffer: LogEntry[] = [];

function serialize(detail: unknown): unknown {
  if (detail instanceof Error) {
    return { name: detail.name, message: detail.message, stack: detail.stack };
  }
  return detail;
}

function emit(level: LogLevel, scope: string, message: string, detail?: unknown): void {
  try {
    const entry: LogEntry = { level, scope, message, detail: serialize(detail), at: Date.now() };
    buffer.push(entry);
    if (buffer.length > MAX_BUFFER) buffer.shift();

    const tag = `[${scope}]`;
    const args: unknown[] = detail === undefined ? [tag, message] : [tag, message, entry.detail];
    if (level === "error") console.error(...args);
    else if (level === "warn") console.warn(...args);
    else console.info(...args);
  } catch {
    // Loglama hiçbir koşulda uygulamayı etkilememeli.
  }
}

export const logger = {
  info: (scope: string, message: string, detail?: unknown) => emit("info", scope, message, detail),
  warn: (scope: string, message: string, detail?: unknown) => emit("warn", scope, message, detail),
  error: (scope: string, message: string, detail?: unknown) => emit("error", scope, message, detail),
  /** Son log kayıtları (en yeni en sonda). Hata ayıklama konsolu için. */
  getRecentLogs: (): LogEntry[] => [...buffer],
};

if (typeof window !== "undefined") {
  // Konsoldan `__turnuvaLogs()` ile son olaylar okunabilir (destek/hata ayıklama).
  (window as unknown as { __turnuvaLogs?: () => LogEntry[] }).__turnuvaLogs = logger.getRecentLogs;
}

/**
 * Bir hatanın "ağ hatası" (bağlantı kopması, zaman aşımı, çevrimdışı vb.)
 * olup olmadığını sezgisel olarak belirler. Tarayıcılar farklı mesajlar
 * kullanır: Chrome/V8 "Failed to fetch", Safari/WebKit "Load failed" der.
 */
export function isLikelyNetworkError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") return true;
  if (!(error instanceof Error)) return false;
  if (error.name === "AbortError") return true;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("failed to fetch") || // Chrome/V8
    msg.includes("load failed") || // Safari/WebKit
    msg.includes("network request failed") ||
    msg.includes("network error") ||
    msg.includes("networkerror") ||
    msg.includes("the internet connection appears to be offline") ||
    msg.includes("timeout") ||
    msg.includes("timed out")
  );
}
