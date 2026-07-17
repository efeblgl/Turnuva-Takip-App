"use server";

/**
 * Duyuru, ceza ve kullanıcı yönetimi işlemleri.
 */
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  announcementSchema, fieldErrorsOf, formToObject, suspensionSchema, userSchema,
} from "../validation";
import { slugifyTr } from "../utils";
import type { ActionResult } from "../types";

function revalidateAll() {
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Duyurular
// ---------------------------------------------------------------------------

export async function saveAnnouncementAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const announcementId = String(formData.get("id") ?? "");
  const tournamentId = String(formData.get("tournament_id") ?? "");
  const imageUrl = String(formData.get("image_url") ?? "");

  const parsed = announcementSchema.safeParse(
    formToObject(formData, ["is_important", "is_published"])
  );
  if (!parsed.success) {
    return { ok: false, message: "Formda hatalar var.", fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const supabase = await createClient();
  const payload = {
    ...parsed.data,
    image_url: imageUrl || null,
    publish_date: parsed.data.publish_date
      ? new Date(`${parsed.data.publish_date}T09:00:00+03:00`).toISOString()
      : new Date().toISOString(),
    expire_date: parsed.data.expire_date
      ? new Date(`${parsed.data.expire_date}T23:59:59+03:00`).toISOString()
      : null,
  };

  if (announcementId) {
    const { error } = await supabase
      .from("announcements")
      .update(payload)
      .eq("id", announcementId);
    if (error) return { ok: false, message: `Duyuru güncellenemedi: ${error.message}` };
    revalidateAll();
    return { ok: true, message: "Duyuru güncellendi." };
  }

  // Benzersiz, okunabilir slug üret
  let slug = slugifyTr(parsed.data.title);
  const { data: existing } = await supabase
    .from("announcements")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("slug", slug)
    .maybeSingle();
  if (existing) slug = `${slug}-${Date.now().toString(36)}`;

  const { data: userData } = await supabase.auth.getUser();

  const { error } = await supabase.from("announcements").insert({
    ...payload,
    tournament_id: tournamentId,
    slug,
    created_by: userData?.user?.id ?? null,
  });
  if (error) return { ok: false, message: `Duyuru eklenemedi: ${error.message}` };
  revalidateAll();
  return { ok: true, message: parsed.data.is_published ? "Duyuru yayınlandı." : "Duyuru taslak olarak kaydedildi." };
}

export async function unpublishAnnouncementAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("announcements")
    .update({ is_published: false })
    .eq("id", id);
  if (error) return { ok: false, message: `İşlem gerçekleştirilemedi: ${error.message}` };
  revalidateAll();
  return { ok: true, message: "Duyuru yayından kaldırıldı." };
}

export async function deleteAnnouncementAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) return { ok: false, message: `Duyuru silinemedi: ${error.message}` };
  revalidateAll();
  return { ok: true, message: "Duyuru silindi." };
}

// ---------------------------------------------------------------------------
// Cezalar
// ---------------------------------------------------------------------------

export async function saveSuspensionAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const suspensionId = String(formData.get("id") ?? "");
  const tournamentId = String(formData.get("tournament_id") ?? "");

  const parsed = suspensionSchema.safeParse(formToObject(formData, ["is_active"]));
  if (!parsed.success) {
    return { ok: false, message: "Formda hatalar var.", fieldErrors: fieldErrorsOf(parsed.error) };
  }

  const supabase = await createClient();
  const payload = {
    ...parsed.data,
    remaining_matches: parsed.data.total_matches, // yeniden hesaplama RPC ile yapılır
  };

  if (suspensionId) {
    const { error } = await supabase
      .from("suspensions")
      .update(parsed.data)
      .eq("id", suspensionId);
    if (error) return { ok: false, message: `Ceza güncellenemedi: ${error.message}` };
    revalidateAll();
    return { ok: true, message: "Ceza güncellendi." };
  }

  const { error } = await supabase
    .from("suspensions")
    .insert({ ...payload, tournament_id: tournamentId });
  if (error) return { ok: false, message: `Ceza eklenemedi: ${error.message}` };
  revalidateAll();
  return { ok: true, message: "Ceza kaydedildi." };
}

export async function endSuspensionAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("suspensions")
    .update({ is_active: false, remaining_matches: 0 })
    .eq("id", id);
  if (error) return { ok: false, message: `İşlem gerçekleştirilemedi: ${error.message}` };
  revalidateAll();
  return { ok: true, message: "Ceza kaldırıldı." };
}

// ---------------------------------------------------------------------------
// Kullanıcılar (yalnızca süper yönetici; RLS ayrıca korur)
// ---------------------------------------------------------------------------

export async function createUserAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const password = String(formData.get("password") ?? "");
  const parsed = userSchema.safeParse(formToObject(formData, ["is_active"]));
  if (!parsed.success) {
    return { ok: false, message: "Formda hatalar var.", fieldErrors: fieldErrorsOf(parsed.error) };
  }
  if (password.length < 8) {
    return {
      ok: false,
      message: "Geçici şifre en az 8 karakter olmalıdır.",
      fieldErrors: { password: "En az 8 karakter." },
    };
  }

  // Çağıran kullanıcı süper yönetici mi? (admin istemcisi RLS'e tabi değildir,
  // bu yüzden burada açıkça kontrol edilir)
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { ok: false, message: "Oturum bulunamadı." };
  const { data: me } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (!me || me.role !== "super_admin" || !me.is_active) {
    return { ok: false, message: "Bu işlem için süper yönetici yetkisi gerekir." };
  }

  const admin = createAdminClient();
  if (!admin) {
    return {
      ok: false,
      message:
        "Kullanıcı oluşturmak için sunucuda SUPABASE_SECRET_KEY tanımlı olmalıdır. " +
        ".env.local dosyasına ekleyin veya kullanıcıyı Supabase panelinden oluşturun.",
    };
  }

  const { data: created, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.full_name },
  });
  if (error) {
    const message = error.message.includes("already been registered")
      ? "Bu e-posta adresiyle bir kullanıcı zaten var."
      : `Kullanıcı oluşturulamadı: ${error.message}`;
    return { ok: false, message };
  }

  // Profil trigger ile oluştu; rolü ata (admin istemcisiyle, profil satırı garanti)
  if (created?.user) {
    await admin
      .from("profiles")
      .upsert({
        id: created.user.id,
        email: parsed.data.email,
        full_name: parsed.data.full_name,
        role: parsed.data.role,
        is_active: parsed.data.is_active,
      });
  }

  revalidateAll();
  return { ok: true, message: "Kullanıcı oluşturuldu. Geçici şifreyi kendisine iletin." };
}

export async function updateUserAction(
  userId: string,
  updates: { role?: string; is_active?: boolean; full_name?: string | null }
): Promise<ActionResult> {
  const supabase = await createClient();

  // Kendi super_admin yetkisini düşürmesini engelle (son yönetici kalmasın)
  const { data: userData } = await supabase.auth.getUser();
  if (userData?.user?.id === userId && updates.role && updates.role !== "super_admin") {
    const { count } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "super_admin")
      .eq("is_active", true);
    if ((count ?? 0) <= 1) {
      return { ok: false, message: "Sistemdeki son süper yöneticinin rolü düşürülemez." };
    }
  }

  const { error } = await supabase.from("profiles").update(updates).eq("id", userId);
  if (error) return { ok: false, message: `Kullanıcı güncellenemedi: ${error.message}` };
  revalidateAll();
  return { ok: true, message: "Kullanıcı güncellendi." };
}
