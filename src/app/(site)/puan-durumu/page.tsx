import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { fetchPublicTournament, getStandingsBundle } from "@/lib/queries";
import { StandingsTable, type StandingsTeamMeta } from "@/components/StandingsTable";
import { EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Puan Durumu",
  description: "Grup gruplarına göre güncel puan durumu, averaj ve form bilgileri.",
};

export default async function StandingsPage() {
  const tournament = await fetchPublicTournament();

  if (!tournament) {
    return (
      <div className="container-page py-10">
        <EmptyState title="Puan durumu henüz oluşmadı" description="Turnuva başladığında puan durumu burada yayınlanacak." />
      </div>
    );
  }

  const supabase = await createClient();
  const bundle = await getStandingsBundle(supabase, tournament);

  const teamsMeta: Record<string, StandingsTeamMeta> = {};
  for (const t of bundle.teams) {
    teamsMeta[t.id] = {
      name: t.name,
      logo_url: t.logo_url,
      primary_color: t.primary_color,
      code: t.code,
      status: t.status,
    };
  }

  const hasAny = [...bundle.tablesByGroup.values()].some((rows) => rows.length > 0);

  return (
    <div className="container-page space-y-6 py-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Puan Durumu</h1>
        <p className="mt-1 text-sm text-muted">
          Sıralama: puan, averaj, atılan gol ve ikili averaj kriterlerine göre hesaplanır.
        </p>
      </div>

      {!hasAny ? (
        <EmptyState title="Henüz takım eklenmedi" description="Gruplar oluşturulduğunda tablolar burada görünecek." />
      ) : (
        <div className="space-y-8">
          {bundle.groups.map((group) => {
            const rows = bundle.tablesByGroup.get(group.id) ?? [];
            if (rows.length === 0) return null;
            return (
              <section key={group.id} aria-label={`${group.name} puan durumu`}>
                <h2 className="mb-2 flex items-center gap-2 text-base font-bold">
                  <span aria-hidden className="size-3 rounded-full" style={{ backgroundColor: group.color ?? "#64748B" }} />
                  {group.name}
                </h2>
                <StandingsTable
                  rows={rows}
                  teamsMeta={teamsMeta}
                  qualificationCount={group.qualification_count}
                />
              </section>
            );
          })}

          {bundle.tablesByGroup.has("__all__") && (
            <section aria-label="Genel puan durumu">
              {bundle.groups.length > 0 && (
                <h2 className="mb-2 text-base font-bold">Grubu Belirlenmemiş Takımlar</h2>
              )}
              <StandingsTable
                rows={bundle.tablesByGroup.get("__all__")!}
                teamsMeta={teamsMeta}
                qualificationCount={0}
              />
            </section>
          )}
        </div>
      )}
    </div>
  );
}
