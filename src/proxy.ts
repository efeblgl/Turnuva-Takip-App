import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/session";

/**
 * Next.js 16 proxy'si (eski adıyla middleware).
 * Her istekte Supabase oturumunu yeniler ve panel rotalarını korur:
 *  - /panel/*  -> giriş yapılmamışsa /giris sayfasına yönlendirir
 *  - /giris    -> zaten giriş yapılmışsa /panel sayfasına yönlendirir
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Aşağıdakiler HARİÇ tüm istekler için çalışır:
     * - _next/static (statik dosyalar)
     * - _next/image (görsel optimizasyonu)
     * - favicon.ico ve yaygın görsel uzantıları
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
