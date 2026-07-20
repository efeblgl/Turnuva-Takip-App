/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ArrowRight, BarChart3, CalendarDays, Megaphone, Radio, Trophy } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import {
  fetchPublicTournament, getGoalEvents, getGroups, getPublicTeams,
  getPublishedAnnouncements, getPublishedMatches, getVenues,
} from "@/lib/queries";
import { MatchCard, teamInfoFrom } from "@/components/MatchCard";
import { PresidentPopup } from "@/components/PresidentPopup";
import { AutoRefresh } from "@/components/site/AutoRefresh";
import { LiveMatchCard } from "@/components/site/LiveMatchCard";
import { MatchStoryShare, type StoryTeam } from "@/components/site/MatchStoryShare";
import { Badge, EmptyState, SectionHeader } from "@/components/ui";
import {
  FINISHED_STATUSES, TOURNAMENT_STATUS_LABELS,
} from "@/lib/labels";
import { selectLiveMatches } from "@/lib/live";
import {
  formatDate, formatDateShort, formatTime, nowTimeInTurkey, todayInTurkey,
} from "@/lib/utils";
import type { MatchEvent, PublicPlayer, PublicTeam } from "@/lib/types";

export const dynamic = "force-dynamic";

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
  const [matches, teams, groups, venues, announcements] = await Promise.all([
    getPublishedMatches(supabase, tournament.id),
    getPublicTeams(supabase, tournament.id),
    getGroups(supabase, tournament.id),
    getVenues(supabase, tournament.id),
    getPublishedAnnouncements(supabase, tournament.id, 6),
  ]);

  const teamsById = new Map(teams.map((t) => [t.id, t]));
  const venueNames = new Map(venues.map((v) => [v.id, v.name]));
  const groupNames = new Map(groups.map((g) => [g.id, g.name]));

  const today = todayInTurkey();
  const now = nowTimeInTurkey();

  // Durumu canlıya çekilmiş veya saati gelmiş maçlar; sonraki maçın saati
  // gelince öncekinin penceresi kapanır ve sıradaki maç ana ekrana geçer
  const liveMatches = selectLiveMatches(matches, today, now);
  const liveIds = new Set(liveMatches.map((m) => m.id));
  // Günün tüm programı (canlıların altında listelenir; geçmiş skorlar dahil)
  const todaysMatches = matches.filter((m) => m.match_date === today && m.status !== "cancelled");
  const hasPendingToday =
    liveMatches.length > 0 ||
    todaysMatches.some((m) => !(FINISHED_STATUSES as string[]).includes(m.status));
  // Sıradaki maç: saati henüz gelmemiş ilk planlı maç (canlı olanlar hariç)
  const nextMatch = matches.find(
    (m) =>
      m.status === "scheduled" &&
      m.match_date &&
      (m.match_date > today ||
        (m.match_date === today && (m.start_time ?? "").slice(0, 5) > now))
  );

  // Canlı maçların gol olayları ve golcü isimleri
  const goalEvents = await getGoalEvents(supabase, liveMatches.map((m) => m.id));
  const scorerIds = [...new Set(goalEvents.map((e) => e.player_id).filter(Boolean) as string[])];
  const { data: scorerPlayers } = scorerIds.length
    ? await supabase.from("public_players").select("*").in("id", scorerIds)
    : { data: [] };
  const playersById = new Map(
    ((scorerPlayers as PublicPlayer[] | null) ?? []).map((p) => [p.id, p])
  );

  const scorerLine = (e: MatchEvent) =>
    `${(e.player_id ? playersById.get(e.player_id)?.full_name : null) ?? "?"} ${e.minute ?? "?"}'${
      e.event_type === "penalty_goal" ? " (P)" : e.event_type === "own_goal" ? " (KK)" : ""
    }`;

  const importantAnnouncements = announcements.filter((a) => a.is_important).slice(0, 2);

  const contextLabelOf = (m: (typeof matches)[number]) =>
    m.stage === "knockout"
      ? m.round_name
      : m.group_id
        ? groupNames.get(m.group_id) ?? m.round_name
        : m.round_name;

  const storyTeam = (t: PublicTeam | null | undefined): StoryTeam | null =>
    t ? { name: t.name, code: t.code, color: t.primary_color, logoUrl: t.logo_url } : null;

  return (
    <div className="container-page space-y-8 py-6">
      {/* Girişte açılan görsel duyuru pop-up'ı */}
      <PresidentPopup />

      {/* Maç günü: skorlar elle yenilemeye gerek kalmadan güncellenir */}
      {hasPendingToday && <AutoRefresh seconds={liveMatches.length > 0 ? 30 : 60} />}

      {/* Canlı maçlar: skor, golcüler ve paylaşım (maç saati gelince otomatik belirir) */}
      <section aria-label="Canlı maçlar">
        {liveMatches.length === 0 ? (
          <div className="card text-center">
            <Radio className="mx-auto size-8 text-muted" aria-hidden />
            <p className="mt-2 text-sm font-semibold">Şu anda oynanan maç yok</p>
            {nextMatch ? (
              <Link href={`/maclar/${nextMatch.id}`} className="mt-2 block hover:underline">
                <span className="text-xs font-medium uppercase tracking-wide text-muted">Sıradaki maç</span>
                <span className="mt-0.5 block text-sm font-bold">
                  {teamsById.get(nextMatch.home_team_id ?? "")?.name ?? "?"} - {teamsById.get(nextMatch.away_team_id ?? "")?.name ?? "?"}
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  {formatDateShort(nextMatch.match_date)} · {formatTime(nextMatch.start_time)}
                  {nextMatch.venue_id && venueNames.get(nextMatch.venue_id) && ` · ${venueNames.get(nextMatch.venue_id)}`}
                </span>
              </Link>
            ) : (
              <p className="mt-1 text-xs text-muted">Planlanmış maç bulunmuyor.</p>
            )}
            <Link href="/fikstur" className="btn-secondary btn-sm mt-3 inline-flex">
              <CalendarDays className="size-3.5" aria-hidden />
              Tüm maçlar ve sonuçlar fikstürde
            </Link>
          </div>
        ) : (
          <div className={liveMatches.length > 1 ? "grid gap-3 md:grid-cols-2" : ""}>
            {liveMatches.map((m) => {
              const home = m.home_team_id ? teamsById.get(m.home_team_id) : null;
              const away = m.away_team_id ? teamsById.get(m.away_team_id) : null;
              const matchGoals = goalEvents.filter((e) => e.match_id === m.id);
              const homeScorers = matchGoals.filter((e) => e.team_id === m.home_team_id).map(scorerLine);
              const awayScorers = matchGoals.filter((e) => e.team_id === m.away_team_id).map(scorerLine);
              const hasScore =
                m.status !== "scheduled" && m.home_score !== null && m.away_score !== null;
              return (
                <LiveMatchCard
                  key={m.id}
                  match={m}
                  home={teamInfoFrom(home)}
                  away={teamInfoFrom(away)}
                  venueName={m.venue_id ? venueNames.get(m.venue_id) : null}
                  contextLabel={contextLabelOf(m)}
                  href={`/maclar/${m.id}`}
                  homeScorers={homeScorers}
                  awayScorers={awayScorers}
                  shareButton={
                    <MatchStoryShare
                      tournamentName={tournament.name}
                      roundLabel={m.round_name ?? (m.stage === "knockout" ? "Eleme Maçı" : "Grup Maçı")}
                      dateLabel={formatDate(m.match_date)}
                      timeLabel={formatTime(m.start_time)}
                      venueName={m.venue_id ? venueNames.get(m.venue_id) ?? null : null}
                      played={hasScore}
                      homeScore={m.home_score}
                      awayScore={m.away_score}
                      homePen={m.home_penalty_score}
                      awayPen={m.away_penalty_score}
                      home={storyTeam(home)}
                      away={storyTeam(away)}
                      homeScorers={homeScorers}
                      awayScorers={awayScorers}
                    />
                  }
                />
              );
            })}
          </div>
        )}
      </section>

      {/* Günün maçları: program, skorlar ve biten maçların sonuçları */}
      {todaysMatches.length > 0 && (
        <section aria-label="Günün maçları">
          <SectionHeader
            title="Günün Maçları"
            action={<Link href="/fikstur" className="text-sm font-medium text-brand-700 hover:underline">Tüm fikstür</Link>}
          />
          <div className="grid gap-3 md:grid-cols-2">
            {todaysMatches.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                home={teamInfoFrom(m.home_team_id ? teamsById.get(m.home_team_id) : null)}
                away={teamInfoFrom(m.away_team_id ? teamsById.get(m.away_team_id) : null)}
                venueName={m.venue_id ? venueNames.get(m.venue_id) : null}
                contextLabel={contextLabelOf(m)}
                href={`/maclar/${m.id}`}
                liveNow={liveIds.has(m.id)}
              />
            ))}
          </div>
        </section>
      )}

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

      {/* Diğer sayfalara hızlı erişim */}
      <section aria-label="Hızlı erişim" className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link href="/fikstur" className="card card-hover flex items-center gap-3">
          <span className="rounded-full bg-brand-50 p-2 text-brand-700">
            <CalendarDays className="size-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Fikstür</span>
            <span className="block text-xs text-muted">Tüm maçlar, sonuçlar ve takım arama</span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-muted" aria-hidden />
        </Link>
        <Link href="/puan-durumu" className="card card-hover flex items-center gap-3">
          <span className="rounded-full bg-brand-50 p-2 text-brand-700">
            <BarChart3 className="size-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Puan Durumu</span>
            <span className="block text-xs text-muted">Grup tabloları ve sıralama</span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-muted" aria-hidden />
        </Link>
        <Link href="/gol-kralligi" className="card card-hover flex items-center gap-3">
          <span className="rounded-full bg-brand-50 p-2 text-brand-700">
            <Trophy className="size-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Gol Krallığı</span>
            <span className="block text-xs text-muted">En golcü oyuncular</span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-muted" aria-hidden />
        </Link>
      </section>
    </div>
  );
}
