-- ============================================================================
-- Yığılca Futbol Turnuvası - Migration 0007: Eleme Ağacı Realtime
-- ----------------------------------------------------------------------------
-- Eleme ağacındaki canlı skor güncellemeleri için matches tablosunu
-- supabase_realtime publication'ına ekler. Satır düzeyinde güvenlik zaten
-- etkin (0002_rls.sql); anon kullanıcılar yalnızca yayındaki turnuvanın
-- yayınlanmış maçlarına ait değişiklik bildirimlerini alır (matches_select
-- politikası Postgres Changes için de uygulanır). Tablo publication'a daha
-- önce (ör. Dashboard'dan elle) eklenmişse hata vermeden atlanır.
-- ============================================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'matches'
  ) then
    alter publication supabase_realtime add table public.matches;
  end if;
end $$;
