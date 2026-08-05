import Link from "next/link";
import { Check, Medal, Radio, Trophy } from "lucide-react";
import { TeamLogo } from "@/components/TeamBadge";
import type { MatchCardTeamInfo } from "@/components/MatchCard";
import { bracketStatusMeta, determineMatchWinner, type BracketStatusMeta } from "@/lib/bracket";
import { cn, formatDateShort, formatTime } from "@/lib/utils";
import type { Match, MatchStatus } from "@/lib/types";

const TBD: MatchCardTeamInfo = { name: "Belirlenecek", logo_url: null, primary_color: "#9CA3AF", code: "?" };

const PLANNED_STATUS: BracketStatusMeta = {
  isLive: false,
  badgeLabel: "Planlandı",
  badgeClassName: "border-[var(--ky-border)] bg-[rgba(36,230,165,0.10)] text-[var(--ky-accent-light)]",
  liveNuance: null,
};

/** Kupa Yolu koyu tema durum rozeti sınıfları (canlı hariç — o kırmızı sabit). */
const DARK_STATUS_CLASS: Partial<Record<MatchStatus, string>> = {
  scheduled: "border-[var(--ky-border)] bg-[rgba(36,230,165,0.10)] text-[var(--ky-accent-light)]",
  completed: "border-white/15 bg-white/5 text-[var(--ky-text-2)]",
  postponed: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  cancelled: "border-white/15 bg-white/5 text-[var(--ky-text-2)]",
  forfeited: "border-purple-300/40 bg-purple-400/10 text-purple-200",
  abandoned: "border-orange-300/40 bg-orange-400/10 text-orange-200",
  awaiting_decision: "border-amber-400/40 bg-amber-400/10 text-amber-300",
};

function TeamRow({
  team,
  score,
  isWinner,
  isLoserOfDecidedMatch,
  logoSize,
  variant,
  highlighted,
  onHoverChange,
}: {
  team: MatchCardTeamInfo;
  score: number | null;
  isWinner: boolean;
  isLoserOfDecidedMatch: boolean;
  logoSize: number;
  variant: "compact" | "full";
  highlighted?: boolean;
  onHoverChange?: (hovering: boolean) => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md px-1 -mx-1 transition-colors",
        highlighted && "bg-[var(--ky-accent)]/10"
      )}
      tabIndex={onHoverChange ? 0 : undefined}
      onMouseEnter={onHoverChange ? () => onHoverChange(true) : undefined}
      onMouseLeave={onHoverChange ? () => onHoverChange(false) : undefined}
      onFocus={onHoverChange ? () => onHoverChange(true) : undefined}
      onBlur={onHoverChange ? () => onHoverChange(false) : undefined}
    >
      <TeamLogo logoUrl={team.logo_url} name={team.name} color={team.primary_color} code={team.code} size={logoSize} />
      <span
        className={cn(
          "line-clamp-2 min-w-0 flex-1 break-words leading-snug",
          variant === "full" ? "text-sm" : "text-xs sm:text-[13px]",
          isWinner && "font-semibold text-[var(--ky-text)]",
          isLoserOfDecidedMatch && "text-[var(--ky-text-2)] opacity-70",
          !isWinner && !isLoserOfDecidedMatch && "font-medium text-[var(--ky-text)]"
        )}
        title={team.name}
      >
        {team.name}
      </span>
      {isWinner && <Check className="size-3.5 shrink-0 text-[var(--ky-accent-light)]" aria-hidden />}
      <span
        className={cn(
          "shrink-0 text-right font-bold tabular-nums",
          variant === "full" ? "w-7 text-lg" : "w-6 text-sm sm:text-base",
          isWinner
            ? "text-[var(--ky-accent-light)]"
            : isLoserOfDecidedMatch
              ? "text-[var(--ky-text-2)] opacity-70"
              : "text-white/30"
        )}
      >
        {score ?? "-"}
      </span>
    </div>
  );
}

export interface BracketMatchCardProps {
  /** null: bu bracket konumunda henüz veritabanı kaydı yok — kart yine de dolu gösterilir. */
  match: Match | null;
  home: MatchCardTeamInfo | null;
  away: MatchCardTeamInfo | null;
  /** Takım henüz belli değilken gösterilecek metin (ör. "Kazanan 3. Maç", "13. Maç Galibi"). */
  homePlaceholder?: string;
  awayPlaceholder?: string;
  roundLabel: string;
  /** Resmi maç programındaki sıralı (1-16) numara. Final/3.'lük kartlarında
   * bağlantı hesapları için kullanılır ama EKRANDA gösterilmez (bkz. headerOverride). */
  matchNumber: number;
  /** Final/3.'lük kartları için "N. Maç" yerine gösterilecek başlık — ör.
   * { title: "FİNAL", subtitle: "1.'LİK-2.'Lİk MAÇI" }. Verilmezse normal
   * "N. Maç" numarası gösterilir. */
  headerOverride?: { title: string; subtitle: string };
  venueName?: string | null;
  variant: "compact" | "full";
  isFinal?: boolean;
  isThirdPlace?: boolean;
  /** Realtime ile az önce güncellendiyse kısa süreli vurgu. */
  justUpdated?: boolean;
  className?: string;
  /** Bağlantı çizgisi katmanının bu kartı ölçebilmesi için kayıt kimliği. */
  nodeId?: string;
  registerNode?: (id: string, el: HTMLElement | null) => void;
  /** Kazananın ilerleyeceği maçın global numarası (Final için null — kendisi ilerlemez). */
  advanceToMatchNumber?: number | null;
  /** Yalnız yarı final: kaybedenin gideceği üçüncülük maçının global numarası. */
  loserAdvanceToMatchNumber?: number | null;
  /** match null ise (DB satırı yok) gösterilecek resmi tarih/saat fallback'i. */
  fallbackDate?: string | null;
  fallbackTime?: string | null;
  /** Hover/tıklama ile vurgulanan olası ilerleme yolu üstünde mi? */
  pathHighlighted?: boolean;
  /** Takım satırı hover/focus olduğunda çağrılır (yol vurgulama için). */
  onTeamHoverChange?: (hovering: boolean) => void;
}

export function BracketMatchCard({
  match,
  home,
  away,
  homePlaceholder,
  awayPlaceholder,
  roundLabel,
  matchNumber,
  headerOverride,
  venueName,
  variant,
  isFinal = false,
  isThirdPlace = false,
  justUpdated = false,
  className,
  nodeId,
  registerNode,
  advanceToMatchNumber = null,
  loserAdvanceToMatchNumber = null,
  fallbackDate = null,
  fallbackTime = null,
  pathHighlighted = false,
  onTeamHoverChange,
}: BracketMatchCardProps) {
  const logoSize = variant === "full" ? (isFinal ? 34 : 28) : 22;
  const padding = variant === "full" ? (isFinal ? "px-5 py-4" : "px-4 py-3.5") : "px-3.5 py-3";
  const refCallback = nodeId && registerNode ? (el: HTMLElement | null) => registerNode(nodeId, el) : undefined;

  const homeInfo = home ?? { ...TBD, name: homePlaceholder ?? "Belirlenecek" };
  const awayInfo = away ?? { ...TBD, name: awayPlaceholder ?? "Belirlenecek" };

  const status: BracketStatusMeta = match ? bracketStatusMeta(match) : PLANNED_STATUS;
  const winner = match ? determineMatchWinner(match) : null;
  const decided = winner !== null;
  const hasScore = !!match && match.home_score !== null && match.away_score !== null;
  const hasPenalties = !!match && match.home_penalty_score !== null && match.away_penalty_score !== null;

  const dateStr = match?.match_date ?? fallbackDate;
  const timeStr = match?.start_time ?? fallbackTime;
  const metaLine = [
    dateStr ? formatDateShort(dateStr) : null,
    timeStr ? formatTime(timeStr) : null,
    venueName ?? null,
  ].filter(Boolean);

  const winnerName = winner === "home" ? homeInfo.name : winner === "away" ? awayInfo.name : null;
  const loserName = winner === "home" ? awayInfo.name : winner === "away" ? homeInfo.name : null;
  // 16 (final) ve 15 (üçüncülük) hiçbir kartta teknik numarayla anılmaz —
  // "N. Maç" yerine "Final" / "3.'lük Maçı" gösterilir.
  const winnerDestination = advanceToMatchNumber === 16 ? "Final" : advanceToMatchNumber != null ? `${advanceToMatchNumber}. Maç` : null;
  const loserDestination = loserAdvanceToMatchNumber === 15 ? "3.'lük Maçı" : loserAdvanceToMatchNumber != null ? `${loserAdvanceToMatchNumber}. Maç` : null;
  const winnerCaption =
    winnerDestination != null
      ? decided
        ? `${winnerName} → ${winnerDestination}`
        : `Kazanan → ${winnerDestination}`
      : null;
  const loserCaption =
    loserDestination != null
      ? decided
        ? `${loserName} → ${loserDestination}`
        : `Mağlup → ${loserDestination}`
      : null;

  const content = (
    <div
      className={cn(
        "relative flex h-full flex-col justify-center gap-1.5 overflow-hidden rounded-[14px] border-[1.5px] backdrop-blur-sm transition-[background-color,box-shadow,border-color] duration-200",
        "bg-[rgba(19,57,52,0.98)] hover:bg-[rgba(25,72,64,1)]",
        "shadow-[0_10px_28px_rgba(0,0,0,0.22),0_0_20px_rgba(51,230,175,0.05)]",
        padding,
        status.isLive
          ? "border-[var(--ky-live)]/70 shadow-[0_0_0_1px_rgba(255,79,103,0.2),0_0_22px_-6px_rgba(255,79,103,0.55)]"
          : "border-[var(--ky-border)] hover:border-[var(--ky-border-hover)]",
        isFinal && "border-[var(--ky-gold)] shadow-[0_0_0_1px_rgba(242,202,100,0.25),0_14px_34px_-8px_rgba(242,202,100,0.4)]",
        isThirdPlace && "border-[var(--ky-bronze)]/70 shadow-[0_0_0_1px_rgba(216,154,96,0.18),0_8px_22px_-8px_rgba(216,154,96,0.3)]",
        justUpdated && "ring-2 ring-[var(--ky-accent-light)]",
        pathHighlighted && "border-[var(--ky-line-active)] shadow-[0_0_0_1px_rgba(101,255,208,0.32),0_0_20px_-4px_rgba(101,255,208,0.6)]"
      )}
    >
      {status.isLive && (
        <span className="absolute inset-x-0 top-0 h-[3px] bg-[var(--ky-live)] shadow-[0_0_8px_rgba(255,77,103,0.8)]" aria-hidden />
      )}

      <div className={cn("flex items-start justify-between gap-2", headerOverride && "items-center")}>
        {headerOverride ? (
          <div className="min-w-0">
            <p className={cn("font-extrabold tracking-wide text-[var(--ky-text)]", variant === "full" ? "text-base" : "text-sm")}>
              {headerOverride.title}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--ky-text-2)]">
              {headerOverride.subtitle}
            </p>
          </div>
        ) : variant === "full" ? (
          <span
            className="shrink-0 whitespace-nowrap text-xs font-medium text-[var(--ky-text-2)]"
            title={`${roundLabel} · ${matchNumber}. Maç`}
          >
            {matchNumber}. Maç
          </span>
        ) : (
          <span />
        )}
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold tracking-wide whitespace-nowrap",
            status.isLive ? "border-[var(--ky-live)] bg-[var(--ky-live)] text-white" : DARK_STATUS_CLASS[match?.status ?? "scheduled"]
          )}
        >
          {status.isLive ? (
            <>
              <Radio className="size-3 animate-pulse motion-reduce:animate-none" aria-hidden />
              CANLI
            </>
          ) : (
            status.badgeLabel
          )}
        </span>
      </div>

      {status.isLive && (
        <p className="text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--ky-live)]">
          Şu anda oynanıyor
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <TeamRow
          team={homeInfo}
          score={hasScore ? match!.home_score : null}
          isWinner={decided && winner === "home"}
          isLoserOfDecidedMatch={decided && winner === "away"}
          logoSize={status.isLive ? logoSize + 4 : logoSize}
          variant={variant}
          highlighted={pathHighlighted}
          onHoverChange={onTeamHoverChange}
        />
        <TeamRow
          team={awayInfo}
          score={hasScore ? match!.away_score : null}
          isWinner={decided && winner === "away"}
          isLoserOfDecidedMatch={decided && winner === "home"}
          logoSize={status.isLive ? logoSize + 4 : logoSize}
          variant={variant}
          highlighted={pathHighlighted}
          onHoverChange={onTeamHoverChange}
        />
      </div>

      {hasPenalties && (
        <p className="text-center text-xs font-medium text-[var(--ky-text-2)]">
          Penaltılar: {match!.home_penalty_score}-{match!.away_penalty_score}
        </p>
      )}
      {match?.status === "forfeited" && (
        <p className="text-center text-xs font-semibold text-purple-300">Hükmen sonuçlandı</p>
      )}
      {status.liveNuance && (
        <p className="text-center text-[10px] font-medium text-[var(--ky-live)]">{status.liveNuance}</p>
      )}

      {variant === "full" && metaLine.length > 0 && (
        <p className="truncate text-center text-[10px] text-[var(--ky-text-2)]">{metaLine.join(" · ")}</p>
      )}

      {(winnerCaption || loserCaption) && (
        <div className="mt-0.5 flex flex-col items-center gap-0.5 border-t border-white/10 pt-1.5 text-center">
          {winnerCaption && (
            <p className={cn("text-[10px] font-bold", decided ? "text-[var(--ky-accent-light)]" : "text-[var(--ky-text-2)]")}>
              {winnerCaption}
            </p>
          )}
          {loserCaption && (
            <p className={cn("text-[10px] font-semibold", decided ? "text-[var(--ky-bronze)]" : "text-[var(--ky-text-2)] opacity-80")}>
              {loserCaption}
            </p>
          )}
        </div>
      )}

      {isFinal && (
        <Trophy className="pointer-events-none absolute -right-2 -top-2 size-10 rotate-12 text-[var(--ky-gold)]/15" aria-hidden />
      )}
      {isThirdPlace && (
        <Medal className="pointer-events-none absolute -right-1.5 -top-1.5 size-7 rotate-12 text-[var(--ky-bronze)]/25" aria-hidden />
      )}
    </div>
  );

  if (!match) {
    return (
      <div ref={refCallback} className={cn("block h-full rounded-[14px]", className)}>
        {content}
      </div>
    );
  }

  return (
    <Link
      ref={refCallback}
      href={`/maclar/${match.id}`}
      className={cn(
        "block h-full rounded-[14px] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ky-accent-light)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--ky-bg-1)]",
        className
      )}
      aria-label={`${homeInfo.name} - ${awayInfo.name}, ${roundLabel}, ${status.isLive ? "Canlı" : status.badgeLabel}`}
    >
      {content}
    </Link>
  );
}
