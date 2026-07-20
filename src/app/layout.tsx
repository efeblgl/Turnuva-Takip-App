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
 * Amaç: ana bundle parse edilirken veya hydration tamamlanmadan önce
 * oluşan script hatalarını/yakalanmamış promise redlerini kaçırmamak.
 * Diagnostics bileşeni mount olduğunda bu tampon logcuya aktarılır.
 * Herhangi bir üçüncü taraf isteği yapmaz; tamamen yerel/satır içidir.
 */
const EARLY_DIAGNOSTICS_SCRIPT = `
(function () {
  try {
    var diag = window.__turnuvaDiag = { start: Date.now(), events: [] };
    function push(type, detail) {
      try { diag.events.push({ type: type, detail: detail, t: Date.now() - diag.start }); } catch (e) {}
    }
    window.addEventListener("error", function (e) {
      push("erken-script-hatasi", {
        message: e && e.message,
        source: e && e.filename,
        lineno: e && e.lineno,
        colno: e && e.colno
      });
    }, true);
    window.addEventListener("unhandledrejection", function (e) {
      var reason = e && e.reason;
      push("erken-yakalanmamis-promise-reddi", {
        message: reason && reason.message ? reason.message : String(reason)
      });
    });
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
