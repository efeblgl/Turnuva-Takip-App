"use client";

/**
 * Kök düzeyde hata sınırı: src/app/error.tsx yalnızca layout'un ALTINDAKİ
 * hataları yakalar; kök layout.tsx'in (font, Toaster, InitialSplash, html/body)
 * kendisinde bir hata olursa YALNIZCA bu dosya devreye girer. Bu dosya
 * olmadan Safari'de (veya herhangi bir tarayıcıda) kök layout'ta oluşan bir
 * hata kullanıcıya boş/beyaz bir ekran olarak görünür ve geri dönüş yolu
 * olmaz. global-error kendi <html>/<body> etiketlerini içermek zorundadır
 * (kök layout'un yerine geçer) ve metadata/generateMetadata export edemez.
 */
import { useEffect } from "react";
import { logger, isLikelyNetworkError } from "@/lib/logger";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("global-error", "Kök düzeyde yakalanmamış hata", error);
  }, [error]);

  const networkIssue = isLikelyNetworkError(error);

  return (
    <html lang="tr">
      <head>
        <title>Bir sorun oluştu | Yığılca Futbol Turnuvası</title>
      </head>
      <body
        style={{
          display: "flex",
          minHeight: "100dvh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "1.5rem",
          textAlign: "center",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
          background: "#f4f5f7",
          color: "#111827",
        }}
      >
        <span
          aria-hidden
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "4rem",
            height: "4rem",
            borderRadius: "9999px",
            background: "#fef2f2",
            color: "#ef4444",
            fontSize: "2rem",
          }}
        >
          !
        </span>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>
          {networkIssue ? "Bağlantı kurulamadı" : "Uygulama başlatılamadı"}
        </h1>
        <p style={{ maxWidth: "26rem", fontSize: "0.875rem", color: "#6b7280" }}>
          {networkIssue
            ? "İnternet bağlantınızda bir sorun olabilir. Bağlantınızı kontrol edip tekrar deneyin."
            : "Sayfa yüklenirken beklenmeyen bir hata oluştu. Tekrar denemek genellikle sorunu çözer."}
        </p>
        {error.digest && (
          <p style={{ fontSize: "0.75rem", color: "#9ca3af" }}>Hata kodu: {error.digest}</p>
        )}
        <button
          type="button"
          onClick={reset}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "2.75rem",
            padding: "0 1.25rem",
            borderRadius: "0.75rem",
            border: "none",
            background: "#15803d",
            color: "#fff",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Tekrar dene
        </button>
      </body>
    </html>
  );
}
