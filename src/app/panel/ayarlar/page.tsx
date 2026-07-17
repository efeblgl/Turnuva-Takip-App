import { createClient } from "@/utils/supabase/server";
import { getAdminTournament, getSettingsMap } from "@/lib/queries";
import { requireRole, ROLES_MANAGE_TOURNAMENT } from "@/lib/auth";
import { SettingsManager } from "@/components/panel/SettingsManager";
import { EmptyState } from "@/components/ui";
import { DEFAULT_TIEBREAKERS } from "@/lib/standings";
import { DEFAULT_SCORER_TIEBREAKERS } from "@/lib/scorers";
import type { ForfeitRules, ScorerTiebreaker, StandingsTiebreaker } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SystemSettingsPage() {
  await requireRole(ROLES_MANAGE_TOURNAMENT);
  const supabase = await createClient();
  const tournament = await getAdminTournament(supabase);
  if (!tournament) return <EmptyState title="Önce turnuva oluşturun" />;

  const settings = await getSettingsMap(supabase, tournament.id);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-bold tracking-tight">Sistem Ayarları</h1>
      <SettingsManager
        tournamentId={tournament.id}
        initialTiebreakers={
          (settings["standings_tiebreakers"] as StandingsTiebreaker[] | undefined) ?? DEFAULT_TIEBREAKERS
        }
        initialScorerTiebreakers={
          (settings["top_scorer_tiebreakers"] as ScorerTiebreaker[] | undefined) ?? DEFAULT_SCORER_TIEBREAKERS
        }
        initialForfeitRules={
          (settings["forfeit_rules"] as ForfeitRules | undefined) ??
          { award_points: true, count_in_goal_stats: true, count_player_goals: false }
        }
        initialRulesHtml={((settings["rules_content"] as { html?: string } | undefined)?.html) ?? ""}
      />
    </div>
  );
}
