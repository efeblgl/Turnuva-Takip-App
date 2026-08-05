"use server";

/**
 * Maç işlemleri: oluşturma, düzenleme, skor girişi (atomik RPC),
 * erteleme, iptal, hükmen sonuç, fikstür kaydetme ve eleme ağacı üretimi.
 */
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import {
  fieldErrorsOf, formToObject, matchSchema, postponeSchema, scoreEntrySchema,
} from "../validation";
import { slugifyTr } from "../utils";
import type { DraftMatch } from "../fixtures";
import type { ActionResult, ForfeitType, KnockoutRound } from "../types";

function revalidateAll() {
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Maç oluşturma / plan düzenleme
// ---------------------------------------------------------------------------

export async function saveMatchAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const matchId = String(formData.get("id") ?? "");
  const tournamentId = String(formData.get("tournament_id") ?? "");

  const parsed = matchSchema.safeParse(formToObject(formData, ["is_published"]));
  if (!parsed.success) {
    return { ok: false, message: "Formda hatalar var.", fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const supabase = await createClient();

  if (matchId) {
    const { error } = await supabase.from("matches").update(parsed.data).eq("id", matchId);
    if (error) return { ok: false, message: friendlyMatchError(error.message) };
    revalidateAll();
    return { ok: true, message: "Maç güncellendi.", id: matchId };
  }

  const { data, error } = await supabase
    .from("matches")
    .insert({ ...parsed.data, tournament_id: tournamentId, stage: "group" })
    .select("id")
    .single();
  if (error) return { ok: false, message: friendlyMatchError(error.message) };
  revalidateAll();
  return { ok: true, message: "Maç eklendi.", id: data.id };
}

function friendlyMatchError(message: string): string {
  if (message.includes("başka bir maç zaten planlanmış")) {
    return "Aynı sahada aynı tarih ve saatte başka bir maç var.";
  }
  return `İşlem gerçekleştirilemedi: ${message}`;
}

export async function deleteMatchAction(matchId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("matches").delete().eq("id", matchId);
  if (error) return { ok: false, message: `Maç silinemedi: ${error.message}` };
  revalidateAll();
  return { ok: true, message: "Maç silindi." };
}

// ---------------------------------------------------------------------------
// Skor girişi (atomik RPC: puan durumu, gol krallığı, kartlar, eleme turu
// ilerletme ve cezalar otomatik güncellenir)
// ---------------------------------------------------------------------------

export interface ScoreEventPayload {
  team_id: string | null;
  player_id: string | null;
  secondary_player_id: string | null;
  event_type: string;
  minute: number | null;
  extra_minute: number | null;
  description: string | null;
}

export async function saveScoreAction(
  matchId: string,
  payload: {
    home_score: number;
    away_score: number;
    home_penalty_score: number | null;
    away_penalty_score: number | null;
    status: string;
    referee_name: string | null;
    assistant_referees: string | null;
    notes: string | null;
    events: ScoreEventPayload[];
  }
): Promise<ActionResult> {
  const parsed = scoreEntrySchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Skor bilgilerinde hata var. Lütfen kontrol edin.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  // Gol olayları skorla tutarlı mı? (uyarı amaçlı kontrol, şartname madde 42)
  const d = parsed.data;
  const goalTypes = ["goal", "penalty_goal", "own_goal"];
  const goalEvents = d.events.filter((e) => goalTypes.includes(e.event_type));
  const totalGoals = d.home_score + d.away_score;
  let warning = "";
  if (goalEvents.length > 0 && goalEvents.length !== totalGoals) {
    warning = ` (Uyarı: girilen gol olayı sayısı (${goalEvents.length}) toplam skorla (${totalGoals}) uyuşmuyor.)`;
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_match_result", {
    p_match_id: matchId,
    p_home_score: d.home_score,
    p_away_score: d.away_score,
    p_status: d.status,
    p_home_penalty_score: d.home_penalty_score,
    p_away_penalty_score: d.away_penalty_score,
    p_referee_name: d.referee_name,
    p_assistant_referees: d.assistant_referees,
    p_notes: d.notes,
    p_events: d.events,
  });

  if (error) {
    return { ok: false, message: `Skor kaydedilemedi: ${error.message}` };
  }

  revalidateAll();
  return { ok: true, message: `Skor kaydedildi.${warning}` };
}

// ---------------------------------------------------------------------------
// Erteleme / iptal / hükmen
// ---------------------------------------------------------------------------

export async function postponeMatchAction(
  matchId: string,
  input: { new_date: string; new_time: string; reason: string; create_announcement: boolean }
): Promise<ActionResult> {
  const parsed = postponeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Erteleme bilgilerini kontrol edin.", fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const supabase = await createClient();
  const { data: match } = await supabase
    .from("matches")
    .select("*, home:teams!matches_home_team_id_fkey(name), away:teams!matches_away_team_id_fkey(name)")
    .eq("id", matchId)
    .maybeSingle();
  if (!match) return { ok: false, message: "Maç bulunamadı." };

  const { error } = await supabase
    .from("matches")
    .update({
      original_match_date: match.original_match_date ?? match.match_date,
      match_date: parsed.data.new_date ?? match.match_date,
      start_time: parsed.data.new_time ?? match.start_time,
      status: parsed.data.new_date ? "scheduled" : "postponed",
      postponement_reason: parsed.data.reason,
    })
    .eq("id", matchId);
  if (error) return { ok: false, message: friendlyMatchError(error.message) };

  // İsteğe bağlı otomatik duyuru (şartname madde 27)
  if (parsed.data.create_announcement) {
    const homeName = (match.home as { name?: string } | null)?.name ?? "Ev sahibi";
    const awayName = (match.away as { name?: string } | null)?.name ?? "Deplasman";
    const title = `${homeName} - ${awayName} maçı ertelendi`;
    await supabase.from("announcements").insert({
      tournament_id: match.tournament_id,
      title,
      slug: `${slugifyTr(title)}-${Date.now().toString(36)}`,
      summary: parsed.data.new_date
        ? `Maç ${parsed.data.new_date} tarihine ertelenmiştir.`
        : "Maç ileri bir tarihe ertelenmiştir. Yeni tarih açıklanacaktır.",
      content: `Erteleme sebebi: ${parsed.data.reason}`,
      announcement_type: "postponement",
      is_important: true,
      is_published: true,
    });
  }

  revalidateAll();
  return { ok: true, message: "Maç ertelendi." };
}

export async function cancelMatchAction(matchId: string, reason: string): Promise<ActionResult> {
  if (!reason.trim()) {
    return { ok: false, message: "İptal sebebi yazılmalıdır." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("matches")
    .update({ status: "cancelled", postponement_reason: reason.trim() })
    .eq("id", matchId);
  if (error) return { ok: false, message: `Maç iptal edilemedi: ${error.message}` };
  revalidateAll();
  return { ok: true, message: "Maç iptal edildi." };
}

/** Hükmen sonuç: skorlar turnuva ayarındaki hükmen skora göre yazılır. */
export async function forfeitMatchAction(
  matchId: string,
  forfeitType: ForfeitType,
  customScore?: { home: number; away: number },
  reason?: string
): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: match } = await supabase
    .from("matches")
    .select("id, tournament_id, tournament:tournaments(forfeit_home_score, forfeit_away_score)")
    .eq("id", matchId)
    .maybeSingle();
  if (!match) return { ok: false, message: "Maç bulunamadı." };

  const t = match.tournament as unknown as { forfeit_home_score: number; forfeit_away_score: number };
  const win = customScore?.home ?? t?.forfeit_home_score ?? 3;
  const lose = customScore?.away ?? t?.forfeit_away_score ?? 0;

  let homeScore = 0, awayScore = 0;
  if (forfeitType === "home_win") { homeScore = win; awayScore = lose; }
  else if (forfeitType === "away_win") { homeScore = lose; awayScore = win; }
  else if (forfeitType === "both_lose") { homeScore = 0; awayScore = 0; }
  else if (forfeitType === "cancelled") {
    return cancelMatchAction(matchId, reason ?? "Yönetim kararı");
  }

  // Önce hükmen bilgisini işaretle, ardından RPC skoru işlesin
  const { error: flagError } = await supabase
    .from("matches")
    .update({ is_forfeit: true, forfeit_type: forfeitType })
    .eq("id", matchId);
  if (flagError) return { ok: false, message: `İşlem gerçekleştirilemedi: ${flagError.message}` };

  const { error } = await supabase.rpc("save_match_result", {
    p_match_id: matchId,
    p_home_score: homeScore,
    p_away_score: awayScore,
    p_status: "forfeited",
    p_home_penalty_score: null,
    p_away_penalty_score: null,
    p_referee_name: null,
    p_assistant_referees: null,
    p_notes: reason ?? null,
    p_events: [],
  });
  if (error) return { ok: false, message: `Hükmen sonuç kaydedilemedi: ${error.message}` };

  revalidateAll();
  return { ok: true, message: "Hükmen sonuç kaydedildi." };
}

// ---------------------------------------------------------------------------
// Fikstür kaydetme / yayınlama
// ---------------------------------------------------------------------------

export async function saveGeneratedFixtureAction(
  tournamentId: string,
  matches: DraftMatch[],
  publish: boolean
): Promise<ActionResult> {
  if (matches.length === 0) {
    return { ok: false, message: "Kaydedilecek maç yok." };
  }

  const supabase = await createClient();
  const rows = matches.map((m) => ({
    tournament_id: tournamentId,
    group_id: m.groupId,
    venue_id: m.venueId || null,
    home_team_id: m.homeTeamId,
    away_team_id: m.awayTeamId,
    week_number: m.weekNumber,
    round_name: m.roundName,
    match_date: m.matchDate,
    start_time: m.startTime,
    stage: "group" as const,
    status: "scheduled" as const,
    is_published: publish,
  }));

  const { error } = await supabase.from("matches").insert(rows);
  if (error) return { ok: false, message: friendlyMatchError(error.message) };

  revalidateAll();
  return {
    ok: true,
    message: publish
      ? `Fikstür oluşturuldu ve yayınlandı (${rows.length} maç).`
      : `Fikstür taslak olarak kaydedildi (${rows.length} maç).`,
  };
}

/** Turnuvanın taslak maçlarını topluca yayınlar. */
export async function publishFixtureAction(tournamentId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("matches")
    .update({ is_published: true })
    .eq("tournament_id", tournamentId)
    .eq("is_published", false);
  if (error) return { ok: false, message: `Fikstür yayınlanamadı: ${error.message}` };
  revalidateAll();
  return { ok: true, message: "Fikstür yayınlandı." };
}

// ---------------------------------------------------------------------------
// Eleme aşaması
// ---------------------------------------------------------------------------

/** Turnuvanın taslak eleme maçlarını topluca yayınlar (grup maçlarına dokunmaz). */
export async function publishKnockoutAction(tournamentId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("matches")
    .update({ is_published: true })
    .eq("tournament_id", tournamentId)
    .eq("stage", "knockout")
    .eq("is_published", false);
  if (error) return { ok: false, message: `Eleme maçları yayınlanamadı: ${error.message}` };
  revalidateAll();
  return { ok: true, message: "Eleme maçları yayınlandı." };
}

export interface KnockoutPairInput {
  home: string | null;
  away: string | null;
}

const NEXT_ROUND: Partial<Record<KnockoutRound, KnockoutRound>> = {
  round_of_32: "round_of_16",
  round_of_16: "quarter_final",
  quarter_final: "semi_final",
  semi_final: "final",
};

const ROUND_LABELS_TR: Record<KnockoutRound, string> = {
  round_of_32: "Son 32",
  round_of_16: "Son 16",
  quarter_final: "Çeyrek Final",
  semi_final: "Yarı Final",
  third_place: "Üçüncülük Maçı",
  final: "Final",
};

/**
 * Eleme ağacını oluşturur: verilen turdan finale kadar tüm maçları
 * yer tutucularla üretir ve kazanan bağlantılarını (next_match_id) kurar.
 * Yarı finalde üçüncülük maçı bağlantısı da (kaybedenler) kurulur.
 */
export async function generateKnockoutAction(
  tournamentId: string,
  startRound: KnockoutRound,
  pairs: KnockoutPairInput[],
  includeThirdPlace: boolean
): Promise<ActionResult> {
  if (pairs.length === 0) {
    return { ok: false, message: "En az bir eşleşme gereklidir." };
  }
  const validSizes: Record<string, number> = {
    round_of_32: 16, round_of_16: 8, quarter_final: 4, semi_final: 2, final: 1,
  };
  if (validSizes[startRound] !== pairs.length) {
    return {
      ok: false,
      message: `${ROUND_LABELS_TR[startRound]} için ${validSizes[startRound]} eşleşme gerekir (${pairs.length} verildi).`,
    };
  }

  const supabase = await createClient();

  // Mevcut eleme maçları varsa engelle (yanlışlıkla iki ağaç kurulmasın)
  const { count } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournamentId)
    .eq("stage", "knockout");
  if ((count ?? 0) > 0) {
    return {
      ok: false,
      message: "Zaten oluşturulmuş bir eleme ağacı var. Önce mevcut eleme maçlarını silin.",
    };
  }

  // Finalden geriye doğru oluştur: önce hedef maçlar, sonra bağlananlar
  const insertMatch = async (row: Record<string, unknown>): Promise<string | null> => {
    const { data, error } = await supabase.from("matches").insert(row).select("id").single();
    if (error) throw new Error(error.message);
    return data?.id ?? null;
  };

  try {
    // Tur zinciri: startRound -> ... -> final
    const chain: KnockoutRound[] = [];
    let r: KnockoutRound | undefined = startRound;
    while (r) {
      chain.push(r);
      r = NEXT_ROUND[r];
    }
    if (!chain.includes("final")) chain.push("final");

    // Her tur için maç kimlikleri (finalden geriye)
    const idsByRound = new Map<KnockoutRound, string[]>();
    let thirdPlaceId: string | null = null;

    for (let i = chain.length - 1; i >= 0; i--) {
      const round = chain[i];
      const matchCount = validSizes[round] ?? 1;
      const nextIds = i < chain.length - 1 ? idsByRound.get(chain[i + 1])! : [];
      const ids: string[] = [];

      // Üçüncülük maçı (yarı final kaybedenleri) finalden önce oluşturulur
      if (round === "semi_final" && includeThirdPlace && !thirdPlaceId) {
        thirdPlaceId = await insertMatch({
          tournament_id: tournamentId,
          stage: "knockout",
          knockout_round: "third_place",
          round_name: ROUND_LABELS_TR.third_place,
          bracket_position: 1,
          status: "scheduled",
          is_published: false,
        });
      }

      for (let pos = 0; pos < matchCount; pos++) {
        const isStart = round === startRound;
        const pair = isStart ? pairs[pos] : null;
        const id = await insertMatch({
          tournament_id: tournamentId,
          stage: "knockout",
          knockout_round: round,
          round_name: ROUND_LABELS_TR[round],
          bracket_position: pos + 1,
          home_team_id: pair?.home ?? null,
          away_team_id: pair?.away ?? null,
          next_match_id: nextIds.length > 0 ? nextIds[Math.floor(pos / 2)] : null,
          next_match_slot: nextIds.length > 0 ? (pos % 2 === 0 ? "home" : "away") : null,
          loser_next_match_id: round === "semi_final" ? thirdPlaceId : null,
          loser_next_match_slot:
            round === "semi_final" && thirdPlaceId ? (pos % 2 === 0 ? "home" : "away") : null,
          status: "scheduled",
          is_published: false,
        });
        if (id) ids.push(id);
      }
      idsByRound.set(round, ids);
    }
  } catch (err) {
    return {
      ok: false,
      message: `Eleme ağacı oluşturulamadı: ${err instanceof Error ? err.message : "bilinmeyen hata"}`,
    };
  }

  revalidateAll();
  return { ok: true, message: "Eleme ağacı oluşturuldu. Maç tarihlerini düzenleyip yayınlayabilirsiniz." };
}

/** Tüm eleme maçlarını siler (yanlış kurulum durumunda). */
export async function deleteKnockoutAction(tournamentId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("matches")
    .delete()
    .eq("tournament_id", tournamentId)
    .eq("stage", "knockout");
  if (error) return { ok: false, message: `Eleme maçları silinemedi: ${error.message}` };
  revalidateAll();
  return { ok: true, message: "Eleme maçları silindi." };
}
