import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { InitialSplash } from "@/components/InitialSplash";
import { Diagnostics } from "@/components/Diagnostics";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: {
    default: "Yığılca Futbol Turnuvası",
    template: "%s | Yığılca Futbol Turnuvası",
  },
  description:
    "Yığılca Belediyesi futbol turnuvası: fikstür, puan durumu, takımlar, gol krallığı ve duyurular.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Yığılca Futbol Turnuvası",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // iOS Safari'de çentik/güvenli alan dışına taşan tam ekran düzenler için.
  viewportFit: "cover",
  themeColor: "#15803d",
  colorScheme: "light",
};

/**
 * Hydration/React'ten ÖNCE çalışır (next/script "beforeInteractive").
 * Amaç: ana JS paketi hiç çalışmasa bile (ör. bir tarayıcının desteklemediği
 * bir sözdizimi yüzünden SyntaxError alıp tamamen parse edilemezse — bu
 * durumda React ASLA mount olmaz) yine de kullanıcıya bir şeyler gösterip
 * teşhis bilgisini yakalamak. Bu yüzden burada React'e HİÇ bağımlı
 * OLMAYAN, saf ES5 DOM kodu kullanılır; SWC/browserslist ile derlenmez,
 * doğrudan HTML'e satır içi basılır — bu yüzden burada yalnızca en eski
 * tarayıcıların bile desteklediği sözdizimi kullanılmalıdır (var, function
 * ifadeleri; ok fonksiyonu/şablon literali/opsiyonel zincirleme YOK).
 *
 * Akış:
 *  1) Erken script hatalarını ve yakalanmamış promise redlerini tamponlar
 *     (Diagnostics bileşeni mount olunca bunları merkezi logcuya aktarır).
 *  2) "ChunkLoadError" gibi eski/silinmiş derleme dosyası hatalarında BİR
 *     KEZ otomatik sayfa yenilemesi dener (döngüye girmemesi için
 *     sessionStorage ile işaretlenir).
 *  3) Sayfa 9 saniye içinde hydrate olmazsa (React hiç çalışmadıysa) saf
 *     DOM ile bağımsız bir tanılama paneli gösterir: hata mesajı, hangi
 *     aşamada kaldığı ve tarayıcı sürümü (User-Agent).
 */
const EARLY_DIAGNOSTICS_SCRIPT = `
(function () {
  try {
    var diag = window.__turnuvaDiag = { start: Date.now(), events: [], stage: "script-start" };
    function push(type, detail) {
      try { diag.events.push({ type: type, detail: detail, t: Date.now() - diag.start }); } catch (e) {}
    }
    window.__turnuvaMarkStage = function (stage) {
      diag.stage = stage;
      push("asama", stage);
    };

    var chunkErrorPattern = /ChunkLoadError|Loading chunk [\\w.-]+ failed|Importing a module script failed|error loading dynamically imported module/i;
    var RELOAD_FLAG = "__turnuvaChunkReload";

    function maybeRecoverFromChunkError(message) {
      if (!message || !chunkErrorPattern.test(message)) return;
      var alreadyTried = false;
      try { alreadyTried = sessionStorage.getItem(RELOAD_FLAG) === "1"; } catch (e) {}
      if (alreadyTried) return;
      try { sessionStorage.setItem(RELOAD_FLAG, "1"); } catch (e) {}
      push("eski-dosya-yenileme", message);
      location.reload();
    }

    window.addEventListener("error", function (e) {
      var message = (e && e.message) || "";
      push("erken-script-hatasi", {
        message: message,
        source: e && e.filename,
        lineno: e && e.lineno,
        colno: e && e.colno
      });
      maybeRecoverFromChunkError(message);
    }, true);

    window.addEventListener("unhandledrejection", function (e) {
      var reason = e && e.reason;
      var message = reason && reason.message ? reason.message : String(reason);
      push("erken-yakalanmamis-promise-reddi", { message: message });
      maybeRecoverFromChunkError(message);
    });

    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        if (c === "&") return "&amp;";
        if (c === "<") return "&lt;";
        if (c === ">") return "&gt;";
        if (c === '"') return "&quot;";
        return "&#39;";
      });
    }

    function lastErrorMessage() {
      for (var i = diag.events.length - 1; i >= 0; i--) {
        var ev = diag.events[i];
        if (ev.type === "erken-script-hatasi" || ev.type === "erken-yakalanmamis-promise-reddi") {
          return (ev.detail && ev.detail.message) ? ev.detail.message : String(ev.detail);
        }
      }
      return "Bilinmiyor (uygulama hiç çalışmamış olabilir)";
    }

    function renderFallbackPanel() {
      if (document.getElementById("turnuva-diag-panel")) return;
      var panel = document.createElement("div");
      panel.id = "turnuva-diag-panel";
      panel.setAttribute(
        "style",
        "position:fixed;inset:0;z-index:2147483647;background:#111827;color:#f9fafb;" +
        "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;" +
        "line-height:1.5;padding:24px;overflow:auto;box-sizing:border-box"
      );
      var seconds = Math.round((Date.now() - diag.start) / 1000);
      panel.innerHTML =
        "<div style=\\"max-width:560px;margin:40px auto 0\\">" +
        "<div style=\\"font-size:20px;font-weight:700;margin-bottom:8px\\">Uygulama başlatılamadı</div>" +
        "<p style=\\"color:#9ca3af;margin:0 0 16px\\">Sayfa " + seconds + " saniyedir yükleniyor ama tamamlanmadı. " +
        "Aşağıdaki bilgiyi destek ekibiyle paylaşabilirsiniz.</p>" +
        "<div style=\\"background:#1f2937;border-radius:8px;padding:12px;margin-bottom:16px;" +
        "font-family:ui-monospace,monospace;font-size:12px;word-break:break-word\\">" +
        "<div><b>Aşama:</b> " + escapeHtml(diag.stage) + "</div>" +
        "<div style=\\"margin-top:6px\\"><b>Hata:</b> " + escapeHtml(lastErrorMessage()) + "</div>" +
        "<div style=\\"margin-top:6px\\"><b>Tarayıcı:</b> " + escapeHtml(navigator.userAgent) + "</div>" +
        "</div>" +
        "<button id=\\"turnuva-diag-retry\\" style=\\"min-height:44px;padding:0 20px;border:none;" +
        "border-radius:10px;background:#16a34a;color:#fff;font-weight:600;font-size:14px\\">" +
        "Sayfayı Yenile</button>" +
        "</div>";
      document.body.appendChild(panel);
      var btn = document.getElementById("turnuva-diag-retry");
      if (btn) {
        btn.addEventListener("click", function () { location.reload(); });
      }
    }

    setTimeout(function () {
      if (diag.stage === "hydrated") return;
      try { renderFallbackPanel(); } catch (e) {}
    }, 9000);
  } catch (err) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Script
          id="early-diagnostics"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: EARLY_DIAGNOSTICS_SCRIPT }}
        />
        <Diagnostics />
        <InitialSplash />
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
