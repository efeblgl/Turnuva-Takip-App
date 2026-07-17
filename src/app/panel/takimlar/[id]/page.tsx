import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getAdminTournament, getGroups } from "@/lib/queries";
import { TeamForm } from "@/components/panel/TeamForm";
import { EmptyState } from "@/components/ui";
import type { Team } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditTeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const tournament = await getAdminTournament(supabase);
  if (!tournament) return <EmptyState title="Önce turnuva oluşturun" />;

  const [groups, teamRes] = await Promise.all([
    getGroups(supabase, tournament.id),
    supabase.from("teams").select("*").eq("id", id).maybeSingle(),
  ]);
  const team = teamRes.data as Team | null;
  if (!team) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold tracking-tight">Takımı Düzenle</h1>
        <Link href={`/panel/oyuncular?takim=${team.id}`} className="btn-secondary btn-sm">
          Kadroyu Görüntüle
        </Link>
      </div>
      <TeamForm tournamentId={tournament.id} groups={groups} team={team} />
    </div>
  );
}
