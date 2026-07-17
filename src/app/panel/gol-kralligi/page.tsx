import { createClient } from "@/utils/supabase/server";
import { getAdminTournament, getScorersData, getSettingsMap } from "@/lib/queries";
import { computeTopScorers, DEFAULT_SCORER_TIEBREAKERS } from "@/lib/scorers";
import { EmptyState } from "@/components/ui";
import type { ScorerTiebreaker } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PanelScorersPage() {
  const supabase = await createClient();
  const tournament = await getAdminTournament(supabase);
  if (!tournament) return <EmptyState title="Önce turnuva oluşturun" />;

  const [data, settings, teamsRes] = await Promise.all([
    getScorersData(supabase, tournament.id),
    getSettingsMap(supabase, tournament.id),
    supabase.from("teams").select("id, name").eq("tournament_id", tournament.id),
  ]);

  const tiebreakers =
    (settings["top_scorer_tiebreakers"] as ScorerTiebreaker[] | undefined) ?? DEFAULT_SCORER_TIEBREAKERS;
  const rows = computeTopScorers(data.events, data.cardCounts, data.players, data.teamMatchCounts, tiebreakers);
  const teamNames = new Map(((teamsRes.data as Array<{ id: string; name: string }> | null) ?? []).map((t) => [t.id, t.name]));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Gol Krallığı</h1>
        <p className="mt-0.5 text-sm text-muted">Maç olaylarından otomatik hesaplanır.</p>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Gol krallığı verisi oluşmadı" description="Skor girişlerinde gol atan oyuncular seçildikçe liste oluşur." />
      ) : (
        <div className="table-wrap">
          <table className="w-full">
            <thead className="border-b border-line bg-gray-50/70">
              <tr>
                <th className="th w-10 text-center">#</th>
                <th className="th">Oyuncu</th>
                <th className="th">Takım</th>
                <th className="th text-center">Maç</th>
                <th className="th text-center">Gol</th>
                <th className="th hidden text-center sm:table-cell">Penaltı</th>
                <th className="th hidden text-center sm:table-cell">Asist</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.playerId} className="border-b border-line last:border-b-0">
                  <td className="td text-center font-bold text-muted">{r.rank}</td>
                  <td className="td text-sm font-semibold">{r.fullName}</td>
                  <td className="td text-sm text-muted">{teamNames.get(r.teamId)}</td>
                  <td className="td text-center tabular-nums">{r.matches}</td>
                  <td className="td text-center text-base font-bold tabular-nums">{r.goals}</td>
                  <td className="td hidden text-center tabular-nums sm:table-cell">{r.penaltyGoals}</td>
                  <td className="td hidden text-center tabular-nums sm:table-cell">{r.assists}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
