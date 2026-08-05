-- ============================================================================
-- Yığılca Futbol Turnuvası - Migration 0008: Kazanan ilerleyince sonraki maç
--                                            otomatik yayınlansın
-- ----------------------------------------------------------------------------
-- SORUN: save_match_result kazananı sonraki tura DOĞRU taşıyor (home_team_id /
-- away_team_id yazılıyor), ancak generateKnockoutAction eleme ağacını
-- `is_published = false` (taslak) oluşturduğu için sonraki tur maçları halka
-- açık sorgudan (getPublishedMatches, queries.ts) düşüyordu. Sonuç: panelde
-- kazanan bir üst turda görünürken, /eleme ve ana sayfadaki Kupa Yolu'nda
-- kart hâlâ "Kazanan N. Maç" yer tutucusunu gösteriyordu — yani kazanan
-- ziyaretçi gözünde bir sonraki tura ATLAMIYORDU.
--
-- ÇÖZÜM: Kazanan (veya üçüncülük için mağlup) bir maça yerleştirildiğinde,
-- hedef maç da yayına alınır. Bu yalnızca KAYNAK maç yayındaysa yapılır:
-- taslak/test maçları hâlâ taslak zinciri üretir ve kura yayınlanmadan
-- eşleşmeler sızmaz. Yayındaki bir maç oynanıp bittiyse kazananın yolu
-- zaten kamuya açık bir bilgidir.
--
-- Fonksiyonun geri kalanı 0003_functions_triggers.sql ile birebir aynıdır
-- (create or replace ile tam gövde tekrar edilir); tek fark ilerletme
-- bloğundaki `is_published` yayılımıdır.
-- ============================================================================

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

    -- is_published yayılımı: hedef maç zaten yayındaysa dokunulmaz, kaynak maç
    -- yayındaysa hedef de yayına alınır (aksi hâlde taslak kalır).
    if v_winner is not null and v_match.next_match_id is not null then
      if v_match.next_match_slot = 'home' then
        update public.matches
           set home_team_id = v_winner,
               is_published = is_published or v_match.is_published
         where id = v_match.next_match_id;
      elsif v_match.next_match_slot = 'away' then
        update public.matches
           set away_team_id = v_winner,
               is_published = is_published or v_match.is_published
         where id = v_match.next_match_id;
      end if;
    end if;

    if v_loser is not null and v_match.loser_next_match_id is not null then
      if v_match.loser_next_match_slot = 'home' then
        update public.matches
           set home_team_id = v_loser,
               is_published = is_published or v_match.is_published
         where id = v_match.loser_next_match_id;
      elsif v_match.loser_next_match_slot = 'away' then
        update public.matches
           set away_team_id = v_loser,
               is_published = is_published or v_match.is_published
         where id = v_match.loser_next_match_id;
      end if;
    end if;
  end if;

  -- Cezaları güvenli şekilde yeniden hesapla
  perform public.recompute_suspensions(v_match.tournament_id);
end $$;

-- ----------------------------------------------------------------------------
-- Geriye dönük düzeltme: bu migration'dan ÖNCE sonuçlanmış eleme maçlarının
-- kazananları hedef maça yazılmış ama hedef maç taslak kaldıysa yayına alınır.
-- ----------------------------------------------------------------------------
update public.matches as hedef
   set is_published = true
  from public.matches as kaynak
 where kaynak.stage = 'knockout'
   and kaynak.is_published
   and kaynak.status in ('completed','forfeited')
   and kaynak.next_match_id = hedef.id
   and hedef.is_published = false
   and (
     (kaynak.next_match_slot = 'home' and hedef.home_team_id is not null) or
     (kaynak.next_match_slot = 'away' and hedef.away_team_id is not null)
   );

update public.matches as hedef
   set is_published = true
  from public.matches as kaynak
 where kaynak.stage = 'knockout'
   and kaynak.is_published
   and kaynak.status in ('completed','forfeited')
   and kaynak.loser_next_match_id = hedef.id
   and hedef.is_published = false
   and (
     (kaynak.loser_next_match_slot = 'home' and hedef.home_team_id is not null) or
     (kaynak.loser_next_match_slot = 'away' and hedef.away_team_id is not null)
   );
