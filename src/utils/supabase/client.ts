import { createBrowserClient } from "@supabase/ssr";

/**
 * Tarayıcı (Client Component) tarafında kullanılacak Supabase istemcisi.
 * Yalnızca herkese açık (publishable) anahtar kullanır; RLS politikaları
 * hangi verinin okunup yazılabileceğini veritabanı seviyesinde belirler.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}
