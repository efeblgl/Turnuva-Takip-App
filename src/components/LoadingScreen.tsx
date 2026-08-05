import Image from "next/image";
import { TrophyBackdrop } from "./TrophyBackdrop";

/**
 * Global yüklenme / açılış ekranı.
 * - Kök ve segment loading.tsx dosyalarında (sayfa geçişleri) ve
 *   InitialSplash'te (ilk açılış) ortak kullanılır.
 * - Sunucu bileşeni olarak da çalışır; hook içermez.
 *
 * Katmanlar (alttan üste): açık nötr zemin → büyük metalik kupa →
 * metni kupanın bantlarından ayıran yumuşak ışık perdesi → logo + başlık
 * grubu. Logolar mevcut asset yollarından (`/logo-belediye.jpg`,
 * `/logo-kaymakamlik.jpg`) DEĞİŞTİRİLMEDEN kullanılır.
 */
export function LoadingScreen({ closing = false }: { closing?: boolean }) {
  return (
    <div
      className={`splash ${closing ? "splash--closing" : ""}`}
      role="status"
      aria-label="Yükleniyor"
    >
      <TrophyBackdrop />

      {/* Başlığın kupa üzerinde her zaman okunur kalması için yumuşak perde */}
      <div className="splash-scrim" aria-hidden />

      <div className="relative z-10 flex w-full max-w-5xl items-center justify-center gap-3 px-4 sm:gap-8 sm:px-6 lg:gap-14">
        <div className="splash-logo-left shrink-0">
          <Image
            src="/logo-belediye.jpg"
            alt="Yığılca Belediyesi"
            width={96}
            height={96}
            priority
            className="h-14 w-14 rounded-full bg-white object-contain ring-1 ring-line sm:h-20 sm:w-20 lg:h-24 lg:w-24"
          />
        </div>

        <div className="splash-center min-w-0 text-center">
          <p className="text-balance text-sm font-bold tracking-tight text-[#0f172a] sm:text-xl lg:text-3xl">
            Ali Kemal Sezgin Futbol Turnuvası
          </p>
          <p className="mt-0.5 text-xs font-medium text-[#475569] sm:mt-1 sm:text-sm lg:text-lg">
            Son 16 Turu
          </p>
          <div className="mt-2 flex items-center justify-center gap-1.5 sm:mt-3" aria-hidden>
            <span className="splash-dot h-1.5 w-1.5 rounded-full bg-brand-700" />
            <span className="splash-dot h-1.5 w-1.5 rounded-full bg-brand-700" />
            <span className="splash-dot h-1.5 w-1.5 rounded-full bg-brand-700" />
          </div>
        </div>

        <div className="splash-logo-right shrink-0">
          <Image
            src="/logo-kaymakamlik.jpg"
            alt="Yığılca Kaymakamlığı"
            width={96}
            height={96}
            priority
            className="h-14 w-14 rounded-full bg-white object-contain ring-1 ring-line sm:h-20 sm:w-20 lg:h-24 lg:w-24"
          />
        </div>
      </div>
    </div>
  );
}
