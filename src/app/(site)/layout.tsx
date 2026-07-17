/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Trophy } from "lucide-react";
import { BottomNav, DesktopNav } from "@/components/site/SiteNav";
import { SiteFooter } from "@/components/site/SiteFooter";
import { fetchPublicTournament, fetchSettings } from "@/lib/queries";
import type { FooterSettings } from "@/lib/types";

export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tournament = await fetchPublicTournament();
  const settings = tournament ? await fetchSettings(tournament.id) : {};
  const footer = (settings["footer"] as FooterSettings | undefined) ?? {};

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
        <div className="container-page flex h-14 items-center justify-between gap-4">
          <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label="Ana sayfa">
            {tournament?.logo_url ? (
              <img
                src={tournament.logo_url}
                alt=""
                className="size-8 rounded-full border border-line object-cover"
              />
            ) : (
              <span className="flex size-8 items-center justify-center rounded-full bg-brand-700 text-white">
                <Trophy className="size-4" aria-hidden />
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold leading-tight">
                {tournament?.short_name ?? tournament?.name ?? "Yığılca Futbol Turnuvası"}
              </span>
            </span>
          </Link>
          <DesktopNav />
        </div>
      </header>

      <main className="flex-1 pb-16 md:pb-0">{children}</main>

      <SiteFooter tournament={tournament} footer={footer} />
      <BottomNav />
    </div>
  );
}
