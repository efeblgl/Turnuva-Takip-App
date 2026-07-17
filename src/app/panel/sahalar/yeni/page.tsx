import { createClient } from "@/utils/supabase/server";
import { getAdminTournament } from "@/lib/queries";
import { requireRole, ROLES_MANAGE_TEAMS } from "@/lib/auth";
import { VenueForm } from "@/components/panel/VenueForm";
import { EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NewVenuePage() {
  await requireRole(ROLES_MANAGE_TEAMS);
  const supabase = await createClient();
  const tournament = await getAdminTournament(supabase);
  if (!tournament) return <EmptyState title="Önce turnuva oluşturun" />;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-bold tracking-tight">Yeni Saha</h1>
      <VenueForm tournamentId={tournament.id} />
    </div>
  );
}
