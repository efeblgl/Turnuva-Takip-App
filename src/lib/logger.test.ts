import { describe, expect, it, vi } from "vitest";
import { isLikelyNetworkError, logger } from "./logger";

describe("isLikelyNetworkError", () => {
  it("Chrome/V8'in 'Failed to fetch' mesajını ağ hatası sayar", () => {
    expect(isLikelyNetworkError(new TypeError("Failed to fetch"))).toBe(true);
  });

  it("Safari/WebKit'in 'Load failed' mesajını ağ hatası sayar", () => {
    expect(isLikelyNetworkError(new TypeError("Load failed"))).toBe(true);
  });

  it("AbortError'ı (zaman aşımı) ağ hatası sayar", () => {
    const err = new DOMException("The operation was aborted.", "AbortError");
    expect(isLikelyNetworkError(err)).toBe(true);
  });

  it("ilgisiz bir hatayı ağ hatası saymaz", () => {
    expect(isLikelyNetworkError(new Error("Skor bilgilerinde hata var"))).toBe(false);
  });

  it("Error olmayan değerlerde false döner", () => {
    expect(isLikelyNetworkError("dize")).toBe(false);
    expect(isLikelyNetworkError(null)).toBe(false);
  });
});

describe("logger", () => {
  it("son logları tamponda tutar ve sırayla döner", () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    logger.error("test", "örnek hata", { code: 1 });
    const logs = logger.getRecentLogs();
    expect(logs.at(-1)).toMatchObject({ level: "error", scope: "test", message: "örnek hata" });
    errSpy.mockRestore();
  });

  it("loglama asla fırlatmaz (döngüsel referansta bile)", () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() => logger.error("test", "döngüsel", circular)).not.toThrow();
    errSpy.mockRestore();
  });
});
