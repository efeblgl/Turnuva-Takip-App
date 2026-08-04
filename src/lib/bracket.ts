/**
 * 16 takımlı Son 16 -> Final eleme ağacı için saf yardımcı fonksiyonlar.
 *
 * Şema değişikliği YAPILMAZ: sol/sağ taraf, mevcut `knockout_round` +
 * `bracket_position` alanlarından türetilir (bkz. lib/actions/matches.ts
 * generateKnockoutAction). Son 16'da 1-4 sol, 5-8 sağ; Çeyrek Final'de 1-2
 * sol, 3-4 sağ; Yarı Final'de 1 sol, 2 sağ; Final tektir. Bu numaralandırma
 * generateKnockoutAction'daki next_match_id eşlemesiyle birebir örtüşür.
 *
 * Kazanan belirleme burada YALNIZCA arayüz gösterimi (vurgu, şampiyon alanı)
 * içindir; gerçek tur ilerletme veritabanında save_match_result RPC'si
 * tarafından atomik biçimde yapılır (supabase/migrations/0003). Bu dosya
 * o RPC'deki eşitlik-bozma kurallarını bilinçli olarak birebir yansıtır.
 */
import { logger } from "./logger";
import { LIVE_STATUSES, MATCH_STATUS_BADGE, MATCH_STATUS_LABELS } from "./labels";
import type { Match, Tournament } from "./types";

export type BracketSide = "left" | "right";

/** Bu bileşenin kapsadığı dört tur (Son 32 ve Üçüncülük ayrı ele alınır). */
export const BRACKET_ROUNDS = ["round_of_16", "quarter_final", "semi_final", "final"] as const;
export type BracketRound = (typeof BRACKET_ROUNDS)[number];

const SIDE_COUNTS: Record<Exclude<BracketRound, "final">, number> = {
  round_of_16: 4,
  quarter_final: 2,
  semi_final: 1,
};

export interface BracketCell {
  /** Taraf içindeki sıra (0 tabanlı): Son 16 0-3, Çeyrek Final 0-1, Yarı Final 0. */
  slot: number;
  /** Veritabanında henüz oluşturulmamışsa null (yer tutucu olarak gösterilir). */
  match: Match | null;
}

export interface BracketSideData {
  roundOf16: BracketCell[];
  quarterFinals: BracketCell[];
  semiFinal: BracketCell;
}

export interface KnockoutBracketData {
  left: BracketSideData;
  right: BracketSideData;
  final: BracketCell;
  /** Son 16 - Final arasında en az bir maç kaydı var mı? */
  hasAnyMatch: boolean;
}

function isBracketRound(round: string): round is BracketRound {
  return (BRACKET_ROUNDS as readonly string[]).includes(round);
}

/** placementOf'un tersi: arayüzde yer tutucu maç numarası göstermek için. */
export function bracketPositionOf(
  round: Exclude<BracketRound, "final">,
  side: BracketSide,
  slot: number
): number {
  const perSide = SIDE_COUNTS[round];
  return (side === "left" ? slot : perSide + slot) + 1;
}

function emptySide(): BracketSideData {
  return {
    roundOf16: Array.from({ length: 4 }, (_, i) => ({ slot: i, match: null })),
    quarterFinals: Array.from({ length: 2 }, (_, i) => ({ slot: i, match: null })),
    semiFinal: { slot: 0, match: null },
  };
}

/** bracket_position -> { side, slot }. Geçersiz/eksik pozisyonda null döner. */
function placementOf(
  round: Exclude<BracketRound, "final">,
  position: number | null
): { side: BracketSide; slot: number } | null {
  if (position === null || !Number.isInteger(position)) return null;
  const perSide = SIDE_COUNTS[round];
  const index = position - 1; // 1 tabanlıdan 0 tabanlıya
  if (index < 0 || index >= perSide * 2) return null;
  return index < perSide ? { side: "left", slot: index } : { side: "right", slot: index - perSide };
}

/**
 * Maç listesinden Son 16 -> Final ağacını kurar. Eksik maçlar için yer
 * tutucu hücre bırakır; aynı konumda birden fazla kayıt varsa ilkini
 * kullanıp durumu loglar (arayüzü kırılgan hale getirmez).
 */
export function buildKnockoutBracket(matches: Match[]): KnockoutBracketData {
  const left = emptySide();
  const right = emptySide();
  const finalCell: BracketCell = { slot: 0, match: null };
  const occupied = new Set<string>();
  let hasAnyMatch = false;
  let finalSeen = false;

  for (const match of matches) {
    if (match.stage !== "knockout") continue;
    const round = match.knockout_round;
    if (!round || !isBracketRound(round)) continue;
    hasAnyMatch = true;

    if (round === "final") {
      if (finalSeen) {
        logger.warn("bracket", "Birden fazla final maçı bulundu, ilki kullanılıyor.", { matchId: match.id });
        continue;
      }
      finalSeen = true;
      finalCell.match = match;
      continue;
    }

    const placement = placementOf(round, match.bracket_position);
    if (!placement) {
      logger.warn("bracket", "Maçın bracket_position değeri geçersiz veya eksik.", {
        matchId: match.id, round, bracket_position: match.bracket_position,
      });
      continue;
    }

    const key = `${round}:${placement.side}:${placement.slot}`;
    if (occupied.has(key)) {
      logger.warn("bracket", "Aynı bracket konumunda birden fazla maç bulundu, ilki kullanılıyor.", {
        matchId: match.id, key,
      });
      continue;
    }
    occupied.add(key);

    const sideData = placement.side === "left" ? left : right;
    const list =
      round === "round_of_16" ? sideData.roundOf16
      : round === "quarter_final" ? sideData.quarterFinals
      : null;
    if (list) list[placement.slot] = { slot: placement.slot, match };
    else sideData.semiFinal = { slot: 0, match };
  }

  return { left, right, final: finalCell, hasAnyMatch };
}

/** Bu bileşenin kapsamadığı diğer eleme maçları (Son 32, Üçüncülük). */
export function otherKnockoutMatches(matches: Match[]): Match[] {
  return matches.filter(
    (m) => m.stage === "knockout" && !!m.knockout_round && !(BRACKET_ROUNDS as readonly string[]).includes(m.knockout_round)
  );
}

// ---------------------------------------------------------------------------
// Kazanan belirleme (yalnızca arayüz gösterimi için)
// ---------------------------------------------------------------------------

export type WinnerSlot = "home" | "away";

/**
 * Bir maçın kazanan tarafını belirler. supabase/migrations/0003_functions_
 * triggers.sql içindeki save_match_result fonksiyonunun eşitlik-bozma
 * mantığıyla BİREBİR aynıdır; burada yalnızca arayüzde vurgu/şampiyon
 * göstermek için kullanılır, veritabanı yazımı yapmaz.
 */
export function determineMatchWinner(
  match: Pick<Match, "status" | "home_score" | "away_score" | "home_penalty_score" | "away_penalty_score">
): WinnerSlot | null {
  if (match.status !== "completed" && match.status !== "forfeited") return null;
  if (match.home_score === null || match.away_score === null) return null;
  if (match.home_score > match.away_score) return "home";
  if (match.away_score > match.home_score) return "away";
  if (match.home_penalty_score !== null && match.away_penalty_score !== null) {
    if (match.home_penalty_score > match.away_penalty_score) return "home";
    if (match.away_penalty_score > match.home_penalty_score) return "away";
  }
  return null;
}

export function winnerTeamId(match: Match): string | null {
  const slot = determineMatchWinner(match);
  if (!slot) return null;
  return slot === "home" ? match.home_team_id : match.away_team_id;
}

/**
 * Şampiyon alanı başlığı ("2026 Şampiyonu" gibi); yıl hard-code edilmez,
 * turnuvanın season veya end_date alanından türetilir.
 */
export function championTitleFor(tournament: Pick<Tournament, "season" | "end_date"> | null): string {
  if (tournament?.season) return `${tournament.season} Şampiyonu`;
  if (tournament?.end_date) return `${tournament.end_date.slice(0, 4)} Şampiyonu`;
  return "Şampiyon";
}

// ---------------------------------------------------------------------------
// Durum gösterimi (tek normalizasyon noktası)
// ---------------------------------------------------------------------------

export interface BracketStatusMeta {
  isLive: boolean;
  /** Kart üstü rozet metni ("LIVE" veya Türkçe durum adı). */
  badgeLabel: string;
  badgeClassName: string;
  /** Canlıyken ek nüans (ör. "Devre arası"); değilse null. */
  liveNuance: string | null;
}

const LIVE_BADGE_CLASS = "border-red-600 bg-red-600 text-white";

/**
 * Maç durumunu bracket kartı için tek noktadan normalize eder.
 * Etiket/renk kaynağı lib/labels.ts'teki MATCH_STATUS_* haritalarıdır;
 * burada yalnızca LIVE_STATUSES için kırmızı "LIVE" rozetine çevrilir.
 */
export function bracketStatusMeta(match: Pick<Match, "status">): BracketStatusMeta {
  const isLive = LIVE_STATUSES.includes(match.status);
  if (isLive) {
    const nuance = match.status === "in_progress" ? null : MATCH_STATUS_LABELS[match.status];
    return { isLive: true, badgeLabel: "LIVE", badgeClassName: LIVE_BADGE_CLASS, liveNuance: nuance };
  }
  return {
    isLive: false,
    badgeLabel: MATCH_STATUS_LABELS[match.status],
    badgeClassName: MATCH_STATUS_BADGE[match.status],
    liveNuance: null,
  };
}
