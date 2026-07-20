/**
 * fetch sarmalayıcısı: zaman aşımı ekler ve başarısız istekleri merkezi
 * logcuya bildirir. Bazı ağ koşullarında (özellikle Safari/iOS'ta ITP,
 * arka plan sekmesi kısıtlamaları veya iCloud Private Relay ile) bir istek
 * ne başarıyla dönebilir ne de hata fırlatabilir — süresiz asılı kalabilir.
 * AbortController tabanlı bu üst sınır olmadan, ör. Supabase oturum
 * kontrolü hiç bitmez ve sayfa sonsuza kadar "yükleniyor" görünür.
 */
import { isLikelyNetworkError, logger } from "./logger";

const DEFAULT_TIMEOUT_MS = 15000;

export function createLoggingFetch(scope: string, timeoutMs = DEFAULT_TIMEOUT_MS): typeof fetch {
  return async function loggingFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const externalSignal = init?.signal;
    const onExternalAbort = () => controller.abort();
    if (externalSignal) {
      if (externalSignal.aborted) controller.abort();
      else externalSignal.addEventListener("abort", onExternalAbort);
    }
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

    try {
      const res = await fetch(input, { ...init, signal: controller.signal });
      if (!res.ok) {
        logger.warn(scope, `İstek başarısız yanıt döndürdü (HTTP ${res.status}): ${url}`);
      }
      return res;
    } catch (err) {
      const abortedByUs = controller.signal.aborted && !externalSignal?.aborted;
      const reason = abortedByUs
        ? `zaman aşımı (${timeoutMs}ms)`
        : isLikelyNetworkError(err)
          ? "ağ bağlantısı hatası"
          : "bilinmeyen hata";
      logger.error(scope, `İstek başarısız oldu (${reason}): ${url}`, err);
      throw err;
    } finally {
      clearTimeout(timer);
      if (externalSignal) externalSignal.removeEventListener("abort", onExternalAbort);
    }
  };
}
