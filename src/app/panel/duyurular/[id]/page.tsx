import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getAdminTournament } from "@/lib/queries";
import { requireRole, ROLES_MANAGE_ANNOUNCEMENTS } from "@/lib/auth";
import { AnnouncementForm } from "@/components/panel/AnnouncementForm";
import { EmptyState } from "@/components/ui";
import type { Announcement } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditAnnouncementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(ROLES_MANAGE_ANNOUNCEMENTS);
  const { id } = await params;
  const supabase = await createClient();
  const tournament = await getAdminTournament(supabase);
  if (!tournament) return <EmptyState title="Önce turnuva oluşturun" />;

  const { data } = await supabase.from("announcements").select("*").eq("id", id).maybeSingle();
  const announcement = data as Announcement | null;
  if (!announcement) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-bold tracking-tight">Duyuruyu Düzenle</h1>
      <AnnouncementForm tournamentId={tournament.id} announcement={announcement} />
    </div>
  );
}
