-- ============================================================================
-- Yığılca Futbol Turnuvası - Migration 0004: Storage (Dosya Yükleme)
-- ----------------------------------------------------------------------------
-- 6 bucket oluşturulur; hepsi herkese açık OKUNUR, yazma rol gerektirir.
-- Dosya sınırı: 5 MB. İzinli türler: JPG, PNG, WEBP.
-- SVG bilinçli olarak KAPALIDIR (script gömme / XSS riski nedeniyle).
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('tournament-logos',    'tournament-logos',    true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('team-logos',          'team-logos',          true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('player-photos',       'player-photos',       true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('announcement-images', 'announcement-images', true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('venue-images',        'venue-images',        true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('sponsor-logos',       'sponsor-logos',       true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Okuma: turnuva görselleri herkese açık
-- ----------------------------------------------------------------------------
create policy "storage_public_read" on storage.objects
  for select using (
    bucket_id in ('tournament-logos','team-logos','player-photos',
                  'announcement-images','venue-images','sponsor-logos')
  );

-- ----------------------------------------------------------------------------
-- Yazma: duyuru görsellerine içerik editörü de yükleyebilir,
-- diğer bucket'lar turnuva yöneticisi ve üstüne aittir.
-- ----------------------------------------------------------------------------
create policy "storage_admin_insert" on storage.objects
  for insert with check (
    (bucket_id in ('tournament-logos','team-logos','player-photos','venue-images','sponsor-logos')
      and public.has_any_role(array['super_admin','tournament_admin']))
    or (bucket_id = 'announcement-images'
      and public.has_any_role(array['super_admin','tournament_admin','content_editor']))
  );

create policy "storage_admin_update" on storage.objects
  for update using (
    (bucket_id in ('tournament-logos','team-logos','player-photos','venue-images','sponsor-logos')
      and public.has_any_role(array['super_admin','tournament_admin']))
    or (bucket_id = 'announcement-images'
      and public.has_any_role(array['super_admin','tournament_admin','content_editor']))
  )
  with check (
    (bucket_id in ('tournament-logos','team-logos','player-photos','venue-images','sponsor-logos')
      and public.has_any_role(array['super_admin','tournament_admin']))
    or (bucket_id = 'announcement-images'
      and public.has_any_role(array['super_admin','tournament_admin','content_editor']))
  );

create policy "storage_admin_delete" on storage.objects
  for delete using (
    (bucket_id in ('tournament-logos','team-logos','player-photos','venue-images','sponsor-logos')
      and public.has_any_role(array['super_admin','tournament_admin']))
    or (bucket_id = 'announcement-images'
      and public.has_any_role(array['super_admin','tournament_admin','content_editor']))
  );
