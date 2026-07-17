import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getAdminTournament, getGroups, getMatchEvents, getVenues } from "@/lib/queries";
import { Badge, EmptyState } from "@/components/ui";
import { MatchForm } from "@/components/panel/MatchForm";
import { ScoreEntry } from "@/components/panel/ScoreEntry";
import { MatchAdminActions } from "@/components/panel/MatchAdminActions";
import { MATCH_STATUS_BADGE, MATCH_STATUS_LABELS } from "@/lib/labels";
import { formatDate, formatTime } from "@/lib/utils";
import type { Match, Player, Suspension, Team } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PanelMatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const tournament = await getAdminTournament(supabase);
  if (!tournament) return <EmptyState title="Önce turnuva oluşturun" />;

  const { data: matchData } = await supabase.from("matches").select("*").eq("id", id).maybeSingle();
  const match = matchData as Match | null;
  if (!match) notFound();

  const [groups, venues, teamsRes, events, suspensionsRes] = await Promise.all([
    getGroups(supabase, tournament.id),
    getVenues(supabase, tournament.id),
    supabase.from("teams").select("id, name, group_id").eq("tournament_id", tournament.id).order("name"),
    getMatchEvents(supabase, id),
    supabase
      .from("suspensions")
      .select("player_id, is_active")
      .eq("tournament_id", tournament.id)
      .eq("is_active", true),
  ]);

  const teams = (teamsRes.data as Pick<Team, "id" | "name" | "group_id">[] | null) ?? [];
  const teamNames = new Map(teams.map((t) => [t.id, t.name]));

  const homeTeam = match.home_team_id
    ? { id: match.home_team_id, name: teamNames.get(match.home_team_id) ?? "?" }
    : null;
  const awayTeam = match.away_team_id
    ? { id: match.away_team_id, name: teamNames.get(match.away_team_id) ?? "?" }
    : null;

  let homePlayers: Pick<Player, "id" | "full_name" | "shirt_number">[] = [];
  let awayPlayers: Pick<Player, "id" | "full_name" | "shirt_number">[] = [];
  if (homeTeam && awayTeam) {
    const { data: playersData } = await supabase
      .from("players")
      .select("id, full_name, shirt_number, team_id")
      .in("team_id", [homeTeam.id, awayTeam.id])
      .eq("is_active", true)
      .order("shirt_number");
    const players = (playersData as Array<Pick<Player, "id" | "full_name" | "shirt_number" | "team_id">> | null) ?? [];
    homePlayers = players.filter((p) => p.team_id === homeTeam.id);
    awayPlayers = players.filter((p) => p.team_id === awayTeam.id);
  }

  const suspendedPlayerIds = (
    (suspensionsRes.data as Array<Pick<Suspension, "player_id" | "is_active">> | null) ?? []
  )
    .map((s) => s.player_id)
    .filter((pid): pid is string => pid !== null);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            {homeTeam?.name ?? "Belirlenecek"} - {awayTeam?.name ?? "Belirlenecek"}
          </h1>
          <p className="mt-0.5 text-sm text-muted">
            {match.round_name && `${match.round_name} · `}
            {formatDate(match.match_date)} {formatTime(match.start_time)}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge className={MATCH_STATUS_BADGE[match.status]}>{MATCH_STATUS_LABELS[match.status]}</Badge>
          {!match.is_published && <Badge className="border-gray-300 bg-gray-100 text-gray-600">Taslak</Badge>}
        </div>
      </div>

      <MatchAdminActions match={match} />

      {homeTeam && awayTeam ? (
        <ScoreEntry
          match={match}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          homePlayers={homePlayers}
          awayPlayers={awayPlayers}
          existingEvents={events}
          suspendedPlayerIds={suspendedPlayerIds}
        />
      ) : (
        <p className="card text-sm text-muted">
          Bu eleme maçının takımları henüz belli değil. Önceki tur tamamlandığında kazananlar
          otomatik olarak yerleşir; aşağıdan elle de atayabilirsiniz.
        </p>
      )}

      <details className="card">
        <summary className="cursor-pointer text-sm font-bold uppercase tracking-wide text-muted">
          Maç Planını Düzenle (tarih, saat, saha, takımlar)
        </summary>
        <div className="mt-4">
          <MatchForm
            tournamentId={tournament.id}
            teams={teams}
            groups={groups}
            venues={venues}
            match={match}
          />
        </div>
      </details>
    </div>
  );
}
