import Link from "next/link";
import {
  CalendarPlus, Megaphone, ShieldPlus, Target, UserPlus, Trophy,
} from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { getAdminTournament } from "@/lib/queries";
import { computeTournamentTotals } from "@/lib/stats";
import { EmptyState, SectionHeader, StatCard } from "@/components/ui";
import { formatDateShort, formatDateTime, formatTime, todayInTurkey } from "@/lib/utils";
import type { AuditLog, Match, Team } from "@/lib/types";

export const dynamic = "force-dynamic";

const AUDIT_LABELS: Record<string, string> = {
  INSERT: "ekledi",
  UPDATE: "güncelledi",
  DELETE: "sildi",
};

const TABLE_LABELS: Record<string, string> = {
  tournaments: "turnuva", teams: "takım", players: "oyuncu", groups: "grup",
  matches: "maç", match_events: "maç olayı", suspensions: "ceza",
  announcements: "duyuru", profiles: "kullanıcı", settings: "ayar", venues: "saha",
};

export default async function PanelHomePage() {
  const supabase = await createClient();
  const tournament = await getAdminTournament(supabase);

  if (!tournament) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <EmptyState
          icon={<Trophy className="size-10" aria-hidden />}
          title="Henüz turnuva oluşturulmadı"
          description="Başlamak için turnuva ayarları sayfasından yeni turnuva oluşturun."
        />
        <div className="mt-4 text-center">
          <Link href="/panel/turnuva" className="btn-primary">Turnuva Oluştur</Link>
        </div>
      </div>
    );
  }

  const [teamsRes, playerCountRes, matchesRes, cardCountRes, auditRes] = await Promise.all([
    supabase
      .from("teams")
      .select("id, name, created_at, status")
      .eq("tournament_id", tournament.id)
      .order("created_at", { ascending: false }),
    supabase.from("players").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase
      .from("matches")
      .select("*")
      .eq("tournament_id", tournament.id)
      .order("match_date")
      .order("start_time"),
    supabase
      .from("cards")
      .select("id, match:matches!inner(tournament_id)", { count: "exact", head: true })
      .eq("match.tournament_id", tournament.id),
    supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const teams = (teamsRes.data as Pick<Team, "id" | "name" | "created_at" | "status">[] | null) ?? [];
  const matches = (matchesRes.data as Match[] | null) ?? [];
  const audits = (auditRes.data as AuditLog[] | null) ?? [];

  const today = todayInTurkey();
  const totals = computeTournamentTotals(matches);
  const todayCount = matches.filter((m) => m.match_date === today).length;
  const postponedCount = matches.filter((m) => m.status === "postponed").length;
  const draftCount = matches.filter((m) => !m.is_published).length;

  const upcoming = matches
    .filter((m) => m.match_date && m.match_date >= today && m.status === "scheduled")
    .slice(0, 5);
  const recentResults = matches
    .filter((m) => ["completed", "forfeited"].includes(m.status))
    .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))
    .slice(0, 5);

  const teamNames = new Map(teams.map((t) => [t.id, t.name]));
  const matchLabel = (m: Match) =>
    `${teamNames.get(m.home_team_id ?? "") ?? "?"} - ${teamNames.get(m.away_team_id ?? "") ?? "?"}`;

  const quickActions = [
    { href: "/panel/takimlar/yeni", label: "Takım Ekle", icon: ShieldPlus },
    { href: "/panel/oyuncular/yeni", label: "Oyuncu Ekle", icon: UserPlus },
    { href: "/panel/maclar/yeni", label: "Maç Ekle", icon: CalendarPlus },
    { href: "/panel/maclar?durum=skor", label: "Skor Gir", icon: Target },
    { href: "/panel/duyurular/yeni", label: "Duyuru Oluştur", icon: Megaphone },
    { href: "/panel/fikstur-olustur", label: "Fikstür Oluştur", icon: CalendarPlus },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Genel Bakış</h1>
          <p className="mt-0.5 text-sm text-muted">{tournament.name}</p>
        </div>
        <Link href="/" className="btn-secondary btn-sm" target="_blank">Siteyi Görüntüle</Link>
      </div>

      {/* Hızlı işlemler */}
      <section aria-label="Hızlı işlemler" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {quickActions.map((qa) => (
          <Link key={qa.href} href={qa.href} className="card card-hover flex flex-col items-center gap-2 py-4 text-center">
            <span className="rounded-full bg-brand-50 p-2.5 text-brand-700">
              <qa.icon className="size-5" aria-hidden />
            </span>
            <span className="text-xs font-semibold">{qa.label}</span>
          </Link>
        ))}
      </section>

      {/* Sayılar */}
      <section aria-label="Özet sayılar" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Takım" value={teams.length} />
        <StatCard label="Aktif Oyuncu" value={playerCountRes.count ?? 0} />
        <StatCard label="Toplam Maç" value={matches.length} hint={draftCount > 0 ? `${draftCount} taslak` : undefined} />
        <StatCard label="Bugünkü Maç" value={todayCount} />
        <StatCard label="Tamamlanan" value={totals.playedCount} />
        <StatCard label="Bekleyen" value={totals.remainingCount} />
        <StatCard label="Ertelenen" value={postponedCount} />
        <StatCard label="Gol / Kart" value={`${totals.totalGoals} / ${cardCountRes.count ?? 0}`} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <SectionHeader
            title="Yaklaşan Maçlar"
            action={<Link href="/panel/maclar" className="text-sm font-medium text-brand-700 hover:underline">Tümü</Link>}
          />
          {upcoming.length === 0 ? (
            <EmptyState title="Planlanmış maç yok" />
          ) : (
            <div className="card divide-y divide-line p-0">
              {upcoming.map((m) => (
                <Link key={m.id} href={`/panel/maclar/${m.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-gray-50">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{matchLabel(m)}</span>
                  <span className="shrink-0 text-xs text-muted">
                    {formatDateShort(m.match_date)} · {formatTime(m.start_time)}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <SectionHeader title="Son Girilen Skorlar" />
          {recentResults.length === 0 ? (
            <EmptyState title="Henüz skor girilmedi" />
          ) : (
            <div className="card divide-y divide-line p-0">
              {recentResults.map((m) => (
                <Link key={m.id} href={`/panel/maclar/${m.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-gray-50">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{matchLabel(m)}</span>
                  <span className="shrink-0 text-sm font-bold tabular-nums">
                    {m.home_score}-{m.away_score}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <section>
        <SectionHeader
          title="Son Yönetici İşlemleri"
          action={<Link href="/panel/islem-gecmisi" className="text-sm font-medium text-brand-700 hover:underline">Tümü</Link>}
        />
        {audits.length === 0 ? (
          <EmptyState title="Henüz işlem kaydı yok" />
        ) : (
          <div className="card divide-y divide-line p-0">
            {audits.map((log) => (
              <div key={log.id} className="flex items-center justify-between gap-3 px-4 py-2">
                <span className="min-w-0 flex-1 truncate text-sm">
                  <span className="font-medium">{TABLE_LABELS[log.table_name] ?? log.table_name}</span>{" "}
                  kaydı {AUDIT_LABELS[log.action_type] ?? log.action_type}
                </span>
                <span className="shrink-0 text-xs text-muted">{formatDateTime(log.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
