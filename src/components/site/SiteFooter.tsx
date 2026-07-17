import Link from "next/link";
import type { FooterSettings, Tournament } from "@/lib/types";

const QUICK_LINKS = [
  { href: "/fikstur", label: "Fikstür" },
  { href: "/puan-durumu", label: "Puan Durumu" },
  { href: "/takimlar", label: "Takımlar" },
  { href: "/gol-kralligi", label: "Gol Krallığı" },
  { href: "/duyurular", label: "Duyurular" },
  { href: "/kurallar", label: "Turnuva Kuralları" },
];

export function SiteFooter({
  tournament,
  footer,
}: {
  tournament: Tournament | null;
  footer: FooterSettings;
}) {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-line bg-surface pb-20 md:pb-0">
      <div className="container-page grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="text-base font-bold">{tournament?.name ?? "Yığılca Futbol Turnuvası"}</p>
          <p className="mt-2 text-sm text-muted">
            {footer.municipality ?? "Yığılca Belediyesi"}
          </p>
          {footer.organization && (
            <p className="mt-1 text-sm text-muted">{footer.organization}</p>
          )}
        </div>

        <nav aria-label="Hızlı bağlantılar">
          <p className="text-sm font-semibold">Hızlı Bağlantılar</p>
          <ul className="mt-3 space-y-2">
            {QUICK_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-muted hover:text-ink hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="text-sm font-semibold">İletişim</p>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            {footer.address && <li>{footer.address}</li>}
            {footer.phone && (
              <li><a href={`tel:${footer.phone}`} className="hover:text-ink hover:underline">{footer.phone}</a></li>
            )}
            {footer.email && (
              <li><a href={`mailto:${footer.email}`} className="hover:text-ink hover:underline">{footer.email}</a></li>
            )}
            <li>
              <Link href="/iletisim" className="hover:text-ink hover:underline">İletişim sayfası</Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold">Sosyal Medya</p>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            {footer.instagram ? (
              <li>
                <a href={footer.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-ink hover:underline">
                  Instagram
                </a>
              </li>
            ) : null}
            {footer.facebook ? (
              <li>
                <a href={footer.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-ink hover:underline">
                  Facebook
                </a>
              </li>
            ) : null}
            {!footer.instagram && !footer.facebook && <li>-</li>}
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container-page flex flex-col items-center justify-between gap-2 py-4 text-xs text-muted sm:flex-row">
          <p>
            © {year} {footer.municipality ?? "Yığılca Belediyesi"}. Tüm hakları saklıdır.
          </p>
          <p className="flex items-center gap-3">
            <Link href="/giris" className="hover:text-ink hover:underline">
              Yönetim Girişi
            </Link>
            <span aria-hidden>·</span>
            <span>
              {/* İmza sabittir; panelden veya ayarlardan değiştirilemez */}
              Tasarım ve geliştirme:{" "}
              <span className="font-semibold text-ink">Efe Baloğlu</span>
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
}
