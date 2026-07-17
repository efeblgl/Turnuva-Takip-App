import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import {
  fetchPublicTournament, getGroups, getPublicPlayers, getPublicSuspensions,
  getPublishedMatches, getStandingsBundle, getVenues,
} from "@/lib/queries";
import { computeTeamAggregates } from "@/lib/stats";
import { MatchCard, teamInfoFrom } from "@/components/MatchCard";
import { Badge, EmptyState, StatCard } from "@/components/ui";
import { TeamLogo } from "@/components/TeamBadge";
import {
  FINISHED_STATUSES, POSITION_LABELS, SUSPENSION_TYPE_LABELS,
  TEAM_STATUS_BADGE, TEAM_STATUS_LABELS,
} from "@/lib/labels";
import { cn, formatDate, readableTextOn, teamColor } from "@/lib/utils";
import type { PublicTeam } from "@/lib/types";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "genel", label: "Genel Bakış" },
  { key: "kadro", label: "Kadro" },
  { key: "fikstur", label: "Fikstür" },
  { key: "sonuclar", label: "Sonuçlar" },
  { key: "kartlar", label: "Kartlar ve Cezalar" },
] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("public_teams").select("name").eq("id", id).maybeSingle();
  const team = data as Pick<PublicTeam, "name"> | null;
  return {
    title: team ? `${team.name}` : "Takım",
    description: team ? `${team.name} kadrosu, fikstürü, sonuçları ve istatistikleri.` : undefined,
  };
}

export default async function TeamDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sekme?: string }>;
}) {
  const { id } = await params;
  const { sekme } = await searchParams;
  const activeTab = TABS.some((t) => t.key === sekme) ? sekme! : "genel";

  const tournament = await fetchPublicTournament();
  if (!tournament) notFound();

  const supabase = await createClient();
  const { data: teamData } = await supabase
    .from("public_teams")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  const team = teamData as PublicTeam | null;
  if (!team || team.tournament_id !== tournament.id) notFound();

  const [players, allMatches, groups, venues, suspensions, bundle] = await Promise.all([
    getPublicPlayers(supabase, id),
    getPublishedMatches(supabase, tournament.id),
    getGroups(supabase, tournament.id),
    getVenues(supabase, tournament.id),
    getPublicSuspensions(supabase, tournament.id),
    getStandingsBundle(supabase, tournament),
  ]);

  const teamMatches = allMatches.filter((m) => m.home_team_id === id || m.away_team_id === id);
  const finished = teamMatches.filter((m) => (FINISHED_STATUSES as string[]).includes(m.status));
  const upcoming = teamMatches.filter((m) => !(FINISHED_STATUSES as string[]).includes(m.status) && m.status !== "cancelled");

  const agg = computeTeamAggregates([id], teamMatches).get(id)!;
  const row = [...bundle.tablesByGroup.values()].flat().find((r) => r.teamId === id);

  const { data: cardData } = await supabase
    .from("cards")
    .select("id, card_type, minute, player_id, match_id")
    .eq("team_id", id);
  const cards = (cardData as Array<{ id: string; card_type: string; minute: number | null; player_id: string | null; match_id: string }> | null) ?? [];
  const yellowCount = cards.filter((c) => c.card_type === "yellow").length;
  const redCount = cards.length - yellowCount;

  const teamSuspensions = suspensions.filter(
    (s) => s.team_id === id || players.some((p) => p.id === s.player_id)
  );

  const playersById = new Map(players.map((p) => [p.id, p]));
  const groupName = team.group_id ? groups.find((g) => g.id === team.group_id)?.name : null;
  const venueNames = new Map(venues.map((v) => [v.id, v.name]));
  const opponentInfo = (teamId: string | null) =>
    teamInfoFrom(teamId ? bundle.teamsById.get(teamId) : null);

  const headerBg = teamColor(team.primary_color);
  const headerText = readableTextOn(headerBg);

  return (
    <div className="container-page space-y-5 py-6">
      {/* Başlık: takım renkleri */}
      <section
        className="card overflow-hidden p-0"
        style={{ borderColor: headerBg }}
      >
        <div className="px-5 py-6" style={{ backgroundColor: headerBg, color: headerText }}>
          <div className="flex flex-wrap items-center gap-4">
            <TeamLogo logoUrl={team.logo_url} name={team.name} color={team.secondary_color ?? "#ffffff"} code={team.code} size={64} />
            <div className="min-w-0 flex-1">
              <h1 className="break-words text-xl font-bold tracking-tight sm:text-2xl">{team.name}</h1>
              <p className="mt-1 text-sm opacity-85">
                {groupName ?? "Grup belirlenmedi"}
                {team.neighborhood && ` · ${team.neighborhood}`}
                {team.founded_year && ` · Kuruluş ${team.founded_year}`}
              </p>
            </div>
            <Badge className={cn(TEAM_STATUS_BADGE[team.status], "bg-white/90")}>
              {TEAM_STATUS_LABELS[team.status]}
            </Badge>
          </div>
          {(team.coach_name || team.captain_player_id) && (
            <p className="mt-3 text-sm opacity-85">
              {team.coach_name && <>Teknik sorumlu: <strong>{team.coach_name}</strong></>}
              {team.coach_name && team.captain_player_id && " · "}
              {team.captain_player_id && (
                <>Kaptan: <strong>{playersById.get(team.captain_player_id)?.full_name ?? "-"}</strong></>
              )}
            </p>
          )}
        </div>

        {/* Sekmeler */}
        <nav aria-label="Takım sekmeleri" className="flex gap-1 overflow-x-auto border-t border-line bg-surface px-2 py-2">
          {TABS.map((tab) => (
            <Link
              key={tab.key}
              href={`/takimlar/${id}?sekme=${tab.key}`}
              className={cn(
                "whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium",
                activeTab === tab.key
                  ? "bg-brand-50 text-brand-800"
                  : "text-gray-600 hover:bg-gray-100"
              )}
              aria-current={activeTab === tab.key ? "page" : undefined}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </section>

      {activeTab === "genel" && (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Takım istatistikleri">
            <StatCard label="Oynanan" value={agg.played} />
            <StatCard label="G / B / M" value={`${agg.won} / ${agg.drawn} / ${agg.lost}`} />
            <StatCard label="Atılan / Yenilen" value={`${agg.goalsFor} / ${agg.goalsAgainst}`} />
            <StatCard label="Puan" value={row?.points ?? 0} hint={row ? `Averaj ${row.goalDifference > 0 ? "+" : ""}${row.goalDifference}` : undefined} />
            <StatCard label="Sarı Kart" value={yellowCount} />
            <StatCard label="Kırmızı Kart" value={redCount} />
            <StatCard label="Gol Yemeden" value={agg.cleanSheets} hint="maç" />
            <StatCard label="En Farklı Galibiyet" value={agg.biggestWin?.score ?? "-"} />
          </section>

          {team.description && (
            <section className="card">
              <h2 className="section-title mb-2">Takım Hakkında</h2>
              <p className="text-sm leading-relaxed text-muted">{team.description}</p>
            </section>
          )}

          <section>
            <h2 className="section-title mb-3">Sıradaki Maçlar</h2>
            {upcoming.length === 0 ? (
              <EmptyState title="Planlanmış maç bulunmuyor" />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {upcoming.slice(0, 4).map((m) => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    home={opponentInfo(m.home_team_id)}
                    away={opponentInfo(m.away_team_id)}
                    venueName={m.venue_id ? venueNames.get(m.venue_id) : null}
                    contextLabel={m.round_name}
                    href={`/maclar/${m.id}`}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {activeTab === "kadro" && (
        <section aria-label="Takım kadrosu">
          {players.length === 0 ? (
            <EmptyState title="Kadro henüz eklenmedi" />
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {players.filter((p) => p.is_active).map((player) => (
                <Link key={player.id} href={`/oyuncular/${player.id}`} className="card card-hover flex items-center gap-3 py-3">
                  <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                    style={{ backgroundColor: headerBg, color: headerText }}
                    aria-hidden
                  >
                    {player.shirt_number ?? "-"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-sm font-semibold leading-tight">
                      {player.full_name}
                      {player.is_captain && <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] font-bold text-amber-800">K</span>}
                    </span>
                    <span className="text-xs text-muted">{POSITION_LABELS[player.position]}</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === "fikstur" && (
        <section aria-label="Takım fikstürü">
          {upcoming.length === 0 ? (
            <EmptyState title="Planlanmış maç bulunmuyor" />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {upcoming.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  home={opponentInfo(m.home_team_id)}
                  away={opponentInfo(m.away_team_id)}
                  venueName={m.venue_id ? venueNames.get(m.venue_id) : null}
                  contextLabel={m.round_name}
                  href={`/maclar/${m.id}`}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === "sonuclar" && (
        <section aria-label="Takım sonuçları">
          {finished.length === 0 ? (
            <EmptyState title="Henüz tamamlanan maç yok" />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {[...finished].reverse().map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  home={opponentInfo(m.home_team_id)}
                  away={opponentInfo(m.away_team_id)}
                  venueName={m.venue_id ? venueNames.get(m.venue_id) : null}
                  contextLabel={m.round_name}
                  href={`/maclar/${m.id}`}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === "kartlar" && (
        <section className="space-y-4" aria-label="Kartlar ve cezalar">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Sarı Kart" value={yellowCount} />
            <StatCard label="Kırmızı Kart" value={redCount} />
          </div>
          {teamSuspensions.length === 0 ? (
            <EmptyState title="Aktif ceza bulunmuyor" />
          ) : (
            <div className="card divide-y divide-line p-0">
              {teamSuspensions.map((s) => (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">
                      {s.player_id ? playersById.get(s.player_id)?.full_name ?? "Oyuncu" : team.name}
                    </p>
                    <p className="text-xs text-muted">
                      {SUSPENSION_TYPE_LABELS[s.suspension_type]}
                      {s.reason && ` · ${s.reason}`}
                      {s.decision_date && ` · ${formatDate(s.decision_date)}`}
                    </p>
                  </div>
                  <Badge className={s.is_active ? "border-red-200 bg-red-50 text-red-700" : "border-line bg-gray-50 text-gray-600"}>
                    {s.is_active
                      ? s.remaining_matches !== null
                        ? `${s.remaining_matches} maç kaldı`
                        : "Aktif"
                      : "Tamamlandı"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
