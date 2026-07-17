/**
 * Veritabanı satır tipleri ve enum birlikleri.
 * Kodlar İngilizce saklanır; Türkçe karşılıklar lib/labels.ts içindedir.
 */

export type TournamentStatus =
  | "preparation" | "registration" | "fixture_pending" | "fixture_published"
  | "group_stage" | "knockout_stage" | "final_stage" | "completed"
  | "postponed" | "cancelled";

export type TournamentFormat =
  | "single_league" | "double_league" | "group_stage_only"
  | "group_knockout" | "knockout_only";

export type TeamStatus =
  | "active" | "passive" | "pending" | "withdrawn"
  | "disqualified" | "eliminated" | "champion";

export type PlayerPosition =
  | "goalkeeper" | "defender" | "midfielder" | "forward" | "unspecified";

export type MatchStatus =
  | "scheduled" | "in_progress" | "half_time" | "second_half" | "extra_time"
  | "penalties" | "completed" | "postponed" | "cancelled" | "forfeited"
  | "abandoned" | "awaiting_decision";

export type MatchStage = "group" | "knockout";

export type KnockoutRound =
  | "round_of_32" | "round_of_16" | "quarter_final" | "semi_final"
  | "third_place" | "final";

export type ForfeitType =
  | "home_win" | "away_win" | "both_lose" | "cancelled" | "admin_decision";

export type MatchEventType =
  | "goal" | "own_goal" | "penalty_goal" | "missed_penalty"
  | "yellow_card" | "second_yellow" | "red_card"
  | "substitution" | "injury"
  | "match_start" | "half_time" | "second_half_start" | "match_end"
  | "extra_time_start" | "penalty_shootout";

export type CardType = "yellow" | "second_yellow" | "red";

export type SuspensionType =
  | "one_match" | "multi_match" | "until_date" | "tournament_ban"
  | "team_penalty" | "point_deduction" | "fine_record" | "warning";

export type AnnouncementType =
  | "general" | "fixture" | "postponement" | "time_change" | "venue_change"
  | "discipline" | "final_program" | "award_ceremony" | "urgent";

export type UserRole =
  | "super_admin" | "tournament_admin" | "score_officer"
  | "content_editor" | "viewer";

// ---------------------------------------------------------------------------
// Satır tipleri
// ---------------------------------------------------------------------------

export interface Tournament {
  id: string;
  name: string;
  short_name: string | null;
  season: string | null;
  logo_url: string | null;
  municipality_logo_url: string | null;
  organizer_logo_url: string | null;
  description: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  status: TournamentStatus;
  format: TournamentFormat;
  win_points: number;
  draw_points: number;
  loss_points: number;
  forfeit_home_score: number;
  forfeit_away_score: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface Venue {
  id: string;
  tournament_id: string;
  name: string;
  address: string | null;
  map_url: string | null;
  capacity: number | null;
  image_url: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Group {
  id: string;
  tournament_id: string;
  name: string;
  short_name: string | null;
  color: string | null;
  qualification_count: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  tournament_id: string;
  group_id: string | null;
  name: string;
  short_name: string | null;
  code: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  text_color: string | null;
  kit_primary_color: string | null;
  kit_secondary_color: string | null;
  goalkeeper_color: string | null;
  neighborhood: string | null;
  founded_year: number | null;
  description: string | null;
  manager_name: string | null;
  manager_phone: string | null;
  coach_name: string | null;
  captain_player_id: string | null;
  status: TeamStatus;
  is_withdrawn: boolean;
  is_disqualified: boolean;
  created_at: string;
  updated_at: string;
}

/** Halka açık view: hassas alanlar (manager_name, manager_phone) yoktur. */
export type PublicTeam = Omit<
  Team,
  "manager_name" | "manager_phone" | "updated_at"
>;

export interface Player {
  id: string;
  team_id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  shirt_number: number | null;
  position: PlayerPosition;
  birth_year: number | null;
  photo_url: string | null;
  is_captain: boolean;
  is_goalkeeper: boolean;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Halka açık view: notes alanı yoktur. */
export type PublicPlayer = Omit<Player, "notes" | "updated_at">;

export interface Match {
  id: string;
  tournament_id: string;
  group_id: string | null;
  venue_id: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  home_score: number | null;
  away_score: number | null;
  home_penalty_score: number | null;
  away_penalty_score: number | null;
  stage: MatchStage;
  round_name: string | null;
  knockout_round: KnockoutRound | null;
  bracket_position: number | null;
  next_match_id: string | null;
  next_match_slot: "home" | "away" | null;
  loser_next_match_id: string | null;
  loser_next_match_slot: "home" | "away" | null;
  week_number: number | null;
  match_date: string | null;
  start_time: string | null;
  end_time: string | null;
  status: MatchStatus;
  referee_name: string | null;
  assistant_referees: string | null;
  notes: string | null;
  is_forfeit: boolean;
  forfeit_type: ForfeitType | null;
  original_match_date: string | null;
  postponement_reason: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface MatchEvent {
  id: string;
  match_id: string;
  team_id: string | null;
  player_id: string | null;
  secondary_player_id: string | null;
  event_type: MatchEventType;
  minute: number | null;
  extra_minute: number | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Lineup {
  id: string;
  match_id: string;
  team_id: string;
  player_id: string;
  lineup_type: "starting" | "substitute";
  position: string | null;
  created_at: string;
}

export interface Card {
  id: string;
  match_id: string;
  team_id: string | null;
  player_id: string | null;
  card_type: CardType;
  minute: number | null;
  reason: string | null;
  source_event_id: string | null;
  created_at: string;
}

export interface Suspension {
  id: string;
  tournament_id: string;
  team_id: string | null;
  player_id: string | null;
  suspension_type: SuspensionType;
  reason: string | null;
  start_date: string | null;
  end_date: string | null;
  total_matches: number | null;
  remaining_matches: number | null;
  penalty_points: number | null;
  is_active: boolean;
  decision_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Halka açık view: notes alanı yoktur. */
export type PublicSuspension = Omit<Suspension, "notes" | "updated_at">;

export interface Announcement {
  id: string;
  tournament_id: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string | null;
  image_url: string | null;
  announcement_type: AnnouncementType;
  is_important: boolean;
  is_published: boolean;
  publish_date: string;
  expire_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: number;
  user_id: string | null;
  action_type: string;
  table_name: string;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  description: string | null;
  created_at: string;
}

export interface Setting {
  id: string;
  tournament_id: string | null;
  setting_key: string;
  setting_value: unknown;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Ayar değerleri
// ---------------------------------------------------------------------------

export type StandingsTiebreaker =
  | "points" | "goal_difference" | "goals_for"
  | "h2h_points" | "h2h_goal_difference" | "h2h_goals_for"
  | "fewest_red_cards" | "fewest_yellow_cards";

export type ScorerTiebreaker = "fewest_matches" | "most_assists" | "fewest_cards";

export interface ForfeitRules {
  award_points: boolean;
  count_in_goal_stats: boolean;
  count_player_goals: boolean;
}

export interface FooterSettings {
  municipality?: string;
  organization?: string;
  email?: string;
  phone?: string;
  address?: string;
  instagram?: string;
  facebook?: string;
  credit?: string;
}

// Server Action'ların ortak dönüş tipi
export interface ActionResult {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
  id?: string;
}
