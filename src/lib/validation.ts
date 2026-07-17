/**
 * Merkezî form doğrulama şemaları (şartname madde 42).
 * Tüm hata mesajları Türkçedir. Server Action'lar bu şemaları kullanır.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Ortak parçalar
// ---------------------------------------------------------------------------

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Geçerli bir renk kodu girin (örn. #F97316).");

const optionalHexColor = z
  .union([hexColor, z.literal("")])
  .transform((v) => (v === "" ? null : v));

const optionalText = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v));

const optionalDate = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Geçerli bir tarih girin."), z.literal("")])
  .transform((v) => (v === "" ? null : v));

const requiredDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Tarih boş bırakılamaz.");

const optionalTime = z
  .union([z.string().regex(/^\d{2}:\d{2}/, "Geçerli bir saat girin."), z.literal("")])
  .transform((v) => (v === "" ? null : v.slice(0, 5)));

const optionalInt = (min: number, max: number, message: string) =>
  z
    .union([z.literal(""), z.coerce.number().int(message).min(min, message).max(max, message)])
    .transform((v) => (v === "" ? null : v));

const uuid = z.string().uuid("Geçersiz kayıt.");
const optionalUuid = z
  .union([uuid, z.literal("")])
  .transform((v) => (v === "" ? null : v));

// ---------------------------------------------------------------------------
// Turnuva
// ---------------------------------------------------------------------------

export const tournamentSchema = z.object({
  name: z.string().trim().min(3, "Turnuva adı en az 3 karakter olmalıdır."),
  short_name: optionalText,
  season: optionalText,
  description: optionalText,
  location: optionalText,
  start_date: optionalDate,
  end_date: optionalDate,
  status: z.enum(
    ["preparation", "registration", "fixture_pending", "fixture_published",
     "group_stage", "knockout_stage", "final_stage", "completed", "postponed", "cancelled"],
    "Geçerli bir turnuva durumu seçin."
  ),
  format: z.enum(
    ["single_league", "double_league", "group_stage_only", "group_knockout", "knockout_only"],
    "Geçerli bir turnuva formatı seçin."
  ),
  win_points: z.coerce.number().int().min(0, "Puan negatif olamaz.").max(10),
  draw_points: z.coerce.number().int().min(0, "Puan negatif olamaz.").max(10),
  loss_points: z.coerce.number().int().min(0, "Puan negatif olamaz.").max(10),
  forfeit_home_score: z.coerce.number().int().min(0, "Skor negatif olamaz.").max(20),
  forfeit_away_score: z.coerce.number().int().min(0, "Skor negatif olamaz.").max(20),
  is_public: z.coerce.boolean(),
});

// ---------------------------------------------------------------------------
// Takım
// ---------------------------------------------------------------------------

export const teamSchema = z.object({
  name: z.string().trim().min(2, "Takım adı en az 2 karakter olmalıdır."),
  short_name: optionalText,
  code: z
    .union([z.string().trim().regex(/^[A-Za-zÇĞİÖŞÜçğıöşü0-9]{2,5}$/, "Kod 2-5 karakter olmalıdır."), z.literal("")])
    .transform((v) => (v === "" ? null : v.toLocaleUpperCase("tr"))),
  group_id: optionalUuid,
  primary_color: optionalHexColor,
  secondary_color: optionalHexColor,
  text_color: optionalHexColor,
  kit_primary_color: optionalHexColor,
  kit_secondary_color: optionalHexColor,
  goalkeeper_color: optionalHexColor,
  neighborhood: optionalText,
  founded_year: optionalInt(1900, 2100, "Geçerli bir kuruluş yılı girin."),
  description: optionalText,
  manager_name: optionalText,
  manager_phone: z
    .union([z.string().trim().regex(/^[0-9+() \-]{7,20}$/, "Geçerli bir telefon numarası girin."), z.literal("")])
    .transform((v) => (v === "" ? null : v)),
  coach_name: optionalText,
  status: z.enum(
    ["active", "passive", "pending", "withdrawn", "disqualified", "eliminated", "champion"],
    "Geçerli bir takım durumu seçin."
  ),
});

// ---------------------------------------------------------------------------
// Oyuncu
// ---------------------------------------------------------------------------

export const playerSchema = z.object({
  team_id: uuid,
  first_name: z.string().trim().min(2, "Ad en az 2 karakter olmalıdır."),
  last_name: z.string().trim().min(2, "Soyad en az 2 karakter olmalıdır."),
  shirt_number: optionalInt(1, 99, "Forma numarası 1-99 arasında olmalıdır."),
  position: z.enum(
    ["goalkeeper", "defender", "midfielder", "forward", "unspecified"],
    "Geçerli bir pozisyon seçin."
  ),
  birth_year: optionalInt(1940, 2020, "Geçerli bir doğum yılı girin."),
  is_captain: z.coerce.boolean(),
  is_goalkeeper: z.coerce.boolean(),
  is_active: z.coerce.boolean(),
  notes: optionalText,
});

// ---------------------------------------------------------------------------
// Grup
// ---------------------------------------------------------------------------

export const groupSchema = z.object({
  name: z.string().trim().min(1, "Grup adı zorunludur."),
  short_name: optionalText,
  color: optionalHexColor,
  qualification_count: z.coerce.number().int().min(0, "Negatif olamaz.").max(10),
  sort_order: z.coerce.number().int().min(0).max(100),
});

// ---------------------------------------------------------------------------
// Saha
// ---------------------------------------------------------------------------

export const venueSchema = z.object({
  name: z.string().trim().min(2, "Saha adı en az 2 karakter olmalıdır."),
  address: optionalText,
  map_url: z
    .union([z.string().trim().url("Geçerli bir bağlantı girin."), z.literal("")])
    .transform((v) => (v === "" ? null : v)),
  capacity: optionalInt(0, 100000, "Geçerli bir kapasite girin."),
  description: optionalText,
  is_active: z.coerce.boolean(),
});

// ---------------------------------------------------------------------------
// Maç
// ---------------------------------------------------------------------------

export const matchSchema = z
  .object({
    group_id: optionalUuid,
    venue_id: optionalUuid,
    // Eleme maçlarında takımlar sonradan belli olabilir
    home_team_id: optionalUuid,
    away_team_id: optionalUuid,
    match_date: requiredDate,
    start_time: z.string().regex(/^\d{2}:\d{2}/, "Maç saati zorunludur."),
    week_number: optionalInt(1, 99, "Geçerli bir hafta numarası girin."),
    round_name: optionalText,
    referee_name: optionalText,
    assistant_referees: optionalText,
    notes: optionalText,
    is_published: z.coerce.boolean(),
  })
  .refine(
    (data) =>
      data.home_team_id === null ||
      data.away_team_id === null ||
      data.home_team_id !== data.away_team_id,
    {
      message: "Ev sahibi ve deplasman takımı aynı olamaz.",
      path: ["away_team_id"],
    }
  );

// Skor girişi
export const scoreEventSchema = z.object({
  team_id: optionalUuid,
  player_id: optionalUuid,
  secondary_player_id: optionalUuid,
  event_type: z.enum(
    ["goal", "own_goal", "penalty_goal", "missed_penalty",
     "yellow_card", "second_yellow", "red_card", "substitution", "injury"],
    "Geçerli bir olay türü seçin."
  ),
  minute: optionalInt(0, 130, "Dakika 0-130 arasında olmalıdır."),
  extra_minute: optionalInt(0, 30, "Uzatma dakikası 0-30 arasında olmalıdır."),
  description: optionalText,
});

export const scoreEntrySchema = z
  .object({
    home_score: z.coerce.number({ error: "Skor girilmelidir." }).int("Skor tam sayı olmalıdır.").min(0, "Skor negatif olamaz.").max(99),
    away_score: z.coerce.number({ error: "Skor girilmelidir." }).int("Skor tam sayı olmalıdır.").min(0, "Skor negatif olamaz.").max(99),
    home_penalty_score: optionalInt(0, 99, "Penaltı skoru negatif olamaz."),
    away_penalty_score: optionalInt(0, 99, "Penaltı skoru negatif olamaz."),
    status: z.enum(
      ["in_progress", "half_time", "second_half", "extra_time", "penalties",
       "completed", "forfeited", "abandoned", "awaiting_decision"],
      "Geçerli bir maç durumu seçin."
    ),
    referee_name: optionalText,
    assistant_referees: optionalText,
    notes: optionalText,
    events: z.array(scoreEventSchema).default([]),
  })
  .refine(
    (d) =>
      (d.home_penalty_score === null && d.away_penalty_score === null) ||
      d.status === "penalties" || d.status === "completed" || d.status === "forfeited",
    { message: "Penaltı skoru yalnızca uygun maç durumunda girilebilir.", path: ["home_penalty_score"] }
  );

// ---------------------------------------------------------------------------
// Duyuru
// ---------------------------------------------------------------------------

export const announcementSchema = z.object({
  title: z.string().trim().min(3, "Başlık en az 3 karakter olmalıdır."),
  summary: optionalText,
  content: optionalText,
  announcement_type: z.enum(
    ["general", "fixture", "postponement", "time_change", "venue_change",
     "discipline", "final_program", "award_ceremony", "urgent"],
    "Geçerli bir duyuru türü seçin."
  ),
  is_important: z.coerce.boolean(),
  is_published: z.coerce.boolean(),
  publish_date: optionalDate,
  expire_date: optionalDate,
});

// ---------------------------------------------------------------------------
// Ceza
// ---------------------------------------------------------------------------

export const suspensionSchema = z
  .object({
    team_id: optionalUuid,
    player_id: optionalUuid,
    suspension_type: z.enum(
      ["one_match", "multi_match", "until_date", "tournament_ban",
       "team_penalty", "point_deduction", "fine_record", "warning"],
      "Geçerli bir ceza türü seçin."
    ),
    reason: optionalText,
    start_date: optionalDate,
    end_date: optionalDate,
    total_matches: optionalInt(0, 99, "Geçerli bir maç sayısı girin."),
    penalty_points: optionalInt(0, 99, "Geçerli bir puan girin."),
    decision_date: optionalDate,
    notes: optionalText,
    is_active: z.coerce.boolean(),
  })
  .refine((d) => d.team_id !== null || d.player_id !== null, {
    message: "Oyuncu veya takım seçilmelidir.",
    path: ["player_id"],
  });

// ---------------------------------------------------------------------------
// Kullanıcı
// ---------------------------------------------------------------------------

export const userSchema = z.object({
  email: z.string().trim().email("Geçerli bir e-posta adresi girin."),
  full_name: optionalText,
  role: z.enum(
    ["super_admin", "tournament_admin", "score_officer", "content_editor", "viewer"],
    "Geçerli bir rol seçin."
  ),
  is_active: z.coerce.boolean(),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Geçerli bir e-posta adresi girin."),
  password: z.string().min(6, "Şifre en az 6 karakter olmalıdır."),
});

// ---------------------------------------------------------------------------
// Erteleme
// ---------------------------------------------------------------------------

export const postponeSchema = z.object({
  new_date: optionalDate,
  new_time: optionalTime,
  reason: z.string().trim().min(3, "Erteleme sebebi yazılmalıdır."),
  create_announcement: z.coerce.boolean(),
});

// ---------------------------------------------------------------------------
// FormData -> düz nesne yardımcıları
// ---------------------------------------------------------------------------

/** Checkbox alanları: FormData'da yoksa "false" kabul edilir. */
export function formToObject(
  formData: FormData,
  booleanFields: string[] = []
): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("$")) continue; // next.js internal
    obj[key] = value;
  }
  for (const field of booleanFields) {
    obj[field] = formData.get(field) === "on" || formData.get(field) === "true";
  }
  return obj;
}

/** Zod hatalarını { alan: mesaj } yapısına çevirir. */
export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
