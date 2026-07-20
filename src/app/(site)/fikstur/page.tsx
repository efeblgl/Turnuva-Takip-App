import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import {
  fetchPublicTournament, getGroups, getPublicTeams, getPublishedMatches, getVenues,
} from "@/lib/queries";
import { MatchCard, teamInfoFrom } from "@/components/MatchCard";
import { EmptyState } from "@/components/ui";
import { FixtureFilters } from "@/components/site/FixtureFilters";
import { FINISHED_STATUSES } from "@/lib/labels";
import { addDays, formatDate, todayInTurkey } from "@/lib/utils";
import type { Match } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Fikstür",
  description: "Turnuva fikstürü: bugünün maçları, yaklaşan ve tamamlanan tüm karşılaşmalar.",
};

function applyFilters(
  matches: Match[],
  params: Record<string, string | undefined>,
  today: string,
  teamNames: Map<string, string>
): Match[] {
  let result = matches;
  const { durum, grup, takim, saha, hafta, ara } = params;

  if (grup) result = result.filter((m) => m.group_id === grup);
  if (takim) result = result.filter((m) => m.home_team_id === takim || m.away_team_id === takim);
  if (saha) result = result.filter((m) => m.venue_id === saha);
  if (hafta) result = result.filter((m) => String(m.week_number ?? "") === hafta);
  if (ara) {
    // Takım adına göre serbest arama (Türkçe harflere duyarsız karşılaştırma)
    const q = ara.trim().toLocaleLowerCase("tr");
    const matchesName = (teamId: string | null) =>
      teamId !== null && (teamNames.get(teamId) ?? "").toLocaleLowerCase("tr").includes(q);
    result = result.filter((m) => matchesName(m.home_team_id) || matchesName(m.away_team_id));
  }

  switch (durum) {
    case "bugun":
      return result.filter((m) => m.match_date === today);
    case "yarin":
      return result.filter((m) => m.match_date === addDays(today, 1));
    case "hafta":
      return result.filter((m) => m.match_date && m.match_date >= today && m.match_date <= addDays(today, 7));
    case "yaklasan":
      return result.filter((m) => m.match_date && m.match_date >= today && m.status === "scheduled");
    case "tamamlanan":
      return result.filter((m) => (FINISHED_STATUSES as string[]).includes(m.status));
    case "ertelenen":
      return result.filter((m) => m.status === "postponed" || m.original_match_date !== null);
    case "iptal":
      return result.filter((m) => m.status === "cancelled");
    case "hukmen":
      return result.filter((m) => m.is_forfeit);
    case "eleme":
      return result.filter((m) => m.stage === "knockout");
    default:
      return result;
  }
}

export default async function FixturePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const tournament = await fetchPublicTournament();

  if (!tournament) {
    return (
      <div className="container-page py-10">
        <EmptyState title="Henüz fikstür yayınlanmadı" description="Fikstür hazırlandığında burada görünecek." />
      </div>
    );
  }

  const supabase = await createClient();
  const [matches, teams, groups, venues] = await Promise.all([
    getPublishedMatches(supabase, tournament.id),
    getPublicTeams(supabase, tournament.id),
    getGroups(supabase, tournament.id),
    getVenues(supabase, tournament.id),
  ]);

  const today = todayInTurkey();
  const teamNames = new Map(teams.map((t) => [t.id, t.name]));
  const filtered = applyFilters(matches, params, today, teamNames);

  const teamsById = new Map(teams.map((t) => [t.id, t]));
  const venueNames = new Map(venues.map((v) => [v.id, v.name]));
  const groupNames = new Map(groups.map((g) => [g.id, g.name]));

  const weeks = [...new Set(matches.map((m) => m.week_number).filter((w): w is number => w !== null))]
    .sort((a, b) => a - b);

  // Tarihe göre grupla
  const byDate = new Map<string, Match[]>();
  for (const m of filtered) {
    const key = m.match_date ?? "tarihsiz";
    const list = byDate.get(key);
    if (list) list.push(m);
    else byDate.set(key, [m]);
  }
  const dateKeys = [...byDate.keys()].sort();

  return (
    <div className="container-page space-y-4 py-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Fikstür</h1>
        <p className="mt-1 text-sm text-muted">
          {params.takim && teamNames.has(params.takim)
            ? `${teamNames.get(params.takim)}: ${filtered.length} maç`
            : params.ara
              ? `"${params.ara}" için ${filtered.length} maç`
              : `${filtered.length} maç listeleniyor`}
        </p>
      </div>

      <FixtureFilters
        groups={groups.map((g) => ({ value: g.id, label: g.name }))}
        teams={teams.map((t) => ({ value: t.id, label: t.name }))}
        venues={venues.map((v) => ({ value: v.id, label: v.name }))}
        weeks={weeks.map((w) => ({ value: String(w), label: `${w}. Hafta` }))}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="size-8" aria-hidden />}
          title="Bu kriterlere uyan maç bulunamadı"
          description="Filtreleri değiştirerek tekrar deneyebilirsiniz."
        />
      ) : (
        <div className="space-y-6">
          {dateKeys.map((date) => (
            <section key={date} aria-label={formatDate(date)}>
              <h2 className="mb-2 text-sm font-bold text-muted">
                {date === "tarihsiz" ? "Tarihi belirlenecek" : formatDate(date)}
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {byDate.get(date)!.map((m) => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    home={teamInfoFrom(m.home_team_id ? teamsById.get(m.home_team_id) : null)}
                    away={teamInfoFrom(m.away_team_id ? teamsById.get(m.away_team_id) : null)}
                    venueName={m.venue_id ? venueNames.get(m.venue_id) : null}
                    contextLabel={
                      m.stage === "knockout"
                        ? m.round_name
                        : m.group_id
                          ? `${groupNames.get(m.group_id) ?? ""} · ${m.round_name ?? ""}`
                          : m.round_name
                    }
                    href={`/maclar/${m.id}`}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
