"use client";

/**
 * Halka açık site navigasyonu:
 *  - Masaüstü: üst menü bağlantıları
 *  - Mobil: sabit alt navigasyon + "Menü" alt sayfası (bottom sheet)
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CalendarDays, Home, ListOrdered, Menu as MenuIcon, Shield, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const DESKTOP_LINKS = [
  { href: "/", label: "Ana Sayfa" },
  { href: "/fikstur", label: "Fikstür" },
  { href: "/puan-durumu", label: "Puan Durumu" },
  { href: "/takimlar", label: "Takımlar" },
  { href: "/gol-kralligi", label: "Gol Krallığı" },
  { href: "/eleme", label: "Eleme Ağacı" },
  { href: "/duyurular", label: "Duyurular" },
  { href: "/hakkinda", label: "Turnuva" },
];

const SHEET_LINKS = [
  { href: "/gruplar", label: "Gruplar" },
  { href: "/gol-kralligi", label: "Gol Krallığı" },
  { href: "/eleme", label: "Eleme Ağacı" },
  { href: "/kartlar", label: "Kartlar ve Cezalar" },
  { href: "/istatistikler", label: "İstatistikler" },
  { href: "/duyurular", label: "Duyurular" },
  { href: "/kurallar", label: "Turnuva Kuralları" },
  { href: "/hakkinda", label: "Turnuva Hakkında" },
  { href: "/iletisim", label: "İletişim" },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function DesktopNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Ana menü" className="hidden items-center gap-1 md:flex">
      {DESKTOP_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            isActive(pathname, link.href)
              ? "bg-brand-50 text-brand-800"
              : "text-gray-600 hover:bg-gray-100 hover:text-ink"
          )}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

const BOTTOM_ITEMS = [
  { href: "/", label: "Ana Sayfa", icon: Home },
  { href: "/fikstur", label: "Fikstür", icon: CalendarDays },
  { href: "/puan-durumu", label: "Puan", icon: ListOrdered },
  { href: "/takimlar", label: "Takımlar", icon: Shield },
];

export function BottomNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <nav
        aria-label="Mobil menü"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <div className="grid grid-cols-5">
          {BOTTOM_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                  active ? "text-brand-700" : "text-gray-500"
                )}
                aria-current={active ? "page" : undefined}
              >
                <item.icon className="size-5" aria-hidden />
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
              menuOpen ? "text-brand-700" : "text-gray-500"
            )}
            aria-expanded={menuOpen}
            aria-label="Diğer sayfalar menüsü"
          >
            {menuOpen ? <X className="size-5" aria-hidden /> : <MenuIcon className="size-5" aria-hidden />}
            Menü
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMenuOpen(false)}
          role="presentation"
        >
          <div
            className="absolute inset-x-0 bottom-14 max-h-[70dvh] overflow-y-auto rounded-t-2xl bg-surface p-4 pb-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Diğer sayfalar"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300" aria-hidden />
            <div className="grid grid-cols-2 gap-2">
              {SHEET_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "rounded-xl border border-line px-3 py-3 text-sm font-medium",
                    isActive(pathname, link.href)
                      ? "border-brand-200 bg-brand-50 text-brand-800"
                      : "bg-surface text-ink"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
