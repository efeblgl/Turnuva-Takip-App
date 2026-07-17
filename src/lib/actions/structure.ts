"use server";

/**
 * Grup, saha ve turnuva ayarları işlemleri.
 */
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import {
  fieldErrorsOf, formToObject, groupSchema, tournamentSchema, venueSchema,
} from "../validation";
import type { ActionResult } from "../types";

function revalidateAll() {
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Gruplar
// ---------------------------------------------------------------------------

export async function saveGroupAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const groupId = String(formData.get("id") ?? "");
  const tournamentId = String(formData.get("tournament_id") ?? "");

  const parsed = groupSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return { ok: false, message: "Formda hatalar var.", fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const supabase = await createClient();

  if (groupId) {
    const { error } = await supabase.from("groups").update(parsed.data).eq("id", groupId);
    if (error) return { ok: false, message: `Grup güncellenemedi: ${error.message}` };
    revalidateAll();
    return { ok: true, message: "Grup güncellendi." };
  }

  const { error } = await supabase
    .from("groups")
    .insert({ ...parsed.data, tournament_id: tournamentId });
  if (error) {
    if (error.code === "23505") {
      return { ok: false, message: "Bu isimde bir grup zaten var." };
    }
    return { ok: false, message: `Grup eklenemedi: ${error.message}` };
  }
  revalidateAll();
  return { ok: true, message: "Grup oluşturuldu." };
}

export async function deleteGroupAction(groupId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { count } = await supabase
    .from("teams")
    .select("id", { count: "exact", head: true })
    .eq("group_id", groupId);
  if ((count ?? 0) > 0) {
    return {
      ok: false,
      message: "Bu grupta takımlar var. Önce takımları başka gruba taşıyın.",
    };
  }

  const { error } = await supabase.from("groups").delete().eq("id", groupId);
  if (error) return { ok: false, message: `Grup silinemedi: ${error.message}` };
  revalidateAll();
  return { ok: true, message: "Grup silindi." };
}

/**
 * Takım -> grup atamalarını toplu kaydeder.
 * Rastgele / torba dağıtımı arayüzde ön izlenir, onaylanınca buraya gelir
 * (şartname madde 16: onay verilmeden veri tabanına kaydedilmez).
 */
export async function assignTeamsToGroupsAction(
  assignments: Array<{ teamId: string; groupId: string | null }>
): Promise<ActionResult> {
  const supabase = await createClient();

  for (const a of assignments) {
    const { error } = await supabase
      .from("teams")
      .update({ group_id: a.groupId })
      .eq("id", a.teamId);
    if (error) {
      return { ok: false, message: `Atama sırasında hata oluştu: ${error.message}` };
    }
  }
  revalidateAll();
  return { ok: true, message: "Takımlar gruplara dağıtıldı." };
}

// ---------------------------------------------------------------------------
// Sahalar
// ---------------------------------------------------------------------------

export async function saveVenueAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const venueId = String(formData.get("id") ?? "");
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const imageUrl = String(formData.get("image_url") ?? "");

  const parsed = venueSchema.safeParse(formToObject(formData, ["is_active"]));
  if (!parsed.success) {
    return { ok: false, message: "Formda hatalar var.", fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const supabase = await createClient();
  const payload = { ...parsed.data, image_url: imageUrl || null };

  if (venueId) {
    const { error } = await supabase.from("venues").update(payload).eq("id", venueId);
    if (error) return { ok: false, message: `Saha güncellenemedi: ${error.message}` };
    revalidateAll();
    return { ok: true, message: "Saha güncellendi." };
  }

  const { error } = await supabase
    .from("venues")
    .insert({ ...payload, tournament_id: tournamentId });
  if (error) return { ok: false, message: `Saha eklenemedi: ${error.message}` };
  revalidateAll();
  return { ok: true, message: "Saha eklendi." };
}

// ---------------------------------------------------------------------------
// Turnuva ayarları
// ---------------------------------------------------------------------------

export async function saveTournamentAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const tournamentId = String(formData.get("id") ?? "");
  const logoUrl = String(formData.get("logo_url") ?? "");
  const municipalityLogoUrl = String(formData.get("municipality_logo_url") ?? "");
  const organizerLogoUrl = String(formData.get("organizer_logo_url") ?? "");

  const parsed = tournamentSchema.safeParse(formToObject(formData, ["is_public"]));
  if (!parsed.success) {
    return { ok: false, message: "Formda hatalar var.", fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const supabase = await createClient();
  const payload = {
    ...parsed.data,
    logo_url: logoUrl || null,
    municipality_logo_url: municipalityLogoUrl || null,
    organizer_logo_url: organizerLogoUrl || null,
  };

  if (!tournamentId) {
    const { error } = await supabase.from("tournaments").insert(payload);
    if (error) return { ok: false, message: `Turnuva oluşturulamadı: ${error.message}` };
    revalidateAll();
    return { ok: true, message: "Turnuva oluşturuldu." };
  }

  const { error } = await supabase.from("tournaments").update(payload).eq("id", tournamentId);
  if (error) return { ok: false, message: `Ayarlar kaydedilemedi: ${error.message}` };
  revalidateAll();
  return { ok: true, message: "Turnuva ayarları kaydedildi." };
}

/** Tek bir ayar anahtarını (JSON değerle) kaydeder. */
export async function saveSettingAction(
  tournamentId: string,
  key: string,
  value: unknown,
  isPublic: boolean
): Promise<ActionResult> {
  // Alt bilgi (footer) düzenlemeye kapalıdır; imza koddan sabitlenmiştir.
  if (key === "footer") {
    return { ok: false, message: "Alt bilgi ayarları değiştirilemez." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("settings")
    .upsert(
      { tournament_id: tournamentId, setting_key: key, setting_value: value, is_public: isPublic },
      { onConflict: "tournament_id,setting_key" }
    );
  if (error) return { ok: false, message: `Ayar kaydedilemedi: ${error.message}` };
  revalidateAll();
  return { ok: true, message: "Ayar kaydedildi." };
}

/**
 * Turnuvayı sıfırlar: tüm maçlar (olaylar ve kartlar dahil) ile cezaları siler.
 * Takımlar, oyuncular, gruplar ve duyurular korunur. GERİ ALINAMAZ.
 */
export async function resetTournamentDataAction(tournamentId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error: matchError } = await supabase
    .from("matches")
    .delete()
    .eq("tournament_id", tournamentId);
  if (matchError) {
    return { ok: false, message: `Maçlar silinemedi: ${matchError.message}` };
  }

  const { error: suspError } = await supabase
    .from("suspensions")
    .delete()
    .eq("tournament_id", tournamentId);
  if (suspError) {
    return { ok: false, message: `Cezalar silinemedi: ${suspError.message}` };
  }

  revalidateAll();
  return { ok: true, message: "Turnuva verileri sıfırlandı (maçlar ve cezalar silindi)." };
}
