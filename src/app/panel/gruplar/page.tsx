import { createClient } from "@/utils/supabase/server";
import { getAdminTournament, getGroups } from "@/lib/queries";
import { requireRole, ROLES_MANAGE_TEAMS } from "@/lib/auth";
import { GroupsManager } from "@/components/panel/GroupsManager";
import { EmptyState } from "@/components/ui";
import type { Team } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PanelGroupsPage() {
  await requireRole(ROLES_MANAGE_TEAMS);
  const supabase = await createClient();
  const tournament = await getAdminTournament(supabase);
  if (!tournament) return <EmptyState title="Önce turnuva oluşturun" />;

  const [groups, teamsRes] = await Promise.all([
    getGroups(supabase, tournament.id),
    supabase
      .from("teams")
      .select("*")
      .eq("tournament_id", tournament.id)
      .in("status", ["active", "pending", "champion"])
      .order("name"),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Gruplar</h1>
        <p className="mt-0.5 text-sm text-muted">
          Grupları oluşturun, takımları elle veya rastgele dağıtın. Rastgele dağıtım kaydedilmeden önce ön izlenir.
        </p>
      </div>
      <GroupsManager
        tournamentId={tournament.id}
        groups={groups}
        teams={(teamsRes.data as Team[] | null) ?? []}
      />
    </div>
  );
}
