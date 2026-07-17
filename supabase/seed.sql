-- ============================================================================
-- Yığılca Futbol Turnuvası - Demo / Başlangıç Verileri (seed)
-- ----------------------------------------------------------------------------
-- 0001-0004 migration'ları çalıştırıldıktan SONRA uygulanır.
-- İçerik: 1 turnuva, 2 saha, 4 grup, 26 takım, takım başına 10 oyuncu,
--         6 tamamlanmış + 11 planlanmış maç, olaylar, 1 ceza, 3 duyuru, ayarlar.
-- Tüm kayıtlar gerçek veri yapısıyla çalışır ve panelden değiştirilebilir.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TURNUVA
-- ----------------------------------------------------------------------------
insert into public.tournaments
  (id, name, short_name, season, description, location,
   start_date, end_date, status, format, is_public)
values
  ('a0000000-0000-4000-8000-000000000001',
   'Yığılca Futbol Turnuvası 2026', 'YFT 2026', '2026',
   'Yığılca Belediyesi tarafından düzenlenen geleneksel futbol turnuvası. Mahalle ve köy takımlarımız centilmenlik çerçevesinde kupa için mücadele ediyor.',
   'Yığılca İlçe Stadyumu',
   date '2026-07-10', date '2026-08-23',
   'group_stage', 'group_knockout', true);

-- ----------------------------------------------------------------------------
-- SAHALAR
-- ----------------------------------------------------------------------------
insert into public.venues (id, tournament_id, name, address, is_active, description) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001',
   'Yığılca İlçe Stadyumu', 'Merkez Mah. Stadyum Cad. Yığılca / Düzce', true, 'Ana müsabaka sahası'),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001',
   'Yığılca Sentetik Saha', 'Atatürk Mah. Okul Sok. Yığılca / Düzce', true, 'Yedek saha');

-- ----------------------------------------------------------------------------
-- GRUPLAR
-- ----------------------------------------------------------------------------
insert into public.groups (id, tournament_id, name, short_name, color, qualification_count, sort_order) values
  ('c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'A Grubu', 'A', '#2563EB', 2, 1),
  ('c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'B Grubu', 'B', '#16A34A', 2, 2),
  ('c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'C Grubu', 'C', '#F97316', 2, 3),
  ('c0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'D Grubu', 'D', '#7C3AED', 2, 4);

-- ----------------------------------------------------------------------------
-- TAKIMLAR (26)  -- renkler örnektir, panelden değiştirilebilir
-- ----------------------------------------------------------------------------
insert into public.teams
  (id, tournament_id, group_id, name, short_name, code,
   primary_color, secondary_color, text_color,
   kit_primary_color, kit_secondary_color, goalkeeper_color, neighborhood, status)
values
  ('d0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','Yağcılar Spor','Yağcılar','YAG','#DC2626','#111827','#FFFFFF','#DC2626','#111827','#374151','Yağcılar','active'),
  ('d0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','Çamlı Spor','Çamlı','CAM','#16A34A','#FFFFFF','#FFFFFF','#16A34A','#FFFFFF','#F59E0B','Çamlı','active'),
  ('d0000000-0000-4000-8000-000000000003','a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','Doğanlar Spor','Doğanlar','DOG','#2563EB','#FFFFFF','#FFFFFF','#2563EB','#FFFFFF','#374151','Doğanlar','active'),
  ('d0000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','Mengen Spor','Mengen','MEN','#7C3AED','#FFFFFF','#FFFFFF','#7C3AED','#FFFFFF','#374151','Mengen','active'),
  ('d0000000-0000-4000-8000-000000000005','a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','Kocaoğlu Spor','Kocaoğlu','KOC','#0F766E','#FFFFFF','#FFFFFF','#0F766E','#FFFFFF','#374151','Kocaoğlu','active'),
  ('d0000000-0000-4000-8000-000000000006','a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','Gökçeağaç Spor','Gökçeağaç','GKA','#CA8A04','#111827','#FFFFFF','#CA8A04','#111827','#374151','Gökçeağaç','active'),
  ('d0000000-0000-4000-8000-000000000007','a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','Kırık Spor','Kırık','KRK','#4B5563','#F9FAFB','#FFFFFF','#4B5563','#F9FAFB','#16A34A','Kırık','active'),
  ('d0000000-0000-4000-8000-000000000008','a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000002','Gelenöz Spor','Gelenöz','GLZ','#B91C1C','#FEF3C7','#FFFFFF','#B91C1C','#FEF3C7','#374151','Gelenöz','active'),
  ('d0000000-0000-4000-8000-000000000009','a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000002','Salavat Spor','Salavat','SLV','#1D4ED8','#FFFFFF','#FFFFFF','#1D4ED8','#FFFFFF','#374151','Salavat','active'),
  ('d0000000-0000-4000-8000-000000000010','a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000002','Gökçeağaç Gençlik Spor','Gökçeağaç G.','GGS','#15803D','#FACC15','#FFFFFF','#15803D','#FACC15','#374151','Gökçeağaç','active'),
  ('d0000000-0000-4000-8000-000000000011','a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000002','Yeniyer Spor','Yeniyer','YEN','#0EA5E9','#0F172A','#FFFFFF','#0EA5E9','#0F172A','#374151','Yeniyer','active'),
  ('d0000000-0000-4000-8000-000000000012','a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000002','Atatürk Mahallesi Spor','Atatürk Mah.','ATM','#F97316','#111827','#FFFFFF','#F97316','#111827','#374151','Atatürk Mahallesi','active'),
  ('d0000000-0000-4000-8000-000000000013','a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000002','Hacılar Spor','Hacılar','HAC','#9333EA','#FFFFFF','#FFFFFF','#9333EA','#FFFFFF','#374151','Hacılar','active'),
  ('d0000000-0000-4000-8000-000000000014','a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000002','Ahmetçiler Spor','Ahmetçiler','AHM','#0369A1','#FFFFFF','#FFFFFF','#0369A1','#FFFFFF','#374151','Ahmetçiler','active'),
  ('d0000000-0000-4000-8000-000000000015','a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000003','Çekiç Otomotiv Spor','Çekiç Oto','CKO','#EA580C','#1F2937','#FFFFFF','#EA580C','#1F2937','#374151','Yığılca Merkez','active'),
  ('d0000000-0000-4000-8000-000000000016','a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000003','Traşlar Spor','Traşlar','TRS','#059669','#FFFFFF','#FFFFFF','#059669','#FFFFFF','#374151','Traşlar','active'),
  ('d0000000-0000-4000-8000-000000000017','a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000003','Kubilay Birlik Taksi Spor','Kubilay Taksi','KBT','#FACC15','#111827','#111827','#FACC15','#111827','#374151','Yığılca Merkez','active'),
  ('d0000000-0000-4000-8000-000000000018','a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000003','Asar Spor','Asar','ASR','#1E3A8A','#FFFFFF','#FFFFFF','#1E3A8A','#FFFFFF','#374151','Asar','active'),
  ('d0000000-0000-4000-8000-000000000019','a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000003','Akçaören Spor','Akçaören','AKC','#DB2777','#FFFFFF','#FFFFFF','#DB2777','#FFFFFF','#374151','Akçaören','active'),
  ('d0000000-0000-4000-8000-000000000020','a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000003','Karakaş Spor','Karakaş','KRS','#111827','#F97316','#FFFFFF','#111827','#F97316','#374151','Karakaş','active'),
  ('d0000000-0000-4000-8000-000000000021','a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000004','Aksaklar Spor','Aksaklar','AKS','#65A30D','#FFFFFF','#FFFFFF','#65A30D','#FFFFFF','#374151','Aksaklar','active'),
  ('d0000000-0000-4000-8000-000000000022','a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000004','Köseler Gençlik Spor','Köseler','KGS','#C2410C','#FFF7ED','#FFFFFF','#C2410C','#FFF7ED','#374151','Köseler','active'),
  ('d0000000-0000-4000-8000-000000000023','a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000004','Çukurören Spor','Çukurören','CKR','#075985','#E0F2FE','#FFFFFF','#075985','#E0F2FE','#374151','Çukurören','active'),
  ('d0000000-0000-4000-8000-000000000024','a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000004','Mehmetler Gençlik Spor','Mehmetler','MGS','#6D28D9','#FDE68A','#FFFFFF','#6D28D9','#FDE68A','#374151','Mehmetler','active'),
  ('d0000000-0000-4000-8000-000000000025','a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000004','SS Tırcılar ve Kamyoncular Spor','Tırcılar','TIR','#B45309','#FFFFFF','#FFFFFF','#B45309','#FFFFFF','#374151','Yığılca Merkez','active'),
  ('d0000000-0000-4000-8000-000000000026','a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000004','Redifler Spor','Redifler','RDF','#991B1B','#FBBF24','#FFFFFF','#991B1B','#FBBF24','#374151','Redifler','active');

-- ----------------------------------------------------------------------------
-- OYUNCULAR: her takıma 10 oyuncu (1 kaleci, 3 defans, 4 orta saha, 2 forvet)
-- Forma 1 = kaleci, forma 10 = kaptan. İsimler örnek amaçlıdır.
-- ----------------------------------------------------------------------------
do $seed_players$
declare
  first_names text[] := array[
    'Ahmet','Mehmet','Mustafa','Ali','Hüseyin','Hasan','İbrahim','Osman','Yusuf','Murat',
    'Ömer','Ramazan','Halil','Süleyman','Abdullah','Emre','Burak','Serkan','Uğur','Volkan',
    'Erhan','Tolga','Cem','Kadir','Selim','Furkan','Oğuz','Baran','Deniz','Kaan',
    'Berat','Yasin','Enes','Umut','Eren','Arda','Çağrı','Gökhan','Sedat','Tuncay'];
  last_names text[] := array[
    'Yılmaz','Kaya','Demir','Çelik','Şahin','Yıldız','Yıldırım','Öztürk','Aydın','Özdemir',
    'Arslan','Doğan','Kılıç','Aslan','Çetin','Kara','Koç','Kurt','Özkan','Şimşek',
    'Polat','Korkmaz','Çakır','Erdoğan','Yavuz','Aksoy','Güneş','Bulut','Keskin','Turan',
    'Avcı','Sarı','Duman','Ateş','Bozkurt','Taş','Acar','Aydoğdu','Tekin','Karaca'];
  t record;
  rn int := 0;
  i int;
  v_position text;
begin
  for t in
    select id from public.teams
    where tournament_id = 'a0000000-0000-4000-8000-000000000001'
    order by name
  loop
    rn := rn + 1;
    for i in 1..10 loop
      v_position := case
        when i = 1 then 'goalkeeper'
        when i between 2 and 4 then 'defender'
        when i between 5 and 8 then 'midfielder'
        else 'forward'
      end;

      insert into public.players
        (team_id, first_name, last_name, shirt_number, position,
         birth_year, is_captain, is_goalkeeper, is_active)
      values (
        t.id,
        first_names[((rn * 7 + i * 3) % 40) + 1],
        last_names[((rn * 11 + i * 5) % 40) + 1],
        i,
        v_position,
        1988 + ((rn + i * 2) % 15),
        (i = 10),
        (i = 1),
        true
      );
    end loop;

    update public.teams
    set captain_player_id = (
      select p.id from public.players p
      where p.team_id = t.id and p.is_captain limit 1)
    where id = t.id;
  end loop;
end
$seed_players$;

-- ----------------------------------------------------------------------------
-- MAÇLAR
-- Tamamlanan: 1. Hafta (11-13 Temmuz) | Planlanan: 2. Hafta (17-23 Temmuz)
-- ----------------------------------------------------------------------------
insert into public.matches
  (id, tournament_id, group_id, venue_id, home_team_id, away_team_id,
   home_score, away_score, stage, round_name, week_number,
   match_date, start_time, status, referee_name, is_published)
values
  -- Tamamlanan maçlar
  ('e0000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000002',2,1,'group','1. Hafta',1,date '2026-07-11',time '18:00','completed','Kemal Aydın',true),
  ('e0000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000003','d0000000-0000-4000-8000-000000000004',0,0,'group','1. Hafta',1,date '2026-07-11',time '20:00','completed','Serdar Koçak',true),
  ('e0000000-0000-4000-8000-000000000003','a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000005','d0000000-0000-4000-8000-000000000006',1,3,'group','1. Hafta',1,date '2026-07-12',time '18:00','completed','Kemal Aydın',true),
  ('e0000000-0000-4000-8000-000000000004','a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000008','d0000000-0000-4000-8000-000000000009',2,2,'group','1. Hafta',1,date '2026-07-12',time '20:00','completed','Serdar Koçak',true),
  ('e0000000-0000-4000-8000-000000000005','a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000012','d0000000-0000-4000-8000-000000000013',4,0,'group','1. Hafta',1,date '2026-07-13',time '18:00','completed','Kemal Aydın',true),
  ('e0000000-0000-4000-8000-000000000006','a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000015','d0000000-0000-4000-8000-000000000016',1,0,'group','1. Hafta',1,date '2026-07-13',time '20:00','completed','Serdar Koçak',true),
  -- Planlanan maçlar
  ('e0000000-0000-4000-8000-000000000015','a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000004','b0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000021','d0000000-0000-4000-8000-000000000022',null,null,'group','1. Hafta',1,date '2026-07-17',time '18:00','scheduled',null,true),
  ('e0000000-0000-4000-8000-000000000016','a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000004','b0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000023','d0000000-0000-4000-8000-000000000024',null,null,'group','1. Hafta',1,date '2026-07-17',time '20:00','scheduled',null,true),
  ('e0000000-0000-4000-8000-000000000017','a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000004','b0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000025','d0000000-0000-4000-8000-000000000026',null,null,'group','1. Hafta',1,date '2026-07-18',time '16:00','scheduled',null,true),
  ('e0000000-0000-4000-8000-000000000007','a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000003',null,null,'group','2. Hafta',2,date '2026-07-18',time '18:00','scheduled',null,true),
  ('e0000000-0000-4000-8000-000000000008','a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000004','d0000000-0000-4000-8000-000000000005',null,null,'group','2. Hafta',2,date '2026-07-18',time '20:00','scheduled',null,true),
  ('e0000000-0000-4000-8000-000000000009','a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000006','d0000000-0000-4000-8000-000000000007',null,null,'group','2. Hafta',2,date '2026-07-19',time '18:00','scheduled',null,true),
  ('e0000000-0000-4000-8000-000000000010','a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000009','d0000000-0000-4000-8000-000000000012',null,null,'group','2. Hafta',2,date '2026-07-19',time '20:00','scheduled',null,true),
  ('e0000000-0000-4000-8000-000000000011','a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000014','d0000000-0000-4000-8000-000000000008',null,null,'group','2. Hafta',2,date '2026-07-20',time '18:00','scheduled',null,true),
  ('e0000000-0000-4000-8000-000000000012','a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000011','d0000000-0000-4000-8000-000000000010',null,null,'group','2. Hafta',2,date '2026-07-20',time '20:00','scheduled',null,true),
  ('e0000000-0000-4000-8000-000000000013','a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000017','d0000000-0000-4000-8000-000000000018',null,null,'group','2. Hafta',2,date '2026-07-21',time '18:00','scheduled',null,true),
  ('e0000000-0000-4000-8000-000000000014','a0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000003','b0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000019','d0000000-0000-4000-8000-000000000020',null,null,'group','2. Hafta',2,date '2026-07-21',time '20:00','scheduled',null,true);

-- ----------------------------------------------------------------------------
-- MAÇ OLAYLARI (skorlarla tutarlı; kartlar cards tablosuna trigger ile yansır)
-- ----------------------------------------------------------------------------
insert into public.match_events (match_id, team_id, player_id, event_type, minute, description) values
  -- Yağcılar 2-1 Çamlı
  ('e0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000001',(select id from public.players where team_id='d0000000-0000-4000-8000-000000000001' and shirt_number=9),'goal',12,null),
  ('e0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000001',(select id from public.players where team_id='d0000000-0000-4000-8000-000000000001' and shirt_number=10),'goal',55,null),
  ('e0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000002',(select id from public.players where team_id='d0000000-0000-4000-8000-000000000002' and shirt_number=9),'goal',70,null),
  ('e0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000002',(select id from public.players where team_id='d0000000-0000-4000-8000-000000000002' and shirt_number=4),'yellow_card',33,'Sert müdahale'),
  -- Doğanlar 0-0 Mengen
  ('e0000000-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000003',(select id from public.players where team_id='d0000000-0000-4000-8000-000000000003' and shirt_number=6),'yellow_card',41,null),
  ('e0000000-0000-4000-8000-000000000002','d0000000-0000-4000-8000-000000000004',(select id from public.players where team_id='d0000000-0000-4000-8000-000000000004' and shirt_number=8),'yellow_card',77,null),
  -- Kocaoğlu 1-3 Gökçeağaç
  ('e0000000-0000-4000-8000-000000000003','d0000000-0000-4000-8000-000000000005',(select id from public.players where team_id='d0000000-0000-4000-8000-000000000005' and shirt_number=10),'goal',21,null),
  ('e0000000-0000-4000-8000-000000000003','d0000000-0000-4000-8000-000000000006',(select id from public.players where team_id='d0000000-0000-4000-8000-000000000006' and shirt_number=9),'goal',34,null),
  ('e0000000-0000-4000-8000-000000000003','d0000000-0000-4000-8000-000000000006',(select id from public.players where team_id='d0000000-0000-4000-8000-000000000006' and shirt_number=9),'goal',58,null),
  ('e0000000-0000-4000-8000-000000000003','d0000000-0000-4000-8000-000000000006',(select id from public.players where team_id='d0000000-0000-4000-8000-000000000006' and shirt_number=7),'goal',77,null),
  ('e0000000-0000-4000-8000-000000000003','d0000000-0000-4000-8000-000000000005',(select id from public.players where team_id='d0000000-0000-4000-8000-000000000005' and shirt_number=5),'red_card',80,'Rakibe faul sonrası itiraz'),
  -- Gelenöz 2-2 Salavat
  ('e0000000-0000-4000-8000-000000000004','d0000000-0000-4000-8000-000000000008',(select id from public.players where team_id='d0000000-0000-4000-8000-000000000008' and shirt_number=9),'goal',15,null),
  ('e0000000-0000-4000-8000-000000000004','d0000000-0000-4000-8000-000000000008',(select id from public.players where team_id='d0000000-0000-4000-8000-000000000008' and shirt_number=8),'goal',48,null),
  ('e0000000-0000-4000-8000-000000000004','d0000000-0000-4000-8000-000000000009',(select id from public.players where team_id='d0000000-0000-4000-8000-000000000009' and shirt_number=10),'goal',30,null),
  ('e0000000-0000-4000-8000-000000000004','d0000000-0000-4000-8000-000000000009',(select id from public.players where team_id='d0000000-0000-4000-8000-000000000009' and shirt_number=10),'goal',85,null),
  -- Atatürk Mahallesi 4-0 Hacılar
  ('e0000000-0000-4000-8000-000000000005','d0000000-0000-4000-8000-000000000012',(select id from public.players where team_id='d0000000-0000-4000-8000-000000000012' and shirt_number=9),'goal',10,null),
  ('e0000000-0000-4000-8000-000000000005','d0000000-0000-4000-8000-000000000012',(select id from public.players where team_id='d0000000-0000-4000-8000-000000000012' and shirt_number=9),'goal',40,null),
  ('e0000000-0000-4000-8000-000000000005','d0000000-0000-4000-8000-000000000012',(select id from public.players where team_id='d0000000-0000-4000-8000-000000000012' and shirt_number=10),'goal',66,null),
  ('e0000000-0000-4000-8000-000000000005','d0000000-0000-4000-8000-000000000012',(select id from public.players where team_id='d0000000-0000-4000-8000-000000000012' and shirt_number=8),'penalty_goal',78,'Penaltıdan'),
  ('e0000000-0000-4000-8000-000000000005','d0000000-0000-4000-8000-000000000013',(select id from public.players where team_id='d0000000-0000-4000-8000-000000000013' and shirt_number=5),'yellow_card',52,null),
  -- Çekiç Otomotiv 1-0 Traşlar
  ('e0000000-0000-4000-8000-000000000006','d0000000-0000-4000-8000-000000000015',(select id from public.players where team_id='d0000000-0000-4000-8000-000000000015' and shirt_number=10),'goal',52,null),
  ('e0000000-0000-4000-8000-000000000006','d0000000-0000-4000-8000-000000000016',(select id from public.players where team_id='d0000000-0000-4000-8000-000000000016' and shirt_number=6),'yellow_card',61,null);

-- ----------------------------------------------------------------------------
-- CEZA: kırmızı kart gören oyuncuya 1 maç
-- ----------------------------------------------------------------------------
insert into public.suspensions
  (tournament_id, team_id, player_id, suspension_type, reason,
   total_matches, remaining_matches, is_active, decision_date, start_date)
values
  ('a0000000-0000-4000-8000-000000000001',
   'd0000000-0000-4000-8000-000000000005',
   (select id from public.players where team_id='d0000000-0000-4000-8000-000000000005' and shirt_number=5),
   'one_match', 'Direkt kırmızı kart (Gökçeağaç Spor maçı, 80. dk)',
   1, 1, true, date '2026-07-12', date '2026-07-12');

-- ----------------------------------------------------------------------------
-- DUYURULAR
-- ----------------------------------------------------------------------------
insert into public.announcements
  (tournament_id, title, slug, summary, content, announcement_type,
   is_important, is_published, publish_date)
values
  ('a0000000-0000-4000-8000-000000000001',
   'Yığılca Futbol Turnuvası 2026 Başladı!',
   'turnuva-basladi',
   '26 takımın katılımıyla geleneksel futbol turnuvamız başladı. Tüm maçlar Yığılca İlçe Stadyumu''nda oynanacak.',
   'Yığılca Belediyesi tarafından düzenlenen futbol turnuvamız 10 Temmuz''da başladı. 4 grupta mücadele eden 26 takımımıza başarılar dileriz. Maçlar hafta içi 18.00 ve 20.00, hafta sonu 16.00, 18.00 ve 20.00 seanslarında oynanacaktır. Tüm hemşehrilerimiz maçlara davetlidir.',
   'general', true, true, timestamptz '2026-07-10 09:00+03'),
  ('a0000000-0000-4000-8000-000000000001',
   'Grup Aşaması Fikstürü Yayınlandı',
   'fikstur-yayinlandi',
   'Grup aşaması maç programı belli oldu. Fikstür sayfasından tüm maçları inceleyebilirsiniz.',
   'Kura çekimi sonucunda gruplar ve maç programı kesinleşti. Her takım grubundaki rakipleriyle tek devreli lig usulü karşılaşacak; grubunu ilk 2 sırada bitiren takımlar eleme aşamasına yükselecektir.',
   'fixture', false, true, timestamptz '2026-07-08 12:00+03'),
  ('a0000000-0000-4000-8000-000000000001',
   '2. Hafta Programı Açıklandı',
   '2-hafta-programi',
   '2. hafta maçları 18-21 Temmuz tarihlerinde oynanacak.',
   'Grup aşaması 2. hafta müsabakaları 18-21 Temmuz tarihleri arasında Yığılca İlçe Stadyumu''nda oynanacaktır. Takımlarımızın maç saatinden 30 dakika önce sahada hazır bulunmaları rica olunur.',
   'fixture', false, true, timestamptz '2026-07-16 10:00+03');

-- ----------------------------------------------------------------------------
-- AYARLAR
-- ----------------------------------------------------------------------------
insert into public.settings (tournament_id, setting_key, setting_value, is_public) values
  -- Puan durumu sıralama kriterleri (şartname madde 24 varsayılanı)
  ('a0000000-0000-4000-8000-000000000001', 'standings_tiebreakers',
   '["points","goal_difference","goals_for","h2h_goal_difference","h2h_goals_for","fewest_red_cards","fewest_yellow_cards"]', true),
  -- Gol krallığı eşitlik kriterleri (şartname madde 29)
  ('a0000000-0000-4000-8000-000000000001', 'top_scorer_tiebreakers',
   '["fewest_matches","most_assists","fewest_cards"]', true),
  -- Hükmen sonuç kuralları (şartname madde 26)
  ('a0000000-0000-4000-8000-000000000001', 'forfeit_rules',
   '{"award_points": true, "count_in_goal_stats": true, "count_player_goals": false}', false),
  -- Turnuva kuralları sayfası içeriği (panelden düzenlenebilir)
  ('a0000000-0000-4000-8000-000000000001', 'rules_content',
   '{"html": "<h2>Genel Kurallar</h2><ul><li>Maçlar 2 x 30 dakika oynanır; devre arası 10 dakikadır.</li><li>Takımlar sahaya 7 as + en fazla 5 yedek oyuncu ile çıkar.</li><li>Oyuncu değişikliği sınırsızdır; çıkan oyuncu tekrar oyuna giremez.</li><li>Bir maçta iki sarı kart gören oyuncu kırmızı kartla oyun dışı kalır.</li><li>Direkt kırmızı kart gören oyuncu en az 1 maç ceza alır; disiplin kurulu cezayı artırabilir.</li><li>Maç saatinde sahaya çıkmayan takım 3-0 hükmen mağlup sayılır.</li><li>Grup sıralaması: puan, averaj, atılan gol, ikili averaj sırasıyla belirlenir.</li><li>İtirazlar maç bitiminden itibaren 24 saat içinde yazılı olarak yapılır.</li><li>Takım sorumluları oyuncu kimliklerini maç öncesi hakeme ibraz eder.</li><li>Saha ve tesis kurallarına uymayan takımlar disiplin kuruluna sevk edilir.</li></ul>"}', true),
  -- Alt bilgi (footer) içeriği - "Cresco Dijital" imzası burada yer alır
  ('a0000000-0000-4000-8000-000000000001', 'footer',
   '{"municipality": "Yığılca Belediyesi", "organization": "Yığılca Belediyesi Gençlik ve Spor Hizmetleri", "email": "", "phone": "", "address": "Yığılca / Düzce", "instagram": "", "facebook": "", "credit": "Cresco Dijital"}', true);
