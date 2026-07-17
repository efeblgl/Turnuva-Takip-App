import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getAdminTournament } from "@/lib/queries";
import { requireRole, ROLES_MANAGE_TEAMS } from "@/lib/auth";
import { VenueForm } from "@/components/panel/VenueForm";
import { EmptyState } from "@/components/ui";
import type { Venue } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditVenuePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(ROLES_MANAGE_TEAMS);
  const { id } = await params;
  const supabase = await createClient();
  const tournament = await getAdminTournament(supabase);
  if (!tournament) return <EmptyState title="Önce turnuva oluşturun" />;

  const { data } = await supabase.from("venues").select("*").eq("id", id).maybeSingle();
  const venue = data as Venue | null;
  if (!venue) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-bold tracking-tight">Sahayı Düzenle</h1>
      <VenueForm tournamentId={tournament.id} venue={venue} />
    </div>
  );
}
