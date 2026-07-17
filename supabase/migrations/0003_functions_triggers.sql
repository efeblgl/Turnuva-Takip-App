-- ============================================================================
-- Yığılca Futbol Turnuvası - Migration 0003: Fonksiyonlar ve Trigger'lar
-- ----------------------------------------------------------------------------
-- İçerik:
--   1) updated_at otomatik güncelleme
--   2) Yeni auth kullanıcısı -> profiles kaydı (varsayılan rol: viewer)
--   3) İşlem geçmişi (audit log) trigger'ları
--   4) match_events -> cards otomatik senkronizasyonu
--   5) İçerik editörü için takım sütun kısıtlaması
--   6) Saha + tarih + saat çakışma kontrolü
--   7) Ceza (kalan maç) yeniden hesaplama
--   8) save_match_result: skor + olaylar + eleme turu ilerletme (atomik RPC)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) updated_at
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger trg_tournaments_updated   before update on public.tournaments   for each row execute function public.set_updated_at();
create trigger trg_venues_updated        before update on public.venues        for each row execute function public.set_updated_at();
create trigger trg_groups_updated        before update on public.groups        for each row execute function public.set_updated_at();
create trigger trg_teams_updated         before update on public.teams         for each row execute function public.set_updated_at();
create trigger trg_players_updated       before update on public.players       for each row execute function public.set_updated_at();
create trigger trg_matches_updated       before update on public.matches       for each row execute function public.set_updated_at();
create trigger trg_match_events_updated  before update on public.match_events  for each row execute function public.set_updated_at();
create trigger trg_suspensions_updated   before update on public.suspensions   for each row execute function public.set_updated_at();
create trigger trg_announcements_updated before update on public.announcements for each row execute function public.set_updated_at();
create trigger trg_profiles_updated      before update on public.profiles      for each row execute function public.set_updated_at();
create trigger trg_settings_updated      before update on public.settings      for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 2) Yeni auth kullanıcısı -> profil kaydı
--    Halka açık kayıt YOKTUR; kullanıcılar süper yönetici tarafından oluşturulur.
--    Varsayılan rol "viewer"dır, yetki yükseltme super_admin'e aittir.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 3) İşlem geçmişi
-- ----------------------------------------------------------------------------
create or replace function public.log_audit()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_record_id text;
begin
  if tg_op = 'DELETE' then
    v_record_id := old.id::text;
  else
    v_record_id := new.id::text;
  end if;

  insert into public.audit_logs (user_id, action_type, table_name, record_id, old_data, new_data)
  values (
    auth.uid(),
    tg_op,
    tg_table_name,
    v_record_id,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end $$;

create trigger trg_audit_tournaments   after insert or update or delete on public.tournaments   for each row execute function public.log_audit();
create trigger trg_audit_venues        after insert or update or delete on public.venues        for each row execute function public.log_audit();
create trigger trg_audit_groups        after insert or update or delete on public.groups        for each row execute function public.log_audit();
create trigger trg_audit_teams         after insert or update or delete on public.teams         for each row execute function public.log_audit();
create trigger trg_audit_players       after insert or update or delete on public.players       for each row execute function public.log_audit();
create trigger trg_audit_matches       after insert or update or delete on public.matches       for each row execute function public.log_audit();
create trigger trg_audit_match_events  after insert or update or delete on public.match_events  for each row execute function public.log_audit();
create trigger trg_audit_suspensions   after insert or update or delete on public.suspensions   for each row execute function public.log_audit();
create trigger trg_audit_announcements after insert or update or delete on public.announcements for each row execute function public.log_audit();
create trigger trg_audit_profiles      after insert or update or delete on public.profiles      for each row execute function public.log_audit();
create trigger trg_audit_settings      after insert or update or delete on public.settings      for each row execute function public.log_audit();

-- ----------------------------------------------------------------------------
-- 4) match_events -> cards senkronizasyonu
--    Kart tipindeki olaylar cards tablosuna otomatik yansır; olay silinirse
--    veya tipi değişirse kart kaydı da güncellenir/silinir.
-- ----------------------------------------------------------------------------
create or replace function public.sync_card_from_event()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_card_type text;
begin
  if tg_op = 'DELETE' then
    delete from public.cards where source_event_id = old.id;
    return old;
  end if;

  v_card_type := case new.event_type
    when 'yellow_card'   then 'yellow'
    when 'second_yellow' then 'second_yellow'
    when 'red_card'      then 'red'
    else null
  end;

  if v_card_type is not null then
    insert into public.cards (match_id, team_id, player_id, card_type, minute, reason, source_event_id)
    values (new.match_id, new.team_id, new.player_id, v_card_type, new.minute, new.description, new.id)
    on conflict (source_event_id) do update set
      match_id  = excluded.match_id,
      team_id   = excluded.team_id,
      player_id = excluded.player_id,
      card_type = excluded.card_type,
      minute    = excluded.minute,
      reason    = excluded.reason;
  elsif tg_op = 'UPDATE' then
    -- Olay artık kart değilse eski kart kaydını temizle
    delete from public.cards where source_event_id = new.id;
  end if;

  return new;
end $$;

create trigger trg_sync_cards
  after insert or update or delete on public.match_events
  for each row execute function public.sync_card_from_event();

-- ----------------------------------------------------------------------------
-- 5) İçerik editörü yalnızca takım açıklamasını değiştirebilir
-- ----------------------------------------------------------------------------
create or replace function public.enforce_content_editor_limits()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if public.current_app_role() = 'content_editor' then
    if (to_jsonb(new) - 'description' - 'updated_at')
       is distinct from
       (to_jsonb(old) - 'description' - 'updated_at') then
      raise exception 'İçerik editörü yalnızca takım açıklamasını düzenleyebilir.';
    end if;
  end if;
  return new;
end $$;

create trigger trg_teams_content_editor_guard
  before update on public.teams
  for each row execute function public.enforce_content_editor_limits();

-- ----------------------------------------------------------------------------
-- 6) Aynı saha + tarih + saatte iki maç engeli
-- ----------------------------------------------------------------------------
create or replace function public.check_venue_conflict()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.venue_id is not null
     and new.match_date is not null
     and new.start_time is not null
     and new.status not in ('cancelled','postponed') then
    if exists (
      select 1 from public.matches m
      where m.venue_id = new.venue_id
        and m.match_date = new.match_date
        and m.start_time = new.start_time
        and m.id <> new.id
        and m.status not in ('cancelled','postponed')
    ) then
      raise exception 'Aynı sahada aynı tarih ve saatte başka bir maç zaten planlanmış.';
    end if;
  end if;
  return new;
end $$;

create trigger trg_matches_venue_conflict
  before insert or update on public.matches
  for each row execute function public.check_venue_conflict();

-- ----------------------------------------------------------------------------
-- 7) Cezaları yeniden hesapla (artımlı sayaç YOK; her seferinde sıfırdan
--    sayılır -> skor düzeltmelerinde veri tutarlılığı bozulmaz)
--    Kalan maç = toplam ceza - karar tarihinden SONRA takımın tamamladığı maç.
-- ----------------------------------------------------------------------------
create or replace function public.recompute_suspensions(p_tournament_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  -- Maç sayısına bağlı cezalar
  with base as (
    select
      s.id,
      coalesce(s.total_matches, 0)     as total_matches,
      coalesce(s.team_id, p.team_id)   as effective_team_id,
      s.decision_date,
      s.tournament_id
    from public.suspensions s
    left join public.players p on p.id = s.player_id
    where s.tournament_id = p_tournament_id
      and s.suspension_type in ('one_match','multi_match')
  ),
  served as (
    select
      b.id,
      greatest(0, b.total_matches - count(m.id)::int) as new_remaining
    from base b
    left join public.matches m
      on m.tournament_id = b.tournament_id
     and m.status in ('completed','forfeited')
     and (m.home_team_id = b.effective_team_id or m.away_team_id = b.effective_team_id)
     and (b.decision_date is null or m.match_date > b.decision_date)
    group by b.id, b.total_matches
  )
  update public.suspensions s
  set remaining_matches = served.new_remaining,
      is_active         = (served.new_remaining > 0)
  from served
  where s.id = served.id;

  -- Tarihe bağlı cezalar
  update public.suspensions s
  set is_active = (s.end_date is null or s.end_date >= current_date)
  where s.tournament_id = p_tournament_id
    and s.suspension_type = 'until_date';
end $$;

-- ----------------------------------------------------------------------------
-- 8) save_match_result: skor girişini TEK atomik işlemde yapar
--    - Maçı günceller (skor, durum, hakem, not)
--    - Oyun olaylarını değiştirir (sil + yeniden ekle; kartlar trigger ile senkron)
--    - Eleme maçıysa kazananı (ve üçüncülük için kaybedeni) sonraki tura taşır
--    - Cezaları yeniden hesaplar
--    SECURITY INVOKER: çağıran kullanıcının RLS yetkileri aynen geçerlidir.
-- ----------------------------------------------------------------------------
create or replace function public.save_match_result(
  p_match_id           uuid,
  p_home_score         int,
  p_away_score         int,
  p_status             text,
  p_home_penalty_score int  default null,
  p_away_penalty_score int  default null,
  p_referee_name       text default null,
  p_assistant_referees text default null,
  p_notes              text default null,
  p_events             jsonb default '[]'::jsonb
)
returns void
language plpgsql security invoker set search_path = public
as $$
declare
  v_match  public.matches%rowtype;
  v_event  jsonb;
  v_winner uuid;
  v_loser  uuid;
begin
  -- Açık yetki kontrolü (RLS zaten korur; bu, anlaşılır Türkçe hata içindir)
  if not public.has_any_role(array['super_admin','tournament_admin','score_officer']) then
    raise exception 'Bu işlem için yetkiniz yok.';
  end if;

  select * into v_match from public.matches where id = p_match_id for update;
  if not found then
    raise exception 'Maç bulunamadı.';
  end if;

  if p_home_score is null or p_away_score is null or p_home_score < 0 or p_away_score < 0 then
    raise exception 'Skorlar boş veya negatif olamaz.';
  end if;

  if p_status not in ('in_progress','half_time','second_half','extra_time','penalties',
                      'completed','forfeited','abandoned','awaiting_decision') then
    raise exception 'Geçersiz maç durumu: %', p_status;
  end if;

  update public.matches set
    home_score         = p_home_score,
    away_score         = p_away_score,
    home_penalty_score = p_home_penalty_score,
    away_penalty_score = p_away_penalty_score,
    status             = p_status,
    referee_name       = coalesce(p_referee_name, referee_name),
    assistant_referees = coalesce(p_assistant_referees, assistant_referees),
    notes              = coalesce(p_notes, notes)
  where id = p_match_id;

  -- Oyun olaylarını değiştir (maç akışı olayları korunur)
  delete from public.match_events
  where match_id = p_match_id
    and event_type in ('goal','own_goal','penalty_goal','missed_penalty',
                       'yellow_card','second_yellow','red_card','substitution','injury');

  for v_event in select value from jsonb_array_elements(coalesce(p_events, '[]'::jsonb))
  loop
    insert into public.match_events
      (match_id, team_id, player_id, secondary_player_id, event_type, minute, extra_minute, description)
    values (
      p_match_id,
      nullif(v_event ->> 'team_id', '')::uuid,
      nullif(v_event ->> 'player_id', '')::uuid,
      nullif(v_event ->> 'secondary_player_id', '')::uuid,
      v_event ->> 'event_type',
      nullif(v_event ->> 'minute', '')::int,
      nullif(v_event ->> 'extra_minute', '')::int,
      nullif(v_event ->> 'description', '')
    );
  end loop;

  -- Eleme aşaması: kazananı bir sonraki tura taşı
  if v_match.stage = 'knockout' and p_status in ('completed','forfeited') then
    if p_home_score > p_away_score then
      v_winner := v_match.home_team_id;  v_loser := v_match.away_team_id;
    elsif p_away_score > p_home_score then
      v_winner := v_match.away_team_id;  v_loser := v_match.home_team_id;
    elsif coalesce(p_home_penalty_score, -1) > coalesce(p_away_penalty_score, -1) then
      v_winner := v_match.home_team_id;  v_loser := v_match.away_team_id;
    elsif coalesce(p_away_penalty_score, -1) > coalesce(p_home_penalty_score, -1) then
      v_winner := v_match.away_team_id;  v_loser := v_match.home_team_id;
    else
      v_winner := null;                  v_loser := null;
    end if;

    if v_winner is not null and v_match.next_match_id is not null then
      if v_match.next_match_slot = 'home' then
        update public.matches set home_team_id = v_winner where id = v_match.next_match_id;
      elsif v_match.next_match_slot = 'away' then
        update public.matches set away_team_id = v_winner where id = v_match.next_match_id;
      end if;
    end if;

    if v_loser is not null and v_match.loser_next_match_id is not null then
      if v_match.loser_next_match_slot = 'home' then
        update public.matches set home_team_id = v_loser where id = v_match.loser_next_match_id;
      elsif v_match.loser_next_match_slot = 'away' then
        update public.matches set away_team_id = v_loser where id = v_match.loser_next_match_id;
      end if;
    end if;
  end if;

  -- Cezaları güvenli şekilde yeniden hesapla
  perform public.recompute_suspensions(v_match.tournament_id);
end $$;
