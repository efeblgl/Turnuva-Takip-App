import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getAdminTournament } from "@/lib/queries";
import { requireRole, ROLES_MANAGE_TEAMS } from "@/lib/auth";
import { SuspensionForm } from "@/components/panel/SuspensionForm";
import { EmptyState } from "@/components/ui";
import type { Player, Suspension, Team } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditSuspensionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(ROLES_MANAGE_TEAMS);
  const { id } = await params;
  const supabase = await createClient();
  const tournament = await getAdminTournament(supabase);
  if (!tournament) return <EmptyState title="Önce turnuva oluşturun" />;

  const [suspRes, teamsRes] = await Promise.all([
    supabase.from("suspensions").select("*").eq("id", id).maybeSingle(),
    supabase.from("teams").select("id, name").eq("tournament_id", tournament.id).order("name"),
  ]);
  const suspension = suspRes.data as Suspension | null;
  if (!suspension) notFound();

  const teams = (teamsRes.data as Pick<Team, "id" | "name">[] | null) ?? [];
  const { data: playersData } = teams.length
    ? await supabase.from("players").select("id, full_name, team_id").in("team_id", teams.map((t) => t.id)).order("full_name")
    : { data: [] };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-bold tracking-tight">Cezayı Düzenle</h1>
      <SuspensionForm
        tournamentId={tournament.id}
        teams={teams}
        players={(playersData as Pick<Player, "id" | "full_name" | "team_id">[] | null) ?? []}
        suspension={suspension}
      />
    </div>
  );
}
