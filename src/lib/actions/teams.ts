"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { fieldErrorsOf, formToObject, teamSchema, playerSchema } from "../validation";
import type { ActionResult } from "../types";

function revalidateAll() {
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Takım oluşturma / güncelleme
// ---------------------------------------------------------------------------

export async function saveTeamAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const teamId = String(formData.get("id") ?? "");
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const logoUrl = String(formData.get("logo_url") ?? "");

  const parsed = teamSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    return {
      ok: false,
      message: "Formda hatalar var. Lütfen işaretli alanları düzeltin.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const supabase = await createClient();

  // Aynı turnuvada aynı takım adı kontrolü (anlaşılır Türkçe hata için)
  const dupQuery = supabase
    .from("teams")
    .select("id")
    .eq("tournament_id", tournamentId)
    .ilike("name", parsed.data.name);
  const { data: dup } = teamId ? await dupQuery.neq("id", teamId) : await dupQuery;
  if (dup && dup.length > 0) {
    return {
      ok: false,
      message: "Bu turnuvada aynı isimde bir takım zaten var.",
      fieldErrors: { name: "Bu takım adı zaten kullanılıyor." },
    };
  }

  const payload = {
    ...parsed.data,
    logo_url: logoUrl || null,
    is_withdrawn: parsed.data.status === "withdrawn",
    is_disqualified: parsed.data.status === "disqualified",
  };

  if (teamId) {
    const { error } = await supabase.from("teams").update(payload).eq("id", teamId);
    if (error) return { ok: false, message: `Takım güncellenemedi: ${error.message}` };
    revalidateAll();
    return { ok: true, message: "Takım güncellendi.", id: teamId };
  }

  const { data, error } = await supabase
    .from("teams")
    .insert({ ...payload, tournament_id: tournamentId })
    .select("id")
    .single();
  if (error) return { ok: false, message: `Takım eklenemedi: ${error.message}` };
  revalidateAll();
  return { ok: true, message: "Takım başarıyla eklendi.", id: data.id };
}

/** Takımı kalıcı silmek yerine pasif yapar (şartname madde 44). */
export async function deactivateTeamAction(teamId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("teams")
    .update({ status: "passive" })
    .eq("id", teamId);
  if (error) return { ok: false, message: `İşlem gerçekleştirilemedi: ${error.message}` };
  revalidateAll();
  return { ok: true, message: "Takım pasif duruma alındı." };
}

// ---------------------------------------------------------------------------
// Oyuncular
// ---------------------------------------------------------------------------

export async function savePlayerAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const playerId = String(formData.get("id") ?? "");
  const photoUrl = String(formData.get("photo_url") ?? "");

  const parsed = playerSchema.safeParse(
    formToObject(formData, ["is_captain", "is_goalkeeper", "is_active"])
  );
  if (!parsed.success) {
    return {
      ok: false,
      message: "Formda hatalar var. Lütfen işaretli alanları düzeltin.",
      fieldErrors: fieldErrorsOf(parsed.error),
    };
  }

  const supabase = await createClient();

  // Aynı takımda aynı forma numarası uyarısı (engellemez, şartname madde 13)
  let warning = "";
  if (parsed.data.shirt_number !== null) {
    const numQuery = supabase
      .from("players")
      .select("id")
      .eq("team_id", parsed.data.team_id)
      .eq("shirt_number", parsed.data.shirt_number)
      .eq("is_active", true);
    const { data: sameNumber } = playerId
      ? await numQuery.neq("id", playerId)
      : await numQuery;
    if (sameNumber && sameNumber.length > 0) {
      warning = " (Uyarı: bu takımda aynı forma numarasını taşıyan başka bir oyuncu var.)";
    }
  }

  const payload = { ...parsed.data, photo_url: photoUrl || null };

  if (playerId) {
    const { error } = await supabase.from("players").update(payload).eq("id", playerId);
    if (error) return { ok: false, message: `Oyuncu güncellenemedi: ${error.message}` };
    revalidateAll();
    return { ok: true, message: `Oyuncu güncellendi.${warning}`, id: playerId };
  }

  const { data, error } = await supabase
    .from("players")
    .insert(payload)
    .select("id")
    .single();
  if (error) return { ok: false, message: `Oyuncu eklenemedi: ${error.message}` };
  revalidateAll();
  return { ok: true, message: `Oyuncu başarıyla eklendi.${warning}`, id: data.id };
}

/** Oyuncuyu silmek yerine pasif yapar; geçmiş maç olayları korunur. */
export async function deactivatePlayerAction(playerId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("players")
    .update({ is_active: false })
    .eq("id", playerId);
  if (error) return { ok: false, message: `İşlem gerçekleştirilemedi: ${error.message}` };
  revalidateAll();
  return { ok: true, message: "Oyuncu pasif duruma alındı." };
}
