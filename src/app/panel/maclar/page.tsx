import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { getAdminTournament, getGroups } from "@/lib/queries";
import { publishFixtureAction } from "@/lib/actions/matches";
import { Badge, EmptyState } from "@/components/ui";
import { ConfirmButton } from "@/components/Modal";
import { FINISHED_STATUSES, MATCH_STATUS_BADGE, MATCH_STATUS_LABELS } from "@/lib/labels";
import { formatDateShort, formatTime, todayInTurkey } from "@/lib/utils";
import type { Match, Team } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PanelMatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string; grup?: string }>;
}) {
  const { durum = "", grup = "" } = await searchParams;
  const supabase = await createClient();
  const tournament = await getAdminTournament(supabase);
  if (!tournament) return <EmptyState title="Önce turnuva oluşturun" />;

  const [groups, teamsRes, matchesRes] = await Promise.all([
    getGroups(supabase, tournament.id),
    supabase.from("teams").select("id, name").eq("tournament_id", tournament.id),
    supabase
      .from("matches")
      .select("*")
      .eq("tournament_id", tournament.id)
      .order("match_date", { ascending: true, nullsFirst: false })
      .order("start_time"),
  ]);

  const teams = (teamsRes.data as Pick<Team, "id" | "name">[] | null) ?? [];
  const teamNames = new Map(teams.map((t) => [t.id, t.name]));
  let matches = (matchesRes.data as Match[] | null) ?? [];
  const today = todayInTurkey();

  const draftCount = matches.filter((m) => !m.is_published).length;

  if (grup) matches = matches.filter((m) => m.group_id === grup);
  switch (durum) {
    case "skor":
      matches = matches.filter(
        (m) => m.match_date && m.match_date <= today && !(FINISHED_STATUSES as string[]).includes(m.status) && !["cancelled", "postponed"].includes(m.status)
      );
      break;
    case "taslak":
      matches = matches.filter((m) => !m.is_published);
      break;
    case "tamamlanan":
      matches = matches.filter((m) => (FINISHED_STATUSES as string[]).includes(m.status));
      break;
    case "bekleyen":
      matches = matches.filter((m) => m.status === "scheduled");
      break;
    case "ertelenen":
      matches = matches.filter((m) => m.status === "postponed");
      break;
    case "eleme":
      matches = matches.filter((m) => m.stage === "knockout");
      break;
  }

  const groupNames = new Map(groups.map((g) => [g.id, g.name]));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Maçlar ve Skorlar</h1>
          <p className="text-sm text-muted">{matches.length} maç listeleniyor</p>
        </div>
        <div className="flex gap-2">
          {draftCount > 0 && (
            <ConfirmButton
              action={publishFixtureAction.bind(null, tournament.id)}
              title="Fikstürü yayınla"
              description={`${draftCount} taslak maç halka açık sitede yayınlanacak.`}
              confirmLabel="Yayınla"
              className="btn-sm"
            >
              <Upload className="size-3.5" aria-hidden />
              Taslakları Yayınla ({draftCount})
            </ConfirmButton>
          )}
          <Link href="/panel/maclar/yeni" className="btn-primary btn-sm">
            <Plus className="size-4" aria-hidden />
            Maç Ekle
          </Link>
        </div>
      </div>

      <form method="get" className="card flex flex-wrap gap-2 p-3">
        <select name="durum" defaultValue={durum} className="input max-w-52" aria-label="Durum filtresi">
          <option value="">Tüm maçlar</option>
          <option value="skor">Skor girilecekler</option>
          <option value="bekleyen">Planlananlar</option>
          <option value="tamamlanan">Tamamlananlar</option>
          <option value="ertelenen">Ertelenenler</option>
          <option value="taslak">Taslaklar (yayında değil)</option>
          <option value="eleme">Eleme maçları</option>
        </select>
        <select name="grup" defaultValue={grup} className="input max-w-44" aria-label="Grup filtresi">
          <option value="">Tüm gruplar</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <button type="submit" className="btn-secondary">Filtrele</button>
      </form>

      {matches.length === 0 ? (
        <EmptyState title="Henüz maç eklenmedi" description="Fikstür sihirbazını kullanabilir veya tek tek maç ekleyebilirsiniz." />
      ) : (
        <div className="grid gap-2">
          {matches.map((m) => (
            <Link key={m.id} href={`/panel/maclar/${m.id}`} className="card card-hover flex flex-wrap items-center gap-3 py-3">
              <div className="w-28 shrink-0 text-xs text-muted">
                <span className="block font-semibold text-ink">{formatDateShort(m.match_date)}</span>
                {formatTime(m.start_time)}
                {m.week_number && ` · ${m.week_number}. hafta`}
              </div>
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-semibold">
                  {m.home_team_id ? teamNames.get(m.home_team_id) : "Belirlenecek"}
                  {" - "}
                  {m.away_team_id ? teamNames.get(m.away_team_id) : "Belirlenecek"}
                </p>
                <p className="text-xs text-muted">
                  {m.stage === "knockout" ? m.round_name : m.group_id ? groupNames.get(m.group_id) : "Grup yok"}
                </p>
              </div>
              {m.home_score !== null && m.away_score !== null && (
                <span className="text-base font-bold tabular-nums">{m.home_score}-{m.away_score}</span>
              )}
              <Badge className={MATCH_STATUS_BADGE[m.status]}>{MATCH_STATUS_LABELS[m.status]}</Badge>
              {!m.is_published && <Badge className="border-gray-300 bg-gray-100 text-gray-600">Taslak</Badge>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
