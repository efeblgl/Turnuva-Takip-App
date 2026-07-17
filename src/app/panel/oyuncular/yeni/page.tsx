import { createClient } from "@/utils/supabase/server";
import { getAdminTournament } from "@/lib/queries";
import { requireRole, ROLES_MANAGE_TEAMS } from "@/lib/auth";
import { PlayerForm } from "@/components/panel/PlayerForm";
import { EmptyState } from "@/components/ui";
import type { Team } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewPlayerPage({
  searchParams,
}: {
  searchParams: Promise<{ takim?: string }>;
}) {
  await requireRole(ROLES_MANAGE_TEAMS);
  const { takim } = await searchParams;
  const supabase = await createClient();
  const tournament = await getAdminTournament(supabase);
  if (!tournament) return <EmptyState title="Önce turnuva oluşturun" />;

  const { data } = await supabase
    .from("teams")
    .select("id, name")
    .eq("tournament_id", tournament.id)
    .order("name");

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-bold tracking-tight">Yeni Oyuncu</h1>
      <PlayerForm teams={(data as Pick<Team, "id" | "name">[] | null) ?? []} defaultTeamId={takim} />
    </div>
  );
}
