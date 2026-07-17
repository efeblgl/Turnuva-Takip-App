import { createClient } from "@/utils/supabase/server";
import { getAdminTournament } from "@/lib/queries";
import { requireRole, ROLES_MANAGE_ANNOUNCEMENTS } from "@/lib/auth";
import { AnnouncementForm } from "@/components/panel/AnnouncementForm";
import { EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NewAnnouncementPage() {
  await requireRole(ROLES_MANAGE_ANNOUNCEMENTS);
  const supabase = await createClient();
  const tournament = await getAdminTournament(supabase);
  if (!tournament) return <EmptyState title="Önce turnuva oluşturun" />;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-bold tracking-tight">Yeni Duyuru</h1>
      <AnnouncementForm tournamentId={tournament.id} />
    </div>
  );
}
