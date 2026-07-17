/**
 * Sunucu tarafı veri sorguları.
 * Halka açık sayfalar public_* view'larını, panel taban tabloları kullanır;
 * yetkilendirme RLS ile veritabanı seviyesinde uygulanır.
 */
import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/utils/supabase/server";
import { computeStandings, DEFAULT_TIEBREAKERS, type StandingRow } from "./standings";
import { FINISHED_STATUSES } from "./labels";
import type {
  Announcement, ForfeitRules, Group, Match, MatchEvent, PublicPlayer,
  PublicSuspension, PublicTeam, Setting, StandingsTiebreaker, Tournament, Venue,
} from "./types";

type Client = SupabaseClient;

/**
 * İstek başına önbellekli yardımcılar: aynı render içinde birden fazla
 * bileşen çağırsa da sorgu bir kez çalışır.
 */
export const fetchPublicTournament = cache(async () => {
  const supabase = await createServerClient();
  return getPublicTournament(supabase);
});

export const fetchSettings = cache(async (tournamentId: string) => {
  const supabase = await createServerClient();
  return getSettingsMap(supabase, tournamentId);
});

// ---------------------------------------------------------------------------
// Turnuva
// ---------------------------------------------------------------------------

/** Yayındaki (halka açık) turnuva; birden fazlaysa en yenisi. */
export async function getPublicTournament(supabase: Client): Promise<Tournament | null> {
  const { data } = await supabase
    .from("tournaments")
    .select("*")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Tournament | null) ?? null;
}

/** Paneldeki aktif turnuva (yayın şartı aranmaz). */
export async function getAdminTournament(supabase: Client): Promise<Tournament | null> {
  const { data } = await supabase
    .from("tournaments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as Tournament | null) ?? null;
}

// ---------------------------------------------------------------------------
// Temel listeler
// ---------------------------------------------------------------------------

export async function getGroups(supabase: Client, tournamentId: string): Promise<Group[]> {
  const { data } = await supabase
    .from("groups")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("sort_order")
    .order("name");
  return (data as Group[]) ?? [];
}

export async function getPublicTeams(supabase: Client, tournamentId: string): Promise<PublicTeam[]> {
  const { data } = await supabase
    .from("public_teams")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("name");
  return (data as PublicTeam[]) ?? [];
}

export async function getPublicPlayers(supabase: Client, teamId: string): Promise<PublicPlayer[]> {
  const { data } = await supabase
    .from("public_players")
    .select("*")
    .eq("team_id", teamId)
    .order("shirt_number");
  return (data as PublicPlayer[]) ?? [];
}

export async function getVenues(supabase: Client, tournamentId: string): Promise<Venue[]> {
  const { data } = await supabase
    .from("venues")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("name");
  return (data as Venue[]) ?? [];
}

// ---------------------------------------------------------------------------
// Maçlar
// ---------------------------------------------------------------------------

export async function getPublishedMatches(supabase: Client, tournamentId: string): Promise<Match[]> {
  const { data } = await supabase
    .from("matches")
    .select("*")
    .eq("tournament_id", tournamentId)
    .eq("is_published", true)
    .order("match_date", { ascending: true })
    .order("start_time", { ascending: true });
  return (data as Match[]) ?? [];
}

export async function getMatchEvents(supabase: Client, matchId: string): Promise<MatchEvent[]> {
  const { data } = await supabase
    .from("match_events")
    .select("*")
    .eq("match_id", matchId)
    .order("minute", { ascending: true, nullsFirst: true })
    .order("created_at");
  return (data as MatchEvent[]) ?? [];
}

// ---------------------------------------------------------------------------
// Duyurular ve ayarlar
// ---------------------------------------------------------------------------

export async function getPublishedAnnouncements(
  supabase: Client,
  tournamentId: string,
  limit = 20
): Promise<Announcement[]> {
  const { data } = await supabase
    .from("announcements")
    .select("*")
    .eq("tournament_id", tournamentId)
    .eq("is_published", true)
    .order("is_important", { ascending: false })
    .order("publish_date", { ascending: false })
    .limit(limit);
  return (data as Announcement[]) ?? [];
}

export async function getAnnouncementBySlug(
  supabase: Client,
  tournamentId: string,
  slug: string
): Promise<Announcement | null> {
  const { data } = await supabase
    .from("announcements")
    .select("*")
    .eq("tournament_id", tournamentId)
    .eq("slug", slug)
    .maybeSingle();
  return (data as Announcement | null) ?? null;
}

/** Ayar anahtarlarını { anahtar: değer } nesnesine çevirir. */
export async function getSettingsMap(
  supabase: Client,
  tournamentId: string
): Promise<Record<string, unknown>> {
  const { data } = await supabase
    .from("settings")
    .select("setting_key, setting_value")
    .eq("tournament_id", tournamentId);
  const map: Record<string, unknown> = {};
  for (const row of (data as Pick<Setting, "setting_key" | "setting_value">[]) ?? []) {
    map[row.setting_key] = row.setting_value;
  }
  return map;
}

// ---------------------------------------------------------------------------
// Cezalar
// ---------------------------------------------------------------------------

export async function getPublicSuspensions(
  supabase: Client,
  tournamentId: string
): Promise<PublicSuspension[]> {
  const { data } = await supabase
    .from("public_suspensions")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("decision_date", { ascending: false });
  return (data as PublicSuspension[]) ?? [];
}

// ---------------------------------------------------------------------------
// Puan durumu paketi
// ---------------------------------------------------------------------------

export interface StandingsBundle {
  groups: Group[];
  teams: PublicTeam[];
  teamsById: Map<string, PublicTeam>;
  matches: Match[];
  /** groupId ("__all__" = grupsuz/lig formatı) -> sıralı tablo */
  tablesByGroup: Map<string, StandingRow[]>;
}

interface CardCountRow {
  team_id: string | null;
  card_type: string;
}

/**
 * Puan durumu için gereken tüm veriyi toplar ve tabloları hesaplar.
 * Hem halka açık sayfalarda hem panelde kullanılır (RLS farkı sorgu
 * sonuçlarına kendiliğinden yansır).
 */
export async function getStandingsBundle(
  supabase: Client,
  tournament: Tournament
): Promise<StandingsBundle> {
  const [groups, teams, matches, settings, cardRows, deductionRows] = await Promise.all([
    getGroups(supabase, tournament.id),
    getPublicTeams(supabase, tournament.id),
    getPublishedMatches(supabase, tournament.id),
    getSettingsMap(supabase, tournament.id),
    supabase
      .from("cards")
      .select("team_id, card_type, match:matches!inner(tournament_id)")
      .eq("match.tournament_id", tournament.id)
      .then(({ data }) => (data as unknown as CardCountRow[]) ?? []),
    supabase
      .from("public_suspensions")
      .select("team_id, penalty_points, suspension_type, is_active")
      .eq("tournament_id", tournament.id)
      .eq("suspension_type", "point_deduction")
      .eq("is_active", true)
      .then(({ data }) => data ?? []),
  ]);

  const yellow = new Map<string, number>();
  const red = new Map<string, number>();
  for (const c of cardRows) {
    if (!c.team_id) continue;
    if (c.card_type === "yellow") yellow.set(c.team_id, (yellow.get(c.team_id) ?? 0) + 1);
    else red.set(c.team_id, (red.get(c.team_id) ?? 0) + 1);
  }

  const deductions = new Map<string, number>();
  for (const d of deductionRows as Array<{ team_id: string | null; penalty_points: number | null }>) {
    if (d.team_id && d.penalty_points) {
      deductions.set(d.team_id, (deductions.get(d.team_id) ?? 0) + d.penalty_points);
    }
  }

  const tiebreakers =
    (settings["standings_tiebreakers"] as StandingsTiebreaker[] | undefined) ?? DEFAULT_TIEBREAKERS;
  const forfeitRules =
    (settings["forfeit_rules"] as ForfeitRules | undefined) ??
    { award_points: true, count_in_goal_stats: true, count_player_goals: false };

  const finished = matches.filter(
    (m) =>
      (FINISHED_STATUSES as string[]).includes(m.status) &&
      m.stage === "group" &&
      m.home_score !== null && m.away_score !== null &&
      m.home_team_id !== null && m.away_team_id !== null
  );

  const standingsInput = (teamList: PublicTeam[]) =>
    teamList.map((t) => ({
      id: t.id,
      name: t.name,
      yellowCards: yellow.get(t.id) ?? 0,
      redCards: red.get(t.id) ?? 0,
      deductedPoints: deductions.get(t.id) ?? 0,
    }));

  const matchInput = (teamIds: Set<string>) =>
    finished
      .filter((m) => teamIds.has(m.home_team_id!) && teamIds.has(m.away_team_id!))
      .map((m) => ({
        homeTeamId: m.home_team_id!,
        awayTeamId: m.away_team_id!,
        homeScore: m.home_score!,
        awayScore: m.away_score!,
        matchDate: m.match_date,
        isForfeit: m.is_forfeit,
        forfeitType: m.forfeit_type,
      }));

  const config = {
    winPoints: tournament.win_points,
    drawPoints: tournament.draw_points,
    lossPoints: tournament.loss_points,
    tiebreakers,
    forfeitRules,
    forfeitLossGoals: tournament.forfeit_home_score,
  };

  const tablesByGroup = new Map<string, StandingRow[]>();

  if (groups.length > 0) {
    for (const group of groups) {
      const groupTeams = teams.filter((t) => t.group_id === group.id);
      const ids = new Set(groupTeams.map((t) => t.id));
      tablesByGroup.set(
        group.id,
        computeStandings(standingsInput(groupTeams), matchInput(ids), config)
      );
    }
  }

  // Grupsuz format (tek/çift devre lig) veya grubu olmayan takımlar
  const ungrouped = teams.filter((t) => !t.group_id);
  if (ungrouped.length > 0 || groups.length === 0) {
    const pool = groups.length === 0 ? teams : ungrouped;
    if (pool.length > 0) {
      const ids = new Set(pool.map((t) => t.id));
      tablesByGroup.set(
        "__all__",
        computeStandings(standingsInput(pool), matchInput(ids), config)
      );
    }
  }

  return {
    groups,
    teams,
    teamsById: new Map(teams.map((t) => [t.id, t])),
    matches,
    tablesByGroup,
  };
}

// ---------------------------------------------------------------------------
// Gol krallığı verisi
// ---------------------------------------------------------------------------

export interface ScorersData {
  events: Array<{
    player_id: string | null;
    secondary_player_id: string | null;
    team_id: string | null;
    event_type: string;
    match_id: string;
  }>;
  players: PublicPlayer[];
  cardCounts: Map<string, number>;
  teamMatchCounts: Map<string, number>;
}

export async function getScorersData(
  supabase: Client,
  tournamentId: string
): Promise<ScorersData> {
  const [matches, eventsRes, playersRes, cardsRes] = await Promise.all([
    getPublishedMatches(supabase, tournamentId),
    supabase
      .from("match_events")
      .select("player_id, secondary_player_id, team_id, event_type, match_id, match:matches!inner(tournament_id)")
      .eq("match.tournament_id", tournamentId)
      .in("event_type", ["goal", "penalty_goal"]),
    supabase
      .from("public_players")
      .select("*")
      .order("full_name"),
    supabase
      .from("cards")
      .select("player_id, match:matches!inner(tournament_id)")
      .eq("match.tournament_id", tournamentId),
  ]);

  const teamMatchCounts = new Map<string, number>();
  for (const m of matches) {
    if (!(FINISHED_STATUSES as string[]).includes(m.status)) continue;
    for (const teamId of [m.home_team_id, m.away_team_id]) {
      if (teamId) teamMatchCounts.set(teamId, (teamMatchCounts.get(teamId) ?? 0) + 1);
    }
  }

  const cardCounts = new Map<string, number>();
  for (const c of (cardsRes.data as Array<{ player_id: string | null }>) ?? []) {
    if (c.player_id) cardCounts.set(c.player_id, (cardCounts.get(c.player_id) ?? 0) + 1);
  }

  return {
    events: (eventsRes.data as unknown as ScorersData["events"]) ?? [],
    players: (playersRes.data as PublicPlayer[]) ?? [],
    cardCounts,
    teamMatchCounts,
  };
}
