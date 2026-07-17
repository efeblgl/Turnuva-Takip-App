import Link from "next/link";
import { Pencil, Plus, UserX } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { getAdminTournament } from "@/lib/queries";
import { deactivatePlayerAction } from "@/lib/actions/teams";
import { Badge, EmptyState } from "@/components/ui";
import { ConfirmButton } from "@/components/Modal";
import { POSITION_LABELS } from "@/lib/labels";
import { compareTr, matchesSearch } from "@/lib/utils";
import type { Player, Team } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PanelPlayersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; takim?: string }>;
}) {
  const { q = "", takim = "" } = await searchParams;
  const supabase = await createClient();
  const tournament = await getAdminTournament(supabase);
  if (!tournament) return <EmptyState title="Önce turnuva oluşturun" />;

  const { data: teamsData } = await supabase
    .from("teams")
    .select("id, name")
    .eq("tournament_id", tournament.id)
    .order("name");
  const teams = (teamsData as Pick<Team, "id" | "name">[] | null) ?? [];
  const teamIds = teams.map((t) => t.id);

  const { data: playersData } = teamIds.length
    ? await supabase.from("players").select("*").in("team_id", teamIds).order("full_name")
    : { data: [] };
  let players = (playersData as Player[] | null) ?? [];

  if (q) players = players.filter((p) => matchesSearch(p.full_name, q));
  if (takim) players = players.filter((p) => p.team_id === takim);
  players = [...players].sort((a, b) => compareTr(a.full_name, b.full_name));

  const teamNames = new Map(teams.map((t) => [t.id, t.name]));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Oyuncular</h1>
          <p className="text-sm text-muted">{players.length} oyuncu listeleniyor</p>
        </div>
        <Link href="/panel/oyuncular/yeni" className="btn-primary btn-sm">
          <Plus className="size-4" aria-hidden />
          Oyuncu Ekle
        </Link>
      </div>

      <form method="get" className="card flex flex-wrap gap-2 p-3">
        <input type="search" name="q" defaultValue={q} placeholder="Oyuncu ara..." className="input max-w-xs" aria-label="Oyuncu ara" />
        <select name="takim" defaultValue={takim} className="input max-w-56" aria-label="Takım filtresi">
          <option value="">Tüm takımlar</option>
          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <button type="submit" className="btn-secondary">Filtrele</button>
      </form>

      {players.length === 0 ? (
        <EmptyState title="Oyuncu bulunamadı" />
      ) : (
        <div className="table-wrap">
          <table className="w-full">
            <thead className="border-b border-line bg-gray-50/70">
              <tr>
                <th className="th">Oyuncu</th>
                <th className="th hidden sm:table-cell">Takım</th>
                <th className="th hidden text-center md:table-cell">Forma</th>
                <th className="th hidden md:table-cell">Pozisyon</th>
                <th className="th text-center">Durum</th>
                <th className="th text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-b-0">
                  <td className="td">
                    <span className="text-sm font-semibold">{p.full_name}</span>
                    {p.is_captain && <span className="ml-1.5 rounded bg-amber-100 px-1 text-[10px] font-bold text-amber-800">K</span>}
                    <span className="block text-xs text-muted sm:hidden">{teamNames.get(p.team_id)}</span>
                  </td>
                  <td className="td hidden text-sm sm:table-cell">{teamNames.get(p.team_id)}</td>
                  <td className="td hidden text-center tabular-nums md:table-cell">{p.shirt_number ?? "-"}</td>
                  <td className="td hidden text-sm text-muted md:table-cell">{POSITION_LABELS[p.position]}</td>
                  <td className="td text-center">
                    <Badge className={p.is_active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-line bg-gray-100 text-gray-500"}>
                      {p.is_active ? "Aktif" : "Pasif"}
                    </Badge>
                  </td>
                  <td className="td">
                    <div className="flex justify-end gap-1.5">
                      <Link href={`/panel/oyuncular/${p.id}`} className="btn-secondary btn-sm" aria-label={`${p.full_name} düzenle`}>
                        <Pencil className="size-3.5" aria-hidden />
                      </Link>
                      {p.is_active && (
                        <ConfirmButton
                          action={deactivatePlayerAction.bind(null, p.id)}
                          title="Oyuncuyu pasif yap"
                          description={`${p.full_name} pasif duruma alınacak. Geçmiş maç olayları (gol, kart) korunur.`}
                          confirmLabel="Pasif yap"
                          className="btn-sm"
                        >
                          <UserX className="size-3.5" aria-hidden />
                        </ConfirmButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
