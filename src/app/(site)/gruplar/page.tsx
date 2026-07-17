import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { fetchPublicTournament, getStandingsBundle } from "@/lib/queries";
import { EmptyState } from "@/components/ui";
import { TeamLogo } from "@/components/TeamBadge";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Gruplar",
  description: "Turnuva grupları ve grup takımları.",
};

export default async function GroupsPage() {
  const tournament = await fetchPublicTournament();
  if (!tournament) {
    return (
      <div className="container-page py-10">
        <EmptyState title="Gruplar henüz oluşturulmadı" />
      </div>
    );
  }

  const supabase = await createClient();
  const bundle = await getStandingsBundle(supabase, tournament);

  return (
    <div className="container-page space-y-4 py-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Gruplar</h1>
        <p className="mt-1 text-sm text-muted">{bundle.groups.length} grup · {bundle.teams.length} takım</p>
      </div>

      {bundle.groups.length === 0 ? (
        <EmptyState title="Henüz grup oluşturulmadı" description="Kura çekimi sonrası gruplar burada yayınlanacak." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {bundle.groups.map((group) => {
            const rows = bundle.tablesByGroup.get(group.id) ?? [];
            return (
              <section key={group.id} className="card overflow-hidden p-0" aria-label={group.name}>
                <div className="flex items-center justify-between px-4 py-3" style={{ backgroundColor: group.color ?? "#475569" }}>
                  <h2 className="text-sm font-bold text-white">{group.name}</h2>
                  <span className="text-xs font-medium text-white/80">
                    İlk {group.qualification_count} takım tur atlar
                  </span>
                </div>
                {rows.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-muted">Bu grupta takım bulunmuyor.</p>
                ) : (
                  <ol className="divide-y divide-line">
                    {rows.map((row) => {
                      const team = bundle.teamsById.get(row.teamId);
                      const qualified = row.rank <= group.qualification_count;
                      return (
                        <li key={row.teamId}>
                          <Link href={`/takimlar/${row.teamId}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50">
                            <span className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${qualified ? "bg-emerald-600 text-white" : "text-muted"}`}>
                              {row.rank}
                            </span>
                            <TeamLogo logoUrl={team?.logo_url} name={row.teamName} color={team?.primary_color} code={team?.code} size={28} />
                            <span className="min-w-0 flex-1 break-words text-sm font-semibold">{row.teamName}</span>
                            <span className="text-xs tabular-nums text-muted">{row.played} maç</span>
                            <span className="w-8 text-right text-sm font-bold tabular-nums">{row.points}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
