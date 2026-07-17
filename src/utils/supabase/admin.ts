import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

// Bu modül istemciye asla paketlenmemelidir (secret key içerir).
if (typeof window !== "undefined") {
  throw new Error("admin istemcisi yalnızca sunucu tarafında kullanılabilir.");
}

/**
 * YALNIZCA SUNUCUDA kullanılabilecek yönetici istemcisi.
 * SUPABASE_SECRET_KEY tanımlı değilse null döner; çağıran taraf kullanıcıya
 * anlaşılır bir mesaj gösterir. Bu anahtar RLS'e tabi değildir — sadece
 * kullanıcı oluşturma gibi yönetimsel işlerde, rol kontrolünden sonra kullanın.
 */
export function createAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) return null;

  return createSupabaseClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
