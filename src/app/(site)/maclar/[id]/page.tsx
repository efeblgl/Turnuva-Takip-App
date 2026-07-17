import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, User } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { fetchPublicTournament, getMatchEvents, getPublishedMatches } from "@/lib/queries";
import { Badge, EmptyState } from "@/components/ui";
import { TeamLogo } from "@/components/TeamBadge";
import { MatchCard, teamInfoFrom } from "@/components/MatchCard";
import { MatchStoryShare, type StoryTeam } from "@/components/site/MatchStoryShare";
import {
  EVENT_TYPE_LABELS, FINISHED_STATUSES, FORFEIT_TYPE_LABELS, LIVE_STATUSES,
  MATCH_STATUS_BADGE, MATCH_STATUS_LABELS,
} from "@/lib/labels";
import { cn, formatDate, formatTime } from "@/lib/utils";
import type { Match, MatchEventType, PublicPlayer, PublicTeam, Venue } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: match } = await supabase
    .from("matches")
    .select("home_score, away_score, match_date, start_time, home_team_id, away_team_id")
    .eq("id", id)
    .maybeSingle();
  if (!match) return { title: "Maç" };

  const ids = [match.home_team_id, match.away_team_id].filter(Boolean) as string[];
  const { data: teams } = await supabase.from("public_teams").select("id, name").in("id", ids);
  const nameOf = (tid: string | null) =>
    (teams as Array<{ id: string; name: string }> | null)?.find((t) => t.id === tid)?.name ?? "Belirlenecek";

  const score =
    match.home_score !== null && match.away_score !== null
      ? `${match.home_score}-${match.away_score}`
      : `${formatDate(match.match_date)} ${formatTime(match.start_time)}`;

  return {
    title: `${nameOf(match.home_team_id)} ${score} ${nameOf(match.away_team_id)}`,
    description: `Maç detayı: ${nameOf(match.home_team_id)} - ${nameOf(match.away_team_id)}, ${formatDate(match.match_date)} ${formatTime(match.start_time)}.`,
  };
}

const GOAL_TYPES: MatchEventType[] = ["goal", "penalty_goal", "own_goal"];
const CARD_TYPES: MatchEventType[] = ["yellow_card", "second_yellow", "red_card"];

function EventIcon({ type }: { type: MatchEventType }) {
  if (GOAL_TYPES.includes(type)) return <span aria-hidden className="text-base leading-none">⚽</span>;
  if (type === "yellow_card") return <span aria-hidden className="inline-block h-4 w-3 rounded-[2px] bg-yellow-400" />;
  if (type === "second_yellow" || type === "red_card")
    return <span aria-hidden className="inline-block h-4 w-3 rounded-[2px] bg-red-500" />;
  if (type === "substitution") return <span aria-hidden className="text-sm leading-none">🔁</span>;
  if (type === "injury") return <span aria-hidden className="text-sm leading-none">🩹</span>;
  return <span aria-hidden className="inline-block size-2 rounded-full bg-gray-300" />;
}

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tournament = await fetchPublicTournament();
  if (!tournament) notFound();

  const supabase = await createClient();
  const { data: matchData } = await supabase
    .from("matches")
    .select("*")
    .eq("id", id)
    .eq("is_published", true)
    .maybeSingle();
  const match = matchData as Match | null;
  if (!match || match.tournament_id !== tournament.id) notFound();

  const teamIds = [match.home_team_id, match.away_team_id].filter(Boolean) as string[];
  const [teamsRes, events, venueRes, allMatches] = await Promise.all([
    supabase.from("public_teams").select("*").in("id", teamIds.length > 0 ? teamIds : ["00000000-0000-0000-0000-000000000000"]),
    getMatchEvents(supabase, id),
    match.venue_id
      ? supabase.from("venues").select("*").eq("id", match.venue_id).maybeSingle()
      : Promise.resolve({ data: null }),
    getPublishedMatches(supabase, tournament.id),
  ]);

  const teams = (teamsRes.data as PublicTeam[] | null) ?? [];
  const home = teams.find((t) => t.id === match.home_team_id) ?? null;
  const away = teams.find((t) => t.id === match.away_team_id) ?? null;
  const venue = (venueRes?.data as Venue | null) ?? null;

  // Olaylardaki oyuncular
  const playerIds = [
    ...new Set(
      events.flatMap((e) => [e.player_id, e.secondary_player_id]).filter(Boolean) as string[]
    ),
  ];
  const { data: playersData } = playerIds.length
    ? await supabase.from("public_players").select("*").in("id", playerIds)
    : { data: [] };
  const playersById = new Map(((playersData as PublicPlayer[] | null) ?? []).map((p) => [p.id, p]));

  const playerEvents = events
    .filter((e) => !["match_start", "half_time", "second_half_start", "match_end", "extra_time_start", "penalty_shootout"].includes(e.event_type))
    .sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0));

  const scorers = playerEvents.filter((e) => GOAL_TYPES.includes(e.event_type));
  const cardEvents = playerEvents.filter((e) => CARD_TYPES.includes(e.event_type));

  // Önceki karşılaşmalar ve form
  const finishedAll = allMatches.filter((m) => (FINISHED_STATUSES as string[]).includes(m.status));
  const headToHead = finishedAll.filter(
    (m) =>
      m.id !== match.id &&
      teamIds.length === 2 &&
      teamIds.includes(m.home_team_id ?? "") &&
      teamIds.includes(m.away_team_id ?? "")
  );

  const formOf = (teamId: string | null) => {
    if (!teamId) return [];
    return finishedAll
      .filter((m) => m.id !== match.id && (m.home_team_id === teamId || m.away_team_id === teamId))
      .slice(-5)
      .map((m) => {
        const isHome = m.home_team_id === teamId;
        const mine = isHome ? m.home_score! : m.away_score!;
        const theirs = isHome ? m.away_score! : m.home_score!;
        return mine > theirs ? "G" : mine < theirs ? "M" : "B";
      });
  };

  const played = match.home_score !== null && match.away_score !== null &&
    !["scheduled", "postponed", "cancelled", "awaiting_decision"].includes(match.status);
  const isLive = (LIVE_STATUSES as string[]).includes(match.status);

  // Instagram hikayesi görseli için veriler
  const storyTeam = (t: PublicTeam | null): StoryTeam | null =>
    t ? { name: t.name, code: t.code, color: t.primary_color, logoUrl: t.logo_url } : null;
  const scorerLine = (e: (typeof scorers)[number]) =>
    `${(e.player_id ? playersById.get(e.player_id)?.full_name : null) ?? "?"} ${e.minute ?? "?"}'${
      e.event_type === "penalty_goal" ? " (P)" : e.event_type === "own_goal" ? " (KK)" : ""
    }`;

  const sideTeam = (team: PublicTeam | null, align: "left" | "right") => (
    <div className={cn("flex min-w-0 flex-1 flex-col items-center gap-2 text-center")}>
      {team ? (
        <Link href={`/takimlar/${team.id}`} className="flex flex-col items-center gap-2 hover:underline">
          <TeamLogo logoUrl={team.logo_url} name={team.name} color={team.primary_color} code={team.code} size={56} />
          <span className="break-words text-sm font-bold leading-tight">{team.name}</span>
        </Link>
      ) : (
        <span className="text-sm font-semibold text-muted">Belirlenecek</span>
      )}
      <span className="flex gap-1" aria-label={`${align === "left" ? "Ev sahibi" : "Deplasman"} form durumu`}>
        {formOf(team?.id ?? null).map((r, i) => (
          <span
            key={i}
            className={cn(
              "flex size-4 items-center justify-center rounded text-[9px] font-bold text-white",
              r === "G" && "bg-emerald-500", r === "B" && "bg-gray-400", r === "M" && "bg-red-500"
            )}
          >
            {r}
          </span>
        ))}
      </span>
    </div>
  );

  return (
    <div className="container-page space-y-5 py-6">
      {/* Skor kartı */}
      <section className="card">
        <div className="mb-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-xs text-muted">
          <span>{match.round_name ?? (match.stage === "knockout" ? "Eleme" : "Grup Maçı")}</span>
          <span className="flex items-center gap-1"><CalendarDays className="size-3.5" aria-hidden />{formatDate(match.match_date)} · {formatTime(match.start_time)}</span>
          {venue && <span className="flex items-center gap-1"><MapPin className="size-3.5" aria-hidden />{venue.name}</span>}
          {match.referee_name && <span className="flex items-center gap-1"><User className="size-3.5" aria-hidden />Hakem: {match.referee_name}</span>}
        </div>

        <div className="flex items-start justify-center gap-3">
          {sideTeam(home, "left")}
          <div className="flex flex-col items-center pt-3">
            {played ? (
              <>
                <span className="text-3xl font-bold tabular-nums tracking-tight sm:text-4xl">
                  {match.home_score} - {match.away_score}
                </span>
                {match.home_penalty_score !== null && match.away_penalty_score !== null && (
                  <span className="mt-1 text-xs font-medium text-muted">
                    Penaltılar: {match.home_penalty_score}-{match.away_penalty_score}
                  </span>
                )}
              </>
            ) : (
              <span className="text-2xl font-bold text-gray-300">vs</span>
            )}
            <Badge className={cn("mt-2", MATCH_STATUS_BADGE[match.status], isLive && "animate-pulse")}>
              {MATCH_STATUS_LABELS[match.status]}
            </Badge>
            {match.is_forfeit && match.forfeit_type && (
              <span className="mt-1 text-xs font-medium text-purple-700">
                {FORFEIT_TYPE_LABELS[match.forfeit_type]}
              </span>
            )}
          </div>
          {sideTeam(away, "right")}
        </div>

        {/* Instagram hikayesi paylaşımı */}
        {!["cancelled", "postponed"].includes(match.status) && (
          <div className="mt-4 flex justify-center border-t border-line pt-4">
            <MatchStoryShare
              tournamentName={tournament.name}
              roundLabel={match.round_name ?? (match.stage === "knockout" ? "Eleme Maçı" : "Grup Maçı")}
              dateLabel={formatDate(match.match_date)}
              timeLabel={formatTime(match.start_time)}
              venueName={venue?.name ?? null}
              played={played}
              homeScore={match.home_score}
              awayScore={match.away_score}
              homePen={match.home_penalty_score}
              awayPen={match.away_penalty_score}
              home={storyTeam(home)}
              away={storyTeam(away)}
              homeScorers={scorers.filter((e) => e.team_id === match.home_team_id).map(scorerLine)}
              awayScorers={scorers.filter((e) => e.team_id === match.away_team_id).map(scorerLine)}
            />
          </div>
        )}

        {match.status === "postponed" && (
          <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-center text-xs text-amber-800">
            Bu maç ertelenmiştir{match.original_match_date && ` (eski tarih: ${formatDate(match.original_match_date)})`}.
            {match.postponement_reason && ` Sebep: ${match.postponement_reason}`}
          </p>
        )}
        {match.status === "cancelled" && (
          <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-center text-xs text-red-800">
            Bu maç iptal edilmiştir.{match.postponement_reason && ` Sebep: ${match.postponement_reason}`}
          </p>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Maç olayları zaman çizelgesi */}
        <section>
          <h2 className="section-title mb-3">Maç Olayları</h2>
          {playerEvents.length === 0 ? (
            <EmptyState title={played ? "Olay kaydı girilmedi" : "Maç henüz oynanmadı"} />
          ) : (
            <ol className="card space-y-0 divide-y divide-line p-0">
              {playerEvents.map((e) => {
                const isHome = e.team_id === match.home_team_id;
                const player = e.player_id ? playersById.get(e.player_id) : null;
                const secondary = e.secondary_player_id ? playersById.get(e.secondary_player_id) : null;
                return (
                  <li key={e.id} className={cn("flex items-center gap-3 px-4 py-2.5", !isHome && "flex-row-reverse text-right")}>
                    <span className="flex w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 px-1.5 py-0.5 text-xs font-bold tabular-nums">
                      {e.minute ?? "-"}&apos;{e.extra_minute ? `+${e.extra_minute}` : ""}
                    </span>
                    <EventIcon type={e.event_type} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold leading-tight">
                        {player?.full_name ?? "Bilinmeyen oyuncu"}
                      </span>
                      <span className="block text-xs text-muted">
                        {EVENT_TYPE_LABELS[e.event_type]}
                        {secondary && e.event_type === "substitution" && ` (çıkan: ${secondary.full_name})`}
                        {secondary && GOAL_TYPES.includes(e.event_type) && ` (asist: ${secondary.full_name})`}
                        {e.description && ` · ${e.description}`}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
          )}

          {(scorers.length > 0 || cardEvents.length > 0) && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="card py-3">
                <p className="text-xs font-semibold uppercase text-muted">Goller</p>
                <ul className="mt-1 space-y-0.5 text-sm">
                  {scorers.length === 0 && <li className="text-muted">-</li>}
                  {scorers.map((e) => (
                    <li key={e.id}>
                      {e.player_id ? playersById.get(e.player_id)?.full_name : "?"}{" "}
                      <span className="text-xs text-muted">{e.minute}&apos;{e.event_type === "own_goal" ? " (KK)" : e.event_type === "penalty_goal" ? " (P)" : ""}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card py-3">
                <p className="text-xs font-semibold uppercase text-muted">Kartlar</p>
                <ul className="mt-1 space-y-0.5 text-sm">
                  {cardEvents.length === 0 && <li className="text-muted">-</li>}
                  {cardEvents.map((e) => (
                    <li key={e.id} className="flex items-center gap-1.5">
                      <EventIcon type={e.event_type} />
                      {e.player_id ? playersById.get(e.player_id)?.full_name : "?"}{" "}
                      <span className="text-xs text-muted">{e.minute}&apos;</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {match.notes && (
            <div className="card mt-3">
              <p className="text-xs font-semibold uppercase text-muted">Maç Notu</p>
              <p className="mt-1 text-sm text-muted">{match.notes}</p>
            </div>
          )}
        </section>

        {/* Önceki karşılaşmalar */}
        <section>
          <h2 className="section-title mb-3">Önceki Karşılaşmalar</h2>
          {headToHead.length === 0 ? (
            <EmptyState title="Bu iki takım daha önce karşılaşmadı" />
          ) : (
            <div className="space-y-3">
              {headToHead.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  home={teamInfoFrom(m.home_team_id === home?.id ? home : away)}
                  away={teamInfoFrom(m.away_team_id === away?.id ? away : home)}
                  contextLabel={m.round_name}
                  href={`/maclar/${m.id}`}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
