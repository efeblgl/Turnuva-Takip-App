import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { fetchPublicTournament, getPublicSuspensions, getPublicTeams } from "@/lib/queries";
import { Badge, EmptyState, StatCard } from "@/components/ui";
import { TeamLogo } from "@/components/TeamBadge";
import { SUSPENSION_TYPE_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/utils";
import type { PublicPlayer } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kartlar ve Cezalar",
  description: "Sarı ve kırmızı kartlar ile disiplin cezaları.",
};

export default async function CardsPage() {
  const tournament = await fetchPublicTournament();
  if (!tournament) {
    return (
      <div className="container-page py-10">
        <EmptyState title="Kart verisi henüz oluşmadı" />
      </div>
    );
  }

  const supabase = await createClient();
  const [teams, suspensions, cardsRes] = await Promise.all([
    getPublicTeams(supabase, tournament.id),
    getPublicSuspensions(supabase, tournament.id),
    supabase
      .from("cards")
      .select("id, card_type, minute, player_id, team_id, match_id, created_at, match:matches!inner(tournament_id, match_date)")
      .eq("match.tournament_id", tournament.id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const cards = (cardsRes.data as Array<{
    id: string; card_type: string; minute: number | null; player_id: string | null;
    team_id: string | null; match: { match_date: string | null };
  }> | null) ?? [];

  const playerIds = [
    ...new Set([
      ...cards.map((c) => c.player_id),
      ...suspensions.map((s) => s.player_id),
    ].filter(Boolean) as string[]),
  ];
  const { data: playersData } = playerIds.length
    ? await supabase.from("public_players").select("*").in("id", playerIds)
    : { data: [] };
  const playersById = new Map(((playersData as PublicPlayer[] | null) ?? []).map((p) => [p.id, p]));
  const teamsById = new Map(teams.map((t) => [t.id, t]));

  const yellowTotal = cards.filter((c) => c.card_type === "yellow").length;
  const redTotal = cards.length - yellowTotal;
  const activeSuspensions = suspensions.filter((s) => s.is_active);
  const pastSuspensions = suspensions.filter((s) => !s.is_active);

  return (
    <div className="container-page space-y-6 py-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Kartlar ve Cezalar</h1>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Kart özetleri">
        <StatCard label="Toplam Sarı Kart" value={yellowTotal} />
        <StatCard label="Toplam Kırmızı Kart" value={redTotal} />
        <StatCard label="Aktif Ceza" value={activeSuspensions.length} />
      </section>

      <section>
        <h2 className="section-title mb-3">Aktif Cezalar</h2>
        {activeSuspensions.length === 0 ? (
          <EmptyState title="Aktif ceza bulunmuyor" description="Disiplin cezaları burada yayınlanır." />
        ) : (
          <div className="card divide-y divide-line p-0">
            {activeSuspensions.map((s) => {
              const team = s.team_id ? teamsById.get(s.team_id) : (s.player_id ? teamsById.get(playersById.get(s.player_id)?.team_id ?? "") : null);
              return (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                  <TeamLogo logoUrl={team?.logo_url} name={team?.name ?? ""} color={team?.primary_color} code={team?.code} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-semibold">
                      {s.player_id ? playersById.get(s.player_id)?.full_name ?? "Oyuncu" : team?.name ?? "Takım"}
                    </p>
                    <p className="text-xs text-muted">
                      {SUSPENSION_TYPE_LABELS[s.suspension_type]}
                      {s.reason && ` · ${s.reason}`}
                      {s.decision_date && ` · Karar: ${formatDate(s.decision_date)}`}
                    </p>
                  </div>
                  <Badge className="border-red-200 bg-red-50 text-red-700">
                    {s.remaining_matches !== null && s.suspension_type !== "until_date"
                      ? `${s.remaining_matches} maç`
                      : s.end_date
                        ? `${formatDate(s.end_date)}'e kadar`
                        : "Aktif"}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="section-title mb-3">Son Kartlar</h2>
        {cards.length === 0 ? (
          <EmptyState title="Henüz kart verisi yok" />
        ) : (
          <div className="card divide-y divide-line p-0">
            {cards.slice(0, 30).map((c) => {
              const player = c.player_id ? playersById.get(c.player_id) : null;
              const team = c.team_id ? teamsById.get(c.team_id) : null;
              return (
                <div key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span
                    aria-label={c.card_type === "yellow" ? "Sarı kart" : "Kırmızı kart"}
                    className={`inline-block h-5 w-3.5 shrink-0 rounded-[3px] ${c.card_type === "yellow" ? "bg-yellow-400" : "bg-red-500"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{player?.full_name ?? "Bilinmeyen oyuncu"}</p>
                    <p className="truncate text-xs text-muted">
                      {team?.name}
                      {c.minute !== null && ` · ${c.minute}. dakika`}
                      {c.match?.match_date && ` · ${formatDate(c.match.match_date)}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {pastSuspensions.length > 0 && (
        <section>
          <h2 className="section-title mb-3">Tamamlanan Cezalar</h2>
          <div className="card divide-y divide-line p-0 opacity-75">
            {pastSuspensions.slice(0, 20).map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {s.player_id ? playersById.get(s.player_id)?.full_name ?? "Oyuncu" : teamsById.get(s.team_id ?? "")?.name ?? "Takım"}
                  </p>
                  <p className="truncate text-xs text-muted">{SUSPENSION_TYPE_LABELS[s.suspension_type]}{s.reason && ` · ${s.reason}`}</p>
                </div>
                <Badge>Tamamlandı</Badge>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
