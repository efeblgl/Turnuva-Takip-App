/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ArrowRight, CalendarDays, Megaphone, Trophy } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import {
  fetchPublicTournament, getPublishedAnnouncements, getScorersData,
  getStandingsBundle, getVenues,
} from "@/lib/queries";
import { computeTopScorers } from "@/lib/scorers";
import { computeTournamentTotals } from "@/lib/stats";
import { MatchCard, teamInfoFrom } from "@/components/MatchCard";
import { Badge, EmptyState, SectionHeader, StatCard } from "@/components/ui";
import { TeamLogo } from "@/components/TeamBadge";
import {
  FINISHED_STATUSES, TOURNAMENT_STATUS_LABELS,
} from "@/lib/labels";
import { formatDate, formatDateShort, formatNumber, formatTime, todayInTurkey } from "@/lib/utils";
import type { Match, PublicTeam } from "@/lib/types";

export const dynamic = "force-dynamic";

function matchCardPropsFactory(
  teamsById: Map<string, PublicTeam>,
  venueNames: Map<string, string>,
  groupNames: Map<string, string>
) {
  return (match: Match) => ({
    match,
    home: teamInfoFrom(match.home_team_id ? teamsById.get(match.home_team_id) : null),
    away: teamInfoFrom(match.away_team_id ? teamsById.get(match.away_team_id) : null),
    venueName: match.venue_id ? venueNames.get(match.venue_id) : null,
    contextLabel:
      match.stage === "knockout"
        ? match.round_name
        : match.group_id
          ? groupNames.get(match.group_id) ?? match.round_name
          : match.round_name,
    href: `/maclar/${match.id}`,
  });
}

export default async function HomePage() {
  const tournament = await fetchPublicTournament();

  if (!tournament) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={<Trophy className="size-10" aria-hidden />}
          title="Turnuva yakında burada"
          description="Turnuva bilgileri yayınlandığında bu sayfada görebileceksiniz."
        />
      </div>
    );
  }

  const supabase = await createClient();
  const [bundle, announcements, scorersData, venues, cardRows] = await Promise.all([
    getStandingsBundle(supabase, tournament),
    getPublishedAnnouncements(supabase, tournament.id, 6),
    getScorersData(supabase, tournament.id),
    getVenues(supabase, tournament.id),
    supabase
      .from("cards")
      .select("card_type, match:matches!inner(tournament_id)")
      .eq("match.tournament_id", tournament.id)
      .then(({ data }) => (data as Array<{ card_type: string }> | null) ?? []),
  ]);

  const { matches, teamsById, teams, groups, tablesByGroup } = bundle;

  const { count: playerCount } = await supabase
    .from("public_players")
    .select("id", { count: "exact", head: true })
    .in("team_id", teams.map((t) => t.id));
  const totals = computeTournamentTotals(matches);
  const today = todayInTurkey();

  const yellowTotal = cardRows.filter((c) => c.card_type === "yellow").length;
  const redTotal = cardRows.length - yellowTotal;

  const todaysMatches = matches.filter((m) => m.match_date === today && m.status !== "cancelled");
  const upcoming = matches
    .filter((m) => m.match_date && m.match_date > today && ["scheduled", "postponed"].includes(m.status))
    .slice(0, 4);
  const results = matches
    .filter((m) => (FINISHED_STATUSES as string[]).includes(m.status))
    .sort((a, b) => (b.match_date ?? "").localeCompare(a.match_date ?? "") || (b.start_time ?? "").localeCompare(a.start_time ?? ""))
    .slice(0, 4);
  const nextMatch = matches.find(
    (m) => m.match_date && m.match_date >= today && m.status === "scheduled"
  );

  const importantAnnouncements = announcements.filter((a) => a.is_important).slice(0, 2);
  const latestAnnouncements = announcements.filter((a) => !a.is_important).slice(0, 3);

  const scorers = computeTopScorers(
    scorersData.events, scorersData.cardCounts, scorersData.players, scorersData.teamMatchCounts
  ).slice(0, 5);

  const venueNames = new Map(venues.map((v) => [v.id, v.name]));
  const groupNames = new Map(groups.map((g) => [g.id, g.name]));
  const cardProps = matchCardPropsFactory(teamsById, venueNames, groupNames);

  return (
    <div className="container-page space-y-8 py-6">
      {/* Turnuva tanıtım alanı */}
      <section className="card overflow-hidden p-0">
        <div className="bg-brand-800 px-5 py-6 text-white sm:px-8">
          <div className="flex flex-wrap items-center gap-4">
            {tournament.logo_url ? (
              <img src={tournament.logo_url} alt="" className="size-16 rounded-full border-2 border-white/30 bg-white object-cover" />
            ) : (
              <span className="flex size-16 items-center justify-center rounded-full bg-white/15">
                <Trophy className="size-8" aria-hidden />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{tournament.name}</h1>
                <Badge className="border-white/30 bg-white/15 text-white">
                  {TOURNAMENT_STATUS_LABELS[tournament.status]}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-white/85">
                {tournament.start_date && formatDate(tournament.start_date)}
                {tournament.end_date && ` - ${formatDate(tournament.end_date)}`}
                {tournament.location && ` · ${tournament.location}`}
              </p>
            </div>
            {tournament.municipality_logo_url && (
              <img
                src={tournament.municipality_logo_url}
                alt="Yığılca Belediyesi logosu"
                className="size-14 rounded-full border border-white/30 bg-white object-contain p-1"
              />
            )}
          </div>
          {tournament.description && (
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-white/85">
              {tournament.description}
            </p>
          )}
        </div>
      </section>

      {/* Önemli duyurular */}
      {importantAnnouncements.length > 0 && (
        <section className="space-y-2" aria-label="Önemli duyurular">
          {importantAnnouncements.map((a) => (
            <Link
              key={a.id}
              href={`/duyurular/${a.slug}`}
              className="card card-hover flex items-center gap-3 border-amber-200 bg-amber-50"
            >
              <span className="rounded-full bg-amber-100 p-2 text-amber-700">
                <Megaphone className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-amber-900">{a.title}</span>
                {a.summary && (
                  <span className="mt-0.5 block truncate text-xs text-amber-800/80">{a.summary}</span>
                )}
              </span>
              <ArrowRight className="size-4 shrink-0 text-amber-600" aria-hidden />
            </Link>
          ))}
        </section>
      )}

      {/* Hızlı bilgi kartları */}
      <section aria-label="Turnuva özeti" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Takım" value={formatNumber(teams.length)} />
        <StatCard label="Oyuncu" value={formatNumber(playerCount ?? 0)} />
        <StatCard label="Oynanan / Kalan Maç" value={`${totals.playedCount} / ${totals.remainingCount}`} />
        <StatCard label="Toplam Gol" value={formatNumber(totals.totalGoals)} hint={`Maç başına ${totals.goalsPerMatch}`} />
        <StatCard label="Sarı Kart" value={formatNumber(yellowTotal)} />
        <StatCard label="Kırmızı Kart" value={formatNumber(redTotal)} />
        <div className="card col-span-2 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Sıradaki Maç</p>
          {nextMatch ? (
            <Link href={`/maclar/${nextMatch.id}`} className="mt-1 block hover:underline">
              <span className="text-sm font-bold">
                {teamsById.get(nextMatch.home_team_id ?? "")?.name ?? "?"} - {teamsById.get(nextMatch.away_team_id ?? "")?.name ?? "?"}
              </span>
              <span className="mt-0.5 block text-xs text-muted">
                {formatDateShort(nextMatch.match_date)} · {formatTime(nextMatch.start_time)}
              </span>
            </Link>
          ) : (
            <p className="mt-1 text-sm text-muted">Planlanmış maç bulunmuyor.</p>
          )}
        </div>
      </section>

      {/* Bugünün maçları */}
      <section>
        <SectionHeader
          title="Bugünün Maçları"
          action={<Link href="/fikstur" className="text-sm font-medium text-brand-700 hover:underline">Tüm fikstür</Link>}
        />
        {todaysMatches.length === 0 ? (
          <EmptyState
            icon={<CalendarDays className="size-8" aria-hidden />}
            title="Bugün oynanacak maç bulunmuyor"
            description="Yaklaşan maçlar için fikstür sayfasına göz atabilirsiniz."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {todaysMatches.map((m) => (
              <MatchCard key={m.id} {...cardProps(m)} />
            ))}
          </div>
        )}
      </section>

      {/* Yaklaşan maçlar + son sonuçlar */}
      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <SectionHeader title="Yaklaşan Maçlar" />
          {upcoming.length === 0 ? (
            <EmptyState title="Yaklaşan maç bulunmuyor" />
          ) : (
            <div className="space-y-3">
              {upcoming.map((m) => (
                <MatchCard key={m.id} {...cardProps(m)} />
              ))}
            </div>
          )}
        </section>
        <section>
          <SectionHeader
            title="Son Sonuçlar"
            action={<Link href="/fikstur?durum=tamamlanan" className="text-sm font-medium text-brand-700 hover:underline">Tümü</Link>}
          />
          {results.length === 0 ? (
            <EmptyState title="Henüz tamamlanan maç yok" />
          ) : (
            <div className="space-y-3">
              {results.map((m) => (
                <MatchCard key={m.id} {...cardProps(m)} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Grup puan durumları (kompakt) */}
      {groups.length > 0 && (
        <section>
          <SectionHeader
            title="Puan Durumu"
            action={<Link href="/puan-durumu" className="text-sm font-medium text-brand-700 hover:underline">Detaylı tablo</Link>}
          />
          <div className="grid gap-3 md:grid-cols-2">
            {groups.map((group) => {
              const rows = (tablesByGroup.get(group.id) ?? []).slice(0, 4);
              return (
                <div key={group.id} className="card">
                  <p className="mb-2 flex items-center gap-2 text-sm font-bold">
                    <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: group.color ?? "#64748B" }} />
                    {group.name}
                  </p>
                  {rows.length === 0 ? (
                    <p className="py-3 text-sm text-muted">Bu grupta takım bulunmuyor.</p>
                  ) : (
                    <ol className="divide-y divide-line">
                      {rows.map((row) => {
                        const team = teamsById.get(row.teamId);
                        return (
                          <li key={row.teamId} className="flex items-center gap-2 py-1.5">
                            <span className="w-5 text-center text-xs font-bold text-muted">{row.rank}</span>
                            <TeamLogo logoUrl={team?.logo_url} name={row.teamName} color={team?.primary_color} code={team?.code} size={20} />
                            <span className="min-w-0 flex-1 truncate text-sm font-medium">{row.teamName}</span>
                            <span className="text-xs tabular-nums text-muted">{row.played} maç</span>
                            <span className="w-8 text-right text-sm font-bold tabular-nums">{row.points}</span>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Gol krallığı ilk 5 + son duyurular */}
      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <SectionHeader
            title="Gol Krallığı"
            action={<Link href="/gol-kralligi" className="text-sm font-medium text-brand-700 hover:underline">Tam liste</Link>}
          />
          {scorers.length === 0 ? (
            <EmptyState title="Gol krallığı verisi oluşmadı" description="İlk goller atıldığında liste burada görünecek." />
          ) : (
            <div className="card divide-y divide-line p-0">
              {scorers.map((s) => {
                const team = teamsById.get(s.teamId);
                return (
                  <Link key={s.playerId} href={`/oyuncular/${s.playerId}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50">
                    <span className="w-5 text-center text-sm font-bold text-muted">{s.rank}</span>
                    <TeamLogo logoUrl={team?.logo_url} name={team?.name ?? ""} color={team?.primary_color} code={team?.code} size={24} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{s.fullName}</span>
                      <span className="block truncate text-xs text-muted">{team?.name}</span>
                    </span>
                    <span className="text-base font-bold tabular-nums">{s.goals}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
        <section>
          <SectionHeader
            title="Son Duyurular"
            action={<Link href="/duyurular" className="text-sm font-medium text-brand-700 hover:underline">Tümü</Link>}
          />
          {latestAnnouncements.length === 0 && importantAnnouncements.length === 0 ? (
            <EmptyState title="Henüz duyuru yayınlanmadı" />
          ) : (
            <div className="space-y-3">
              {(latestAnnouncements.length > 0 ? latestAnnouncements : importantAnnouncements).map((a) => (
                <Link key={a.id} href={`/duyurular/${a.slug}`} className="card card-hover block">
                  <p className="text-xs text-muted">{formatDate(a.publish_date)}</p>
                  <p className="mt-0.5 text-sm font-semibold">{a.title}</p>
                  {a.summary && <p className="mt-1 line-clamp-2 text-sm text-muted">{a.summary}</p>}
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
