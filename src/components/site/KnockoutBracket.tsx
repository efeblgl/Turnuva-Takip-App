import Link from "next/link";
import { Trophy } from "lucide-react";
import { teamInfoFrom, type MatchCardTeamInfo } from "@/components/MatchCard";
import { TeamLogo } from "@/components/TeamBadge";
import { BracketMatchCard } from "@/components/site/BracketMatchCard";
import {
  bracketPositionOf, determineMatchWinner, type BracketCell, type BracketSide,
  type BracketSideData, type KnockoutBracketData,
} from "@/lib/bracket";
import { KNOCKOUT_ROUND_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { Match, PublicTeam } from "@/lib/types";

export type BracketVariant = "compact" | "full";

export interface KnockoutBracketProps {
  bracket: KnockoutBracketData;
  teamsById: Map<string, PublicTeam>;
  venueNamesById?: Map<string, string>;
  variant: BracketVariant;
  /** Şampiyon alanı başlığı (yıl/sezon çağıran sayfadan verilir, hard-code edilmez). */
  championTitle?: string;
  /** Realtime ile az önce güncellenen maç kimlikleri (kısa vurgu için). */
  justUpdatedIds?: Set<string>;
  title?: string;
  description?: string;
  ctaHref?: string;
  ctaLabel?: string;
}

function resolveTeam(teamId: string | null, teamsById: Map<string, PublicTeam>): MatchCardTeamInfo | null {
  if (!teamId) return null;
  return teamInfoFrom(teamsById.get(teamId));
}

interface ResolvedCard {
  match: Match | null;
  home: MatchCardTeamInfo | null;
  away: MatchCardTeamInfo | null;
  roundLabel: string;
  matchNumber: number;
}

function resolveCell(
  cell: BracketCell,
  round: "round_of_16" | "quarter_final" | "semi_final",
  side: BracketSide,
  teamsById: Map<string, PublicTeam>
): ResolvedCard {
  return {
    match: cell.match,
    home: cell.match ? resolveTeam(cell.match.home_team_id, teamsById) : null,
    away: cell.match ? resolveTeam(cell.match.away_team_id, teamsById) : null,
    roundLabel: KNOCKOUT_ROUND_LABELS[round],
    matchNumber: cell.match?.bracket_position ?? bracketPositionOf(round, side, cell.slot),
  };
}

function Card({
  card, variant, isFinal, venueNamesById, justUpdatedIds, className,
}: {
  card: ResolvedCard;
  variant: BracketVariant;
  isFinal?: boolean;
  venueNamesById?: Map<string, string>;
  justUpdatedIds?: Set<string>;
  className?: string;
}) {
  return (
    <BracketMatchCard
      match={card.match}
      home={card.home}
      away={card.away}
      roundLabel={card.roundLabel}
      matchNumber={card.matchNumber}
      venueName={card.match?.venue_id ? venueNamesById?.get(card.match.venue_id) : null}
      variant={variant}
      isFinal={isFinal}
      justUpdated={!!card.match && !!justUpdatedIds?.has(card.match.id)}
      className={className}
    />
  );
}

// ---------------------------------------------------------------------------
// Masaüstü: sabit CSS Grid, kesik çizgili bağlantılar (JS ölçüm yok)
// ---------------------------------------------------------------------------

/** İki maçı tek bir sonraki maça bağlayan kesik çizgi (grid hücresi kadar esner). */
function PairConnector({ mirrored = false }: { mirrored?: boolean }) {
  return (
    <div className={cn("relative h-full w-full", mirrored && "scale-x-[-1]")} aria-hidden="true">
      <div className="absolute left-0 top-1/4 h-0 w-1/2 border-t-2 border-dashed border-gray-300" />
      <div className="absolute bottom-1/4 left-0 h-0 w-1/2 border-t-2 border-dashed border-gray-300" />
      <div className="absolute bottom-1/4 left-1/2 top-1/4 h-auto w-0 border-l-2 border-dashed border-gray-300" />
      <div className="absolute left-1/2 top-1/2 h-0 w-1/2 border-t-2 border-dashed border-gray-300" />
    </div>
  );
}

/** Yarı Final -> Final gibi tek-tek (1-1) bağlantılar için düz kesik çizgi. */
function StraightConnector() {
  return (
    <div className="relative h-full w-full" aria-hidden="true">
      <div className="absolute left-0 top-1/2 h-0 w-full border-t-2 border-dashed border-gray-300" />
    </div>
  );
}

const DESKTOP_ROW_TEMPLATE = "repeat(4, minmax(112px, 1fr))";

/** Kart/bağlantı genişlikleri: yazılar hiçbir takım adında sıkışmasın diye
 * geniş tutulur (bkz. determineMatchWinner altındaki kartlarda kelime içi
 * bölünme sorunu — dar sütunlarda "Yığılcaspor" gibi tek kelimelik isimler
 * ortadan bölünüyordu). */
function cardSizes(variant: BracketVariant) {
  return variant === "full"
    ? { card: "minmax(232px, 1fr)", finalCard: "minmax(272px, 1.1fr)", conn: "40px" }
    : { card: "minmax(212px, 1fr)", finalCard: "minmax(244px, 1fr)", conn: "30px" };
}

function desktopColumnTemplate(variant: BracketVariant): string {
  const { card, finalCard, conn } = cardSizes(variant);
  return [card, conn, card, conn, card, conn, finalCard, conn, card, conn, card, conn, card].join(" ");
}

function resolveFinal(bracket: KnockoutBracketData, teamsById: Map<string, PublicTeam>): ResolvedCard {
  const match = bracket.final.match;
  return {
    match,
    home: match ? resolveTeam(match.home_team_id, teamsById) : null,
    away: match ? resolveTeam(match.away_team_id, teamsById) : null,
    roundLabel: KNOCKOUT_ROUND_LABELS.final,
    matchNumber: 1,
  };
}

function championOf(card: ResolvedCard): MatchCardTeamInfo | null {
  if (!card.match) return null;
  const winnerSlot = determineMatchWinner(card.match);
  if (!winnerSlot) return null;
  return winnerSlot === "home" ? card.home : card.away;
}

function DesktopSide({
  side, sideData, variant, venueNamesById, justUpdatedIds, teamsById, mirrored,
}: {
  side: BracketSide;
  sideData: BracketSideData;
  variant: BracketVariant;
  venueNamesById?: Map<string, string>;
  justUpdatedIds?: Set<string>;
  teamsById: Map<string, PublicTeam>;
  mirrored: boolean;
}) {
  const r16 = sideData.roundOf16.map((c) => resolveCell(c, "round_of_16", side, teamsById));
  const qf = sideData.quarterFinals.map((c) => resolveCell(c, "quarter_final", side, teamsById));
  const sf = resolveCell(sideData.semiFinal, "semi_final", side, teamsById);

  const rowGap = variant === "full" ? "6px" : "4px";

  // Sol taraf sütun sırası: R16, conn, QF, conn, SF (dışarıdan içeri, merkeze doğru).
  // Sağ taraf yalnızca YERLEŞİM olarak aynalanır: SF, conn, QF, conn, R16.
  // Yazılar/skorlar/takım isimleri ASLA çevrilmez; yalnızca kartların dizilim sırası değişir.
  const r16Order = mirrored ? [...r16].reverse() : r16;
  const qfOrder = mirrored ? [...qf].reverse() : qf;

  return (
    <div
      className="grid"
      style={{ gridTemplateColumns: sideColTemplate(variant), gridTemplateRows: DESKTOP_ROW_TEMPLATE, columnGap: 0, rowGap }}
    >
      {!mirrored && (
        <>
          {r16Order.map((c, i) => (
            <div key={`r16-${i}`} style={{ gridColumn: 1, gridRow: i + 1 }}>
              <Card card={c} variant={variant} venueNamesById={venueNamesById} justUpdatedIds={justUpdatedIds} className="h-full" />
            </div>
          ))}
          <div style={{ gridColumn: 2, gridRow: "1 / span 2" }}><PairConnector /></div>
          <div style={{ gridColumn: 2, gridRow: "3 / span 2" }}><PairConnector /></div>
          {qfOrder.map((c, i) => (
            <div key={`qf-${i}`} style={{ gridColumn: 3, gridRow: `${i * 2 + 1} / span 2` }}>
              <Card card={c} variant={variant} venueNamesById={venueNamesById} justUpdatedIds={justUpdatedIds} className="h-full" />
            </div>
          ))}
          <div style={{ gridColumn: 4, gridRow: "1 / span 4" }}><PairConnector /></div>
          <div style={{ gridColumn: 5, gridRow: "1 / span 4" }}>
            <Card card={sf} variant={variant} venueNamesById={venueNamesById} justUpdatedIds={justUpdatedIds} className="h-full" />
          </div>
        </>
      )}
      {mirrored && (
        <>
          <div style={{ gridColumn: 1, gridRow: "1 / span 4" }}>
            <Card card={sf} variant={variant} venueNamesById={venueNamesById} justUpdatedIds={justUpdatedIds} className="h-full" />
          </div>
          <div style={{ gridColumn: 2, gridRow: "1 / span 4" }}><PairConnector mirrored /></div>
          {qfOrder.map((c, i) => (
            <div key={`qf-${i}`} style={{ gridColumn: 3, gridRow: `${i * 2 + 1} / span 2` }}>
              <Card card={c} variant={variant} venueNamesById={venueNamesById} justUpdatedIds={justUpdatedIds} className="h-full" />
            </div>
          ))}
          <div style={{ gridColumn: 4, gridRow: "1 / span 2" }}><PairConnector mirrored /></div>
          <div style={{ gridColumn: 4, gridRow: "3 / span 2" }}><PairConnector mirrored /></div>
          {r16Order.map((c, i) => (
            <div key={`r16-${i}`} style={{ gridColumn: 5, gridRow: i + 1 }}>
              <Card card={c} variant={variant} venueNamesById={venueNamesById} justUpdatedIds={justUpdatedIds} className="h-full" />
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function sideColTemplate(variant: BracketVariant): string {
  const { card, conn } = cardSizes(variant);
  return [card, conn, card, conn, card].join(" ");
}

function DesktopBracket({
  bracket, teamsById, venueNamesById, variant, justUpdatedIds, championTitle,
}: Required<Pick<KnockoutBracketProps, "bracket" | "teamsById" | "variant">> &
  Pick<KnockoutBracketProps, "venueNamesById" | "justUpdatedIds" | "championTitle">) {
  const finalCard = resolveFinal(bracket, teamsById);
  const champion = championOf(finalCard);

  const headerLabels = [
    "SON 16", "", "ÇEYREK FİNAL", "", "YARI FİNAL", "", "FİNAL", "", "YARI FİNAL", "", "ÇEYREK FİNAL", "", "SON 16",
  ];

  return (
    <div className="hidden overflow-x-auto lg:block">
      <div className={variant === "full" ? "min-w-[1900px]" : "min-w-[1700px]"}>
        {variant === "full" && (
          <div className="grid pb-2" style={{ gridTemplateColumns: desktopColumnTemplate(variant), columnGap: 0 }}>
            {headerLabels.map((label, i) => (
              <p key={i} className="text-center text-xs font-bold tracking-wide text-muted">{label}</p>
            ))}
          </div>
        )}
        <div className="grid items-stretch" style={{ gridTemplateColumns: desktopColumnTemplate(variant), gridTemplateRows: DESKTOP_ROW_TEMPLATE, columnGap: 0 }}>
          <div style={{ gridColumn: "1 / span 5", gridRow: "1 / span 4" }}>
            <DesktopSide side="left" sideData={bracket.left} variant={variant} venueNamesById={venueNamesById} justUpdatedIds={justUpdatedIds} teamsById={teamsById} mirrored={false} />
          </div>
          <div style={{ gridColumn: 6, gridRow: "1 / span 4" }}><StraightConnector /></div>
          <div style={{ gridColumn: 7, gridRow: "1 / span 4" }}>
            <Card card={finalCard} variant={variant} isFinal venueNamesById={venueNamesById} justUpdatedIds={justUpdatedIds} className="h-full" />
          </div>
          <div style={{ gridColumn: 8, gridRow: "1 / span 4" }}><StraightConnector /></div>
          <div style={{ gridColumn: "9 / span 5", gridRow: "1 / span 4" }}>
            <DesktopSide side="right" sideData={bracket.right} variant={variant} venueNamesById={venueNamesById} justUpdatedIds={justUpdatedIds} teamsById={teamsById} mirrored />
          </div>
        </div>
      </div>
      {champion && variant === "full" && <ChampionBanner team={champion} title={championTitle} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mobil: sol yol / sağ yol / final, dikey basit bağlantılar
// ---------------------------------------------------------------------------

function MobileRoundGroup({
  label, cells, round, side, variant, teamsById, venueNamesById, justUpdatedIds,
}: {
  label: string;
  cells: BracketCell[];
  round: "round_of_16" | "quarter_final" | "semi_final";
  side: BracketSide;
  variant: BracketVariant;
  teamsById: Map<string, PublicTeam>;
  venueNamesById?: Map<string, string>;
  justUpdatedIds?: Set<string>;
}) {
  return (
    <div>
      <h4 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">{label}</h4>
      <div className="space-y-1.5">
        {cells.map((cell) => (
          <Card
            key={cell.slot}
            card={resolveCell(cell, round, side, teamsById)}
            variant={variant}
            venueNamesById={venueNamesById}
            justUpdatedIds={justUpdatedIds}
          />
        ))}
      </div>
    </div>
  );
}

function MobileConnector() {
  return (
    <div className="flex items-center justify-center gap-2 py-1" aria-hidden="true">
      <span className="h-4 w-px border-l-2 border-dashed border-gray-300" />
      <span className="text-[10px] font-medium text-muted">Kazananlar ilerler</span>
      <span className="h-4 w-px border-l-2 border-dashed border-gray-300" />
    </div>
  );
}

function MobileSide({
  side, sideData, label, variant, teamsById, venueNamesById, justUpdatedIds,
}: {
  side: BracketSide;
  sideData: BracketSideData;
  label: string;
  variant: BracketVariant;
  teamsById: Map<string, PublicTeam>;
  venueNamesById?: Map<string, string>;
  justUpdatedIds?: Set<string>;
}) {
  return (
    <section aria-label={label} className="rounded-2xl border border-line bg-gray-50/50 p-3">
      <h3 className="mb-2 text-sm font-bold text-ink">{label}</h3>
      <MobileRoundGroup label="Son 16" cells={sideData.roundOf16} round="round_of_16" side={side} variant={variant} teamsById={teamsById} venueNamesById={venueNamesById} justUpdatedIds={justUpdatedIds} />
      <MobileConnector />
      <MobileRoundGroup label="Çeyrek Final" cells={sideData.quarterFinals} round="quarter_final" side={side} variant={variant} teamsById={teamsById} venueNamesById={venueNamesById} justUpdatedIds={justUpdatedIds} />
      <MobileConnector />
      <MobileRoundGroup label="Yarı Final" cells={[sideData.semiFinal]} round="semi_final" side={side} variant={variant} teamsById={teamsById} venueNamesById={venueNamesById} justUpdatedIds={justUpdatedIds} />
    </section>
  );
}

function MobileBracket({ bracket, teamsById, venueNamesById, variant, justUpdatedIds, championTitle }: Required<Pick<KnockoutBracketProps, "bracket" | "teamsById" | "variant">> & Pick<KnockoutBracketProps, "venueNamesById" | "justUpdatedIds" | "championTitle">) {
  const finalCard = resolveFinal(bracket, teamsById);
  const champion = championOf(finalCard);

  return (
    <div className="space-y-3 lg:hidden">
      <MobileSide side="left" sideData={bracket.left} label="Sol Eleme Yolu" variant={variant} teamsById={teamsById} venueNamesById={venueNamesById} justUpdatedIds={justUpdatedIds} />
      <MobileSide side="right" sideData={bracket.right} label="Sağ Eleme Yolu" variant={variant} teamsById={teamsById} venueNamesById={venueNamesById} justUpdatedIds={justUpdatedIds} />
      <section aria-label="Final" className="rounded-2xl border-2 border-brand-600 bg-brand-50/30 p-3">
        <h3 className="mb-2 text-sm font-bold text-ink">Final</h3>
        <Card card={finalCard} variant={variant} isFinal venueNamesById={venueNamesById} justUpdatedIds={justUpdatedIds} />
        {champion && <ChampionBanner team={champion} title={championTitle} />}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Şampiyon alanı
// ---------------------------------------------------------------------------

function ChampionBanner({ team, title = "Şampiyon" }: { team: MatchCardTeamInfo; title?: string }) {
  return (
    <div className="mx-auto mt-4 flex max-w-xs flex-col items-center gap-2 rounded-2xl border-2 border-brand-600 bg-brand-50 px-6 py-4 text-center shadow-[0_2px_8px_rgba(21,128,61,0.12)]">
      <Trophy className="size-7 text-brand-700" aria-hidden />
      <p className="text-xs font-bold uppercase tracking-wide text-brand-700">{title}</p>
      <div className="flex items-center gap-2">
        <TeamLogo logoUrl={team.logo_url} name={team.name} color={team.primary_color} code={team.code} size={36} />
        <span className="text-lg font-bold text-ink">{team.name}</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ana bileşen
// ---------------------------------------------------------------------------

export function KnockoutBracket({
  bracket, teamsById, venueNamesById, variant, championTitle, justUpdatedIds,
  title, description, ctaHref, ctaLabel,
}: KnockoutBracketProps) {
  return (
    <div className="space-y-4">
      {(title || description) && (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            {title && <h2 className="section-title">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          {ctaHref && (
            <Link href={ctaHref} className="btn-secondary btn-sm shrink-0">
              {ctaLabel ?? "Tüm Eleme Ağacını Gör"}
            </Link>
          )}
        </div>
      )}
      <DesktopBracket bracket={bracket} teamsById={teamsById} venueNamesById={venueNamesById} variant={variant} justUpdatedIds={justUpdatedIds} championTitle={championTitle} />
      <MobileBracket bracket={bracket} teamsById={teamsById} venueNamesById={venueNamesById} variant={variant} justUpdatedIds={justUpdatedIds} championTitle={championTitle} />
    </div>
  );
}
