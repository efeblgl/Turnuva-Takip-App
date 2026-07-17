import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getAdminTournament } from "@/lib/queries";
import { PlayerForm } from "@/components/panel/PlayerForm";
import { EmptyState } from "@/components/ui";
import type { Player, Team } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditPlayerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const tournament = await getAdminTournament(supabase);
  if (!tournament) return <EmptyState title="Önce turnuva oluşturun" />;

  const [teamsRes, playerRes] = await Promise.all([
    supabase.from("teams").select("id, name").eq("tournament_id", tournament.id).order("name"),
    supabase.from("players").select("*").eq("id", id).maybeSingle(),
  ]);
  const player = playerRes.data as Player | null;
  if (!player) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-bold tracking-tight">Oyuncuyu Düzenle</h1>
      <PlayerForm teams={(teamsRes.data as Pick<Team, "id" | "name">[] | null) ?? []} player={player} />
    </div>
  );
}
