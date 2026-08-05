"use client";

/**
 * Kupa Yolu final alanının merkezi görsel öğesi: kendi ekseni etrafında
 * yavaşça dönen, procedural (dış model dosyasına bağımlı olmayan) 3D kupa.
 *
 * LAYOUT GÜVENCESİ (önemli): dış sarmalayıcı HER ZAMAN aynı sabit boyuttadır
 * ve 3D sahne de 2D fallback de onu `absolute inset-0` ile birebir doldurur.
 * Böylece "önce 2D göster, WebGL hazır olunca 3D'ye geç" akışında kutu boyu
 * DEĞİŞMEZ — bracket geometrisi (useBracketGeometry) kupayı ölçtüğünde
 * kayma/taşma oluşmaz. Daha önce fallback 112px, canvas 224px olduğu için
 * kupa yüklendiğinde yerleşim bozuluyordu.
 *
 * Canvas arka planı tamamen saydamdır; koyu bir "gölge plakası" (drei
 * ContactShadows) BİLİNÇLİ olarak kullanılmaz — saydam zeminde koyu blok
 * gibi görünebiliyordu. Yere değme hissi saf CSS ışık/gölge ile verilir.
 */
import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { cn } from "@/lib/utils";

/** SSR'da her zaman `false` (sunucu anlık görüntüsü); hydration sonrası
 * gerçek tarayıcı değerine geçer — useSyncExternalStore bu geçişi
 * hydration uyumsuzluğu OLUŞTURMADAN yapar (bkz. react.dev). */
function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false
  );
}

/**
 * WebGL desteği yalnızca BİR KEZ ölçülür ve önbelleğe alınır.
 * ÖNEMLİ: bu fonksiyon `useSyncExternalStore`'un getSnapshot'ı olarak
 * kullanılıyor ve React onu her render'da çağırır. Önbelleksiz hâli her
 * çağrıda yeni bir WebGL context açıyor, tarayıcının context limitini
 * tüketiyor ve gerçek kupa canvas'ının "context lost" ile boşalmasına
 * (kullanıcıya siyah/bozuk alan olarak görünmesine) yol açıyordu.
 * Ayrıca getSnapshot'ın kararlı bir değer döndürmesi zorunludur.
 */
let webglSupport: boolean | null = null;

function isWebGLAvailable(): boolean {
  if (webglSupport !== null) return webglSupport;
  try {
    const canvas = document.createElement("canvas");
    const ctx =
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"));
    // Ölçüm için açılan context'i hemen serbest bırak.
    if (ctx && "getExtension" in ctx) {
      (ctx as WebGLRenderingContext).getExtension("WEBGL_lose_context")?.loseContext();
    }
    webglSupport = !!ctx;
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

/** 3D sahne render sırasında hata verirse (sürücü/context kaybı) 2D'ye düşer. */
class TrophyErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

// ---------------------------------------------------------------------------
// 2D fallback — 3D ile BİREBİR aynı kutuyu doldurur
// ---------------------------------------------------------------------------

function TrophyFallback2D() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <svg viewBox="0 0 100 116" className="ky-trophy-float h-full w-auto drop-shadow-[0_0_18px_rgba(242,202,100,0.45)]" aria-hidden>
        <defs>
          <linearGradient id="ky-cup-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fbe6a8" />
            <stop offset="45%" stopColor="#f2ca64" />
            <stop offset="100%" stopColor="#b8873a" />
          </linearGradient>
        </defs>
        <path d="M30 12h40v26a20 20 0 0 1-40 0V12Z" fill="url(#ky-cup-grad)" />
        <path d="M30 16H20a12 12 0 0 0 12 12v-6a6 6 0 0 1-6-6h4v-6Z" fill="url(#ky-cup-grad)" />
        <path d="M70 16h10a12 12 0 0 1-12 12v-6a6 6 0 0 0 6-6h-4v-6Z" fill="url(#ky-cup-grad)" />
        <rect x="45" y="58" width="10" height="20" fill="url(#ky-cup-grad)" />
        <path d="M32 78h36l-4 12H36l-4-12Z" fill="url(#ky-cup-grad)" />
        <rect x="26" y="90" width="48" height="9" rx="2.5" fill="url(#ky-cup-grad)" />
        <ellipse cx="50" cy="106" rx="26" ry="4" fill="#33e6af" opacity="0.18" />
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3D kupa (procedural — dış GLB/model dosyası yok)
// ---------------------------------------------------------------------------

/** Kupa profili (LatheGeometry): (yarıçap, yükseklik) noktaları, alttan üste. */
const CUP_PROFILE: [number, number][] = [
  [0.0, -1.0], [0.5, -1.0], [0.5, -0.9], [0.2, -0.82],
  [0.15, -0.35], [0.3, 0.08], [0.6, 0.52], [0.64, 0.76],
  [0.58, 0.9], [0.66, 1.0],
];

function TrophyMesh({ reducedMotion }: { reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const speed = useRef(1);
  const tilt = useRef({ x: 0, z: 0 });

  const cupPoints = useMemo(() => CUP_PROFILE.map(([r, y]) => new THREE.Vector2(r, y)), []);

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color("#f2ca64"),
        metalness: 0.86,
        roughness: 0.25,
        emissive: new THREE.Color("#33e6af"),
        emissiveIntensity: 0.05,
      }),
    []
  );

  useEffect(() => () => material.dispose(), [material]);

  useFrame((state, delta) => {
    if (!group.current) return;
    const targetSpeed = hovered ? 1.8 : 1;
    speed.current += (targetSpeed - speed.current) * 0.06;
    if (!reducedMotion) {
      // Tam tur ~16 sn
      group.current.rotation.y += delta * ((Math.PI * 2) / 16) * speed.current;
      group.current.position.y = Math.sin(state.clock.elapsedTime * 0.6) * 0.06;
    }
    // Fareye çok hafif tepki (elle döndürme değil, ince bir eğim)
    tilt.current.x += ((-state.pointer.y * 0.08) - tilt.current.x) * 0.04;
    tilt.current.z += ((state.pointer.x * 0.06) - tilt.current.z) * 0.04;
    group.current.rotation.x = tilt.current.x;
    group.current.rotation.z = tilt.current.z;
  });

  return (
    <group
      ref={group}
      scale={0.82}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <mesh material={material}>
        <latheGeometry args={[cupPoints, 48]} />
      </mesh>
      <mesh position={[0, 1.0, 0]} material={material}>
        <torusGeometry args={[0.66, 0.045, 16, 48]} />
      </mesh>
      <mesh position={[-0.58, 0.32, 0]} rotation={[0, 0, Math.PI / 2]} material={material}>
        <torusGeometry args={[0.26, 0.045, 12, 32, Math.PI * 1.3]} />
      </mesh>
      <mesh position={[0.58, 0.32, 0]} rotation={[0, Math.PI, -Math.PI / 2]} material={material}>
        <torusGeometry args={[0.26, 0.045, 12, 32, Math.PI * 1.3]} />
      </mesh>
      <mesh position={[0, -1.32, 0]} material={material}>
        <cylinderGeometry args={[0.09, 0.13, 0.62, 24]} />
      </mesh>
      <mesh position={[0, -1.66, 0]} material={material}>
        <cylinderGeometry args={[0.48, 0.54, 0.18, 32]} />
      </mesh>
    </group>
  );
}

function WebGLTrophy({ offscreen, onContextLost }: { offscreen: boolean; onContextLost: () => void }) {
  const reducedMotion = useReducedMotion();
  return (
    <Canvas
      className="absolute inset-0"
      dpr={[1, 1.5]}
      // Görüş alanı dışındayken sürekli render döngüsü durur (performans).
      // "never" DEĞİL "demand" kullanılır: "never" ile bileşen görüş alanı
      // dışında mount olursa TEK BİR kare bile çizilmez ve canvas kalıcı
      // boş kalır (ör. ana sayfada bracket sayfanın altındadır). "demand"
      // ilk kareyi çizip sonra bekler — kupa her hâlükârda görünür.
      // Mount'u IntersectionObserver'a bağlamak da bilinçli olarak terk
      // edildi: IO tetiklenmezse kupa hiç görünmüyordu.
      frameloop={offscreen ? "demand" : "always"}
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      camera={{ position: [0, 0.1, 4.6], fov: 30 }}
      style={{ background: "transparent" }}
      onCreated={({ gl }) => {
        // WebGL context kaybı bir REACT hatası değildir; error boundary
        // yakalayamaz ve canvas sessizce boşalır (kullanıcıya siyah/bozuk
        // alan olarak görünür). Bu yüzden açıkça dinlenip 2D'ye düşülür.
        gl.domElement.addEventListener("webglcontextlost", (event) => {
          event.preventDefault();
          onContextLost();
        });
      }}
    >
      <ambientLight intensity={0.65} />
      <directionalLight position={[2, 3, 4]} intensity={1.15} color="#fff6de" />
      <directionalLight position={[-3, 0.5, -2]} intensity={0.7} color="#33e6af" />
      <directionalLight position={[0, -2, 2]} intensity={0.3} color="#f2ca64" />
      <Suspense fallback={null}>
        <TrophyMesh reducedMotion={reducedMotion} />
      </Suspense>
    </Canvas>
  );
}

// ---------------------------------------------------------------------------
// Dışa açılan bileşen
// ---------------------------------------------------------------------------

const noSubscription = () => () => {};

export function TrophyScene({ compact = false }: { compact?: boolean }) {
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  /** Yalnızca IO açıkça "görüş alanı dışında" dediğinde true olur; IO hiç
   * çalışmazsa false kalır ve kupa normal şekilde render edilir. */
  const [offscreen, setOffscreen] = useState(false);
  /** Context bir kez kaybedildiyse bu oturumda 3D'ye geri dönülmez —
   * yeniden denemek çoğu kez tekrar kaybe ve titremeye yol açar. */
  const [contextLost, setContextLost] = useState(false);
  const handleContextLost = useCallback(() => setContextLost(true), []);

  // WebGL desteği oturum boyunca değişmez; abonelik gerekmez, yalnızca
  // sunucu/istemci anlık görüntüsü farkı hydration-güvenli ele alınır.
  const webglOk = useSyncExternalStore(noSubscription, isWebGLAvailable, () => false);

  useEffect(() => {
    if (!node) return;
    const io = new IntersectionObserver(([entry]) => setOffscreen(!entry.isIntersecting), {
      threshold: 0,
      rootMargin: "200px",
    });
    io.observe(node);
    return () => io.disconnect();
  }, [node]);

  return (
    <div
      ref={setNode}
      aria-hidden="true"
      className={cn(
        "relative shrink-0",
        compact
          ? "h-[104px] w-[100px]"
          : "h-[150px] w-[140px] sm:h-[178px] sm:w-[166px] lg:h-[206px] lg:w-[190px]"
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_45%,rgba(51,230,175,0.30),transparent_65%)] blur-lg"
        aria-hidden
      />
      {webglOk && !contextLost ? (
        <TrophyErrorBoundary fallback={<TrophyFallback2D />}>
          <WebGLTrophy offscreen={offscreen} onContextLost={handleContextLost} />
        </TrophyErrorBoundary>
      ) : (
        <TrophyFallback2D />
      )}
      <div
        className="pointer-events-none absolute inset-x-6 bottom-1 h-1.5 rounded-full bg-[var(--ky-accent)]/25 blur-[3px]"
        aria-hidden
      />
    </div>
  );
}
