import { createBrowserClient } from "@supabase/ssr";
import { createLoggingFetch } from "@/lib/fetchWithTimeout";
import { logger } from "@/lib/logger";

/**
 * Tarayıcı (Client Component) tarafında kullanılacak Supabase istemcisi.
 * Yalnızca herkese açık (publishable) anahtar kullanır; RLS politikaları
 * hangi verinin okunup yazılabileceğini veritabanı seviyesinde belirler.
 * İstekler loglu+zaman aşımlı fetch ile yapılır: bir ağ isteği süresiz
 * asılı kalırsa (Safari/iOS'ta ITP veya arka plan kısıtlamalarında olduğu
 * gibi) kullanıcı sonsuz bir yükleniyor ekranında kalmaz, hata görür.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    logger.error(
      "supabase-client",
      "Supabase ortam değişkenleri eksik (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY). Tarayıcı istemcisi çalışmayacak."
    );
  }
  return createBrowserClient(url!, key!, {
    global: { fetch: createLoggingFetch("supabase-client") },
  });
}
