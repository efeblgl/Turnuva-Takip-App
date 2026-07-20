import Link from "next/link";
import type { ReactNode } from "react";
import { TeamLogo } from "@/components/TeamBadge";
import { MATCH_STATUS_LABELS } from "@/lib/labels";
import { formatTime } from "@/lib/utils";
import type { Match } from "@/lib/types";
import type { MatchCardTeamInfo } from "@/components/MatchCard";

const PLACEHOLDER: MatchCardTeamInfo = {
  name: "Belirlenecek",
  logo_url: null,
  primary_color: "#9CA3AF",
  code: "?",
};

function Side({ team, align }: { team: MatchCardTeamInfo; align: "left" | "right" }) {
  return (
    <div
      className={
        align === "right"
          ? "flex min-w-0 flex-1 flex-row-reverse items-center gap-2 text-right"
          : "flex min-w-0 flex-1 items-center gap-2"
      }
    >
      <TeamLogo logoUrl={team.logo_url} name={team.name} color={team.primary_color} code={team.code} size={40} />
      <span className="min-w-0 break-words text-sm font-bold leading-tight sm:text-base">{team.name}</span>
    </div>
  );
}

/**
 * Canlı (veya maç saati gelmiş) maç için öne çıkan kart.
 * Skor görevlisi henüz giriş yapmadıysa skor yerine başlama saati gösterilir.
 * Golcüler girildikçe kartta listelenir; alttaki paylaş butonu ile
 * Instagram hikayesi görseli üretilir.
 */
export function LiveMatchCard({
  match,
  home,
  away,
  venueName,
  contextLabel,
  href,
  homeScorers = [],
  awayScorers = [],
  shareButton,
}: {
  match: Match;
  home: MatchCardTeamInfo | null;
  away: MatchCardTeamInfo | null;
  venueName?: string | null;
  contextLabel?: string | null;
  href: string;
  /** "Ad Soyad 12'" biçiminde golcü satırları */
  homeScorers?: string[];
  awayScorers?: string[];
  /** Kartın altında gösterilecek paylaşım butonu (ör. MatchStoryShare) */
  shareButton?: ReactNode;
}) {
  const hasScore =
    match.status !== "scheduled" && match.home_score !== null && match.away_score !== null;
  const statusLabel =
    match.status === "scheduled" ? "Maç saati geldi · skor bekleniyor" : MATCH_STATUS_LABELS[match.status];
  const hasScorers = homeScorers.length > 0 || awayScorers.length > 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="flex items-center justify-between gap-2 bg-red-600 px-4 py-1.5 text-white">
        <span className="min-w-0 truncate text-xs text-white/90">
          {contextLabel && <span>{contextLabel} · </span>}
          {formatTime(match.start_time)}
          {venueName && <span> · {venueName}</span>}
        </span>
        {/* Maç saatleri içinde sağ üstte "Canlı" yazar */}
        <span className="flex shrink-0 items-center gap-2 text-xs font-bold uppercase tracking-widest">
          <span className="relative flex size-2" aria-hidden>
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-white" />
          </span>
          Maç Canlı
        </span>
      </div>

      <Link
        href={href}
        className="block"
        aria-label={`Canlı maç: ${home?.name ?? "Belirlenecek"} - ${away?.name ?? "Belirlenecek"} detayı`}
      >
        <div className="flex items-center gap-2 px-4 pb-2 pt-4">
          <Side team={home ?? PLACEHOLDER} align="left" />
          <div className="flex flex-col items-center px-3">
            {hasScore ? (
              <span className="text-3xl font-bold tabular-nums tracking-tight">
                {match.home_score} - {match.away_score}
              </span>
            ) : (
              <span className="text-2xl font-bold tracking-tight text-gray-300">
                {formatTime(match.start_time)}
              </span>
            )}
            {match.home_penalty_score !== null && match.away_penalty_score !== null && (
              <span className="text-[11px] font-medium text-muted">
                Pen. {match.home_penalty_score}-{match.away_penalty_score}
              </span>
            )}
          </div>
          <Side team={away ?? PLACEHOLDER} align="right" />
        </div>

        {hasScorers && (
          <div className="flex items-start gap-3 px-4 pb-1 text-xs text-muted">
            <ul className="min-w-0 flex-1 space-y-0.5">
              {homeScorers.map((s, i) => (
                <li key={i} className="truncate">⚽ {s}</li>
              ))}
            </ul>
            <ul className="min-w-0 flex-1 space-y-0.5 text-right">
              {awayScorers.map((s, i) => (
                <li key={i} className="truncate">{s} ⚽</li>
              ))}
            </ul>
          </div>
        )}

        <p className="pb-2 text-center text-xs font-semibold text-red-600">{statusLabel}</p>
      </Link>

      {shareButton && (
        <div className="flex justify-center border-t border-line px-4 py-2">
          {shareButton}
        </div>
      )}
    </div>
  );
}
