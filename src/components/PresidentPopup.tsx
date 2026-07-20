"use client";

/**
 * Siteye girişte açılan görsel duyuru pop-up'ı (başkan görseli).
 *  - Sayfa yüklendikten ~700 ms sonra ekranın ortasında belirir
 *  - Arka plan kararır ve bulanıklaşır; arka plana tıklamak KAPATMAZ
 *  - Yalnızca sağ üstteki çarpı veya Escape tuşu ile kapanır
 *  - Açıkken sayfa kaydırılamaz; her sayfa yenilemesinde tekrar gösterilir
 *  - Görsel bulunamazsa hiçbir şey gösterilmez (sayfa çökmez)
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Varsayılan görsel yolu: public/ klasörüne göre. Değiştirmek için yeterli. */
const DEFAULT_IMAGE_SRC = "/images/baskan-popup.jpg";

/** Kapanış animasyonunun süresi (globals.css'teki promo-popup-out ile aynı). */
const CLOSE_ANIMATION_MS = 200;

/**
 * Sayfa oturumu boyunca (F5'e kadar) hatırlanan durum. Canlı skor yenilemesi
 * (router.refresh) bileşeni yeniden kursa bile: kapatılan pop-up geri gelmez,
 * açık olan beklemeden yeniden açılır. Tam sayfa yenilemede sıfırlanır.
 */
const pageSession = { dismissed: false, opened: false };

export function PresidentPopup({
  imageSrc = DEFAULT_IMAGE_SRC,
  alt = "Belediye Başkanı'ndan duyuru",
  delayMs = 700,
}: {
  imageSrc?: string;
  alt?: string;
  delayMs?: number;
}) {
  const [phase, setPhase] = useState<"hidden" | "open" | "closing">("hidden");
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  // Gecikmeli açılış; kullanıcı bu sayfa oturumunda kapattıysa tekrar açılmaz
  useEffect(() => {
    if (pageSession.dismissed) return;
    const wait = pageSession.opened ? 0 : delayMs;
    const timer = setTimeout(() => {
      pageSession.opened = true;
      setPhase("open");
    }, wait);
    return () => clearTimeout(timer);
  }, [delayMs]);

  const close = useCallback(() => {
    pageSession.dismissed = true;
    setPhase((p) => (p === "open" ? "closing" : p));
  }, []);

  // Kapanış animasyonu bitince tamamen kaldır
  useEffect(() => {
    if (phase !== "closing") return;
    const timer = setTimeout(() => setPhase("hidden"), CLOSE_ANIMATION_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  const isOpen = phase === "open" && !failed;

  // Açıkken: arka plan kaydırma kilidi, Escape ile kapatma, odak yönetimi
  useEffect(() => {
    if (!isOpen) return;
    // NOT (iOS Safari uyumluluğu): yalnızca `overflow: hidden` iOS
    // Safari'de arka planın parmakla kaydırılmasını ENGELLEMEZ (bilinen
    // WebKit davranışı) — pop-up açıkken arkadaki sayfa kayabilir. Bunun
    // yerine body'yi geçici olarak `position: fixed` yapıp kaydırma
    // konumunu koruyoruz; bu iOS'ta da güvenilir şekilde çalışır.
    const scrollY = window.scrollY;
    const body = document.body;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      // Tek etkileşimli öğe kapatma butonu: odak dışarı çıkmasın
      if (e.key === "Tab") {
        e.preventDefault();
        closeButtonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.left = previous.left;
      body.style.right = previous.right;
      body.style.width = previous.width;
      body.style.overflow = previous.overflow;
      window.scrollTo(0, scrollY);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, close]);

  if (phase === "hidden" || failed) return null;

  return (
    <div
      className={cn(
        "promo-popup-overlay backdrop-blur-sm",
        phase === "closing" && "promo-popup-overlay--closing"
      )}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Duyuru"
        className="promo-popup-panel"
      >
        <Image
          key={attempt}
          src={imageSrc}
          alt={alt}
          width={1040}
          height={1360}
          className="promo-popup-img"
          // Görsel public/ altından olduğu gibi sunulur; optimizasyon servisi
          // devre dışı (anlık iptal/hata pop-up'ı gereksiz yere gizleyebiliyor)
          unoptimized
          // İlk hatada bir kez yeniden dene; yine olmazsa sessizce gizle
          onError={() => (attempt === 0 ? setAttempt(1) : setFailed(true))}
          priority
        />
        <button
          ref={closeButtonRef}
          type="button"
          aria-label="Kapat"
          className="promo-popup-close"
          onClick={close}
        >
          <X className="size-6" aria-hidden />
        </button>
      </div>
    </div>
  );
}
