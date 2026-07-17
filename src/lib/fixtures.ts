/**
 * Otomatik fikstür üretimi (şartname madde 17).
 *
 *  - Round-robin (berger/daire yöntemi): tek veya çift devre, tek sayıda
 *    takımda "bay" desteği.
 *  - Takvim yerleştirme: maç günleri, günlük maç sayısı, ilk maç saati,
 *    maç süresi + dinlenme, çoklu saha, aynı takım için minimum dinlenme.
 *  - Saf fonksiyonlardır; veritabanı bağımlılığı yoktur -> test edilebilir.
 */
import { addDays, weekdayOf } from "./utils";

export interface RoundPair {
  home: string;
  away: string;
}

/**
 * Daire yöntemiyle round-robin turları üretir.
 * Tek sayıda takım varsa görünmez bir "bay" eklenir; bay ile eşleşen takım
 * o hafta maç yapmaz.
 */
export function roundRobinRounds(teamIds: string[], double = false): RoundPair[][] {
  if (teamIds.length < 2) return [];

  const BYE = "__bay__";
  const arr: string[] = [...teamIds];
  if (arr.length % 2 === 1) arr.push(BYE);

  const n = arr.length;
  const roundCount = n - 1;
  const half = n / 2;
  const rounds: RoundPair[][] = [];

  const rotating = [...arr];
  for (let r = 0; r < roundCount; r++) {
    const pairs: RoundPair[] = [];
    for (let i = 0; i < half; i++) {
      const a = rotating[i];
      const b = rotating[n - 1 - i];
      if (a === BYE || b === BYE) continue;
      // Ev/deplasman dengelemesi: tur ve eşleşme sırasına göre değiştir
      if ((r + i) % 2 === 0) pairs.push({ home: a, away: b });
      else pairs.push({ home: b, away: a });
    }
    rounds.push(pairs);
    // İlk eleman sabit kalır, kalanlar saat yönünde döner
    rotating.splice(1, 0, rotating.pop()!);
  }

  if (double) {
    const secondLeg = rounds.map((round) =>
      round.map((p) => ({ home: p.away, away: p.home }))
    );
    rounds.push(...secondLeg);
  }
  return rounds;
}

// ---------------------------------------------------------------------------
// Takvim yerleştirme
// ---------------------------------------------------------------------------

export interface ScheduleOptions {
  /** İlk maç günü (YYYY-MM-DD) */
  startDate: string;
  /** Maç oynanacak hafta günleri (0=Pazar ... 6=Cumartesi) */
  matchDays: number[];
  /** Bir günde oynanacak toplam maç sayısı */
  dailyMatchCount: number;
  /** İlk maç saati "HH:MM" */
  firstMatchTime: string;
  /** Maç süresi (dakika, devre arası dahil) */
  matchDurationMin: number;
  /** Maçlar arası dinlenme (dakika) */
  restBetweenMin: number;
  /** Kullanılacak sahalar (en az 1) */
  venueIds: string[];
  /** Aynı takımın iki maçı arasında en az kaç gün olmalı */
  minTeamRestDays: number;
  /** Çift devre mi? */
  double: boolean;
}

export interface DraftMatch {
  homeTeamId: string;
  awayTeamId: string;
  groupId: string | null;
  weekNumber: number;
  roundName: string;
  matchDate: string;
  startTime: string; // "HH:MM"
  venueId: string;
}

export interface FixtureResult {
  matches: DraftMatch[];
  warnings: string[];
}

interface Slot {
  date: string;
  time: string;
  venueId: string;
  used: boolean;
}

function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Bir günün maç slotlarını üretir (saat x saha kombinasyonu). */
function slotsForDay(date: string, opts: ScheduleOptions): Slot[] {
  const slots: Slot[] = [];
  const start = timeToMinutes(opts.firstMatchTime);
  const step = opts.matchDurationMin + opts.restBetweenMin;
  const venueCount = Math.max(1, opts.venueIds.length);

  for (let s = 0; s < opts.dailyMatchCount; s++) {
    const timeIndex = Math.floor(s / venueCount);
    const venue = opts.venueIds[s % venueCount] ?? opts.venueIds[0];
    slots.push({
      date,
      time: minutesToTime(start + timeIndex * step),
      venueId: venue,
      used: false,
    });
  }
  return slots;
}

/**
 * Gruplara ait round-robin turlarını ortak takvime yerleştirir.
 *
 * Strateji: tüm grupların aynı numaralı turları birleştirilir ve sırayla
 * uygun slotlara atanır. Bir eşleşme; her iki takımın da o gün başka maçı
 * yoksa ve son maçlarının üzerinden minTeamRestDays geçtiyse yerleştirilir.
 */
export function generateFixture(
  groups: Array<{ groupId: string | null; teamIds: string[] }>,
  opts: ScheduleOptions
): FixtureResult {
  const warnings: string[] = [];

  const groupRounds = groups
    .filter((g) => g.teamIds.length >= 2)
    .map((g) => ({
      groupId: g.groupId,
      rounds: roundRobinRounds(g.teamIds, opts.double),
    }));

  if (groupRounds.length === 0) {
    return { matches: [], warnings: ["Fikstür üretmek için en az 2 takımlı bir grup gerekir."] };
  }
  if (opts.matchDays.length === 0) {
    return { matches: [], warnings: ["En az bir maç günü seçmelisiniz."] };
  }
  if (opts.venueIds.length === 0) {
    return { matches: [], warnings: ["En az bir saha seçmelisiniz."] };
  }

  const totalRounds = Math.max(...groupRounds.map((g) => g.rounds.length));

  // Slot üretici: ihtiyaç oldukça yeni günler açılır
  let cursorDate = opts.startDate;
  const slots: Slot[] = [];
  let safetyDays = 0;

  const openMoreSlots = (): boolean => {
    while (safetyDays < 730) {
      const isMatchDay = opts.matchDays.includes(weekdayOf(cursorDate));
      const date = cursorDate;
      cursorDate = addDays(cursorDate, 1);
      safetyDays++;
      if (isMatchDay) {
        slots.push(...slotsForDay(date, opts));
        return true;
      }
    }
    return false;
  };

  const lastPlayed = new Map<string, string>(); // takım -> son maç tarihi
  const playsOnDate = new Set<string>();        // "takım|tarih"
  const matches: DraftMatch[] = [];

  const canPlace = (pair: RoundPair, slot: Slot): boolean => {
    for (const team of [pair.home, pair.away]) {
      if (playsOnDate.has(`${team}|${slot.date}`)) return false;
      const last = lastPlayed.get(team);
      // minTeamRestDays = 1 -> en erken ertesi gün oynayabilir
      if (last && opts.minTeamRestDays > 0 && slot.date < addDays(last, opts.minTeamRestDays)) {
        return false;
      }
    }
    return true;
  };

  for (let r = 0; r < totalRounds; r++) {
    // Bu turun tüm grup eşleşmeleri
    const roundPairs: Array<{ pair: RoundPair; groupId: string | null }> = [];
    for (const g of groupRounds) {
      const round = g.rounds[r];
      if (round) roundPairs.push(...round.map((pair) => ({ pair, groupId: g.groupId })));
    }

    for (const { pair, groupId } of roundPairs) {
      let placed = false;
      let guard = 0;
      while (!placed && guard < 10000) {
        guard++;
        const free = slots.find((s) => !s.used && canPlace(pair, s));
        if (!free) {
          if (!openMoreSlots()) break;
          continue;
        }
        free.used = true;
        placed = true;
        lastPlayed.set(pair.home, free.date);
        lastPlayed.set(pair.away, free.date);
        playsOnDate.add(`${pair.home}|${free.date}`);
        playsOnDate.add(`${pair.away}|${free.date}`);
        matches.push({
          homeTeamId: pair.home,
          awayTeamId: pair.away,
          groupId,
          weekNumber: r + 1,
          roundName: `${r + 1}. Hafta`,
          matchDate: free.date,
          startTime: free.time,
          venueId: free.venueId,
        });
      }
      if (!placed) {
        warnings.push(
          "Bazı maçlar 2 yıllık takvim içine sığmadı. Maç günü veya günlük maç sayısını artırın."
        );
        return { matches, warnings };
      }
    }
  }

  matches.sort((a, b) =>
    a.matchDate === b.matchDate
      ? a.startTime.localeCompare(b.startTime)
      : a.matchDate.localeCompare(b.matchDate)
  );

  return { matches, warnings };
}

// ---------------------------------------------------------------------------
// Eleme aşaması eşleştirme yardımcıları
// ---------------------------------------------------------------------------

export interface KnockoutPair {
  home: string | null;
  away: string | null;
  label: string;
}

/**
 * Grup sıralamasından çapraz eleme eşleşmeleri üretir:
 * A1-B2, B1-A2, C1-D2, D1-C2 ... (şartname madde 28)
 * @param rankings Grup sırasına göre: [[A1, A2], [B1, B2], ...]
 */
export function crossGroupPairs(
  rankings: Array<{ groupName: string; qualifiers: string[] }>
): KnockoutPair[] {
  const pairs: KnockoutPair[] = [];
  for (let i = 0; i + 1 < rankings.length; i += 2) {
    const g1 = rankings[i];
    const g2 = rankings[i + 1];
    pairs.push({
      home: g1.qualifiers[0] ?? null,
      away: g2.qualifiers[1] ?? null,
      label: `${g1.groupName} 1. - ${g2.groupName} 2.`,
    });
    pairs.push({
      home: g2.qualifiers[0] ?? null,
      away: g1.qualifiers[1] ?? null,
      label: `${g2.groupName} 1. - ${g1.groupName} 2.`,
    });
  }
  return pairs;
}

/** Fisher-Yates karıştırması (rastgele eşleşme için) */
export function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
