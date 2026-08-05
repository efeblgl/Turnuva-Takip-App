/**
 * Bu turnuvanın resmi eleme programı — YALNIZCA tarih/saat için bir
 * ÖNİZLEME fallback'idir, takım adı İÇERMEZ (takımlar her zaman Supabase
 * `matches`/`teams`den gelir). Veritabanındaki bir maçın `match_date`/
 * `start_time` alanı doluysa bu tablo hiç devreye girmez; yalnızca panelden
 * henüz tarih girilmemiş (ya da satırı hiç oluşturulmamış) maçlar için
 * "10 Ağustos · 19.00" gibi bilgilendirici bir tarih göstermek içindir.
 * Admin panelde gerçek tarih girildiğinde DB değeri bunun yerini alır.
 */
export interface ScheduleEntry {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
}

/** Global maç numarası (1-16) -> resmi tarih/saat. */
export const OFFICIAL_KNOCKOUT_SCHEDULE: Record<number, ScheduleEntry> = {
  1: { date: "2026-08-05", time: "19:00" },
  2: { date: "2026-08-05", time: "20:00" },
  3: { date: "2026-08-06", time: "19:00" },
  4: { date: "2026-08-06", time: "20:00" },
  5: { date: "2026-08-07", time: "19:00" },
  6: { date: "2026-08-07", time: "20:00" },
  7: { date: "2026-08-08", time: "19:00" },
  8: { date: "2026-08-08", time: "20:00" },
  9: { date: "2026-08-10", time: "19:00" },
  10: { date: "2026-08-10", time: "20:00" },
  11: { date: "2026-08-11", time: "19:00" },
  12: { date: "2026-08-11", time: "20:00" },
  13: { date: "2026-08-12", time: "19:00" },
  14: { date: "2026-08-12", time: "20:00" },
  15: { date: "2026-08-14", time: "19:00" },
  16: { date: "2026-08-15", time: "20:00" },
};

export function officialScheduleFor(globalMatchNumber: number): ScheduleEntry | null {
  return OFFICIAL_KNOCKOUT_SCHEDULE[globalMatchNumber] ?? null;
}
