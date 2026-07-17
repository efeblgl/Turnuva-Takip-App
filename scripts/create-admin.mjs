/**
 * İlk süper yönetici kullanıcıyı oluşturur (veya mevcut kullanıcıyı yükseltir).
 *
 * Kullanım:
 *   node scripts/create-admin.mjs <eposta> [ad soyad] [--reset-password]
 *
 * --reset-password: kullanıcı zaten varsa parolasını da yeniler ve ekrana yazar.
 *
 * Örnek:
 *   node scripts/create-admin.mjs yonetici@yigilca.bel.tr "Turnuva Yöneticisi"
 *
 * Gereksinim: .env.local içinde
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY   (Dashboard -> Settings -> API Keys -> Secret keys)
 *
 * Parola: ADMIN_PASSWORD ortam değişkeni verilirse o kullanılır;
 * verilmezse güçlü rastgele bir parola üretilip ekrana yazılır.
 * İlk girişten sonra paroladan panel üzerinden değiştirilmesi önerilir.
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// .env.local dosyasını oku (dotenv bağımlılığı olmadan)
function loadEnv() {
  const envPath = join(root, ".env.local");
  if (!existsSync(envPath)) return {};
  const out = {};
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = loadEnv();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY || env.SUPABASE_SECRET_KEY;

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const resetPassword = process.argv.includes("--reset-password");
const email = args[0];
const fullName = args[1] || "Süper Yönetici";

if (!email || !email.includes("@")) {
  console.error("Kullanım: node scripts/create-admin.mjs <eposta> [ad soyad]");
  process.exit(1);
}
if (!url) {
  console.error("HATA: NEXT_PUBLIC_SUPABASE_URL bulunamadı (.env.local).");
  process.exit(1);
}
if (!secretKey) {
  console.error("HATA: SUPABASE_SECRET_KEY bulunamadı.");
  console.error("Supabase Dashboard -> Settings -> API Keys -> Secret keys bölümünden");
  console.error("bir secret key oluşturup .env.local dosyasına SUPABASE_SECRET_KEY= olarak ekleyin.");
  process.exit(1);
}

const admin = createClient(url, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// URL güvenli, karışıklık yaratan karakterler (0/O, l/1) olmadan parola üret
function generatePassword() {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789.-_";
  const bytes = randomBytes(20);
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
}

const password = process.env.ADMIN_PASSWORD || env.ADMIN_PASSWORD || generatePassword();
const generated = !(process.env.ADMIN_PASSWORD || env.ADMIN_PASSWORD);

let userId;
const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: fullName },
});

if (createErr) {
  if (/already|kayıtlı|exists/i.test(createErr.message) || createErr.code === "email_exists") {
    console.log(`Kullanıcı zaten mevcut: ${email} — rolü super_admin'e yükseltilecek.`);
    const { data: byEmail, error: findErr } = await admin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (findErr || !byEmail) {
      console.error(`HATA: mevcut kullanıcının profili bulunamadı: ${findErr?.message ?? "kayıt yok"}`);
      process.exit(1);
    }
    userId = byEmail.id;
  } else {
    console.error(`HATA: kullanıcı oluşturulamadı: ${createErr.message}`);
    process.exit(1);
  }
} else {
  userId = created.user.id;
  console.log(`Kullanıcı oluşturuldu: ${email} (${userId})`);
  if (generated) {
    // Parolayı hemen yazdır: sonraki adımlardan biri hata verirse kaybolmasın.
    console.log(`Üretilen parola: ${password}`);
  }
}

// Mevcut kullanıcı + --reset-password: parolayı yenile
let passwordWasReset = false;
if (createErr && resetPassword) {
  const { error: pwErr } = await admin.auth.admin.updateUserById(userId, { password });
  if (pwErr) {
    console.error(`HATA: parola sıfırlanamadı: ${pwErr.message}`);
    process.exit(1);
  }
  passwordWasReset = true;
  console.log(`Parola sıfırlandı. Yeni parola: ${password}`);
}

// Trigger profili 'viewer' rolüyle açar; super_admin'e yükselt.
const { error: roleErr } = await admin
  .from("profiles")
  .update({ role: "super_admin", full_name: fullName, is_active: true })
  .eq("id", userId);

if (roleErr) {
  console.error(`HATA: rol güncellenemedi: ${roleErr.message}`);
  process.exit(1);
}

console.log("\nTAMAM — süper yönetici hazır.");
console.log(`  E-posta : ${email}`);
if (!createErr || passwordWasReset) {
  console.log(`  Parola  : ${password}`);
  console.log("\nBu parolayı güvenli bir yere kaydedin; ilk girişten sonra değiştirmeniz önerilir.");
} else {
  console.log("  Parola  : (mevcut kullanıcının parolası değişmedi)");
}
console.log(`\nGiriş adresi: /giris`);
