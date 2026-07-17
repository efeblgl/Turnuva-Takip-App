import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Sunucu tarafında (Server Component, Server Action, Route Handler)
 * kullanılacak Supabase istemcisi. Oturum bilgisini çerezler üzerinden okur;
 * böylece RLS politikaları giriş yapan kullanıcının rolüne göre uygulanır.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
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
