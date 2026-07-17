import type { Metadata } from "next";
import Link from "next/link";
import { Target } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { fetchPublicTournament, fetchSettings, getPublicTeams, getScorersData } from "@/lib/queries";
import { computeTopScorers, DEFAULT_SCORER_TIEBREAKERS } from "@/lib/scorers";
import { EmptyState } from "@/components/ui";
import { TeamLogo } from "@/components/TeamBadge";
import { POSITION_LABELS } from "@/lib/labels";
import type { PlayerPosition, ScorerTiebreaker } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gol Krallığı",
  description: "Turnuvanın en golcü oyuncuları.",
};

export default async function TopScorersPage({
  searchParams,
}: {
  searchParams: Promise<{ takim?: string }>;
}) {
  const { takim } = await searchParams;
  const tournament = await fetchPublicTournament();
  if (!tournament) {
    return (
      <div className="container-page py-10">
        <EmptyState title="Gol krallığı verisi oluşmadı" />
      </div>
    );
  }

  const supabase = await createClient();
  const [data, teams, settings] = await Promise.all([
    getScorersData(supabase, tournament.id),
    getPublicTeams(supabase, tournament.id),
    fetchSettings(tournament.id),
  ]);

  const tiebreakers =
    (settings["top_scorer_tiebreakers"] as ScorerTiebreaker[] | undefined) ?? DEFAULT_SCORER_TIEBREAKERS;

  let rows = computeTopScorers(data.events, data.cardCounts, data.players, data.teamMatchCounts, tiebreakers);
  if (takim) rows = rows.filter((r) => r.teamId === takim);

  const teamsById = new Map(teams.map((t) => [t.id, t]));

  return (
    <div className="container-page space-y-4 py-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Gol Krallığı</h1>
        <p className="mt-1 text-sm text-muted">
          Eşitlik durumunda daha az maçta gol atan ve daha fazla asist yapan oyuncu üstte yer alır.
        </p>
      </div>

      <form method="get" className="card flex gap-2 p-3 sm:max-w-md">
        <select name="takim" defaultValue={takim ?? ""} className="input" aria-label="Takıma göre filtrele">
          <option value="">Tüm takımlar</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <button type="submit" className="btn-primary shrink-0">Uygula</button>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Target className="size-8" aria-hidden />}
          title="Gol krallığı verisi oluşmadı"
          description="İlk goller atıldığında sıralama burada görünecek."
        />
      ) : (
        <div className="table-wrap">
          <table className="w-full">
            <thead className="border-b border-line bg-gray-50/70">
              <tr>
                <th className="th w-10 text-center" scope="col">#</th>
                <th className="th" scope="col">Oyuncu</th>
                <th className="th hidden sm:table-cell" scope="col">Takım</th>
                <th className="th hidden text-center md:table-cell" scope="col">Pozisyon</th>
                <th className="th text-center" scope="col">Maç</th>
                <th className="th text-center" scope="col">Gol</th>
                <th className="th hidden text-center sm:table-cell" scope="col">Ort.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const team = teamsById.get(row.teamId);
                return (
                  <tr key={row.playerId} className="border-b border-line last:border-b-0">
                    <td className="td text-center">
                      <span className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-bold ${row.rank <= 3 ? "bg-amber-400 text-amber-950" : "text-muted"}`}>
                        {row.rank}
                      </span>
                    </td>
                    <td className="td">
                      <Link href={`/oyuncular/${row.playerId}`} className="flex min-w-0 items-center gap-2 hover:underline">
                        <TeamLogo logoUrl={team?.logo_url} name={team?.name ?? ""} color={team?.primary_color} code={team?.code} size={24} />
                        <span className="min-w-0">
                          <span className="block break-words text-sm font-semibold leading-tight">
                            {row.fullName}
                            {row.shirtNumber !== null && <span className="ml-1 text-xs font-normal text-muted">#{row.shirtNumber}</span>}
                          </span>
                          <span className="block text-xs text-muted sm:hidden">{team?.name}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="td hidden text-sm sm:table-cell">{team?.name}</td>
                    <td className="td hidden text-center text-sm text-muted md:table-cell">
                      {POSITION_LABELS[row.position as PlayerPosition] ?? "-"}
                    </td>
                    <td className="td text-center tabular-nums">{row.matches}</td>
                    <td className="td text-center text-base font-bold tabular-nums">{row.goals}</td>
                    <td className="td hidden text-center tabular-nums text-muted sm:table-cell">{row.goalsPerMatch}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
