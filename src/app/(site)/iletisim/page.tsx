import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";
import { fetchPublicTournament, fetchSettings } from "@/lib/queries";
import type { FooterSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "İletişim",
  description: "Turnuva organizasyonu iletişim bilgileri.",
};

export default async function ContactPage() {
  const tournament = await fetchPublicTournament();
  const settings = tournament ? await fetchSettings(tournament.id) : {};
  const footer = (settings["footer"] as FooterSettings | undefined) ?? {};

  return (
    <div className="container-page max-w-2xl space-y-4 py-6">
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl">İletişim</h1>

      <div className="card space-y-4 p-5 sm:p-8">
        <p className="text-sm leading-relaxed text-muted">
          Turnuvayla ilgili soru, itiraz ve talepleriniz için{" "}
          <strong>{footer.municipality ?? "Yığılca Belediyesi"}</strong>
          {footer.organization && <> ({footer.organization})</>} ile iletişime geçebilirsiniz.
        </p>

        <ul className="space-y-3">
          <li className="flex items-center gap-3">
            <span className="rounded-full bg-brand-50 p-2 text-brand-700"><MapPin className="size-4" aria-hidden /></span>
            <span className="text-sm">{footer.address ?? "Yığılca / Düzce"}</span>
          </li>
          {footer.phone && (
            <li className="flex items-center gap-3">
              <span className="rounded-full bg-brand-50 p-2 text-brand-700"><Phone className="size-4" aria-hidden /></span>
              <a href={`tel:${footer.phone}`} className="text-sm font-medium hover:underline">{footer.phone}</a>
            </li>
          )}
          {footer.email && (
            <li className="flex items-center gap-3">
              <span className="rounded-full bg-brand-50 p-2 text-brand-700"><Mail className="size-4" aria-hidden /></span>
              <a href={`mailto:${footer.email}`} className="text-sm font-medium hover:underline">{footer.email}</a>
            </li>
          )}
        </ul>

        {!footer.phone && !footer.email && (
          <p className="rounded-xl bg-gray-50 px-3 py-2 text-xs text-muted">
            İletişim bilgileri yönetim panelinden eklendiğinde burada görünecektir.
          </p>
        )}
      </div>
    </div>
  );
}
