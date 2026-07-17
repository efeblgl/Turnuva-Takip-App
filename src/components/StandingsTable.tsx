"use client";

/**
 * Responsive puan durumu tablosu (şartname madde 24).
 * Masaüstünde tüm sütunlar; mobilde Sıra/Takım/O/AV/P gösterilir,
 * satıra dokununca diğer veriler açılır.
 */
import { Fragment, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { TeamLogo } from "./TeamBadge";
import { cn } from "@/lib/utils";
import type { StandingRow } from "@/lib/standings";

export interface StandingsTeamMeta {
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  code: string | null;
  status: string;
}

function FormChips({ form }: { form: Array<"G" | "B" | "M"> }) {
  if (form.length === 0) return <span className="text-xs text-muted">-</span>;
  return (
    <span className="flex gap-1" aria-label={`Son maçlar: ${form.join(", ")}`}>
      {form.map((r, i) => (
        <span
          key={i}
          className={cn(
            "flex size-5 items-center justify-center rounded text-[10px] font-bold text-white",
            r === "G" && "bg-emerald-500",
            r === "B" && "bg-gray-400",
            r === "M" && "bg-red-500"
          )}
        >
          {r}
        </span>
      ))}
    </span>
  );
}

export function StandingsTable({
  rows,
  teamsMeta,
  qualificationCount = 0,
  linkPrefix = "/takimlar",
}: {
  rows: StandingRow[];
  teamsMeta: Record<string, StandingsTeamMeta>;
  qualificationCount?: number;
  linkPrefix?: string | null;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (rows.length === 0) {
    return (
      <div className="card py-8 text-center text-sm text-muted">
        Bu grupta henüz takım bulunmuyor.
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table className="w-full border-collapse">
        <thead className="border-b border-line bg-gray-50/70">
          <tr>
            <th className="th w-8 text-center" scope="col" title="Sıra">#</th>
            <th className="th" scope="col">Takım</th>
            <th className="th text-center" scope="col" title="Oynanan">O</th>
            <th className="th hidden text-center md:table-cell" scope="col" title="Galibiyet">G</th>
            <th className="th hidden text-center md:table-cell" scope="col" title="Beraberlik">B</th>
            <th className="th hidden text-center md:table-cell" scope="col" title="Mağlubiyet">M</th>
            <th className="th hidden text-center md:table-cell" scope="col" title="Atılan gol">A</th>
            <th className="th hidden text-center md:table-cell" scope="col" title="Yenilen gol">Y</th>
            <th className="th text-center" scope="col" title="Averaj">AV</th>
            <th className="th text-center" scope="col" title="Puan">P</th>
            <th className="th hidden md:table-cell" scope="col">Form</th>
            <th className="th w-8 md:hidden" scope="col">
              <span className="sr-only">Detay</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const meta = teamsMeta[row.teamId];
            const qualified = qualificationCount > 0 && row.rank <= qualificationCount;
            const disqualified = meta?.status === "disqualified" || meta?.status === "withdrawn";
            const eliminated = meta?.status === "eliminated";
            const isOpen = expanded === row.teamId;

            return (
              <Fragment key={row.teamId}>
                <tr
                  className={cn(
                    "border-b border-line last:border-b-0",
                    qualified && "bg-emerald-50/50",
                    eliminated && "opacity-55",
                    disqualified && "bg-red-50/60"
                  )}
                >
                  <td className="td text-center">
                    <span
                      className={cn(
                        "inline-flex size-6 items-center justify-center rounded-full text-xs font-bold",
                        qualified ? "bg-emerald-600 text-white" : "text-muted"
                      )}
                    >
                      {row.rank}
                    </span>
                  </td>
                  <td className="td">
                    <span className="flex min-w-0 items-center gap-2">
                      <TeamLogo
                        logoUrl={meta?.logo_url}
                        name={meta?.name ?? row.teamName}
                        color={meta?.primary_color}
                        code={meta?.code}
                        size={24}
                      />
                      {linkPrefix ? (
                        <Link
                          href={`${linkPrefix}/${row.teamId}`}
                          className={cn(
                            "min-w-0 break-words text-sm font-semibold hover:underline",
                            disqualified && "text-red-700"
                          )}
                        >
                          {row.teamName}
                        </Link>
                      ) : (
                        <span className="min-w-0 break-words text-sm font-semibold">{row.teamName}</span>
                      )}
                      {disqualified && (
                        <span className="badge border-red-200 bg-red-50 text-red-700">
                          {meta?.status === "withdrawn" ? "Çekildi" : "İhraç"}
                        </span>
                      )}
                      {row.deductedPoints > 0 && (
                        <span className="badge border-amber-200 bg-amber-50 text-amber-700" title="Puan silme cezası">
                          -{row.deductedPoints}P
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="td text-center tabular-nums">{row.played}</td>
                  <td className="td hidden text-center tabular-nums md:table-cell">{row.won}</td>
                  <td className="td hidden text-center tabular-nums md:table-cell">{row.drawn}</td>
                  <td className="td hidden text-center tabular-nums md:table-cell">{row.lost}</td>
                  <td className="td hidden text-center tabular-nums md:table-cell">{row.goalsFor}</td>
                  <td className="td hidden text-center tabular-nums md:table-cell">{row.goalsAgainst}</td>
                  <td className="td text-center tabular-nums">
                    {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                  </td>
                  <td className="td text-center text-sm font-bold tabular-nums">{row.points}</td>
                  <td className="td hidden md:table-cell">
                    <FormChips form={row.form} />
                  </td>
                  <td className="td text-center md:hidden">
                    <button
                      type="button"
                      className="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-gray-100"
                      aria-expanded={isOpen}
                      aria-label={`${row.teamName} detaylarını ${isOpen ? "gizle" : "göster"}`}
                      onClick={() => setExpanded(isOpen ? null : row.teamId)}
                    >
                      <ChevronDown className={cn("size-4 transition-transform", isOpen && "rotate-180")} aria-hidden />
                    </button>
                  </td>
                </tr>
                {isOpen && (
                  <tr className="border-b border-line bg-gray-50/60 md:hidden">
                    <td colSpan={6} className="px-4 py-3">
                      <dl className="grid grid-cols-3 gap-x-4 gap-y-2 text-xs">
                        <div><dt className="text-muted">Galibiyet</dt><dd className="font-semibold">{row.won}</dd></div>
                        <div><dt className="text-muted">Beraberlik</dt><dd className="font-semibold">{row.drawn}</dd></div>
                        <div><dt className="text-muted">Mağlubiyet</dt><dd className="font-semibold">{row.lost}</dd></div>
                        <div><dt className="text-muted">Atılan gol</dt><dd className="font-semibold">{row.goalsFor}</dd></div>
                        <div><dt className="text-muted">Yenilen gol</dt><dd className="font-semibold">{row.goalsAgainst}</dd></div>
                        <div>
                          <dt className="text-muted">Kartlar</dt>
                          <dd className="font-semibold">{row.yellowCards} sarı / {row.redCards} kırmızı</dd>
                        </div>
                        <div className="col-span-3">
                          <dt className="mb-1 text-muted">Form (eskiden yeniye)</dt>
                          <dd><FormChips form={row.form} /></dd>
                        </div>
                      </dl>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      {qualificationCount > 0 && (
        <p className="border-t border-line px-3 py-2 text-xs text-muted">
          <span aria-hidden className="mr-1 inline-block size-2 rounded-full bg-emerald-600" />
          İlk {qualificationCount} sıra bir üst tura yükselir.
        </p>
      )}
    </div>
  );
}
