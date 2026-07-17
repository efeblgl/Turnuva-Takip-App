import Image from "next/image";

/**
 * Global yüklenme ekranı görseli.
 * - Kök ve segment loading.tsx dosyalarında (sayfa geçişleri) ve
 *   InitialSplash'te (ilk açılış) ortak kullanılır.
 * - Sunucu bileşeni olarak da çalışır; hook içermez.
 */
export function LoadingScreen({ closing = false }: { closing?: boolean }) {
  return (
    <div
      className={`splash ${closing ? "splash--closing" : ""}`}
      role="status"
      aria-label="Yükleniyor"
    >
      <div className="flex items-center gap-5 px-6 sm:gap-10">
        <div className="splash-logo-left shrink-0">
          <Image
            src="/logo-belediye.jpg"
            alt="Yığılca Belediyesi"
            width={96}
            height={96}
            priority
            className="h-16 w-16 rounded-full bg-white object-contain ring-1 ring-line sm:h-24 sm:w-24"
          />
        </div>

        <div className="splash-center min-w-0 text-center">
          <p className="text-sm font-semibold tracking-tight text-ink sm:text-lg">
            Yığılca Futbol Turnuvası
          </p>
          <div className="mt-3 flex items-center justify-center gap-1.5" aria-hidden>
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
            className="h-16 w-16 rounded-full bg-white object-contain ring-1 ring-line sm:h-24 sm:w-24"
          />
        </div>
      </div>
    </div>
  );
}
