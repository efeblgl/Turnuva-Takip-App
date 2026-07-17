import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { fetchPublicTournament, getStandingsBundle } from "@/lib/queries";
import { computeTeamAggregates, computeTournamentTotals } from "@/lib/stats";
import { EmptyState, SectionHeader, StatCard } from "@/components/ui";
import { TeamLabel } from "@/components/TeamBadge";
import { compareTr } from "@/lib/utils";
import type { PublicTeam } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "İstatistikler",
  description: "Turnuva geneli takım istatistikleri ve rekorlar.",
};

interface RecordLine {
  label: string;
  team: PublicTeam | undefined;
  value: string;
}

export default async function StatsPage() {
  const tournament = await fetchPublicTournament();
  if (!tournament) {
    return (
      <div className="container-page py-10">
        <EmptyState title="İstatistikler henüz oluşmadı" />
      </div>
    );
  }

  const supabase = await createClient();
  const bundle = await getStandingsBundle(supabase, tournament);
  const { teams, matches, teamsById } = bundle;

  const totals = computeTournamentTotals(matches);
  const aggregates = computeTeamAggregates(teams.map((t) => t.id), matches);

  const allRows = [...bundle.tablesByGroup.values()].flat();

  const aggList = [...aggregates.values()].filter((a) => a.played > 0);

  function best<T>(
    list: T[],
    score: (item: T) => number,
    tieName: (item: T) => string
  ): T | undefined {
    return [...list].sort((a, b) => score(b) - score(a) || compareTr(tieName(a), tieName(b)))[0];
  }

  const nameOf = (teamId: string) => teamsById.get(teamId)?.name ?? "";

  const records: RecordLine[] = [];
  if (aggList.length > 0) {
    const mostGoals = best(aggList, (a) => a.goalsFor, (a) => nameOf(a.teamId))!;
    records.push({ label: "En çok gol atan takım", team: teamsById.get(mostGoals.teamId), value: `${mostGoals.goalsFor} gol` });

    const leastConceded = best(aggList, (a) => -a.goalsAgainst, (a) => nameOf(a.teamId))!;
    records.push({ label: "En az gol yiyen takım", team: teamsById.get(leastConceded.teamId), value: `${leastConceded.goalsAgainst} gol` });

    const mostWins = best(aggList, (a) => a.won, (a) => nameOf(a.teamId))!;
    records.push({ label: "En çok galibiyet", team: teamsById.get(mostWins.teamId), value: `${mostWins.won} galibiyet` });

    const mostDraws = best(aggList, (a) => a.drawn, (a) => nameOf(a.teamId))!;
    records.push({ label: "En çok beraberlik", team: teamsById.get(mostDraws.teamId), value: `${mostDraws.drawn} beraberlik` });

    const biggestWin = best(aggList.filter((a) => a.biggestWin), (a) => a.biggestWin!.diff, (a) => nameOf(a.teamId));
    if (biggestWin?.biggestWin) {
      records.push({
        label: "En farklı galibiyet",
        team: teamsById.get(biggestWin.teamId),
        value: `${biggestWin.biggestWin.score} (${teamsById.get(biggestWin.biggestWin.opponentId ?? "")?.name ?? "?"} karşısında)`,
      });
    }

    const bestAvg = best(aggList, (a) => a.goalsFor / a.played, (a) => nameOf(a.teamId))!;
    records.push({
      label: "Maç başına en yüksek gol ortalaması",
      team: teamsById.get(bestAvg.teamId),
      value: (bestAvg.goalsFor / bestAvg.played).toFixed(2),
    });

    const cleanSheets = best(aggList, (a) => a.cleanSheets, (a) => nameOf(a.teamId))!;
    records.push({ label: "Gol yemeden en çok maç bitiren", team: teamsById.get(cleanSheets.teamId), value: `${cleanSheets.cleanSheets} maç` });
  }

  const cardRecords: RecordLine[] = [];
  const rowsWithCards = allRows.filter((r) => r.played > 0);
  if (rowsWithCards.length > 0) {
    const fairPlay = [...rowsWithCards].sort(
      (a, b) => (a.yellowCards + a.redCards * 3) - (b.yellowCards + b.redCards * 3) || compareTr(a.teamName, b.teamName)
    )[0];
    cardRecords.push({
      label: "En centilmen takım",
      team: teamsById.get(fairPlay.teamId),
      value: `${fairPlay.yellowCards} sarı, ${fairPlay.redCards} kırmızı`,
    });

    const mostYellow = [...rowsWithCards].sort((a, b) => b.yellowCards - a.yellowCards)[0];
    cardRecords.push({ label: "En çok sarı kart gören", team: teamsById.get(mostYellow.teamId), value: `${mostYellow.yellowCards} sarı kart` });

    const mostRed = [...rowsWithCards].sort((a, b) => b.redCards - a.redCards)[0];
    cardRecords.push({ label: "En çok kırmızı kart gören", team: teamsById.get(mostRed.teamId), value: `${mostRed.redCards} kırmızı kart` });
  }

  const hasData = totals.playedCount > 0;

  return (
    <div className="container-page space-y-6 py-6">
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl">İstatistikler</h1>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Genel istatistikler">
        <StatCard label="Oynanan Maç" value={totals.playedCount} />
        <StatCard label="Kalan Maç" value={totals.remainingCount} />
        <StatCard label="Toplam Gol" value={totals.totalGoals} />
        <StatCard label="Maç Başına Gol" value={totals.goalsPerMatch} />
      </section>

      {!hasData ? (
        <EmptyState title="Henüz istatistik oluşmadı" description="İlk maçlar oynandığında rekorlar burada görünecek." />
      ) : (
        <>
          <section>
            <SectionHeader title="Takım Rekorları" />
            <div className="card divide-y divide-line p-0">
              {records.map((r) => (
                <div key={r.label} className="flex flex-wrap items-center gap-2 px-4 py-3">
                  <span className="w-full text-xs font-medium uppercase tracking-wide text-muted sm:w-64">{r.label}</span>
                  <span className="min-w-0 flex-1">
                    {r.team && (
                      <TeamLabel name={r.team.name} color={r.team.primary_color} logoUrl={r.team.logo_url} code={r.team.code} bold />
                    )}
                  </span>
                  <span className="text-sm font-bold">{r.value}</span>
                </div>
              ))}
            </div>
          </section>

          {cardRecords.length > 0 && (
            <section>
              <SectionHeader title="Disiplin" />
              <div className="card divide-y divide-line p-0">
                {cardRecords.map((r) => (
                  <div key={r.label} className="flex flex-wrap items-center gap-2 px-4 py-3">
                    <span className="w-full text-xs font-medium uppercase tracking-wide text-muted sm:w-64">{r.label}</span>
                    <span className="min-w-0 flex-1">
                      {r.team && (
                        <TeamLabel name={r.team.name} color={r.team.primary_color} logoUrl={r.team.logo_url} code={r.team.code} bold />
                      )}
                    </span>
                    <span className="text-sm font-bold">{r.value}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
