/**
 * Gol krallığı hesaplama (şartname madde 29).
 * Veriler match_events'ten türetilir; oyuncu tablosunda toplam saklanmaz.
 */
import type { ScorerTiebreaker } from "./types";
import { compareTr } from "./utils";

export interface ScorerEventInput {
  player_id: string | null;
  secondary_player_id: string | null;
  team_id: string | null;
  event_type: string;
}

export interface ScorerPlayerInput {
  id: string;
  full_name: string;
  team_id: string;
  shirt_number: number | null;
  position: string;
}

export interface ScorerRow {
  rank: number;
  playerId: string;
  fullName: string;
  teamId: string;
  shirtNumber: number | null;
  position: string;
  goals: number;
  penaltyGoals: number;
  assists: number;
  cards: number;
  /** Takımının tamamladığı maç sayısı (kadro verisi olmadığı için yaklaşımdır) */
  matches: number;
  goalsPerMatch: number;
}

export const DEFAULT_SCORER_TIEBREAKERS: ScorerTiebreaker[] = [
  "fewest_matches", "most_assists", "fewest_cards",
];

/**
 * @param events            Gol/asist olayları (yayınlanmış maçlardan)
 * @param cardCounts        oyuncuId -> toplam kart sayısı
 * @param players           Oyuncular
 * @param teamMatchCounts   takımId -> tamamlanan maç sayısı
 */
export function computeTopScorers(
  events: ScorerEventInput[],
  cardCounts: Map<string, number>,
  players: ScorerPlayerInput[],
  teamMatchCounts: Map<string, number>,
  tiebreakers: ScorerTiebreaker[] = DEFAULT_SCORER_TIEBREAKERS
): ScorerRow[] {
  const goals = new Map<string, number>();
  const penalties = new Map<string, number>();
  const assists = new Map<string, number>();

  for (const e of events) {
    // Kendi kalesine gol, gol krallığına SAYILMAZ
    if ((e.event_type === "goal" || e.event_type === "penalty_goal") && e.player_id) {
      goals.set(e.player_id, (goals.get(e.player_id) ?? 0) + 1);
      if (e.event_type === "penalty_goal") {
        penalties.set(e.player_id, (penalties.get(e.player_id) ?? 0) + 1);
      }
      if (e.secondary_player_id) {
        assists.set(e.secondary_player_id, (assists.get(e.secondary_player_id) ?? 0) + 1);
      }
    }
  }

  const rows: ScorerRow[] = [];
  for (const p of players) {
    const g = goals.get(p.id) ?? 0;
    if (g === 0) continue;
    const matches = teamMatchCounts.get(p.team_id) ?? 0;
    rows.push({
      rank: 0,
      playerId: p.id,
      fullName: p.full_name,
      teamId: p.team_id,
      shirtNumber: p.shirt_number,
      position: p.position,
      goals: g,
      penaltyGoals: penalties.get(p.id) ?? 0,
      assists: assists.get(p.id) ?? 0,
      cards: cardCounts.get(p.id) ?? 0,
      matches,
      goalsPerMatch: matches > 0 ? Math.round((g / matches) * 100) / 100 : g,
    });
  }

  rows.sort((a, b) => {
    if (b.goals !== a.goals) return b.goals - a.goals;
    for (const tb of tiebreakers) {
      let diff = 0;
      if (tb === "fewest_matches") diff = a.matches - b.matches;
      else if (tb === "most_assists") diff = b.assists - a.assists;
      else if (tb === "fewest_cards") diff = a.cards - b.cards;
      if (diff !== 0) return diff;
    }
    return compareTr(a.fullName, b.fullName);
  });

  rows.forEach((r, i) => { r.rank = i + 1; });
  return rows;
}
