/**
 * Puan durumu hesaplama modülü.
 *
 * Tasarım ilkeleri (şartname madde 21, 24, 25):
 *  - Puanlar veritabanında SAKLANMAZ; tamamlanan maçlardan her seferinde
 *    sıfırdan hesaplanır. Skor düzeltmeleri otomatik olarak yansır.
 *  - Sıralama kriterleri yapılandırılabilir. İkili averaj (head-to-head)
 *    kriterleri, eşit takımlar arasında "mini lig" tablosu kurularak
 *    hesaplanır; 3+ takımlı eşitlikleri de destekler.
 *  - Saf fonksiyondur, veritabanına bağımlı değildir -> test edilebilir.
 */
import { compareTr } from "./utils";
import type { ForfeitRules, StandingsTiebreaker } from "./types";

export interface StandingsMatchInput {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  matchDate: string | null;
  isForfeit: boolean;
  forfeitType: string | null;
}

export interface StandingsConfig {
  winPoints: number;
  drawPoints: number;
  lossPoints: number;
  tiebreakers: StandingsTiebreaker[];
  forfeitRules: ForfeitRules;
  /** "İki takım hükmen mağlup" durumunda her takımın yediği gol (varsayılan 3) */
  forfeitLossGoals: number;
}

export const DEFAULT_TIEBREAKERS: StandingsTiebreaker[] = [
  "points", "goal_difference", "goals_for",
  "h2h_goal_difference", "h2h_goals_for",
  "fewest_red_cards", "fewest_yellow_cards",
];

export const DEFAULT_CONFIG: StandingsConfig = {
  winPoints: 3,
  drawPoints: 1,
  lossPoints: 0,
  tiebreakers: DEFAULT_TIEBREAKERS,
  forfeitRules: { award_points: true, count_in_goal_stats: true, count_player_goals: false },
  forfeitLossGoals: 3,
};

export interface StandingsTeamInput {
  id: string;
  name: string;
  yellowCards: number;
  redCards: number;
  /** Puan silme cezası toplamı */
  deductedPoints: number;
}

export interface StandingRow {
  rank: number;
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  deductedPoints: number;
  yellowCards: number;
  redCards: number;
  /** Son maçlardan yeniye doğru: G / B / M */
  form: Array<"G" | "B" | "M">;
}

interface Tally {
  played: number; won: number; drawn: number; lost: number;
  goalsFor: number; goalsAgainst: number; points: number;
  results: Array<{ date: string; result: "G" | "B" | "M" }>;
}

function emptyTally(): Tally {
  return { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0, results: [] };
}

/** Tek bir maçı iki takımın toplamına işler. */
function applyMatch(
  tallies: Map<string, Tally>,
  m: StandingsMatchInput,
  cfg: StandingsConfig
): void {
  const home = tallies.get(m.homeTeamId);
  const away = tallies.get(m.awayTeamId);
  if (!home || !away) return; // tabloda olmayan takım (ör. ihraç) -> yok say

  const date = m.matchDate ?? "";

  // "İki takım hükmen mağlup": skorlar yok sayılır, iki taraf da kaybetmiş sayılır
  if (m.isForfeit && m.forfeitType === "both_lose") {
    for (const t of [home, away]) {
      t.played += 1;
      t.lost += 1;
      if (cfg.forfeitRules.count_in_goal_stats) t.goalsAgainst += cfg.forfeitLossGoals;
      t.points += cfg.lossPoints;
      t.results.push({ date, result: "M" });
    }
    return;
  }

  const countGoals = !m.isForfeit || cfg.forfeitRules.count_in_goal_stats;
  const awardPoints = !m.isForfeit || cfg.forfeitRules.award_points;

  home.played += 1;
  away.played += 1;
  if (countGoals) {
    home.goalsFor += m.homeScore;
    home.goalsAgainst += m.awayScore;
    away.goalsFor += m.awayScore;
    away.goalsAgainst += m.homeScore;
  }

  if (m.homeScore > m.awayScore) {
    home.won += 1;
    away.lost += 1;
    if (awardPoints) home.points += cfg.winPoints;
    away.points += cfg.lossPoints;
    home.results.push({ date, result: "G" });
    away.results.push({ date, result: "M" });
  } else if (m.homeScore < m.awayScore) {
    away.won += 1;
    home.lost += 1;
    if (awardPoints) away.points += cfg.winPoints;
    home.points += cfg.lossPoints;
    away.results.push({ date, result: "G" });
    home.results.push({ date, result: "M" });
  } else {
    home.drawn += 1;
    away.drawn += 1;
    if (awardPoints) {
      home.points += cfg.drawPoints;
      away.points += cfg.drawPoints;
    }
    home.results.push({ date, result: "B" });
    away.results.push({ date, result: "B" });
  }
}

/**
 * Eşit takımlar arasındaki maçlardan mini tablo (ikili averaj) hesaplar.
 * Şartname madde 25: 3+ takım eşitse aralarındaki tüm maçlar mini lig olur.
 */
export function computeHeadToHead(
  teamIds: string[],
  matches: StandingsMatchInput[],
  cfg: StandingsConfig
): Map<string, { points: number; goalDifference: number; goalsFor: number }> {
  const idSet = new Set(teamIds);
  const tallies = new Map<string, Tally>(teamIds.map((id) => [id, emptyTally()]));
  for (const m of matches) {
    if (idSet.has(m.homeTeamId) && idSet.has(m.awayTeamId)) {
      applyMatch(tallies, m, cfg);
    }
  }
  const out = new Map<string, { points: number; goalDifference: number; goalsFor: number }>();
  for (const [id, t] of tallies) {
    out.set(id, {
      points: t.points,
      goalDifference: t.goalsFor - t.goalsAgainst,
      goalsFor: t.goalsFor,
    });
  }
  return out;
}

/** Bir kriter için sıralama anahtarı (her zaman "büyük olan üstte"). */
function criterionKey(
  row: StandingRow,
  crit: StandingsTiebreaker,
  h2h: Map<string, { points: number; goalDifference: number; goalsFor: number }> | null
): number {
  switch (crit) {
    case "points": return row.points;
    case "goal_difference": return row.goalDifference;
    case "goals_for": return row.goalsFor;
    case "h2h_points": return h2h?.get(row.teamId)?.points ?? 0;
    case "h2h_goal_difference": return h2h?.get(row.teamId)?.goalDifference ?? 0;
    case "h2h_goals_for": return h2h?.get(row.teamId)?.goalsFor ?? 0;
    case "fewest_red_cards": return -row.redCards;
    case "fewest_yellow_cards": return -row.yellowCards;
  }
}

/** Kriter listesini kümeler halinde, özyinelemeli uygular. */
function rankGroup(
  rows: StandingRow[],
  criteria: StandingsTiebreaker[],
  matches: StandingsMatchInput[],
  cfg: StandingsConfig
): StandingRow[] {
  if (rows.length <= 1) return rows;
  if (criteria.length === 0) {
    return [...rows].sort((a, b) => compareTr(a.teamName, b.teamName));
  }

  const [crit, ...rest] = criteria;
  const h2h = crit.startsWith("h2h_")
    ? computeHeadToHead(rows.map((r) => r.teamId), matches, cfg)
    : null;

  const sorted = [...rows].sort(
    (a, b) => criterionKey(b, crit, h2h) - criterionKey(a, crit, h2h)
  );

  // Aynı anahtara sahip ardışık kümeleri bul, kalan kriterlerle çöz
  const out: StandingRow[] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i + 1;
    const key = criterionKey(sorted[i], crit, h2h);
    while (j < sorted.length && criterionKey(sorted[j], crit, h2h) === key) j++;
    const cluster = sorted.slice(i, j);
    out.push(...(cluster.length > 1 ? rankGroup(cluster, rest, matches, cfg) : cluster));
    i = j;
  }
  return out;
}

/**
 * Puan durumunu hesaplar ve sıralar.
 * @param teams   Tabloya dahil takımlar (kart sayıları ve puan cezalarıyla)
 * @param matches Yalnızca sonuç doğuran (tamamlandı / hükmen) maçlar
 */
export function computeStandings(
  teams: StandingsTeamInput[],
  matches: StandingsMatchInput[],
  config?: Partial<StandingsConfig>
): StandingRow[] {
  const cfg: StandingsConfig = { ...DEFAULT_CONFIG, ...config };
  const tallies = new Map<string, Tally>(teams.map((t) => [t.id, emptyTally()]));

  for (const m of matches) applyMatch(tallies, m, cfg);

  const rows: StandingRow[] = teams.map((team) => {
    const t = tallies.get(team.id)!;
    const sortedResults = [...t.results].sort((a, b) => a.date.localeCompare(b.date));
    return {
      rank: 0,
      teamId: team.id,
      teamName: team.name,
      played: t.played,
      won: t.won,
      drawn: t.drawn,
      lost: t.lost,
      goalsFor: t.goalsFor,
      goalsAgainst: t.goalsAgainst,
      goalDifference: t.goalsFor - t.goalsAgainst,
      points: Math.max(0, t.points - team.deductedPoints),
      deductedPoints: team.deductedPoints,
      yellowCards: team.yellowCards,
      redCards: team.redCards,
      form: sortedResults.slice(-5).map((r) => r.result),
    };
  });

  const ranked = rankGroup(rows, cfg.tiebreakers, matches, cfg);
  ranked.forEach((row, index) => { row.rank = index + 1; });
  return ranked;
}
