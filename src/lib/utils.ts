/**
 * Genel yardımcılar: tarih/saat biçimleme (Türkiye saati), renk kontrastı,
 * Türkçe karakter destekli arama/sıralama, slug üretimi.
 */

/** Sınıf adlarını birleştirir (clsx'in küçük hali) */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

const TZ = "Europe/Istanbul";

/** "2026-07-20" -> "20 Temmuz 2026" */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(`${date.slice(0, 10)}T12:00:00+03:00`) : date;
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric", month: "long", year: "numeric", timeZone: TZ,
  }).format(d);
}

/** "2026-07-20" -> "20 Tem, Pzt" gibi kısa biçim */
export function formatDateShort(date: string | null | undefined): string {
  if (!date) return "-";
  const d = new Date(`${date.slice(0, 10)}T12:00:00+03:00`);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric", month: "short", weekday: "short", timeZone: TZ,
  }).format(d);
}

/** "18:30:00" -> "18.30" */
export function formatTime(time: string | null | undefined): string {
  if (!time) return "-";
  const m = time.match(/^(\d{2}):(\d{2})/);
  return m ? `${m[1]}.${m[2]}` : time;
}

/** ISO timestamp -> "20 Temmuz 2026 18.30" */
export function formatDateTime(ts: string | null | undefined): string {
  if (!ts) return "-";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "-";
  const date = new Intl.DateTimeFormat("tr-TR", {
    day: "numeric", month: "long", year: "numeric", timeZone: TZ,
  }).format(d);
  const time = new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ,
  }).format(d).replace(":", ".");
  return `${date} ${time}`;
}

/** Türkiye saatine göre bugünün tarihi: "2026-07-17" */
export function todayInTurkey(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit", timeZone: TZ,
  }).format(new Date());
  return parts; // en-CA formatı YYYY-MM-DD üretir
}

/** Türkiye saatine göre şu anki saat: "19:05" */
export function nowTimeInTurkey(): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: TZ,
  }).format(new Date());
}

/** "19:00" + 110 -> "20:50" (gün sonunu aşarsa 23:59'da durur) */
export function addMinutesToTime(time: string, minutes: number): string {
  const m = time.match(/^(\d{2}):(\d{2})/);
  if (!m) return time;
  const total = Math.min(Number(m[1]) * 60 + Number(m[2]) + minutes, 23 * 60 + 59);
  const h = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${h}:${mm}`;
}

/** Tarihe gün ekle: addDays("2026-07-17", 3) -> "2026-07-20" */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Tarihin haftanın hangi günü olduğu (0=Pazar ... 6=Cumartesi) */
export function weekdayOf(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

// ---------------------------------------------------------------------------
// Renk yardımcıları
// ---------------------------------------------------------------------------

/** #RRGGBB geçerli mi? */
export function isValidHex(color: string | null | undefined): color is string {
  return typeof color === "string" && /^#[0-9a-fA-F]{6}$/.test(color);
}

/** Rölatif parlaklık (0 koyu - 1 açık) */
function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

/**
 * Arka plan rengine göre okunabilir metin rengi seçer.
 * Çok açık zeminde koyu, koyu zeminde açık metin (erişilebilirlik).
 */
export function readableTextOn(bg: string | null | undefined): string {
  if (!isValidHex(bg)) return "#111827";
  return luminance(bg) > 0.45 ? "#111827" : "#FFFFFF";
}

/** Takım ana rengi (yoksa varsayılan gri) */
export function teamColor(color: string | null | undefined): string {
  return isValidHex(color) ? color : "#64748B";
}

// ---------------------------------------------------------------------------
// Türkçe metin yardımcıları
// ---------------------------------------------------------------------------

const collator = new Intl.Collator("tr", { sensitivity: "base" });

/** Türkçe alfabeye göre karşılaştırma (sıralama için) */
export function compareTr(a: string, b: string): number {
  return collator.compare(a, b);
}

/** Türkçe duyarlı küçük harfe çevirme (İ->i, I->ı) */
export function lowerTr(s: string): string {
  return s.toLocaleLowerCase("tr");
}

/** Arama eşleşmesi: büyük/küçük harf ve Türkçe karakter duyarlı değil */
export function matchesSearch(text: string | null | undefined, query: string): boolean {
  if (!query.trim()) return true;
  if (!text) return false;
  return lowerTr(text).includes(lowerTr(query.trim()));
}

/** Başlıktan URL dostu slug üretir: "2. Hafta Programı" -> "2-hafta-programi" */
export function slugifyTr(text: string): string {
  const map: Record<string, string> = {
    ç: "c", Ç: "c", ğ: "g", Ğ: "g", ı: "i", I: "i", İ: "i",
    ö: "o", Ö: "o", ş: "s", Ş: "s", ü: "u", Ü: "u",
  };
  return text
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "duyuru";
}

/** Sayıyı okunur hale getirir (1234 -> "1.234") */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat("tr-TR").format(n);
}

/** Dizi elemanlarını anahtara göre gruplar */
export function groupBy<T, K extends string | number>(
  items: T[],
  key: (item: T) => K
): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return map;
}
