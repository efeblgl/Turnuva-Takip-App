/**
 * Canlı maç tespiti.
 * Bir maç iki durumda "canlı" sayılır:
 *   1) Skor görevlisi maç durumunu canlı bir duruma çekmişse (Başladı, Devre
 *      arası, İkinci yarı, Uzatma, Penaltılar)
 *   2) Maç hâlâ "Planlandı" olsa bile maç saati gelmişse (görevli girişi
 *      gecikse de site maçı canlı gösterir)
 * Saate dayalı canlılık, aynı sahadaki bir sonraki maçın saati gelince biter:
 * 20.00-21.00 maçı, 21.00 maçının saati gelince ana ekrandan düşer ve yerini
 * sıradaki maça bırakır.
 */
import { LIVE_STATUSES } from "./labels";
import { addMinutesToTime, nowTimeInTurkey, todayInTurkey } from "./utils";
import type { Match } from "./types";

/** Sonraki maç yoksa maç saatinden itibaren canlı kabul edilen süre (dk). */
export const LIVE_WINDOW_MINUTES = 110;

export function isMatchLiveNow(
  match: Pick<Match, "status" | "match_date" | "start_time">,
  today: string = todayInTurkey(),
  now: string = nowTimeInTurkey()
): boolean {
  if ((LIVE_STATUSES as string[]).includes(match.status)) {
    // Görevli maçı bitirmeyi unutmuşsa geçmiş tarihli maç canlı sayılmaz
    return !match.match_date || match.match_date === today;
  }
  if (match.status !== "scheduled" || !match.match_date || !match.start_time) return false;
  const start = match.start_time.slice(0, 5);
  return match.match_date === today && start <= now && now <= addMinutesToTime(start, LIVE_WINDOW_MINUTES);
}

type LiveCandidate = Pick<Match, "id" | "status" | "match_date" | "start_time" | "venue_id">;

/**
 * Ana ekranda "şu an canlı" gösterilecek maçları seçer.
 * Saate dayalı canlı sayılan bir maç, aynı gün ve aynı sahadaki daha geç
 * saatli bir maçın saati geldiyse listeden düşer (maç süresi bitti kabul
 * edilir); durumu görevli tarafından canlıya çekilmiş maçlar her zaman kalır.
 */
export function selectLiveMatches<T extends LiveCandidate>(
  matches: T[],
  today: string = todayInTurkey(),
  now: string = nowTimeInTurkey()
): T[] {
  return matches.filter((m) => {
    if ((LIVE_STATUSES as string[]).includes(m.status)) return isMatchLiveNow(m, today, now);
    if (!isMatchLiveNow(m, today, now)) return false;
    const start = m.start_time!.slice(0, 5);
    // Aynı sahada saati gelmiş daha geç bir maç varsa bu maçın penceresi kapanır
    const superseded = matches.some((o) => {
      if (o.id === m.id || !o.start_time || o.match_date !== m.match_date) return false;
      if (["cancelled", "postponed"].includes(o.status)) return false;
      if ((o.venue_id ?? null) !== (m.venue_id ?? null)) return false;
      const oStart = o.start_time.slice(0, 5);
      return oStart > start && oStart <= now;
    });
    return !superseded;
  });
}
