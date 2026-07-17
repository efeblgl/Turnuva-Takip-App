/**
 * Takım ve turnuva geneli istatistikler (şartname madde 12 ve 30).
 * Tamamlanan maçlardan saf fonksiyonlarla türetilir.
 */
import { FINISHED_STATUSES } from "./labels";
import type { Match } from "./types";

export interface TeamAggregate {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  cleanSheets: number;
  biggestWin: { diff: number; score: string; opponentId: string | null } | null;
}

/** Sonuç doğuran maçlar (tamamlandı / hükmen) */
export function finishedMatches<T extends Pick<Match, "status" | "home_score" | "away_score" | "home_team_id" | "away_team_id">>(
  matches: T[]
): T[] {
  return matches.filter(
    (m) =>
      (FINISHED_STATUSES as string[]).includes(m.status) &&
      m.home_score !== null && m.away_score !== null &&
      m.home_team_id !== null && m.away_team_id !== null
  );
}

export function computeTeamAggregates(
  teamIds: string[],
  matches: Array<Pick<Match, "status" | "home_score" | "away_score" | "home_team_id" | "away_team_id" | "is_forfeit" | "forfeit_type">>
): Map<string, TeamAggregate> {
  const map = new Map<string, TeamAggregate>(
    teamIds.map((id) => [id, {
      teamId: id, played: 0, won: 0, drawn: 0, lost: 0,
      goalsFor: 0, goalsAgainst: 0, cleanSheets: 0, biggestWin: null,
    }])
  );

  for (const m of finishedMatches(matches)) {
    const home = map.get(m.home_team_id!);
    const away = map.get(m.away_team_id!);
    const hs = m.home_score!;
    const as = m.away_score!;

    const bothLose = m.is_forfeit && m.forfeit_type === "both_lose";

    if (home) {
      home.played++;
      if (bothLose) { home.lost++; }
      else {
        home.goalsFor += hs; home.goalsAgainst += as;
        if (as === 0) home.cleanSheets++;
        if (hs > as) {
          home.won++;
          const diff = hs - as;
          if (!home.biggestWin || diff > home.biggestWin.diff) {
            home.biggestWin = { diff, score: `${hs}-${as}`, opponentId: m.away_team_id };
          }
        } else if (hs < as) home.lost++;
        else home.drawn++;
      }
    }
    if (away) {
      away.played++;
      if (bothLose) { away.lost++; }
      else {
        away.goalsFor += as; away.goalsAgainst += hs;
        if (hs === 0) away.cleanSheets++;
        if (as > hs) {
          away.won++;
          const diff = as - hs;
          if (!away.biggestWin || diff > away.biggestWin.diff) {
            away.biggestWin = { diff, score: `${as}-${hs}`, opponentId: m.home_team_id };
          }
        } else if (as < hs) away.lost++;
        else away.drawn++;
      }
    }
  }
  return map;
}

export interface TournamentTotals {
  playedCount: number;
  remainingCount: number;
  totalGoals: number;
  goalsPerMatch: number;
}

export function computeTournamentTotals(
  matches: Array<Pick<Match, "status" | "home_score" | "away_score" | "home_team_id" | "away_team_id">>
): TournamentTotals {
  const finished = finishedMatches(matches);
  const remaining = matches.filter((m) =>
    ["scheduled", "postponed", "awaiting_decision", "in_progress", "half_time", "second_half", "extra_time", "penalties"].includes(m.status)
  ).length;
  const totalGoals = finished.reduce((sum, m) => sum + (m.home_score ?? 0) + (m.away_score ?? 0), 0);
  return {
    playedCount: finished.length,
    remainingCount: remaining,
    totalGoals,
    goalsPerMatch: finished.length > 0 ? Math.round((totalGoals / finished.length) * 100) / 100 : 0,
  };
}
