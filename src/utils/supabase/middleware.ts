import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Her istekte oturumu yeniler (süresi dolan access token'ı tazeler) ve
 * yönetim paneli rotalarını korur:
 *  - /panel/*  -> giriş yapılmamışsa /giris sayfasına yönlendirir
 *  - /giris    -> zaten giriş yapılmışsa /panel sayfasına yönlendirir
 *
 * Not: Burada yalnızca "oturum var mı?" kontrolü yapılır. Rol bazlı yetki
 * kontrolü hem panel layout'unda hem de veritabanı RLS politikalarında
 * ayrıca uygulanır.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // ÖNEMLİ: createServerClient ile bu çağrı arasına kod eklemeyin.
  // getClaims() token'ı doğrular ve gerekiyorsa yeniler.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims ?? null;

  const { pathname } = request.nextUrl;

  if (!user && pathname.startsWith("/panel")) {
    const url = request.nextUrl.clone();
    url.pathname = "/giris";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/giris") {
    const url = request.nextUrl.clone();
    url.pathname = "/panel";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
