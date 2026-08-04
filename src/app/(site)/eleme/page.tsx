import type { Metadata } from "next";
import { Trophy } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { fetchPublicTournament, getPublicTeams, getPublishedMatches, getVenues } from "@/lib/queries";
import { MatchCard, teamInfoFrom } from "@/components/MatchCard";
import { LiveKnockoutBracket } from "@/components/site/LiveKnockoutBracket";
import { EmptyState } from "@/components/ui";
import { championTitleFor, otherKnockoutMatches } from "@/lib/bracket";
import { KNOCKOUT_ROUND_LABELS, KNOCKOUT_ROUND_ORDER } from "@/lib/labels";
import type { KnockoutRound } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Eleme Ağacı",
  description: "16 takımlı Son 16 eleme ağacı: çeyrek final, yarı final ve final eşleşmeleri, canlı skorlar.",
};

export default async function KnockoutPage() {
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
  const venueNamesById = new Map(venues.map((v) => [v.id, v.name]));

  if (knockoutMatches.length === 0) {
    return (
      <div className="container-page space-y-4 py-6">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Eleme Ağacı</h1>
        <EmptyState
          icon={<Trophy className="size-8" aria-hidden />}
          title="Eleme aşaması henüz başlamadı"
          description="Grup maçları tamamlandığında Son 16 eşleşmeleri burada yayınlanacak."
        />
      </div>
    );
  }

  // Bu bileşenin kapsamadığı diğer eleme maçları (varsa Son 32 / Üçüncülük);
  // mevcut sistemde bu turlar da desteklenir, ana ağaçtan gizlenmez.
  const otherRounds = otherKnockoutMatches(knockoutMatches);
  const otherRoundNames = KNOCKOUT_ROUND_ORDER.filter((r) => otherRounds.some((m) => m.knockout_round === r));

  return (
    <div className="mx-auto w-full max-w-[2000px] space-y-8 px-4 py-6 sm:px-6">
      <LiveKnockoutBracket
        tournamentId={tournament.id}
        initialMatches={knockoutMatches}
        teamsById={teamsById}
        venueNamesById={venueNamesById}
        variant="full"
        championTitle={championTitleFor(tournament)}
        title="Eleme Ağacı"
        description="16 takımın şampiyonluk yolculuğunu ve canlı skorları takip edin."
      />

      {otherRoundNames.length > 0 && (
        <div className="space-y-4">
          <h2 className="section-title">Diğer Eleme Maçları</h2>
          {otherRoundNames.map((round: KnockoutRound) => (
            <section key={round} aria-label={KNOCKOUT_ROUND_LABELS[round]}>
              <h3 className="mb-2 text-sm font-bold text-muted">{KNOCKOUT_ROUND_LABELS[round]}</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {otherRounds
                  .filter((m) => m.knockout_round === round)
                  .sort((a, b) => (a.bracket_position ?? 0) - (b.bracket_position ?? 0))
                  .map((m) => (
                    <MatchCard
                      key={m.id}
                      match={m}
                      home={teamInfoFrom(m.home_team_id ? teamsById.get(m.home_team_id) : null)}
                      away={teamInfoFrom(m.away_team_id ? teamsById.get(m.away_team_id) : null)}
                      venueName={m.venue_id ? venueNamesById.get(m.venue_id) : null}
                      contextLabel={KNOCKOUT_ROUND_LABELS[round]}
                      href={`/maclar/${m.id}`}
                    />
                  ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
