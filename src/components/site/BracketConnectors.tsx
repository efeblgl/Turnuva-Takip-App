"use client";

/**
 * Eleme ağacı için SVG bağlantı katmanı (Kupa Yolu tasarımı). Canvas
 * KULLANILMAZ. Salt sunum bileşeni — koordinat hesaplaması (DOM ölçümü,
 * ResizeObserver, rAF) `useBracketGeometry` kancasında yapılır, buraya
 * hazır path verisi gelir (tek ölçüm geçişinde hem kart konumlarıyla hem
 * bağlantılarla tutarlı kalması için).
 */
import { cn } from "@/lib/utils";

export interface BracketPath {
  key: string;
  d: string;
  /** Kaynak maçın kazananı belli mi? (parlak/aktif çizgi için) */
  active: boolean;
  /** Hover/tıklama ile vurgulanan olası ilerleme yolu (henüz kesinleşmemiş). */
  highlighted?: boolean;
}

const DASH_LENGTH = 2400;

export function BracketConnectors({
  width,
  height,
  paths,
  drawn,
}: {
  width: number;
  height: number;
  paths: BracketPath[];
  drawn: boolean;
}) {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute left-0 top-0 z-[1]"
      width={width}
      height={height}
      style={{ overflow: "visible" }}
    >
      {paths.map((p) => (
        <path
          key={p.key}
          d={p.d}
          fill="none"
          strokeLinecap="round"
          strokeWidth={p.active || p.highlighted ? 3 : 2}
          className={cn(
            "transition-[stroke-dashoffset,stroke,filter] duration-[900ms] ease-out",
            p.active || p.highlighted ? "stroke-[var(--ky-line-active)]" : "stroke-[var(--ky-line-idle)]"
          )}
          style={{
            strokeDasharray: DASH_LENGTH,
            strokeDashoffset: drawn ? 0 : DASH_LENGTH,
            filter:
              p.active || p.highlighted
                ? "drop-shadow(0 0 4px rgba(101,255,208,0.65))"
                : undefined,
          }}
        />
      ))}
    </svg>
  );
}
