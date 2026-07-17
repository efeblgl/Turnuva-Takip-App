import { createClient } from "@/utils/supabase/server";
import { getAdminTournament, getGroups, getVenues } from "@/lib/queries";
import { requireRole, ROLES_MANAGE_TEAMS } from "@/lib/auth";
import { MatchForm } from "@/components/panel/MatchForm";
import { EmptyState } from "@/components/ui";
import type { Team } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewMatchPage() {
  await requireRole(ROLES_MANAGE_TEAMS);
  const supabase = await createClient();
  const tournament = await getAdminTournament(supabase);
  if (!tournament) return <EmptyState title="Önce turnuva oluşturun" />;

  const [groups, venues, teamsRes] = await Promise.all([
    getGroups(supabase, tournament.id),
    getVenues(supabase, tournament.id),
    supabase.from("teams").select("id, name, group_id").eq("tournament_id", tournament.id).order("name"),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-bold tracking-tight">Yeni Maç</h1>
      <MatchForm
        tournamentId={tournament.id}
        teams={(teamsRes.data as Pick<Team, "id" | "name" | "group_id">[] | null) ?? []}
        groups={groups}
        venues={venues}
      />
    </div>
  );
}
