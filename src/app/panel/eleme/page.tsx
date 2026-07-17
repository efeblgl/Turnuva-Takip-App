import { createClient } from "@/utils/supabase/server";
import { getAdminTournament, getStandingsBundle } from "@/lib/queries";
import { requireRole, ROLES_MANAGE_TEAMS } from "@/lib/auth";
import { KnockoutManager, type QualifiedGroup } from "@/components/panel/KnockoutManager";
import { EmptyState } from "@/components/ui";
import type { Match } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PanelKnockoutPage() {
  await requireRole(ROLES_MANAGE_TEAMS);
  const supabase = await createClient();
  const tournament = await getAdminTournament(supabase);
  if (!tournament) return <EmptyState title="Önce turnuva oluşturun" />;

  const [bundle, knockoutRes] = await Promise.all([
    getStandingsBundle(supabase, tournament),
    supabase
      .from("matches")
      .select("*")
      .eq("tournament_id", tournament.id)
      .eq("stage", "knockout")
      .order("knockout_round")
      .order("bracket_position"),
  ]);

  const qualifiedGroups: QualifiedGroup[] = bundle.groups.map((group) => {
    const rows = bundle.tablesByGroup.get(group.id) ?? [];
    return {
      groupName: group.name,
      qualifiers: rows.slice(0, group.qualification_count).map((r) => ({
        id: r.teamId,
        name: r.teamName,
      })),
    };
  });

  const teamNames: Record<string, string> = {};
  for (const t of bundle.teams) teamNames[t.id] = t.name;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Eleme Aşaması</h1>
        <p className="mt-0.5 text-sm text-muted">
          Eşleşmeleri grup sıralamasından otomatik, rastgele veya elle kurabilirsiniz.
        </p>
      </div>
      <KnockoutManager
        tournamentId={tournament.id}
        teams={bundle.teams
          .filter((t) => ["active", "champion"].includes(t.status))
          .map((t) => ({ id: t.id, name: t.name }))}
        qualifiedGroups={qualifiedGroups}
        knockoutMatches={(knockoutRes.data as Match[] | null) ?? []}
        teamNames={teamNames}
      />
    </div>
  );
}
