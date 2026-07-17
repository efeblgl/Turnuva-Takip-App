/**
 * İngilizce kodların Türkçe karşılıkları.
 * Rozet renk sınıfları da burada merkezî olarak tanımlanır.
 */
import type {
  AnnouncementType, CardType, ForfeitType, KnockoutRound, MatchEventType,
  MatchStatus, PlayerPosition, SuspensionType, TeamStatus,
  TournamentFormat, TournamentStatus, UserRole,
} from "./types";

export const TOURNAMENT_STATUS_LABELS: Record<TournamentStatus, string> = {
  preparation: "Hazırlık aşaması",
  registration: "Takım kayıtları devam ediyor",
  fixture_pending: "Fikstür hazırlanıyor",
  fixture_published: "Fikstür yayınlandı",
  group_stage: "Grup aşaması devam ediyor",
  knockout_stage: "Eleme aşaması devam ediyor",
  final_stage: "Final aşaması",
  completed: "Turnuva tamamlandı",
  postponed: "Turnuva ertelendi",
  cancelled: "Turnuva iptal edildi",
};

export const TOURNAMENT_FORMAT_LABELS: Record<TournamentFormat, string> = {
  single_league: "Tek devre lig",
  double_league: "Çift devre lig",
  group_stage_only: "Grup aşaması",
  group_knockout: "Grup + eleme",
  knockout_only: "Direkt eleme",
};

export const TEAM_STATUS_LABELS: Record<TeamStatus, string> = {
  active: "Aktif",
  passive: "Pasif",
  pending: "Kayıt bekliyor",
  withdrawn: "Turnuvadan çekildi",
  disqualified: "İhraç edildi",
  eliminated: "Elendi",
  champion: "Şampiyon",
};

export const TEAM_STATUS_BADGE: Record<TeamStatus, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  passive: "bg-gray-100 text-gray-600 border-gray-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  withdrawn: "bg-orange-50 text-orange-700 border-orange-200",
  disqualified: "bg-red-50 text-red-700 border-red-200",
  eliminated: "bg-gray-100 text-gray-500 border-gray-200",
  champion: "bg-yellow-50 text-yellow-700 border-yellow-300",
};

export const POSITION_LABELS: Record<PlayerPosition, string> = {
  goalkeeper: "Kaleci",
  defender: "Defans",
  midfielder: "Orta saha",
  forward: "Forvet",
  unspecified: "Belirtilmedi",
};

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  scheduled: "Planlandı",
  in_progress: "Başladı",
  half_time: "Devre arası",
  second_half: "İkinci yarı",
  extra_time: "Uzatma",
  penalties: "Penaltılar",
  completed: "Tamamlandı",
  postponed: "Ertelendi",
  cancelled: "İptal edildi",
  forfeited: "Hükmen",
  abandoned: "Yarıda kaldı",
  awaiting_decision: "Karar bekleniyor",
};

export const MATCH_STATUS_BADGE: Record<MatchStatus, string> = {
  scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-emerald-50 text-emerald-700 border-emerald-200",
  half_time: "bg-emerald-50 text-emerald-700 border-emerald-200",
  second_half: "bg-emerald-50 text-emerald-700 border-emerald-200",
  extra_time: "bg-emerald-50 text-emerald-700 border-emerald-200",
  penalties: "bg-emerald-50 text-emerald-700 border-emerald-200",
  completed: "bg-gray-100 text-gray-700 border-gray-200",
  postponed: "bg-amber-50 text-amber-700 border-amber-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  forfeited: "bg-purple-50 text-purple-700 border-purple-200",
  abandoned: "bg-orange-50 text-orange-700 border-orange-200",
  awaiting_decision: "bg-amber-50 text-amber-700 border-amber-200",
};

/** Maç oynanıyor mu? (canlı rozeti için) */
export const LIVE_STATUSES: MatchStatus[] = [
  "in_progress", "half_time", "second_half", "extra_time", "penalties",
];

/** Sonuç doğuran durumlar (puan durumuna sayılır) */
export const FINISHED_STATUSES: MatchStatus[] = ["completed", "forfeited"];

export const KNOCKOUT_ROUND_LABELS: Record<KnockoutRound, string> = {
  round_of_32: "Son 32",
  round_of_16: "Son 16",
  quarter_final: "Çeyrek Final",
  semi_final: "Yarı Final",
  third_place: "Üçüncülük Maçı",
  final: "Final",
};

export const KNOCKOUT_ROUND_ORDER: KnockoutRound[] = [
  "round_of_32", "round_of_16", "quarter_final", "semi_final", "third_place", "final",
];

export const FORFEIT_TYPE_LABELS: Record<ForfeitType, string> = {
  home_win: "Ev sahibi hükmen galip",
  away_win: "Deplasman hükmen galip",
  both_lose: "İki takım hükmen mağlup",
  cancelled: "Maç iptal",
  admin_decision: "Yönetim kararıyla belirlendi",
};

export const EVENT_TYPE_LABELS: Record<MatchEventType, string> = {
  goal: "Gol",
  own_goal: "Kendi kalesine gol",
  penalty_goal: "Penaltı golü",
  missed_penalty: "Kaçan penaltı",
  yellow_card: "Sarı kart",
  second_yellow: "İkinci sarıdan kırmızı",
  red_card: "Kırmızı kart",
  substitution: "Oyuncu değişikliği",
  injury: "Sakatlık",
  match_start: "Maç başladı",
  half_time: "İlk yarı sonu",
  second_half_start: "İkinci yarı başladı",
  match_end: "Maç sona erdi",
  extra_time_start: "Uzatma başladı",
  penalty_shootout: "Penaltı serisi",
};

/** Skor girişi ekranında seçilebilen oyuncu olayları */
export const PLAYER_EVENT_TYPES: MatchEventType[] = [
  "goal", "own_goal", "penalty_goal", "missed_penalty",
  "yellow_card", "second_yellow", "red_card", "substitution", "injury",
];

export const GOAL_EVENT_TYPES: MatchEventType[] = ["goal", "own_goal", "penalty_goal"];
export const CARD_EVENT_TYPES: MatchEventType[] = ["yellow_card", "second_yellow", "red_card"];

export const CARD_TYPE_LABELS: Record<CardType, string> = {
  yellow: "Sarı kart",
  second_yellow: "İkinci sarıdan kırmızı",
  red: "Kırmızı kart",
};

export const SUSPENSION_TYPE_LABELS: Record<SuspensionType, string> = {
  one_match: "Bir maç ceza",
  multi_match: "Birden fazla maç ceza",
  until_date: "Belirli tarihe kadar ceza",
  tournament_ban: "Turnuvadan ihraç",
  team_penalty: "Takım cezası",
  point_deduction: "Puan silme",
  fine_record: "Para cezası (kayıt)",
  warning: "Uyarı",
};

export const ANNOUNCEMENT_TYPE_LABELS: Record<AnnouncementType, string> = {
  general: "Genel duyuru",
  fixture: "Fikstür duyurusu",
  postponement: "Maç erteleme",
  time_change: "Saat değişikliği",
  venue_change: "Saha değişikliği",
  discipline: "Disiplin kararı",
  final_program: "Final programı",
  award_ceremony: "Ödül töreni",
  urgent: "Acil duyuru",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Süper yönetici",
  tournament_admin: "Turnuva yöneticisi",
  score_officer: "Skor görevlisi",
  content_editor: "İçerik editörü",
  viewer: "Görüntüleyici",
};

export const WEEKDAY_LABELS = [
  "Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi",
];
