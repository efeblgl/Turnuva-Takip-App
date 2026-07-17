"use client";

/**
 * Panel navigasyonu: masaüstünde sol menü, mobilde hamburger menü.
 * Menü öğeleri role göre sunucu tarafında filtrelenip buraya gelir.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BookOpen, CalendarDays, CalendarPlus, ClipboardList, Gavel, Home,
  ListOrdered, LogOut, Megaphone, Menu, Settings, Shield, Target,
  Trophy, User, Users, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = {
  home: Home, trophy: Trophy, shield: Shield, user: User, users: Users,
  calendar: CalendarDays, calendarPlus: CalendarPlus, list: ListOrdered,
  target: Target, gavel: Gavel, megaphone: Megaphone, settings: Settings,
  clipboard: ClipboardList, book: BookOpen,
} as const;

export interface PanelNavItem {
  href: string;
  label: string;
  icon: keyof typeof ICONS;
}

function NavLinks({
  items,
  onNavigate,
}: {
  items: PanelNavItem[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav aria-label="Panel menüsü" className="flex flex-col gap-0.5">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active =
          item.href === "/panel"
            ? pathname === "/panel"
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex min-h-10 items-center gap-2.5 rounded-lg px-3 text-sm font-medium",
              active
                ? "bg-brand-700 text-white"
                : "text-gray-600 hover:bg-gray-100 hover:text-ink"
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function PanelShell({
  items,
  userLabel,
  roleLabel,
  signOut,
  children,
}: {
  items: PanelNavItem[];
  userLabel: string;
  roleLabel: string;
  signOut: () => Promise<void>;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const sidebarContent = (
    <>
      <div className="mb-4 border-b border-line pb-4">
        <p className="truncate text-sm font-bold">{userLabel}</p>
        <p className="text-xs text-muted">{roleLabel}</p>
      </div>
      <NavLinks items={items} onNavigate={() => setOpen(false)} />
      <form action={signOut} className="mt-4 border-t border-line pt-4">
        <button type="submit" className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 text-sm font-medium text-red-600 hover:bg-red-50">
          <LogOut className="size-4" aria-hidden />
          Çıkış Yap
        </button>
      </form>
      <p className="mt-auto px-3 pt-6 text-[11px] text-muted">
        Efe Baloğlu tarafından yapıldı
      </p>
    </>
  );

  return (
    <div className="flex min-h-dvh">
      {/* Masaüstü sol menü */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col overflow-y-auto border-r border-line bg-surface p-4 lg:flex">
        <Link href="/panel" className="mb-4 flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand-700 text-white">
            <Trophy className="size-4" aria-hidden />
          </span>
          <span className="text-sm font-bold">Turnuva Paneli</span>
        </Link>
        {sidebarContent}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobil üst bar */}
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-line bg-surface px-4 lg:hidden">
          <Link href="/panel" className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-brand-700 text-white">
              <Trophy className="size-3.5" aria-hidden />
            </span>
            <span className="text-sm font-bold">Turnuva Paneli</span>
          </Link>
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => setOpen(true)}
            aria-label="Menüyü aç"
          >
            <Menu className="size-5" aria-hidden />
          </button>
        </header>

        {/* Mobil çekmece */}
        {open && (
          <div className="fixed inset-0 z-50 bg-black/40 lg:hidden" onClick={() => setOpen(false)} role="presentation">
            <div
              className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-y-auto bg-surface p-4"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label="Panel menüsü"
            >
              <div className="mb-2 flex justify-end">
                <button type="button" className="btn-ghost btn-sm" onClick={() => setOpen(false)} aria-label="Menüyü kapat">
                  <X className="size-5" aria-hidden />
                </button>
              </div>
              {sidebarContent}
            </div>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
