/**
 * Migration + seed çalıştırıcı.
 *
 * Kullanım:
 *   node scripts/run-migrations.mjs           -> sadece migration'lar
 *   node scripts/run-migrations.mjs --seed    -> migration'lar + demo verileri
 *
 * Gereksinim: .env.local içinde SUPABASE_DB_URL
 * (Supabase Dashboard -> Connect -> Session pooler URI)
 *
 * Uygulanan dosyalar public._migrations tablosunda izlenir;
 * script tekrar çalıştırıldığında aynı dosya iki kez uygulanmaz.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

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
const dbUrl = process.env.SUPABASE_DB_URL || env.SUPABASE_DB_URL;

if (!dbUrl) {
  console.error("HATA: SUPABASE_DB_URL bulunamadı.");
  console.error("Supabase Dashboard -> Connect -> Session pooler URI adresini");
  console.error(".env.local dosyasına SUPABASE_DB_URL= olarak ekleyin.");
  process.exit(1);
}

const withSeed = process.argv.includes("--seed");
const client = new pg.Client({ connectionString: dbUrl });

try {
  await client.connect();
  console.log("Veritabanına bağlanıldı.");

  await client.query(`
    create table if not exists public._migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )`);

  const { rows } = await client.query("select name from public._migrations");
  const applied = new Set(rows.map((r) => r.name));

  const dir = join(root, "supabase", "migrations");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`ATLANDI  ${file} (daha önce uygulanmış)`);
      continue;
    }
    const sql = readFileSync(join(dir, file), "utf8");
    console.log(`UYGULANIYOR ${file} ...`);
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into public._migrations (name) values ($1)", [file]);
      await client.query("commit");
      console.log(`TAMAM    ${file}`);
    } catch (err) {
      await client.query("rollback");
      console.error(`HATA     ${file}: ${err.message}`);
      process.exit(1);
    }
  }

  if (withSeed) {
    const seedName = "seed.sql";
    if (applied.has(seedName)) {
      console.log("ATLANDI  seed.sql (daha önce uygulanmış)");
    } else {
      const sql = readFileSync(join(root, "supabase", seedName), "utf8");
      console.log("UYGULANIYOR seed.sql ...");
      try {
        await client.query("begin");
        await client.query(sql);
        await client.query("insert into public._migrations (name) values ($1)", [seedName]);
        await client.query("commit");
        console.log("TAMAM    seed.sql");
      } catch (err) {
        await client.query("rollback");
        console.error(`HATA     seed.sql: ${err.message}`);
        process.exit(1);
      }
    }
  }

  console.log("\nBitti. Tüm dosyalar uygulandı.");
} finally {
  await client.end();
}
