import type { Metadata } from "next";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { fetchPublicTournament, getPublicTeams, getPublishedMatches, getVenues } from "@/lib/queries";
import { MatchCard, teamInfoFrom } from "@/components/MatchCard";
import { EmptyState } from "@/components/ui";
import { KNOCKOUT_ROUND_LABELS, KNOCKOUT_ROUND_ORDER } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { KnockoutRound } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Eleme Ağacı",
  description: "Eleme aşaması eşleşmeleri: çeyrek final, yarı final ve final.",
};

export default async function KnockoutPage({
  searchParams,
}: {
  searchParams: Promise<{ tur?: string }>;
}) {
  const { tur } = await searchParams;
  const tournament = await fetchPublicTournament();
  if (!tournament) {
    return (
      <div className="container-page py-10">
        <EmptyState title="Eleme aşaması henüz başlamadı" />
      </div>
    );
  }

  const supabase = await createClient();
  const [matches, teams, venues] = await Promise.all([
    getPublishedMatches(supabase, tournament.id),
    getPublicTeams(supabase, tournament.id),
    getVenues(supabase, tournament.id),
  ]);

  const knockoutMatches = matches.filter((m) => m.stage === "knockout");
  const teamsById = new Map(teams.map((t) => [t.id, t]));
  const venueNames = new Map(venues.map((v) => [v.id, v.name]));

  const rounds = KNOCKOUT_ROUND_ORDER.filter((r) =>
    knockoutMatches.some((m) => m.knockout_round === r)
  );

  if (rounds.length === 0) {
    return (
      <div className="container-page space-y-4 py-6">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Eleme Ağacı</h1>
        <EmptyState
          icon={<Trophy className="size-8" aria-hidden />}
          title="Eleme aşaması henüz başlamadı"
          description="Grup maçları tamamlandığında eşleşmeler burada yayınlanacak."
        />
      </div>
    );
  }

  const activeRound: KnockoutRound = rounds.includes(tur as KnockoutRound)
    ? (tur as KnockoutRound)
    : rounds[0];

  const roundMatches = (round: KnockoutRound) =>
    knockoutMatches
      .filter((m) => m.knockout_round === round)
      .sort((a, b) => (a.bracket_position ?? 0) - (b.bracket_position ?? 0));

  return (
    <div className="container-page space-y-4 py-6">
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Eleme Ağacı</h1>

      {/* Mobil: tur seçici + tek tur listesi (şartname madde 28) */}
      <div className="lg:hidden">
        <nav aria-label="Tur seçimi" className="flex gap-1 overflow-x-auto pb-1">
          {rounds.map((round) => (
            <Link
              key={round}
              href={`/eleme?tur=${round}`}
              className={cn(
                "whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium",
                activeRound === round ? "bg-brand-700 text-white" : "bg-surface text-gray-600 border border-line"
              )}
              aria-current={activeRound === round ? "page" : undefined}
            >
              {KNOCKOUT_ROUND_LABELS[round]}
            </Link>
          ))}
        </nav>
        <div className="mt-3 space-y-3">
          {roundMatches(activeRound).map((m) => (
            <MatchCard
              key={m.id}
              match={m}
              home={teamInfoFrom(m.home_team_id ? teamsById.get(m.home_team_id) : null)}
              away={teamInfoFrom(m.away_team_id ? teamsById.get(m.away_team_id) : null)}
              venueName={m.venue_id ? venueNames.get(m.venue_id) : null}
              contextLabel={KNOCKOUT_ROUND_LABELS[activeRound]}
              href={`/maclar/${m.id}`}
            />
          ))}
        </div>
      </div>

      {/* Masaüstü: tur sütunlu ağaç görünümü */}
      <div className="hidden gap-4 overflow-x-auto lg:grid" style={{ gridTemplateColumns: `repeat(${rounds.length}, minmax(260px, 1fr))` }}>
        {rounds.map((round) => (
          <section key={round} aria-label={KNOCKOUT_ROUND_LABELS[round]}>
            <h2 className="mb-3 text-center text-sm font-bold text-muted">
              {KNOCKOUT_ROUND_LABELS[round]}
            </h2>
            <div className="flex h-full flex-col justify-around gap-3">
              {roundMatches(round).map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  home={teamInfoFrom(m.home_team_id ? teamsById.get(m.home_team_id) : null)}
                  away={teamInfoFrom(m.away_team_id ? teamsById.get(m.away_team_id) : null)}
                  venueName={m.venue_id ? venueNames.get(m.venue_id) : null}
                  href={`/maclar/${m.id}`}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
