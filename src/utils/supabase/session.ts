import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { createLoggingFetch } from "@/lib/fetchWithTimeout";
import { logger } from "@/lib/logger";

/** Proxy her istekte çalışır; oturum kontrolü bu süreyi aşarsa isteğe devam edilir. */
const PROXY_SUPABASE_TIMEOUT_MS = 8000;

/**
 * Her istekte oturumu yeniler (süresi dolan access token'ı tazeler) ve
 * yönetim paneli rotalarını korur:
 *  - /panel/*  -> giriş yapılmamışsa /giris sayfasına yönlendirir
 *  - /giris    -> zaten giriş yapılmışsa /panel sayfasına yönlendirir
 *
 * Not: Burada yalnızca "oturum var mı?" kontrolü yapılır. Rol bazlı yetki
 * kontrolü hem panel layout'unda hem de veritabanı RLS politikalarında
 * ayrıca uygulanır.
 *
 * ÖNEMLİ (kararlılık): Bu fonksiyon proxy.ts üzerinden HEMEN HEMEN HER
 * İSTEKTE çalışır (bkz. proxy.ts matcher'ı). Supabase'e giden istek ağ
 * sorunu yüzünden (DNS, TLS, zaman aşımı, geçici kesinti) fırlatırsa veya
 * hiç yanıt vermezse — önceki sürümde olduğu gibi bir üst sınır yoksa —
 * tüm site tüm kullanıcılar için (tarayıcı fark etmeksizin) ya hataya
 * düşer ya da sonsuza kadar "yükleniyor" görünür. Bu yüzden çağrı hem
 * zaman aşımlı fetch ile sarılır hem de try/catch ile "başarısız olursa
 * güvenli şekilde devam et" kuralına bağlanır: herkese açık sayfalar
 * oturum bilgisi olmadan da render edilebilir; yalnızca /panel gibi
 * korumalı rotalarda, doğrulama yapılamadığında güvenli taraf seçilerek
 * girişe yönlendirilir (oturum var sayılıp yetkisiz erişime izin verilmez).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const { pathname } = request.nextUrl;

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        global: { fetch: createLoggingFetch("supabase-proxy", PROXY_SUPABASE_TIMEOUT_MS) },
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
    const { data, error } = await supabase.auth.getClaims();
    if (error) {
      logger.warn("proxy", "getClaims hata döndürdü, oturumsuz kabul ediliyor", error);
    }
    const user = data?.claims ?? null;

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
  } catch (err) {
    // Supabase'e ulaşılamadı (ağ hatası/zaman aşımı). Siteyi tamamen
    // devre dışı bırakmak yerine güvenli varsayılana düş.
    logger.error(
      "proxy",
      "Oturum kontrolü başarısız oldu (ağ/Supabase hatası); istek güvenli şekilde devam ettiriliyor",
      err
    );
    if (pathname.startsWith("/panel")) {
      const url = request.nextUrl.clone();
      url.pathname = "/giris";
      url.searchParams.set("next", pathname);
      url.searchParams.set("hata", "baglanti");
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }
}
