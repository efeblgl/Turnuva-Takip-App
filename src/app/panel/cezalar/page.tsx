import Link from "next/link";
import { Pencil, Plus, ShieldCheck } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { getAdminTournament } from "@/lib/queries";
import { endSuspensionAction } from "@/lib/actions/content";
import { requireRole, ROLES_MANAGE_TEAMS } from "@/lib/auth";
import { Badge, EmptyState } from "@/components/ui";
import { ConfirmButton } from "@/components/Modal";
import { SUSPENSION_TYPE_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/utils";
import type { Player, Suspension, Team } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PanelSuspensionsPage() {
  await requireRole(ROLES_MANAGE_TEAMS);
  const supabase = await createClient();
  const tournament = await getAdminTournament(supabase);
  if (!tournament) return <EmptyState title="Önce turnuva oluşturun" />;

  const [suspensionsRes, teamsRes] = await Promise.all([
    supabase
      .from("suspensions")
      .select("*")
      .eq("tournament_id", tournament.id)
      .order("is_active", { ascending: false })
      .order("decision_date", { ascending: false }),
    supabase.from("teams").select("id, name").eq("tournament_id", tournament.id),
  ]);
  const suspensions = (suspensionsRes.data as Suspension[] | null) ?? [];
  const teamNames = new Map(((teamsRes.data as Pick<Team, "id" | "name">[] | null) ?? []).map((t) => [t.id, t.name]));

  const playerIds = suspensions.map((s) => s.player_id).filter(Boolean) as string[];
  const { data: playersData } = playerIds.length
    ? await supabase.from("players").select("id, full_name, team_id").in("id", playerIds)
    : { data: [] };
  const playersById = new Map(
    ((playersData as Pick<Player, "id" | "full_name" | "team_id">[] | null) ?? []).map((p) => [p.id, p])
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight">Kartlar ve Cezalar</h1>
        <Link href="/panel/cezalar/yeni" className="btn-primary btn-sm">
          <Plus className="size-4" aria-hidden />
          Ceza Ekle
        </Link>
      </div>

      <p className="card p-3 text-xs text-muted">
        Kırmızı kartlar skor girişinde otomatik kayda geçer; disiplin cezalarını buradan ekleyin.
        Maç sayılı cezaların kalan maçı, takımın oynadığı maçlara göre otomatik düşer ve ceza
        tamamlanınca pasifleşir.
      </p>

      {suspensions.length === 0 ? (
        <EmptyState title="Ceza kaydı bulunmuyor" />
      ) : (
        <div className="grid gap-2">
          {suspensions.map((s) => {
            const player = s.player_id ? playersById.get(s.player_id) : null;
            const teamName = s.team_id
              ? teamNames.get(s.team_id)
              : player
                ? teamNames.get(player.team_id)
                : null;
            return (
              <div key={s.id} className="card flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">
                    {player?.full_name ?? teamName ?? "Kayıt"}
                    {player && teamName && <span className="ml-1 text-xs font-normal text-muted">({teamName})</span>}
                  </p>
                  <p className="text-xs text-muted">
                    {SUSPENSION_TYPE_LABELS[s.suspension_type]}
                    {s.reason && ` · ${s.reason}`}
                    {s.decision_date && ` · Karar: ${formatDate(s.decision_date)}`}
                    {s.penalty_points ? ` · ${s.penalty_points} puan` : ""}
                  </p>
                </div>
                <Badge className={s.is_active ? "border-red-200 bg-red-50 text-red-700" : "border-line bg-gray-100 text-gray-500"}>
                  {s.is_active
                    ? s.remaining_matches !== null && ["one_match", "multi_match"].includes(s.suspension_type)
                      ? `${s.remaining_matches} maç kaldı`
                      : "Aktif"
                    : "Tamamlandı"}
                </Badge>
                <div className="flex gap-1.5">
                  <Link href={`/panel/cezalar/${s.id}`} className="btn-secondary btn-sm" aria-label="Cezayı düzenle">
                    <Pencil className="size-3.5" aria-hidden />
                  </Link>
                  {s.is_active && (
                    <ConfirmButton
                      action={endSuspensionAction.bind(null, s.id)}
                      title="Cezayı kaldır"
                      description="Ceza pasif duruma alınacak ve kalan maç sayısı sıfırlanacak."
                      confirmLabel="Cezayı Kaldır"
                      className="btn-sm"
                    >
                      <ShieldCheck className="size-3.5" aria-hidden />
                      Kaldır
                    </ConfirmButton>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
