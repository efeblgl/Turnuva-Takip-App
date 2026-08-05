"use client";

/**
 * Simetrik, iki taraftan merkeze yakınsayan eleme ağacının geometrisini
 * hesaplar. Sol taraf (Son 16 -> Çeyrek Final -> Yarı Final) doğal akışta
 * kalır ve SAĞA doğru büyür; sağ taraf da doğal akışta kalır ve SOLA doğru
 * büyür. Bir sonraki tur kartı, kendisini besleyen iki kartın gerçek
 * (ölçülmüş) merkez-Y ortalaması matematiksel olarak türetilerek konumlanır
 * — kartın KENDİ ölçülen Y'sine güvenilmez (henüz doğru yerde olmayabilir),
 * yalnızca YÜKSEKLİĞİ (top'tan bağımsız) güvenilir kabul edilir.
 *
 * MERKEZ SÜTUNU (kupa + final + üçüncülük) burada KONUMLANDIRILMAZ: her iki
 * tarafın Son 16 sütunu eşit sayıda ve eşit aralıklı kart içerdiğinden,
 * türetilen merkez (midY) matematiksel olarak satırın tam dikey ortasına
 * eşittir; bu yüzden merkez sütunu saf CSS ile (flex justify-center)
 * kendiliğinden doğru yere oturur. Daha önce final/kupa için `top` elle
 * hesaplanıyordu ve kupa yüksekliği final'in üstünde NEGATİF bir top
 * ürettiğinde (tops.trophy < 0) kupa container'ın tepesinden taşıp
 * kırpılıyordu. Artık final/üçüncülük yalnızca bağlantı çizgilerinin uç
 * noktaları için ÖLÇÜLÜR, konumlandırılmaz.
 */
import { useEffect, useRef, useState, type RefObject } from "react";
import type { BracketPath } from "./BracketConnectors";

const CORNER_RADIUS = 10;
/** Kartlar henüz mount olmadıysa ölçüm en fazla bu kadar kare yeniden denenir. */
const MAX_MEASURE_RETRIES = 60;

interface Rect {
  left: number;
  right: number;
  top: number;
  height: number;
  centerY: number;
}

function roundedElbowPath(x0: number, y0: number, x1: number, y1: number): string {
  if (Math.abs(y0 - y1) < 0.5) return `M ${x0} ${y0} L ${x1} ${y1}`;
  const midX = x0 + (x1 - x0) / 2;
  const dir = y1 > y0 ? 1 : -1;
  const r = Math.max(0, Math.min(CORNER_RADIUS, Math.abs(x1 - x0) / 2, Math.abs(y1 - y0) / 2));
  return [
    `M ${x0} ${y0}`,
    `L ${midX - r} ${y0}`,
    `Q ${midX} ${y0} ${midX} ${y0 + r * dir}`,
    `L ${midX} ${y1 - r * dir}`,
    `Q ${midX} ${y1} ${midX + r} ${y1}`,
    `L ${x1} ${y1}`,
  ].join(" ");
}

export interface BracketGeometry {
  /** Yalnızca Çeyrek Final ve Yarı Final kartları için (merkez sütunu hariç). */
  tops: Record<string, number>;
  paths: BracketPath[];
  height: number;
  width: number;
  ready: boolean;
  drawn: boolean;
}

export interface BracketGeometryInput {
  containerRef: RefObject<HTMLElement | null>;
  nodesRef: RefObject<Map<string, HTMLElement>>;
  /** nodeId -> bu maçın kazananı belli mi (bağlantı çizgisini aydınlatmak için). */
  activeMap: Record<string, boolean>;
  leftR16Ids: readonly string[];
  leftQFIds: readonly string[];
  leftSFId: string;
  rightR16Ids: readonly string[];
  rightQFIds: readonly string[];
  rightSFId: string;
}

export function useBracketGeometry({
  containerRef, nodesRef, activeMap,
  leftR16Ids, leftQFIds, leftSFId, rightR16Ids, rightQFIds, rightSFId,
}: BracketGeometryInput): BracketGeometry {
  const [state, setState] = useState<{ tops: Record<string, number>; paths: BracketPath[]; height: number; width: number }>({
    tops: {}, paths: [], height: 0, width: 0,
  });
  const [ready, setReady] = useState(false);
  const [drawn, setDrawn] = useState(false);
  const frameRef = useRef<number | null>(null);
  const retriesRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDrawn(true), 150);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function rectOf(id: string, containerRect: DOMRect, scrollLeft: number): Rect | null {
      const el = nodesRef.current?.get(id);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const top = r.top - containerRect.top;
      return {
        left: r.left - containerRect.left + scrollLeft,
        right: r.right - containerRect.left + scrollLeft,
        top,
        height: r.height,
        centerY: top + r.height / 2,
      };
    }

    function recompute() {
      const containerEl = containerRef.current;
      if (!containerEl) return;
      const containerRect = containerEl.getBoundingClientRect();
      const scrollLeft = containerEl.scrollLeft;
      const at = (id: string) => rectOf(id, containerRect, scrollLeft);

      const leftR16 = leftR16Ids.map(at);
      const rightR16 = rightR16Ids.map(at);
      const leftQFSize = leftQFIds.map(at);
      const rightQFSize = rightQFIds.map(at);
      const leftSFSize = at(leftSFId);
      const rightSFSize = at(rightSFId);
      const finalRect = at("final");
      const thirdRect = at("third");

      if (
        leftR16.some((r) => !r) || rightR16.some((r) => !r) ||
        leftQFSize.some((r) => !r) || rightQFSize.some((r) => !r) ||
        !leftSFSize || !rightSFSize || !finalRect || !thirdRect
      ) {
        // Henüz tüm kartlar mount olmadı. Yeniden dene: aksi halde bu tek
        // kaçırılmış ölçüm kalıcı olur (ResizeObserver yalnızca efekt
        // anındaki düğümleri izler, sonradan eklenenleri değil).
        // Patolojik bir durumda sonsuz döngü olmaması için sınırlı.
        if (retriesRef.current < MAX_MEASURE_RETRIES) {
          retriesRef.current += 1;
          schedule();
        }
        return;
      }
      const lR16 = leftR16 as Rect[];
      const rR16 = rightR16 as Rect[];
      const lQF = leftQFSize as Rect[];
      const rQF = rightQFSize as Rect[];

      const lR16CenterY = lR16.map((r) => r.centerY);
      const rR16CenterY = rR16.map((r) => r.centerY);
      const lQFCenterY = [0, 1].map((i) => (lR16CenterY[i * 2] + lR16CenterY[i * 2 + 1]) / 2);
      const rQFCenterY = [0, 1].map((i) => (rR16CenterY[i * 2] + rR16CenterY[i * 2 + 1]) / 2);
      const lSFCenterY = (lQFCenterY[0] + lQFCenterY[1]) / 2;
      const rSFCenterY = (rQFCenterY[0] + rQFCenterY[1]) / 2;

      // Yalnızca ara turlar konumlandırılır; merkez sütunu CSS ile ortalanır.
      const tops: Record<string, number> = {};
      leftQFIds.forEach((id, i) => { tops[id] = lQFCenterY[i] - lQF[i].height / 2; });
      rightQFIds.forEach((id, i) => { tops[id] = rQFCenterY[i] - rQF[i].height / 2; });
      tops[leftSFId] = lSFCenterY - leftSFSize.height / 2;
      tops[rightSFId] = rSFCenterY - rightSFSize.height / 2;

      const paths: BracketPath[] = [];
      const addSeg = (sourceId: string, sx: number, sy: number, targetId: string, tx: number, ty: number) => {
        paths.push({ key: `${sourceId}-${targetId}`, d: roundedElbowPath(sx, sy, tx, ty), active: !!activeMap[sourceId] });
      };
      const addPair = (
        aId: string, aX: number, aY: number, bId: string, bX: number, bY: number,
        targetId: string, targetX: number, targetY: number
      ) => {
        addSeg(aId, aX, aY, targetId, targetX, targetY);
        addSeg(bId, bX, bY, targetId, targetX, targetY);
      };

      // Sol taraf: sağa doğru akış (kaynağın SAĞ kenarı -> hedefin SOL kenarı)
      for (let i = 0; i < 2; i++) {
        addPair(
          leftR16Ids[i * 2], lR16[i * 2].right, lR16CenterY[i * 2],
          leftR16Ids[i * 2 + 1], lR16[i * 2 + 1].right, lR16CenterY[i * 2 + 1],
          leftQFIds[i], lQF[i].left, lQFCenterY[i]
        );
      }
      addPair(
        leftQFIds[0], lQF[0].right, lQFCenterY[0], leftQFIds[1], lQF[1].right, lQFCenterY[1],
        leftSFId, leftSFSize.left, lSFCenterY
      );
      addSeg(leftSFId, leftSFSize.right, lSFCenterY, "final", finalRect.left, finalRect.centerY);
      addSeg(leftSFId, leftSFSize.right, lSFCenterY, "third", thirdRect.left, thirdRect.centerY);

      // Sağ taraf: sola doğru akış (kaynağın SOL kenarı -> hedefin SAĞ kenarı) — solun aynası
      for (let i = 0; i < 2; i++) {
        addPair(
          rightR16Ids[i * 2], rR16[i * 2].left, rR16CenterY[i * 2],
          rightR16Ids[i * 2 + 1], rR16[i * 2 + 1].left, rR16CenterY[i * 2 + 1],
          rightQFIds[i], rQF[i].right, rQFCenterY[i]
        );
      }
      addPair(
        rightQFIds[0], rQF[0].left, rQFCenterY[0], rightQFIds[1], rQF[1].left, rQFCenterY[1],
        rightSFId, rightSFSize.right, rSFCenterY
      );
      addSeg(rightSFId, rightSFSize.left, rSFCenterY, "final", finalRect.right, finalRect.centerY);
      addSeg(rightSFId, rightSFSize.left, rSFCenterY, "third", thirdRect.right, thirdRect.centerY);

      setState({ tops, paths, height: containerEl.scrollHeight, width: containerEl.scrollWidth });
      setReady(true);
    }

    function schedule() {
      if (frameRef.current !== null) return;
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        recompute();
      });
    }

    // İlk ölçüm SENKRON yapılır (rAF beklenmez): efektler DOM commit'inden
    // sonra çalıştığı için layout hazırdır. requestAnimationFrame arka plan
    // sekmelerinde HİÇ tetiklenmez; ilk ölçümü ona bağlamak, sayfa arka
    // planda açıldığında Çeyrek/Yarı Final kartlarının kalıcı olarak
    // görünmez kalmasına yol açıyordu. rAF yalnızca sonraki güncellemeleri
    // (ResizeObserver) tek kareye toplamak için kullanılır.
    retriesRef.current = 0;
    recompute();
    const observer = new ResizeObserver(schedule);
    observer.observe(container);
    nodesRef.current?.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        // KRİTİK: iptal ettikten sonra bayrağı sıfırla. Aksi halde efekt
        // yeniden çalıştığında (React StrictMode dev'de efektleri iki kez
        // çalıştırır, ayrıca bağımlılık değişimlerinde) `schedule()`
        // `frameRef.current !== null` görüp hemen çıkıyor ve `recompute()`
        // BİR DAHA HİÇ çalışmıyordu → `ready` sonsuza dek false kalıyor,
        // Çeyrek/Yarı Final kartları `visibility:hidden` ile görünmez
        // oluyor ve bağlantı çizgileri hiç çizilmiyordu.
        frameRef.current = null;
      }
    };
    // Node id dizileri modül seviyesinde sabittir (referansları değişmez).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, nodesRef, activeMap]);

  return { ...state, ready, drawn };
}
