-- ============================================================================
-- Yığılca Futbol Turnuvası - Migration 0001: Tablo Şeması
-- ----------------------------------------------------------------------------
-- Bu dosya tüm tabloları, kısıtlamaları (constraint) ve indeksleri oluşturur.
-- Enum benzeri alanlar text + CHECK olarak tutulur; kodlar İngilizce,
-- kullanıcıya gösterilen Türkçe etiketler frontend'de eşlenir.
-- Çalıştırma sırası: 0001 -> 0002 -> 0003 -> 0004 -> seed.sql
-- ============================================================================

create extension if not exists pgcrypto;

-- ============================================================================
-- TURNUVALAR
-- ============================================================================
create table public.tournaments (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  short_name            text,
  season                text,
  logo_url              text,
  municipality_logo_url text,
  organizer_logo_url    text,
  description           text,
  location              text,
  start_date            date,
  end_date              date,
  -- Turnuva durumu: hazırlık / kayıt / fikstür hazırlanıyor / fikstür yayında /
  -- grup aşaması / eleme / final / tamamlandı / ertelendi / iptal
  status                text not null default 'preparation'
    check (status in ('preparation','registration','fixture_pending','fixture_published',
                      'group_stage','knockout_stage','final_stage','completed','postponed','cancelled')),
  -- Format: tek devre lig / çift devre lig / sadece grup / grup + eleme / direkt eleme
  format                text not null default 'group_knockout'
    check (format in ('single_league','double_league','group_stage_only','group_knockout','knockout_only')),
  win_points            int  not null default 3 check (win_points  >= 0),
  draw_points           int  not null default 1 check (draw_points >= 0),
  loss_points           int  not null default 0 check (loss_points >= 0),
  forfeit_home_score    int  not null default 3 check (forfeit_home_score >= 0),
  forfeit_away_score    int  not null default 0 check (forfeit_away_score >= 0),
  is_public             boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ============================================================================
-- SAHALAR
-- ============================================================================
create table public.venues (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name          text not null,
  address       text,
  map_url       text,
  capacity      int check (capacity is null or capacity >= 0),
  image_url     text,
  description   text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ============================================================================
-- GRUPLAR
-- ============================================================================
create table public.groups (
  id                  uuid primary key default gen_random_uuid(),
  tournament_id       uuid not null references public.tournaments(id) on delete cascade,
  name                text not null,
  short_name          text,
  color               text check (color is null or color ~* '^#[0-9a-f]{6}$'),
  qualification_count int not null default 2 check (qualification_count >= 0),
  sort_order          int not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (tournament_id, name)
);

-- ============================================================================
-- TAKIMLAR
-- ============================================================================
create table public.teams (
  id                  uuid primary key default gen_random_uuid(),
  tournament_id       uuid not null references public.tournaments(id) on delete cascade,
  group_id            uuid references public.groups(id) on delete set null,
  name                text not null,
  short_name          text,
  code                text, -- 3-4 harfli kısaltma (ör. YAĞ)
  logo_url            text,
  primary_color       text check (primary_color       is null or primary_color       ~* '^#[0-9a-f]{6}$'),
  secondary_color     text check (secondary_color     is null or secondary_color     ~* '^#[0-9a-f]{6}$'),
  text_color          text check (text_color          is null or text_color          ~* '^#[0-9a-f]{6}$'),
  kit_primary_color   text check (kit_primary_color   is null or kit_primary_color   ~* '^#[0-9a-f]{6}$'),
  kit_secondary_color text check (kit_secondary_color is null or kit_secondary_color ~* '^#[0-9a-f]{6}$'),
  goalkeeper_color    text check (goalkeeper_color    is null or goalkeeper_color    ~* '^#[0-9a-f]{6}$'),
  neighborhood        text, -- mahalle veya köy
  founded_year        int check (founded_year is null or founded_year between 1900 and 2100),
  description         text,
  manager_name        text, -- HALKA AÇIK GÖRÜNÜMDE GÖSTERİLMEZ
  manager_phone       text, -- HALKA AÇIK GÖRÜNÜMDE GÖSTERİLMEZ
  coach_name          text,
  captain_player_id   uuid, -- FK, players tablosundan sonra eklenir
  status              text not null default 'active'
    check (status in ('active','passive','pending','withdrawn','disqualified','eliminated','champion')),
  is_withdrawn        boolean not null default false,
  is_disqualified     boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (tournament_id, name)
);

-- ============================================================================
-- OYUNCULAR
-- ============================================================================
-- Not: Gol / asist / kart toplamları burada SAKLANMAZ; veri tutarlılığı için
-- her zaman match_events tablosundan hesaplanır (bkz. şartname madde 21).
create table public.players (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null references public.teams(id) on delete cascade,
  first_name    text not null,
  last_name     text not null,
  full_name     text generated always as (first_name || ' ' || last_name) stored,
  shirt_number  int check (shirt_number is null or shirt_number between 1 and 99),
  position      text not null default 'unspecified'
    check (position in ('goalkeeper','defender','midfielder','forward','unspecified')),
  birth_year    int check (birth_year is null or birth_year between 1940 and 2020),
  photo_url     text,
  is_captain    boolean not null default false,
  is_goalkeeper boolean not null default false,
  is_active     boolean not null default true, -- silmek yerine pasif yapılır
  notes         text, -- HALKA AÇIK GÖRÜNÜMDE GÖSTERİLMEZ
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.teams
  add constraint teams_captain_player_fk
  foreign key (captain_player_id) references public.players(id) on delete set null;

-- ============================================================================
-- MAÇLAR
-- ============================================================================
-- Takım alanları eleme aşaması için NULL olabilir: sonraki tur maçları
-- "yer tutucu" olarak oluşturulur, kazanan belli olunca doldurulur.
create table public.matches (
  id                    uuid primary key default gen_random_uuid(),
  tournament_id         uuid not null references public.tournaments(id) on delete cascade,
  group_id              uuid references public.groups(id) on delete set null,
  venue_id              uuid references public.venues(id) on delete set null,
  home_team_id          uuid references public.teams(id) on delete restrict,
  away_team_id          uuid references public.teams(id) on delete restrict,
  home_score            int check (home_score is null or home_score >= 0),
  away_score            int check (away_score is null or away_score >= 0),
  home_penalty_score    int check (home_penalty_score is null or home_penalty_score >= 0),
  away_penalty_score    int check (away_penalty_score is null or away_penalty_score >= 0),
  -- Aşama ve eleme ağacı bağlantısı
  stage                 text not null default 'group' check (stage in ('group','knockout')),
  round_name            text, -- görünen ad: "3. Hafta", "Çeyrek Final" vb.
  knockout_round        text check (knockout_round is null or knockout_round in
                          ('round_of_32','round_of_16','quarter_final','semi_final','third_place','final')),
  bracket_position      int,
  next_match_id         uuid references public.matches(id) on delete set null,
  next_match_slot       text check (next_match_slot is null or next_match_slot in ('home','away')),
  loser_next_match_id   uuid references public.matches(id) on delete set null, -- üçüncülük maçı için
  loser_next_match_slot text check (loser_next_match_slot is null or loser_next_match_slot in ('home','away')),
  week_number           int,
  match_date            date,
  start_time            time,
  end_time              time,
  status                text not null default 'scheduled'
    check (status in ('scheduled','in_progress','half_time','second_half','extra_time','penalties',
                      'completed','postponed','cancelled','forfeited','abandoned','awaiting_decision')),
  referee_name          text,
  assistant_referees    text,
  notes                 text,
  is_forfeit            boolean not null default false,
  forfeit_type          text check (forfeit_type is null or forfeit_type in
                          ('home_win','away_win','both_lose','cancelled','admin_decision')),
  original_match_date   date, -- erteleme durumunda eski tarih saklanır
  postponement_reason   text,
  is_published          boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  check (home_team_id is null or away_team_id is null or home_team_id <> away_team_id)
);

-- ============================================================================
-- MAÇ OLAYLARI (gol, kart, değişiklik, maç akışı)
-- ============================================================================
create table public.match_events (
  id                  uuid primary key default gen_random_uuid(),
  match_id            uuid not null references public.matches(id) on delete cascade,
  team_id             uuid references public.teams(id) on delete set null,
  player_id           uuid references public.players(id) on delete set null,
  secondary_player_id uuid references public.players(id) on delete set null, -- asist / oyuna giren
  event_type          text not null check (event_type in
    ('goal','own_goal','penalty_goal','missed_penalty',
     'yellow_card','second_yellow','red_card',
     'substitution','injury',
     'match_start','half_time','second_half_start','match_end',
     'extra_time_start','penalty_shootout')),
  minute              int check (minute is null or minute between 0 and 130),
  extra_minute        int check (extra_minute is null or extra_minute between 0 and 30),
  description         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ============================================================================
-- KADROLAR
-- ============================================================================
create table public.lineups (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid not null references public.matches(id) on delete cascade,
  team_id     uuid not null references public.teams(id) on delete cascade,
  player_id   uuid not null references public.players(id) on delete cascade,
  lineup_type text not null default 'starting' check (lineup_type in ('starting','substitute')),
  position    text,
  created_at  timestamptz not null default now(),
  unique (match_id, player_id)
);

-- ============================================================================
-- KARTLAR
-- ----------------------------------------------------------------------------
-- Kart satırları match_events'ten trigger ile otomatik senkronize edilir
-- (source_event_id). Böylece tek veri kaynağı korunur.
-- ============================================================================
create table public.cards (
  id              uuid primary key default gen_random_uuid(),
  match_id        uuid not null references public.matches(id) on delete cascade,
  team_id         uuid references public.teams(id) on delete set null,
  player_id       uuid references public.players(id) on delete set null,
  card_type       text not null check (card_type in ('yellow','second_yellow','red')),
  minute          int,
  reason          text,
  source_event_id uuid references public.match_events(id) on delete cascade,
  created_at      timestamptz not null default now(),
  unique (source_event_id)
);

-- ============================================================================
-- CEZALAR
-- ============================================================================
create table public.suspensions (
  id                uuid primary key default gen_random_uuid(),
  tournament_id     uuid not null references public.tournaments(id) on delete cascade,
  team_id           uuid references public.teams(id) on delete cascade,
  player_id         uuid references public.players(id) on delete cascade,
  suspension_type   text not null check (suspension_type in
    ('one_match','multi_match','until_date','tournament_ban',
     'team_penalty','point_deduction','fine_record','warning')),
  reason            text,
  start_date        date,
  end_date          date,
  total_matches     int check (total_matches is null or total_matches >= 0),
  remaining_matches int check (remaining_matches is null or remaining_matches >= 0),
  penalty_points    int check (penalty_points is null or penalty_points >= 0), -- puan silme cezası için
  is_active         boolean not null default true,
  decision_date     date,
  notes             text, -- HALKA AÇIK GÖRÜNÜMDE GÖSTERİLMEZ
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (team_id is not null or player_id is not null)
);

-- ============================================================================
-- DUYURULAR
-- ============================================================================
create table public.announcements (
  id                uuid primary key default gen_random_uuid(),
  tournament_id     uuid not null references public.tournaments(id) on delete cascade,
  title             text not null,
  slug              text not null,
  summary           text,
  content           text,
  image_url         text,
  announcement_type text not null default 'general' check (announcement_type in
    ('general','fixture','postponement','time_change','venue_change',
     'discipline','final_program','award_ceremony','urgent')),
  is_important      boolean not null default false,
  is_published      boolean not null default false,
  publish_date      timestamptz not null default now(),
  expire_date       timestamptz,
  created_by        uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (tournament_id, slug)
);

-- ============================================================================
-- KULLANICI PROFİLLERİ (auth.users ile 1-1)
-- ============================================================================
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  full_name  text,
  role       text not null default 'viewer'
    check (role in ('super_admin','tournament_admin','score_officer','content_editor','viewer')),
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- İŞLEM GEÇMİŞİ
-- ============================================================================
create table public.audit_logs (
  id          bigint generated always as identity primary key,
  user_id     uuid references auth.users(id) on delete set null,
  action_type text not null, -- INSERT / UPDATE / DELETE
  table_name  text not null,
  record_id   text,
  old_data    jsonb,
  new_data    jsonb,
  description text,
  created_at  timestamptz not null default now()
);

-- ============================================================================
-- AYARLAR (anahtar-değer; sıralama kriterleri, hükmen kuralları, footer vb.)
-- ============================================================================
create table public.settings (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete cascade,
  setting_key   text not null,
  setting_value jsonb,
  is_public     boolean not null default false, -- halka açık site okuyabilir mi?
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique nulls not distinct (tournament_id, setting_key)
);

-- ============================================================================
-- İNDEKSLER
-- ============================================================================
create index idx_venues_tournament        on public.venues (tournament_id);
create index idx_groups_tournament        on public.groups (tournament_id, sort_order);
create index idx_teams_tournament         on public.teams (tournament_id);
create index idx_teams_group              on public.teams (group_id);
create index idx_players_team             on public.players (team_id);
create index idx_matches_tournament_date  on public.matches (tournament_id, match_date, start_time);
create index idx_matches_group            on public.matches (group_id);
create index idx_matches_home_team        on public.matches (home_team_id);
create index idx_matches_away_team        on public.matches (away_team_id);
create index idx_matches_status           on public.matches (status);
create index idx_matches_venue_slot       on public.matches (venue_id, match_date, start_time);
create index idx_match_events_match       on public.match_events (match_id);
create index idx_match_events_player      on public.match_events (player_id);
create index idx_match_events_type        on public.match_events (event_type);
create index idx_lineups_match            on public.lineups (match_id);
create index idx_cards_match              on public.cards (match_id);
create index idx_cards_player             on public.cards (player_id);
create index idx_suspensions_tournament   on public.suspensions (tournament_id);
create index idx_suspensions_player       on public.suspensions (player_id);
create index idx_suspensions_team         on public.suspensions (team_id);
create index idx_announcements_published  on public.announcements (tournament_id, is_published, publish_date desc);
create index idx_audit_logs_created       on public.audit_logs (created_at desc);
create index idx_audit_logs_record        on public.audit_logs (table_name, record_id);
