"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { loginSchema } from "../validation";
import type { ActionResult } from "../types";

/**
 * Kullanıcı adı girişini dahili e-postaya çevirir.
 * "@" içermeyen girdiler kullanıcı adı sayılır: Türkçe karakterler
 * sadeleştirilir, küçük harfe çevrilir ve sabit alan adı eklenir.
 * Örn. "Yıgılcaspor1" -> "yigilcaspor1@panel.yigilca"
 */
const USERNAME_DOMAIN = "panel.yigilca";

function toLoginEmail(input: string): string {
  const raw = input.trim();
  if (raw.includes("@")) return raw;
  const ascii = raw
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u")
    .replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9._-]/g, "");
  return `${ascii}@${USERNAME_DOMAIN}`;
}

export async function signInAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: toLoginEmail(String(formData.get("email") ?? "")),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, message: "Lütfen bilgileri kontrol edin." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    const message =
      error.code === "invalid_credentials"
        ? "Kullanıcı adı / e-posta veya şifre hatalı."
        : error.code === "over_request_rate_limit"
          ? "Çok fazla deneme yapıldı. Lütfen birkaç dakika sonra tekrar deneyin."
          : "Giriş yapılamadı. Lütfen tekrar deneyin.";
    return { ok: false, message };
  }

  // Profil pasifse oturumu kapat
  const { data: userData } = await supabase.auth.getUser();
  if (userData?.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_active")
      .eq("id", userData.user.id)
      .maybeSingle();
    if (profile && !profile.is_active) {
      await supabase.auth.signOut();
      return { ok: false, message: "Hesabınız pasif durumda. Yöneticinizle iletişime geçin." };
    }
  }

  redirect("/panel");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/giris");
}

export async function resetPasswordAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email.includes("@")) {
    return { ok: false, message: "Geçerli bir e-posta adresi girin." };
  }

  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? "http";

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${proto}://${host}/sifre-yenile`,
  });

  // Güvenlik gereği e-postanın kayıtlı olup olmadığı açıklanmaz
  return {
    ok: true,
    message: "Bu e-posta sistemde kayıtlıysa şifre sıfırlama bağlantısı gönderildi.",
  };
}

export async function updatePasswordAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 6) {
    return { ok: false, message: "Şifre en az 6 karakter olmalıdır." };
  }
  if (password !== confirm) {
    return { ok: false, message: "Şifreler birbiriyle uyuşmuyor." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { ok: false, message: "Şifre güncellenemedi. Bağlantının süresi dolmuş olabilir." };
  }

  redirect("/panel");
}
