import Link from "next/link";
import { Pencil, Plus, ShieldOff } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { getAdminTournament, getGroups } from "@/lib/queries";
import { deactivateTeamAction } from "@/lib/actions/teams";
import { Badge, EmptyState } from "@/components/ui";
import { TeamLogo } from "@/components/TeamBadge";
import { ConfirmButton } from "@/components/Modal";
import { TEAM_STATUS_BADGE, TEAM_STATUS_LABELS } from "@/lib/labels";
import { matchesSearch } from "@/lib/utils";
import type { Team } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PanelTeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; grup?: string }>;
}) {
  const { q = "", grup = "" } = await searchParams;
  const supabase = await createClient();
  const tournament = await getAdminTournament(supabase);
  if (!tournament) {
    return <EmptyState title="Önce turnuva oluşturun" description="Turnuva Ayarları sayfasından başlayın." />;
  }

  const [groups, teamsRes] = await Promise.all([
    getGroups(supabase, tournament.id),
    supabase.from("teams").select("*").eq("tournament_id", tournament.id).order("name"),
  ]);
  let teams = (teamsRes.data as Team[] | null) ?? [];
  if (q) teams = teams.filter((t) => matchesSearch(t.name, q));
  if (grup) teams = teams.filter((t) => t.group_id === grup);

  const groupNames = new Map(groups.map((g) => [g.id, g.name]));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight">Takımlar</h1>
        <Link href="/panel/takimlar/yeni" className="btn-primary btn-sm">
          <Plus className="size-4" aria-hidden />
          Takım Ekle
        </Link>
      </div>

      <form method="get" className="card flex flex-wrap gap-2 p-3">
        <input type="search" name="q" defaultValue={q} placeholder="Takım ara..." className="input max-w-xs" aria-label="Takım ara" />
        <select name="grup" defaultValue={grup} className="input max-w-44" aria-label="Grup filtresi">
          <option value="">Tüm gruplar</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <button type="submit" className="btn-secondary">Filtrele</button>
      </form>

      {teams.length === 0 ? (
        <EmptyState title="Takım bulunamadı" description="Yeni takım eklemek için sağ üstteki düğmeyi kullanın." />
      ) : (
        <div className="grid gap-2">
          {teams.map((team) => (
            <div key={team.id} className="card flex flex-wrap items-center gap-3 py-3">
              <TeamLogo logoUrl={team.logo_url} name={team.name} color={team.primary_color} code={team.code} size={36} />
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-bold">{team.name}</p>
                <p className="text-xs text-muted">
                  {team.group_id ? groupNames.get(team.group_id) : "Grup yok"}
                  {team.neighborhood && ` · ${team.neighborhood}`}
                  {team.manager_name && ` · Sorumlu: ${team.manager_name}`}
                </p>
              </div>
              <Badge className={TEAM_STATUS_BADGE[team.status]}>{TEAM_STATUS_LABELS[team.status]}</Badge>
              <div className="flex gap-1.5">
                <Link href={`/panel/takimlar/${team.id}`} className="btn-secondary btn-sm">
                  <Pencil className="size-3.5" aria-hidden />
                  Düzenle
                </Link>
                {team.status !== "passive" && (
                  <ConfirmButton
                    action={deactivateTeamAction.bind(null, team.id)}
                    title="Takımı pasif yap"
                    description={`${team.name} pasif duruma alınacak. Geçmiş maç kayıtları korunur; takım halka açık listelerde pasif görünür.`}
                    confirmLabel="Pasif yap"
                    className="btn-sm"
                  >
                    <ShieldOff className="size-3.5" aria-hidden />
                    Pasif
                  </ConfirmButton>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
