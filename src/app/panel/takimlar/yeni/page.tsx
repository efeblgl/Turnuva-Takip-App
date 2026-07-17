import { createClient } from "@/utils/supabase/server";
import { getAdminTournament, getGroups } from "@/lib/queries";
import { requireRole, ROLES_MANAGE_TEAMS } from "@/lib/auth";
import { TeamForm } from "@/components/panel/TeamForm";
import { EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NewTeamPage() {
  await requireRole(ROLES_MANAGE_TEAMS);
  const supabase = await createClient();
  const tournament = await getAdminTournament(supabase);
  if (!tournament) return <EmptyState title="Önce turnuva oluşturun" />;

  const groups = await getGroups(supabase, tournament.id);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-bold tracking-tight">Yeni Takım</h1>
      <TeamForm tournamentId={tournament.id} groups={groups} />
    </div>
  );
}
