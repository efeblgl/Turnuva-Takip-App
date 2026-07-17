import type { Metadata } from "next";
import Link from "next/link";
import { Shield } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { fetchPublicTournament, getStandingsBundle } from "@/lib/queries";
import { Badge, EmptyState } from "@/components/ui";
import { TeamLogo } from "@/components/TeamBadge";
import { TEAM_STATUS_BADGE, TEAM_STATUS_LABELS } from "@/lib/labels";
import { compareTr, matchesSearch, teamColor } from "@/lib/utils";
import type { StandingRow } from "@/lib/standings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Takımlar",
  description: "Turnuvaya katılan tüm takımlar, renkleri, grupları ve puanları.",
};

export default async function TeamsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const tournament = await fetchPublicTournament();

  if (!tournament) {
    return (
      <div className="container-page py-10">
        <EmptyState title="Takımlar henüz açıklanmadı" />
      </div>
    );
  }

  const supabase = await createClient();
  const bundle = await getStandingsBundle(supabase, tournament);

  const rowsByTeam = new Map<string, StandingRow>();
  for (const rows of bundle.tablesByGroup.values()) {
    for (const row of rows) rowsByTeam.set(row.teamId, row);
  }
  const groupNames = new Map(bundle.groups.map((g) => [g.id, g.name]));

  const q = params.q ?? "";
  const grup = params.grup ?? "";
  const durum = params.durum ?? "";
  const sirala = params.sirala ?? "ad";

  let teams = bundle.teams.filter((t) => matchesSearch(t.name, q));
  if (grup) teams = teams.filter((t) => t.group_id === grup);
  if (durum === "aktif") teams = teams.filter((t) => t.status === "active");
  else if (durum === "elenen") teams = teams.filter((t) => t.status === "eliminated");
  else if (durum === "eleme") teams = teams.filter((t) => t.status === "active" || t.status === "champion");

  teams = [...teams].sort((a, b) => {
    const ra = rowsByTeam.get(a.id);
    const rb = rowsByTeam.get(b.id);
    switch (sirala) {
      case "puan": return (rb?.points ?? 0) - (ra?.points ?? 0) || compareTr(a.name, b.name);
      case "galibiyet": return (rb?.won ?? 0) - (ra?.won ?? 0) || compareTr(a.name, b.name);
      case "gol": return (rb?.goalsFor ?? 0) - (ra?.goalsFor ?? 0) || compareTr(a.name, b.name);
      case "grup": return compareTr(groupNames.get(a.group_id ?? "") ?? "z", groupNames.get(b.group_id ?? "") ?? "z") || compareTr(a.name, b.name);
      default: return compareTr(a.name, b.name);
    }
  });

  return (
    <div className="container-page space-y-4 py-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Takımlar</h1>
        <p className="mt-1 text-sm text-muted">{teams.length} takım listeleniyor</p>
      </div>

      {/* Arama ve filtreler (GET formu; URL parametrelerine yansır) */}
      <form className="card grid gap-2 p-3 sm:grid-cols-4" method="get">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Takım ara..."
          className="input"
          aria-label="Takım adına göre ara"
        />
        <select name="grup" defaultValue={grup} className="input" aria-label="Gruba göre filtrele">
          <option value="">Tüm gruplar</option>
          {bundle.groups.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
        <select name="durum" defaultValue={durum} className="input" aria-label="Duruma göre filtrele">
          <option value="">Tüm takımlar</option>
          <option value="aktif">Aktif takımlar</option>
          <option value="eleme">Eleme aşamasındakiler</option>
          <option value="elenen">Elenen takımlar</option>
        </select>
        <div className="flex gap-2">
          <select name="sirala" defaultValue={sirala} className="input" aria-label="Sıralama">
            <option value="ad">Ada göre</option>
            <option value="puan">Puana göre</option>
            <option value="grup">Gruba göre</option>
            <option value="galibiyet">Galibiyete göre</option>
            <option value="gol">Gole göre</option>
          </select>
          <button type="submit" className="btn-primary shrink-0">Uygula</button>
        </div>
      </form>

      {teams.length === 0 ? (
        <EmptyState
          icon={<Shield className="size-8" aria-hidden />}
          title="Takım bulunamadı"
          description="Arama veya filtre kriterlerinizi değiştirin."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => {
            const row = rowsByTeam.get(team.id);
            return (
              <Link key={team.id} href={`/takimlar/${team.id}`} className="card card-hover overflow-hidden p-0">
                {/* Takım rengi üst kenar şeridi */}
                <div className="h-1.5" style={{ backgroundColor: teamColor(team.primary_color) }} aria-hidden />
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <TeamLogo logoUrl={team.logo_url} name={team.name} color={team.primary_color} code={team.code} size={44} />
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-bold leading-tight">{team.name}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {team.group_id ? groupNames.get(team.group_id) : "Grup belirlenmedi"}
                        {team.neighborhood && ` · ${team.neighborhood}`}
                      </p>
                    </div>
                    <Badge className={TEAM_STATUS_BADGE[team.status]}>
                      {TEAM_STATUS_LABELS[team.status]}
                    </Badge>
                  </div>
                  <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
                    <div>
                      <dt className="text-[11px] font-medium uppercase text-muted">Maç</dt>
                      <dd className="text-sm font-bold tabular-nums">{row?.played ?? 0}</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-medium uppercase text-muted">Averaj</dt>
                      <dd className="text-sm font-bold tabular-nums">
                        {row ? (row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference) : 0}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-medium uppercase text-muted">Puan</dt>
                      <dd className="text-sm font-bold tabular-nums">{row?.points ?? 0}</dd>
                    </div>
                  </dl>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
