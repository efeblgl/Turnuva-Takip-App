/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { fetchPublicTournament, getPublishedMatches } from "@/lib/queries";
import { Badge, EmptyState, StatCard } from "@/components/ui";
import { TeamLogo } from "@/components/TeamBadge";
import { FINISHED_STATUSES, POSITION_LABELS } from "@/lib/labels";
import { formatDateShort, readableTextOn, teamColor } from "@/lib/utils";
import type { PublicPlayer, PublicTeam } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("public_players").select("full_name").eq("id", id).maybeSingle();
  return { title: (data as { full_name: string } | null)?.full_name ?? "Oyuncu" };
}

export default async function PlayerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tournament = await fetchPublicTournament();
  if (!tournament) notFound();

  const supabase = await createClient();
  const { data: playerData } = await supabase
    .from("public_players")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  const player = playerData as PublicPlayer | null;
  if (!player) notFound();

  const { data: teamData } = await supabase
    .from("public_teams")
    .select("*")
    .eq("id", player.team_id)
    .maybeSingle();
  const team = teamData as PublicTeam | null;
  if (!team || team.tournament_id !== tournament.id) notFound();

  const [matches, eventsRes, cardsRes, suspensionsRes] = await Promise.all([
    getPublishedMatches(supabase, tournament.id),
    supabase
      .from("match_events")
      .select("id, match_id, event_type, minute")
      .or(`player_id.eq.${id},secondary_player_id.eq.${id}`),
    supabase.from("cards").select("id, match_id, card_type, minute").eq("player_id", id),
    supabase
      .from("public_suspensions")
      .select("*")
      .eq("player_id", id)
      .eq("is_active", true),
  ]);

  const events = (eventsRes.data as Array<{ id: string; match_id: string; event_type: string; minute: number | null }> | null) ?? [];
  const cards = (cardsRes.data as Array<{ id: string; match_id: string; card_type: string; minute: number | null }> | null) ?? [];
  const activeSuspensions = suspensionsRes.data ?? [];

  const goalEvents = events.filter((e) => ["goal", "penalty_goal"].includes(e.event_type));
  // Asist: secondary_player olarak geçtiği gol olayları
  const { count: assistCountExact } = await supabase
    .from("match_events")
    .select("id", { count: "exact", head: true })
    .eq("secondary_player_id", id)
    .in("event_type", ["goal", "penalty_goal"]);

  const yellow = cards.filter((c) => c.card_type === "yellow").length;
  const red = cards.length - yellow;

  const matchesById = new Map(matches.map((m) => [m.id, m]));
  const teamMatches = matches.filter(
    (m) =>
      (m.home_team_id === team.id || m.away_team_id === team.id) &&
      (FINISHED_STATUSES as string[]).includes(m.status)
  );

  const goalMatches = [...new Set(goalEvents.map((e) => e.match_id))]
    .map((mid) => matchesById.get(mid))
    .filter(Boolean);
  const cardMatches = [...new Set(cards.map((c) => c.match_id))]
    .map((mid) => matchesById.get(mid))
    .filter(Boolean);

  const bg = teamColor(team.primary_color);
  const fg = readableTextOn(bg);

  const matchLine = (m: NonNullable<ReturnType<typeof matchesById.get>>, extra: string) => (
    <Link key={`${m.id}-${extra}`} href={`/maclar/${m.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-gray-50">
      <span className="min-w-0 flex-1 truncate text-sm">
        {m.round_name && <span className="text-muted">{m.round_name} · </span>}
        <span className="font-medium">{formatDateShort(m.match_date)}</span>
        {m.home_score !== null && m.away_score !== null && (
          <span className="ml-2 font-bold tabular-nums">{m.home_score}-{m.away_score}</span>
        )}
      </span>
      <span className="shrink-0 text-xs font-semibold text-muted">{extra}</span>
    </Link>
  );

  return (
    <div className="container-page space-y-5 py-6">
      <section className="card overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-4 px-5 py-6" style={{ backgroundColor: bg, color: fg }}>
          {player.photo_url ? (
            <img src={player.photo_url} alt="" className="size-20 rounded-full border-2 border-white/40 object-cover" />
          ) : (
            <span
              className="flex size-20 items-center justify-center rounded-full border-2 border-white/40 text-2xl font-bold"
              aria-hidden
            >
              {player.shirt_number ?? player.first_name.charAt(0)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-xl font-bold tracking-tight sm:text-2xl">
              {player.full_name}
              {player.is_captain && (
                <span className="ml-2 rounded bg-white/25 px-1.5 py-0.5 align-middle text-xs font-bold">Kaptan</span>
              )}
            </h1>
            <Link href={`/takimlar/${team.id}`} className="mt-1 inline-flex items-center gap-2 text-sm opacity-90 hover:underline">
              <TeamLogo logoUrl={team.logo_url} name={team.name} color={team.secondary_color} code={team.code} size={20} />
              {team.name}
            </Link>
            <p className="mt-1 text-sm opacity-85">
              {player.shirt_number !== null && `Forma No: ${player.shirt_number} · `}
              {POSITION_LABELS[player.position]}
              {player.birth_year && ` · ${player.birth_year} doğumlu`}
            </p>
          </div>
          {activeSuspensions.length > 0 && (
            <Badge className="border-red-300 bg-red-100 text-red-800">Cezalı</Badge>
          )}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-5" aria-label="Oyuncu istatistikleri">
        <StatCard label="Takım Maçı" value={teamMatches.length} />
        <StatCard label="Gol" value={goalEvents.length} />
        <StatCard label="Asist" value={assistCountExact ?? 0} />
        <StatCard label="Sarı Kart" value={yellow} />
        <StatCard label="Kırmızı Kart" value={red} />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section>
          <h2 className="section-title mb-3">Gol Attığı Maçlar</h2>
          {goalMatches.length === 0 ? (
            <EmptyState title="Henüz gol kaydı yok" />
          ) : (
            <div className="card divide-y divide-line p-0">
              {goalMatches.map((m) =>
                matchLine(m!, `${goalEvents.filter((e) => e.match_id === m!.id).length} gol`)
              )}
            </div>
          )}
        </section>

        <section>
          <h2 className="section-title mb-3">Kart Gördüğü Maçlar</h2>
          {cardMatches.length === 0 ? (
            <EmptyState title="Kart kaydı bulunmuyor" />
          ) : (
            <div className="card divide-y divide-line p-0">
              {cardMatches.map((m) =>
                matchLine(
                  m!,
                  cards
                    .filter((c) => c.match_id === m!.id)
                    .map((c) => (c.card_type === "yellow" ? "Sarı" : "Kırmızı"))
                    .join(", ")
                )
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
