import Link from "next/link";
import { Badge } from "./ui";
import { TeamLogo } from "./TeamBadge";
import { LIVE_STATUSES, MATCH_STATUS_BADGE, MATCH_STATUS_LABELS } from "@/lib/labels";
import { cn, formatDateShort, formatTime } from "@/lib/utils";
import type { Match } from "@/lib/types";

export interface MatchCardTeamInfo {
  id?: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  code: string | null;
}

const PLACEHOLDER: MatchCardTeamInfo = {
  name: "Belirlenecek",
  logo_url: null,
  primary_color: "#9CA3AF",
  code: "?",
};

/** Takım satırından maç kartı bilgisine dönüştürücü. */
export function teamInfoFrom(
  team:
    | { id?: string; name: string; logo_url: string | null; primary_color: string | null; code: string | null }
    | null
    | undefined
): MatchCardTeamInfo | null {
  if (!team) return null;
  return {
    id: team.id,
    name: team.name,
    logo_url: team.logo_url,
    primary_color: team.primary_color,
    code: team.code,
  };
}

function ScoreBox({ match }: { match: Match }) {
  const played = match.home_score !== null && match.away_score !== null &&
    !["scheduled", "postponed", "cancelled", "awaiting_decision"].includes(match.status);

  if (!played) {
    return (
      <div className="flex flex-col items-center px-2">
        <span className="text-lg font-bold tracking-tight text-gray-400">-</span>
        <span className="text-[11px] font-medium text-muted">{formatTime(match.start_time)}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-2">
      <span className="text-xl font-bold tabular-nums tracking-tight">
        {match.home_score} - {match.away_score}
      </span>
      {match.home_penalty_score !== null && match.away_penalty_score !== null && (
        <span className="text-[11px] font-medium text-muted">
          Pen. {match.home_penalty_score}-{match.away_penalty_score}
        </span>
      )}
    </div>
  );
}

function TeamSide({
  team,
  align,
}: {
  team: MatchCardTeamInfo;
  align: "left" | "right";
}) {
  const content = (
    <>
      <TeamLogo logoUrl={team.logo_url} name={team.name} color={team.primary_color} code={team.code} size={32} />
      <span className="min-w-0 break-words text-sm font-semibold leading-tight">
        {team.name}
      </span>
    </>
  );

  const className = cn(
    "flex min-w-0 flex-1 items-center gap-2",
    align === "right" && "flex-row-reverse text-right"
  );

  // Takıma tıklanınca fikstür o takımın maçlarına filtrelenir
  if (team.id) {
    return (
      <Link
        href={`/fikstur?takim=${team.id}`}
        className={cn(className, "relative z-10 rounded-lg hover:underline")}
        title={`${team.name} maçlarını göster`}
      >
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}

export function MatchCard({
  match,
  home,
  away,
  venueName,
  contextLabel,
  href,
  liveNow = false,
}: {
  match: Match;
  home: MatchCardTeamInfo | null;
  away: MatchCardTeamInfo | null;
  venueName?: string | null;
  /** Grup adı, tur adı veya hafta bilgisi */
  contextLabel?: string | null;
  href: string;
  /** Maç saati geldi (durum hâlâ "Planlandı" olsa bile rozet "Canlı" yazar) */
  liveNow?: boolean;
}) {
  const statusLive = (LIVE_STATUSES as string[]).includes(match.status);
  const isLive = statusLive || (liveNow && match.status === "scheduled");
  const badgeClass = isLive ? MATCH_STATUS_BADGE.in_progress : MATCH_STATUS_BADGE[match.status];
  const badgeLabel = statusLive
    ? MATCH_STATUS_LABELS[match.status]
    : isLive
      ? "Canlı"
      : MATCH_STATUS_LABELS[match.status];

  return (
    <div className="card card-hover relative">
      {/* Kartın tamamı maç detayına götürür; takım adları ayrıca tıklanabilir */}
      <Link
        href={href}
        className="absolute inset-0 rounded-2xl"
        aria-label={`${home?.name ?? "Belirlenecek"} - ${away?.name ?? "Belirlenecek"} maç detayı`}
      />

      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted">
          {contextLabel && <span>{contextLabel} · </span>}
          {formatDateShort(match.match_date)}
          {venueName && <span> · {venueName}</span>}
        </span>
        <Badge
          className={cn(
            badgeClass,
            isLive && "animate-pulse"
          )}
        >
          {isLive && <span aria-hidden className="size-1.5 rounded-full bg-emerald-500" />}
          {badgeLabel}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        <TeamSide team={home ?? PLACEHOLDER} align="left" />
        <ScoreBox match={match} />
        <TeamSide team={away ?? PLACEHOLDER} align="right" />
      </div>
    </div>
  );
}
