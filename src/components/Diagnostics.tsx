"use client";

/**
 * İstemci tarafı tanılama: global hata yakalayıcılar, ilk yükleme süresi
 * logları ve eski Service Worker/önbellek temizliği. Kök layout'ta bir kez
 * kurulur. Bu bileşenin kendisi bir şey RENDER ETMEZ (null döner) — amaç,
 * "Safari'de sayfa hiç açılmıyor" gibi şikayetlerde nerede takıldığını
 * (script, hydration, ağ isteği) konsol loglarından görülebilir kılmaktır.
 *
 * Not: Script parse/hydration öncesi oluşan hatalar bu bileşen mount
 * olmadan önce kaçırılmasın diye kök layout'ta ayrıca `beforeInteractive`
 * bir inline script (bkz. EarlyDiagnosticsScript) window.__turnuvaDiag
 * içine tamponlar; bu bileşen mount olunca o tamponu logcuya aktarır.
 */
import { useEffect } from "react";
import { logger } from "@/lib/logger";

declare global {
  interface Window {
    __turnuvaDiag?: {
      start: number;
      events: Array<{ type: string; detail?: unknown; t: number }>;
    };
  }
}

function flushEarlyDiagnostics() {
  const diag = window.__turnuvaDiag;
  if (!diag) return;
  for (const ev of diag.events) {
    logger.error("early-diagnostics", `${ev.type} (script başlangıcından +${ev.t}ms)`, ev.detail);
  }
  diag.events = [];
}

function checkEnv() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    logger.error(
      "diagnostics",
      "Supabase ortam değişkenleri eksik görünüyor — giriş ve veri yükleme çalışmayabilir."
    );
  }
}

/** Eski Service Worker kayıtlarını ve önbelleklerini temizler (bu uygulama SW kullanmıyor). */
function cleanupStaleServiceWorkers() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) => {
      if (registrations.length === 0) return;
      logger.warn(
        "diagnostics",
        `${registrations.length} eski Service Worker kaydı bulundu, kaldırılıyor`
      );
      registrations.forEach((r) => {
        r.unregister().catch((err) => logger.warn("diagnostics", "Service Worker kaldırılamadı", err));
      });
    })
    .catch((err) => logger.warn("diagnostics", "Service Worker kayıtları okunamadı", err));

  if ("caches" in window) {
    caches
      .keys()
      .then((keys) => {
        if (keys.length === 0) return;
        logger.warn("diagnostics", `${keys.length} eski önbellek (Cache Storage) bulundu, temizleniyor`);
        keys.forEach((key) => {
          caches.delete(key).catch(() => undefined);
        });
      })
      .catch((err) => logger.warn("diagnostics", "Cache Storage okunamadı", err));
  }
}

export function Diagnostics() {
  useEffect(() => {
    checkEnv();
    flushEarlyDiagnostics();
    cleanupStaleServiceWorkers();

    const start = window.__turnuvaDiag?.start ?? performance.timeOrigin;
    logger.info("diagnostics", `İstemci hazır (hydration tamam), +${Math.round(Date.now() - start)}ms`);

    const onError = (event: ErrorEvent) => {
      logger.error("window-error", event.message || "Bilinmeyen script hatası", {
        source: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
      });
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      logger.error("unhandled-rejection", "Yakalanmamış promise reddi", event.reason);
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        // Safari (özellikle iOS) sayfayı geri/ileri gezinmede bfcache'ten
        // JS'i yeniden çalıştırmadan geri getirebilir; bu durumun görünür
        // olması "donmuş gibi görünen" sayfa şikayetlerinde ayırt edici olur.
        logger.info("diagnostics", "Sayfa bfcache'ten geri yüklendi (pageshow persisted)");
      }
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  return null;
}
