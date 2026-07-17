import { createClient } from "@/utils/supabase/server";
import { getAdminTournament, getGroups, getVenues } from "@/lib/queries";
import { requireRole, ROLES_MANAGE_TEAMS } from "@/lib/auth";
import { FixtureWizard } from "@/components/panel/FixtureWizard";
import { EmptyState } from "@/components/ui";
import type { Team } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function FixtureWizardPage() {
  await requireRole(ROLES_MANAGE_TEAMS);
  const supabase = await createClient();
  const tournament = await getAdminTournament(supabase);
  if (!tournament) return <EmptyState title="Önce turnuva oluşturun" />;

  const [groups, venues, teamsRes, matchCountRes] = await Promise.all([
    getGroups(supabase, tournament.id),
    getVenues(supabase, tournament.id),
    supabase
      .from("teams")
      .select("id, name, group_id")
      .eq("tournament_id", tournament.id)
      .in("status", ["active", "pending", "champion"])
      .order("name"),
    supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("tournament_id", tournament.id),
  ]);

  const teams = (teamsRes.data as Pick<Team, "id" | "name" | "group_id">[] | null) ?? [];

  const wizardGroups =
    groups.length > 0
      ? groups.map((group) => ({
          group,
          teams: teams.filter((t) => t.group_id === group.id).map((t) => ({ id: t.id, name: t.name })),
        }))
      : [{ group: null, teams: teams.map((t) => ({ id: t.id, name: t.name })) }];

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Fikstür Oluştur</h1>
        <p className="mt-0.5 text-sm text-muted">
          Round-robin (herkes herkesle) yöntemine göre otomatik fikstür üretilir; tek sayıda takım olan gruplarda
          takımlar sırayla bay geçer. Ön izlemeyi onaylamadan hiçbir şey kaydedilmez.
        </p>
      </div>
      <FixtureWizard
        tournament={tournament}
        wizardGroups={wizardGroups}
        venues={venues.filter((v) => v.is_active)}
        existingMatchCount={matchCountRes.count ?? 0}
      />
    </div>
  );
}
