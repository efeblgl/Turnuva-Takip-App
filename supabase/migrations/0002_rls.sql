-- ============================================================================
-- Yığılca Futbol Turnuvası - Migration 0002: Row Level Security
-- ----------------------------------------------------------------------------
-- Kural özeti:
--   * Halka açık (anon) kullanıcılar yalnızca yayındaki turnuvanın yayınlanmış
--     verilerini OKUYABİLİR. Hassas sütunlar (telefon, iç notlar, yönetici
--     bilgileri) taban tablo yerine "public_*" view'ları üzerinden gizlenir.
--   * Yazma işlemleri role bağlıdır:
--       super_admin      -> her şey + kullanıcı ve ayar yönetimi
--       tournament_admin -> takım / oyuncu / grup / saha / fikstür / skor / ceza / duyuru
--       score_officer    -> maç durumu, skor ve maç olayları
--       content_editor   -> duyurular + takım açıklaması (trigger ile sınırlanır)
--       viewer           -> panel verilerini sadece okur
--   * Pasif (is_active = false) kullanıcıların tüm yetkileri düşer.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Yardımcı fonksiyonlar
-- ----------------------------------------------------------------------------
create or replace function public.current_app_role()
returns text
language sql stable security definer set search_path = public
as $$
  select role from public.profiles
  where id = auth.uid() and is_active = true;
$$;

create or replace function public.has_any_role(required_roles text[])
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and is_active = true
      and role = any(required_roles)
  );
$$;

-- Panel erişimi olan herhangi bir aktif kullanıcı mı? (viewer dahil)
create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active = true
  );
$$;

-- ----------------------------------------------------------------------------
-- RLS'i tüm tablolarda etkinleştir
-- ----------------------------------------------------------------------------
alter table public.tournaments   enable row level security;
alter table public.venues        enable row level security;
alter table public.groups       enable row level security;
alter table public.teams         enable row level security;
alter table public.players       enable row level security;
alter table public.matches       enable row level security;
alter table public.match_events  enable row level security;
alter table public.lineups       enable row level security;
alter table public.cards         enable row level security;
alter table public.suspensions   enable row level security;
alter table public.announcements enable row level security;
alter table public.profiles      enable row level security;
alter table public.audit_logs    enable row level security;
alter table public.settings      enable row level security;

-- ----------------------------------------------------------------------------
-- TOURNAMENTS: herkes yayındakini okur, yalnız süper yönetici yazar
-- ----------------------------------------------------------------------------
create policy "tournaments_select" on public.tournaments
  for select using (is_public = true or public.is_staff());

create policy "tournaments_insert" on public.tournaments
  for insert with check (public.has_any_role(array['super_admin']));

create policy "tournaments_update" on public.tournaments
  for update using (public.has_any_role(array['super_admin']))
  with check (public.has_any_role(array['super_admin']));

create policy "tournaments_delete" on public.tournaments
  for delete using (public.has_any_role(array['super_admin']));

-- ----------------------------------------------------------------------------
-- VENUES: aktif sahalar (yayındaki turnuvada) herkese açık
-- ----------------------------------------------------------------------------
create policy "venues_select" on public.venues
  for select using (
    (is_active = true and exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and t.is_public = true))
    or public.is_staff()
  );

create policy "venues_write" on public.venues
  for all using (public.has_any_role(array['super_admin','tournament_admin']))
  with check (public.has_any_role(array['super_admin','tournament_admin']));

-- ----------------------------------------------------------------------------
-- GROUPS
-- ----------------------------------------------------------------------------
create policy "groups_select" on public.groups
  for select using (
    exists (select 1 from public.tournaments t
            where t.id = tournament_id and t.is_public = true)
    or public.is_staff()
  );

create policy "groups_write" on public.groups
  for all using (public.has_any_role(array['super_admin','tournament_admin']))
  with check (public.has_any_role(array['super_admin','tournament_admin']));

-- ----------------------------------------------------------------------------
-- TEAMS: taban tablo SADECE panel kullanıcılarına açık.
-- Halka açık okuma "public_teams" view'ı üzerinden yapılır (telefon vb. hariç).
-- ----------------------------------------------------------------------------
create policy "teams_select_staff" on public.teams
  for select using (public.is_staff());

create policy "teams_insert" on public.teams
  for insert with check (public.has_any_role(array['super_admin','tournament_admin']));

-- content_editor güncellemesi 0003'teki trigger ile yalnızca
-- "description" sütunuyla sınırlandırılır.
create policy "teams_update" on public.teams
  for update using (public.has_any_role(array['super_admin','tournament_admin','content_editor']))
  with check (public.has_any_role(array['super_admin','tournament_admin','content_editor']));

create policy "teams_delete" on public.teams
  for delete using (public.has_any_role(array['super_admin','tournament_admin']));

-- ----------------------------------------------------------------------------
-- PLAYERS: taban tablo panel kullanıcılarına; halka açık okuma "public_players"
-- ----------------------------------------------------------------------------
create policy "players_select_staff" on public.players
  for select using (public.is_staff());

create policy "players_write" on public.players
  for all using (public.has_any_role(array['super_admin','tournament_admin']))
  with check (public.has_any_role(array['super_admin','tournament_admin']));

-- ----------------------------------------------------------------------------
-- MATCHES: yayınlanmış maçlar (yayındaki turnuvada) herkese açık
-- ----------------------------------------------------------------------------
create policy "matches_select" on public.matches
  for select using (
    (is_published = true and exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and t.is_public = true))
    or public.is_staff()
  );

create policy "matches_insert" on public.matches
  for insert with check (public.has_any_role(array['super_admin','tournament_admin']));

create policy "matches_update" on public.matches
  for update using (public.has_any_role(array['super_admin','tournament_admin','score_officer']))
  with check (public.has_any_role(array['super_admin','tournament_admin','score_officer']));

create policy "matches_delete" on public.matches
  for delete using (public.has_any_role(array['super_admin','tournament_admin']));

-- ----------------------------------------------------------------------------
-- MATCH_EVENTS / LINEUPS / CARDS: maç yayında ise herkes okur;
-- skor görevlisi ve üstü yazar
-- ----------------------------------------------------------------------------
create policy "match_events_select" on public.match_events
  for select using (
    exists (select 1 from public.matches m
            join public.tournaments t on t.id = m.tournament_id
            where m.id = match_id and m.is_published = true and t.is_public = true)
    or public.is_staff()
  );

create policy "match_events_write" on public.match_events
  for all using (public.has_any_role(array['super_admin','tournament_admin','score_officer']))
  with check (public.has_any_role(array['super_admin','tournament_admin','score_officer']));

create policy "lineups_select" on public.lineups
  for select using (
    exists (select 1 from public.matches m
            join public.tournaments t on t.id = m.tournament_id
            where m.id = match_id and m.is_published = true and t.is_public = true)
    or public.is_staff()
  );

create policy "lineups_write" on public.lineups
  for all using (public.has_any_role(array['super_admin','tournament_admin','score_officer']))
  with check (public.has_any_role(array['super_admin','tournament_admin','score_officer']));

create policy "cards_select" on public.cards
  for select using (
    exists (select 1 from public.matches m
            join public.tournaments t on t.id = m.tournament_id
            where m.id = match_id and m.is_published = true and t.is_public = true)
    or public.is_staff()
  );

create policy "cards_write" on public.cards
  for all using (public.has_any_role(array['super_admin','tournament_admin','score_officer']))
  with check (public.has_any_role(array['super_admin','tournament_admin','score_officer']));

-- ----------------------------------------------------------------------------
-- SUSPENSIONS: taban tablo panele; halka açık okuma "public_suspensions"
-- ----------------------------------------------------------------------------
create policy "suspensions_select_staff" on public.suspensions
  for select using (public.is_staff());

create policy "suspensions_write" on public.suspensions
  for all using (public.has_any_role(array['super_admin','tournament_admin']))
  with check (public.has_any_role(array['super_admin','tournament_admin']));

-- ----------------------------------------------------------------------------
-- ANNOUNCEMENTS: yayında + tarihi geçerli olanlar herkese açık
-- ----------------------------------------------------------------------------
create policy "announcements_select" on public.announcements
  for select using (
    (is_published = true
      and publish_date <= now()
      and (expire_date is null or expire_date > now())
      and exists (select 1 from public.tournaments t
                  where t.id = tournament_id and t.is_public = true))
    or public.is_staff()
  );

create policy "announcements_write" on public.announcements
  for all using (public.has_any_role(array['super_admin','tournament_admin','content_editor']))
  with check (public.has_any_role(array['super_admin','tournament_admin','content_editor']));

-- ----------------------------------------------------------------------------
-- PROFILES: kullanıcı kendi kaydını görür; yönetim yalnız süper yönetici
-- (Yeni kayıt 0003'teki auth trigger'ı ile otomatik oluşur.)
-- ----------------------------------------------------------------------------
create policy "profiles_select" on public.profiles
  for select using (id = auth.uid() or public.has_any_role(array['super_admin']));

create policy "profiles_insert" on public.profiles
  for insert with check (public.has_any_role(array['super_admin']));

create policy "profiles_update" on public.profiles
  for update using (public.has_any_role(array['super_admin']))
  with check (public.has_any_role(array['super_admin']));

create policy "profiles_delete" on public.profiles
  for delete using (public.has_any_role(array['super_admin']));

-- ----------------------------------------------------------------------------
-- AUDIT_LOGS: yalnızca yöneticiler okur; yazma sadece trigger üzerinden
-- (security definer fonksiyon RLS'i aşar, doğrudan insert politikası YOKTUR)
-- ----------------------------------------------------------------------------
create policy "audit_logs_select" on public.audit_logs
  for select using (public.has_any_role(array['super_admin','tournament_admin']));

-- ----------------------------------------------------------------------------
-- SETTINGS: is_public = true anahtarları herkes okur (kurallar, footer vb.)
-- ----------------------------------------------------------------------------
create policy "settings_select" on public.settings
  for select using (is_public = true or public.is_staff());

create policy "settings_write" on public.settings
  for all using (public.has_any_role(array['super_admin']))
  with check (public.has_any_role(array['super_admin']));

-- ============================================================================
-- HALKA AÇIK VIEW'LAR
-- ----------------------------------------------------------------------------
-- security_invoker = off: view sahibinin (postgres) yetkisiyle çalışır,
-- böylece taban tablodaki "staff-only" RLS'e takılmadan, ama YALNIZCA
-- burada seçilen güvenli sütunları ve yayındaki turnuvanın satırlarını sunar.
-- manager_name, manager_phone, notes gibi alanlar BİLİNÇLİ olarak dışarıda.
-- ============================================================================
create view public.public_teams
with (security_invoker = off) as
select
  t.id, t.tournament_id, t.group_id, t.name, t.short_name, t.code, t.logo_url,
  t.primary_color, t.secondary_color, t.text_color,
  t.kit_primary_color, t.kit_secondary_color, t.goalkeeper_color,
  t.neighborhood, t.founded_year, t.description, t.coach_name,
  t.captain_player_id, t.status, t.is_withdrawn, t.is_disqualified, t.created_at
from public.teams t
join public.tournaments tr on tr.id = t.tournament_id
where tr.is_public = true;

create view public.public_players
with (security_invoker = off) as
select
  p.id, p.team_id, p.first_name, p.last_name, p.full_name, p.shirt_number,
  p.position, p.birth_year, p.photo_url, p.is_captain, p.is_goalkeeper,
  p.is_active, p.created_at
from public.players p
join public.teams t on t.id = p.team_id
join public.tournaments tr on tr.id = t.tournament_id
where tr.is_public = true;

create view public.public_suspensions
with (security_invoker = off) as
select
  s.id, s.tournament_id, s.team_id, s.player_id, s.suspension_type, s.reason,
  s.start_date, s.end_date, s.total_matches, s.remaining_matches,
  s.penalty_points, s.is_active, s.decision_date, s.created_at
from public.suspensions s
join public.tournaments tr on tr.id = s.tournament_id
where tr.is_public = true;

grant select on public.public_teams       to anon, authenticated;
grant select on public.public_players     to anon, authenticated;
grant select on public.public_suspensions to anon, authenticated;
