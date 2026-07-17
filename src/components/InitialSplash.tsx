"use client";

import { useEffect, useState } from "react";
import { LoadingScreen } from "./LoadingScreen";

// Toplam süre ~1350ms: 1000ms görünür + 350ms yumuşak kapanış.
const SHOW_MS = 1000;
const FADE_MS = 350;

/**
 * İlk açılış (tam sayfa yükleme) sırasında gösterilen kısa karşılama ekranı.
 * Sunucu HTML'inde görünür olarak gelir, hydration sonrası zamanlayıcıyla
 * yumuşakça kapanır. Sayfa geçişleri loading.tsx dosyalarıyla karşılanır.
 */
export function InitialSplash() {
  const [phase, setPhase] = useState<"visible" | "closing" | "done">("visible");

  useEffect(() => {
    const closeTimer = setTimeout(() => setPhase("closing"), SHOW_MS);
    const doneTimer = setTimeout(() => setPhase("done"), SHOW_MS + FADE_MS);
    return () => {
      clearTimeout(closeTimer);
      clearTimeout(doneTimer);
    };
  }, []);

  if (phase === "done") return null;
  return <LoadingScreen closing={phase === "closing"} />;
}
