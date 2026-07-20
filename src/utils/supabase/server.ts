import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createLoggingFetch } from "@/lib/fetchWithTimeout";
import { logger } from "@/lib/logger";

/**
 * Sunucu tarafında (Server Component, Server Action, Route Handler)
 * kullanılacak Supabase istemcisi. Oturum bilgisini çerezler üzerinden okur;
 * böylece RLS politikaları giriş yapan kullanıcının rolüne göre uygulanır.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    logger.error(
      "supabase-server",
      "Supabase ortam değişkenleri eksik (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)."
    );
  }

  return createServerClient(
    url!,
    key!,
    {
      global: { fetch: createLoggingFetch("supabase-server") },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component içinden çağrıldığında çerez yazılamaz.
            // Oturum yenileme proxy (updateSession) tarafından yapıldığı
            // için bu durum güvenle yok sayılabilir.
          }
        },
      },
    }
  );
}
