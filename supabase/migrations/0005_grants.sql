-- ============================================================================
-- Yığılca Futbol Turnuvası - Migration 0005: Tablo düzeyi yetkiler (GRANT)
-- ----------------------------------------------------------------------------
-- Neden gerekli?
--   Supabase'in yeni projelerinde, SQL ile oluşturulan tablolara anon /
--   authenticated / service_role rolleri için otomatik DML yetkisi VERİLMİYOR
--   (yalnızca REFERENCES/TRIGGER/TRUNCATE geliyor). RLS politikaları satır
--   düzeyinde filtreler ama tablo düzeyinde GRANT olmadan sorgular
--   "permission denied" ile düşer. Bu dosya eksik yetkileri tanımlar.
--
-- Güvenlik ilkeleri:
--   * anon yalnızca halka açık site tarafından okunan tablolara SELECT alır.
--     Hassas sütun içeren teams / players / suspensions taban tablolarına ve
--     profiles / audit_logs tablolarına anon yetkisi YOKTUR — site bunları
--     public_teams / public_players / public_suspensions view'larıyla okur
--     (view'lara select 0002'de verildi).
--   * authenticated tüm panel tablolarına DML alır; hangi rolün neyi
--     yazabileceğini 0002'deki RLS politikaları belirler.
--   * service_role (secret key) yönetim scriptleri için tam yetki alır
--     (RLS'i zaten baypas eder ama tablo GRANT'i yine de şarttır).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- anon: halka açık okunan tablolar (RLS yalnızca yayınlanmış satırları verir)
-- ----------------------------------------------------------------------------
grant select on public.tournaments   to anon;
grant select on public.venues        to anon;
grant select on public.groups        to anon;
grant select on public.matches       to anon;
grant select on public.match_events  to anon;
grant select on public.lineups       to anon;
grant select on public.cards         to anon;
grant select on public.announcements to anon;
grant select on public.settings      to anon;

-- ----------------------------------------------------------------------------
-- authenticated: panel erişimi (rol bazlı kısıtlar RLS politikalarında)
-- ----------------------------------------------------------------------------
grant select, insert, update, delete on public.tournaments   to authenticated;
grant select, insert, update, delete on public.venues        to authenticated;
grant select, insert, update, delete on public.groups        to authenticated;
grant select, insert, update, delete on public.teams         to authenticated;
grant select, insert, update, delete on public.players       to authenticated;
grant select, insert, update, delete on public.matches       to authenticated;
grant select, insert, update, delete on public.match_events  to authenticated;
grant select, insert, update, delete on public.lineups       to authenticated;
grant select, insert, update, delete on public.cards         to authenticated;
grant select, insert, update, delete on public.suspensions   to authenticated;
grant select, insert, update, delete on public.announcements to authenticated;
grant select, insert, update, delete on public.settings      to authenticated;
-- profiles: okuma herkese (staff), yazma yalnız super_admin — RLS uygular
grant select, update on public.profiles to authenticated;
-- audit_logs: staff okur; kayıtlar security definer trigger ile yazılır
grant select on public.audit_logs to authenticated;

-- ----------------------------------------------------------------------------
-- service_role: yönetim scriptleri (create-admin vb.) için tam yetki
-- ----------------------------------------------------------------------------
grant select, insert, update, delete on all tables in schema public to service_role;

-- ----------------------------------------------------------------------------
-- Sequence yetkileri (bigserial kimlikler için)
-- ----------------------------------------------------------------------------
grant usage, select on all sequences in schema public to authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Gelecekte eklenecek tablolar için varsayılan yetkiler
-- (postgres rolüyle oluşturulan yeni nesnelere otomatik uygulanır;
--  anon bilinçli olarak DAHİL DEĞİL — yeni tablolar varsayılan kapalı kalır)
-- ----------------------------------------------------------------------------
alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to service_role;
alter default privileges for role postgres in schema public
  grant usage, select on sequences to authenticated, service_role;
