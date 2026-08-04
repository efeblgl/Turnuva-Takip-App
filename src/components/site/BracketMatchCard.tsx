import Link from "next/link";
import { Check } from "lucide-react";
import { TeamLogo } from "@/components/TeamBadge";
import type { MatchCardTeamInfo } from "@/components/MatchCard";
import { bracketStatusMeta, determineMatchWinner } from "@/lib/bracket";
import { cn, formatDateShort, formatTime } from "@/lib/utils";
import type { Match } from "@/lib/types";

const TBD: MatchCardTeamInfo = { name: "Belirlenecek", logo_url: null, primary_color: "#9CA3AF", code: "?" };

function TeamRow({
  team,
  score,
  isWinner,
  isLoserOfDecidedMatch,
  logoSize,
  variant,
}: {
  team: MatchCardTeamInfo;
  score: number | null;
  isWinner: boolean;
  isLoserOfDecidedMatch: boolean;
  logoSize: number;
  variant: "compact" | "full";
}) {
  return (
    <div className="flex items-center gap-2">
      <TeamLogo logoUrl={team.logo_url} name={team.name} color={team.primary_color} code={team.code} size={logoSize} />
      <span
        className={cn(
          "line-clamp-2 min-w-0 flex-1 break-words leading-snug",
          variant === "full" ? "text-sm" : "text-xs sm:text-[13px]",
          isWinner && "font-semibold text-ink",
          isLoserOfDecidedMatch && "text-muted",
          !isWinner && !isLoserOfDecidedMatch && "font-medium text-ink"
        )}
        title={team.name}
      >
        {team.name}
      </span>
      {isWinner && <Check className="size-3.5 shrink-0 text-brand-700" aria-hidden />}
      <span
        className={cn(
          "shrink-0 text-right font-bold tabular-nums",
          variant === "full" ? "w-7 text-lg" : "w-6 text-sm sm:text-base",
          isWinner ? "text-ink" : isLoserOfDecidedMatch ? "text-muted" : "text-gray-400"
        )}
      >
        {score ?? "-"}
      </span>
    </div>
  );
}

export interface BracketMatchCardProps {
  /** null: bu bracket konumunda henüz veritabanı kaydı yok. */
  match: Match | null;
  home: MatchCardTeamInfo | null;
  away: MatchCardTeamInfo | null;
  roundLabel: string;
  matchNumber: number;
  venueName?: string | null;
  variant: "compact" | "full";
  isFinal?: boolean;
  /** Realtime ile az önce güncellendiyse kısa süreli vurgu. */
  justUpdated?: boolean;
  className?: string;
}

export function BracketMatchCard({
  match,
  home,
  away,
  roundLabel,
  matchNumber,
  venueName,
  variant,
  isFinal = false,
  justUpdated = false,
  className,
}: BracketMatchCardProps) {
  const logoSize = variant === "full" ? 30 : 22;
  const padding = variant === "full" ? "px-4 py-3" : "px-3 py-2.5";

  if (!match) {
    return (
      <div
        className={cn(
          "flex flex-col justify-center rounded-[14px] border border-dashed border-line bg-gray-50/60 text-center",
          padding,
          className
        )}
      >
        <p className="text-xs font-medium text-muted">{roundLabel} · {matchNumber}. Maç</p>
        <p className="mt-1 text-sm font-medium text-gray-400">Maç henüz oluşturulmadı</p>
      </div>
    );
  }

  const homeInfo = home ?? TBD;
  const awayInfo = away ?? TBD;
  const bothUnknown = !home && !away;
  const status = bracketStatusMeta(match);
  const winner = determineMatchWinner(match);
  const decided = winner !== null;
  const hasScore = match.home_score !== null && match.away_score !== null;
  const hasPenalties = match.home_penalty_score !== null && match.away_penalty_score !== null;
  const metaLine = [
    match.match_date ? formatDateShort(match.match_date) : null,
    match.start_time ? formatTime(match.start_time) : null,
    venueName ?? null,
  ].filter(Boolean);

  const content = (
    <div
      className={cn(
        "relative flex h-full flex-col justify-center gap-1.5 rounded-[14px] border bg-surface shadow-[0_1px_2px_rgba(16,24,40,0.06)] transition-colors",
        padding,
        status.isLive ? "border-red-300" : "border-line",
        isFinal && "border-2 border-brand-600 bg-brand-50/40 shadow-[0_2px_8px_rgba(21,128,61,0.12)]",
        justUpdated && "ring-2 ring-brand-400"
      )}
    >
      {status.isLive && (
        <span className="absolute inset-x-0 top-0 h-0.5 rounded-t-[14px] bg-red-600" aria-hidden />
      )}

      <div className="flex items-center justify-between gap-2">
        {variant === "full" ? (
          <span className="shrink-0 whitespace-nowrap text-xs font-medium text-muted" title={`${roundLabel} · ${matchNumber}. Maç`}>
            {matchNumber}. Maç
          </span>
        ) : (
          <span />
        )}
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold tracking-wide whitespace-nowrap",
            status.badgeClassName
          )}
        >
          {status.isLive && (
            <span className="relative flex size-1.5" aria-hidden>
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-75 motion-reduce:animate-none" />
              <span className="relative inline-flex size-1.5 rounded-full bg-white" />
            </span>
          )}
          {status.badgeLabel}
        </span>
      </div>

      {bothUnknown ? (
        <p className="py-1.5 text-center text-xs font-medium text-gray-400">Takımlar belli değil</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          <TeamRow
            team={home ? homeInfo : { ...TBD, name: "Kazanan bekleniyor" }}
            score={hasScore ? match.home_score : null}
            isWinner={decided && winner === "home"}
            isLoserOfDecidedMatch={decided && winner === "away"}
            logoSize={logoSize}
            variant={variant}
          />
          <TeamRow
            team={away ? awayInfo : { ...TBD, name: "Kazanan bekleniyor" }}
            score={hasScore ? match.away_score : null}
            isWinner={decided && winner === "away"}
            isLoserOfDecidedMatch={decided && winner === "home"}
            logoSize={logoSize}
            variant={variant}
          />
        </div>
      )}

      {hasPenalties && (
        <p className="text-center text-xs font-medium text-muted">
          Penaltılar: {match.home_penalty_score}-{match.away_penalty_score}
        </p>
      )}
      {match.status === "forfeited" && (
        <p className="text-center text-xs font-semibold text-purple-700">Hükmen sonuçlandı</p>
      )}
      {status.liveNuance && (
        <p className="text-center text-[10px] font-medium text-red-700">{status.liveNuance}</p>
      )}

      {variant === "full" && metaLine.length > 0 && (
        <p className="truncate text-center text-[10px] text-muted">{metaLine.join(" · ")}</p>
      )}
    </div>
  );

  return (
    <Link
      href={`/maclar/${match.id}`}
      className={cn("block h-full rounded-[14px] transition-transform hover:-translate-y-0.5", className)}
      aria-label={`${homeInfo.name} - ${awayInfo.name}, ${roundLabel}, ${status.badgeLabel}`}
    >
      {content}
    </Link>
  );
}
