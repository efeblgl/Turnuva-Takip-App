import { createClient } from "@/utils/supabase/server";
import { getAdminTournament, getStandingsBundle } from "@/lib/queries";
import { StandingsTable, type StandingsTeamMeta } from "@/components/StandingsTable";
import { EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PanelStandingsPage() {
  const supabase = await createClient();
  const tournament = await getAdminTournament(supabase);
  if (!tournament) return <EmptyState title="Önce turnuva oluşturun" />;

  const bundle = await getStandingsBundle(supabase, tournament);
  const teamsMeta: Record<string, StandingsTeamMeta> = {};
  for (const t of bundle.teams) {
    teamsMeta[t.id] = {
      name: t.name, logo_url: t.logo_url, primary_color: t.primary_color,
      code: t.code, status: t.status,
    };
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Puan Durumu</h1>
        <p className="mt-0.5 text-sm text-muted">
          Tablo, yayınlanmış ve sonuçlanmış maçlardan otomatik hesaplanır. Skor düzeltmeleri anında yansır.
        </p>
      </div>

      {bundle.groups.map((group) => {
        const rows = bundle.tablesByGroup.get(group.id) ?? [];
        if (rows.length === 0) return null;
        return (
          <section key={group.id}>
            <h2 className="mb-2 text-base font-bold">{group.name}</h2>
            <StandingsTable rows={rows} teamsMeta={teamsMeta} qualificationCount={group.qualification_count} linkPrefix={null} />
          </section>
        );
      })}

      {bundle.tablesByGroup.has("__all__") && (
        <section>
          {bundle.groups.length > 0 && <h2 className="mb-2 text-base font-bold">Grupsuz Takımlar</h2>}
          <StandingsTable rows={bundle.tablesByGroup.get("__all__")!} teamsMeta={teamsMeta} linkPrefix={null} />
        </section>
      )}
    </div>
  );
}
