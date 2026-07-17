/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import { Trophy } from "lucide-react";
import { fetchPublicTournament } from "@/lib/queries";
import { Badge, EmptyState } from "@/components/ui";
import { TOURNAMENT_FORMAT_LABELS, TOURNAMENT_STATUS_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Turnuva Hakkında",
  description: "Turnuva bilgileri, tarihleri ve organizasyon.",
};

export default async function AboutPage() {
  const tournament = await fetchPublicTournament();

  if (!tournament) {
    return (
      <div className="container-page py-10">
        <EmptyState title="Turnuva bilgisi bulunamadı" />
      </div>
    );
  }

  const rows: Array<[string, string]> = [
    ["Sezon", tournament.season ?? "-"],
    ["Durum", TOURNAMENT_STATUS_LABELS[tournament.status]],
    ["Format", TOURNAMENT_FORMAT_LABELS[tournament.format]],
    ["Başlangıç", tournament.start_date ? formatDate(tournament.start_date) : "-"],
    ["Bitiş", tournament.end_date ? formatDate(tournament.end_date) : "-"],
    ["Yer", tournament.location ?? "-"],
    ["Puanlama", `Galibiyet ${tournament.win_points} · Beraberlik ${tournament.draw_points} · Mağlubiyet ${tournament.loss_points}`],
  ];

  return (
    <div className="container-page max-w-3xl space-y-4 py-6">
      <div className="card p-5 sm:p-8">
        <div className="flex flex-wrap items-center gap-4">
          {tournament.logo_url ? (
            <img src={tournament.logo_url} alt="" className="size-16 rounded-full border border-line object-cover" />
          ) : (
            <span className="flex size-16 items-center justify-center rounded-full bg-brand-700 text-white">
              <Trophy className="size-8" aria-hidden />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{tournament.name}</h1>
            <Badge className="mt-1 border-brand-200 bg-brand-50 text-brand-800">
              {TOURNAMENT_STATUS_LABELS[tournament.status]}
            </Badge>
          </div>
          {tournament.municipality_logo_url && (
            <img src={tournament.municipality_logo_url} alt="Yığılca Belediyesi logosu" className="size-14 object-contain" />
          )}
        </div>

        {tournament.description && (
          <p className="mt-5 text-sm leading-relaxed text-muted">{tournament.description}</p>
        )}

        <dl className="mt-6 divide-y divide-line border-t border-line">
          {rows.map(([label, value]) => (
            <div key={label} className="flex flex-wrap justify-between gap-2 py-2.5">
              <dt className="text-sm font-medium text-muted">{label}</dt>
              <dd className="text-sm font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
