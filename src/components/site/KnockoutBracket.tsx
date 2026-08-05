"use client";

/**
 * "Kupa Yolu" - zümrüt/turkuaz, İKİ TARAFTAN MERKEZE yakınsayan simetrik
 * eleme ağacı görünümü.
 *
 * TEK YERLEŞİM: masaüstü ve mobil AYNI bracket'ı kullanır (ayrı bir mobil
 * arayüz/sekme yoktur). Dar ekranlarda yerleşim değişmez, yalnızca kart
 * genişlikleri bir miktar küçülür ve bracket yatay olarak kaydırılır;
 * açılışta kaydırma konumu merkeze (final + kupa) ayarlanır.
 *
 * Sütun sırası: SOL SON 16 → SOL ÇEYREK FİNAL → SOL YARI FİNAL → MERKEZ
 * (KUPA + FİNAL + 3.'LÜK) → SAĞ YARI FİNAL → SAĞ ÇEYREK FİNAL → SAĞ SON 16.
 * `lib/bracket.ts`'teki `left`/`right` alanları (bracket_position: Son 16
 * sol 1-4/sağ 5-8, Çeyrek Final sol 1-2/sağ 3-4, Yarı Final sol 1/sağ 2)
 * BİREBİR bu yerleşime karşılık gelir — veri katmanında değişiklik YOK.
 *
 * Ara turlar (ÇF/YF) gerçek DOM ölçümüyle besleyen iki kartın tam ortasına
 * konumlanır (bkz. useBracketGeometry). Merkez sütunu ise JS ile
 * konumlandırılmaz: her iki taraf eşit sayıda/aralıkta kart içerdiği için
 * türetilen merkez satırın tam ortasıdır, bu yüzden `justify-center` ile
 * kendiliğinden doğru yere oturur.
 */
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { teamInfoFrom, type MatchCardTeamInfo } from "@/components/MatchCard";
import { TeamLogo } from "@/components/TeamBadge";
import { BracketConnectors, type BracketPath } from "@/components/site/BracketConnectors";
import { BracketMatchCard } from "@/components/site/BracketMatchCard";
import { TrophyScene } from "@/components/site/TrophyScene";
import { useBracketGeometry } from "@/components/site/useBracketGeometry";
import {
  bracketPositionOf, determineMatchWinner, feederPlaceholders, globalMatchNumber,
  type BracketCell, type BracketSide, type BracketSideData, type KnockoutBracketData,
} from "@/lib/bracket";
import { officialScheduleFor } from "@/lib/bracket-schedule";
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

// ---------------------------------------------------------------------------
// Sabit node kimlikleri (stabil referanslar — useBracketGeometry'nin efekt
// bağımlılıklarından bilinçli olarak çıkarılmıştır, bkz. o dosyadaki not)
// ---------------------------------------------------------------------------

const LEFT_R16_IDS = ["l16-0", "l16-1", "l16-2", "l16-3"] as const;
const LEFT_QF_IDS = ["lqf-0", "lqf-1"] as const;
const LEFT_SF_ID = "lsf";
const RIGHT_R16_IDS = ["r16-0", "r16-1", "r16-2", "r16-3"] as const;
const RIGHT_QF_IDS = ["rqf-0", "rqf-1"] as const;
const RIGHT_SF_ID = "rsf";

const FINAL_HEADER = { title: "FİNAL", subtitle: "1.'LİK-2.'LİK MAÇI" };
const THIRD_HEADER = { title: "3.'LÜK-4.'LÜK MAÇI", subtitle: "YARI FİNAL MAĞLUPLARI" };

// ---------------------------------------------------------------------------
// Veri çözümleme: bracket.left / bracket.right -> resmi numaralı kart listeleri
// ---------------------------------------------------------------------------

interface ResolvedCard {
  match: Match | null;
  home: MatchCardTeamInfo | null;
  away: MatchCardTeamInfo | null;
  homePlaceholder?: string;
  awayPlaceholder?: string;
  roundLabel: string;
  matchNumber: number;
  nodeId: string;
  advanceToMatchNumber: number | null;
  loserAdvanceToMatchNumber: number | null;
  fallbackDate: string | null;
  fallbackTime: string | null;
}

function resolveTeam(teamId: string | null, teamsById: Map<string, PublicTeam>): MatchCardTeamInfo | null {
  if (!teamId) return null;
  return teamInfoFrom(teamsById.get(teamId));
}

function cardFromCell(
  cell: BracketCell,
  matchNumber: number,
  nodeId: string,
  roundLabel: string,
  advanceToMatchNumber: number | null,
  loserAdvanceToMatchNumber: number | null,
  placeholder: { home: string; away: string } | null,
  teamsById: Map<string, PublicTeam>
): ResolvedCard {
  const sched = officialScheduleFor(matchNumber);
  return {
    match: cell.match,
    home: cell.match ? resolveTeam(cell.match.home_team_id, teamsById) : null,
    away: cell.match ? resolveTeam(cell.match.away_team_id, teamsById) : null,
    homePlaceholder: placeholder?.home,
    awayPlaceholder: placeholder?.away,
    roundLabel,
    matchNumber,
    nodeId,
    advanceToMatchNumber,
    loserAdvanceToMatchNumber,
    fallbackDate: sched?.date ?? null,
    fallbackTime: sched?.time ?? null,
  };
}

function buildSideCards(
  sideData: BracketSideData,
  side: BracketSide,
  r16Ids: readonly string[],
  qfIds: readonly string[],
  sfId: string,
  teamsById: Map<string, PublicTeam>
): { r16: ResolvedCard[]; qf: ResolvedCard[]; sf: ResolvedCard } {
  const r16 = sideData.roundOf16.map((cell, slot) => {
    const num = globalMatchNumber("round_of_16", bracketPositionOf("round_of_16", side, slot));
    const targetQFPos = bracketPositionOf("quarter_final", side, Math.floor(slot / 2));
    return cardFromCell(
      cell, num, r16Ids[slot], KNOCKOUT_ROUND_LABELS.round_of_16,
      globalMatchNumber("quarter_final", targetQFPos), null, null, teamsById
    );
  });

  const qf = sideData.quarterFinals.map((cell, slot) => {
    const position = bracketPositionOf("quarter_final", side, slot);
    const num = globalMatchNumber("quarter_final", position);
    const sfPos = bracketPositionOf("semi_final", side, 0);
    return cardFromCell(
      cell, num, qfIds[slot], KNOCKOUT_ROUND_LABELS.quarter_final,
      globalMatchNumber("semi_final", sfPos), null, feederPlaceholders("quarter_final", position), teamsById
    );
  });

  const sfPosition = bracketPositionOf("semi_final", side, 0);
  const sfNum = globalMatchNumber("semi_final", sfPosition);
  const sf = cardFromCell(
    sideData.semiFinal, sfNum, sfId, KNOCKOUT_ROUND_LABELS.semi_final,
    16, 15, feederPlaceholders("semi_final", sfPosition), teamsById
  );

  return { r16, qf, sf };
}

function buildResolvedCards(bracket: KnockoutBracketData, teamsById: Map<string, PublicTeam>) {
  const left = buildSideCards(bracket.left, "left", LEFT_R16_IDS, LEFT_QF_IDS, LEFT_SF_ID, teamsById);
  const right = buildSideCards(bracket.right, "right", RIGHT_R16_IDS, RIGHT_QF_IDS, RIGHT_SF_ID, teamsById);

  const finalCard = cardFromCell(
    bracket.final, 16, "final", KNOCKOUT_ROUND_LABELS.final,
    null, null, feederPlaceholders("final", 1), teamsById
  );
  const thirdCard = cardFromCell(
    bracket.thirdPlace, 15, "third", KNOCKOUT_ROUND_LABELS.third_place,
    null, null, feederPlaceholders("third_place", 1), teamsById
  );

  const activeMap: Record<string, boolean> = {};
  for (const c of [...left.r16, ...left.qf, left.sf, ...right.r16, ...right.qf, right.sf]) {
    activeMap[c.nodeId] = c.match ? determineMatchWinner(c.match) !== null : false;
  }

  return { left, right, finalCard, thirdCard, activeMap };
}

// ---------------------------------------------------------------------------
// Olası ilerleme yolu (hover/tıklama vurgusu) — sabit ağaç yapısından türetilir
// ---------------------------------------------------------------------------

const FORWARD_CHAIN: Record<string, string[]> = {
  "l16-0": ["lqf-0", "lsf", "final"], "l16-1": ["lqf-0", "lsf", "final"],
  "l16-2": ["lqf-1", "lsf", "final"], "l16-3": ["lqf-1", "lsf", "final"],
  "lqf-0": ["lsf", "final"], "lqf-1": ["lsf", "final"],
  lsf: ["final"],
  "r16-0": ["rqf-0", "rsf", "final"], "r16-1": ["rqf-0", "rsf", "final"],
  "r16-2": ["rqf-1", "rsf", "final"], "r16-3": ["rqf-1", "rsf", "final"],
  "rqf-0": ["rsf", "final"], "rqf-1": ["rsf", "final"],
  rsf: ["final"],
  final: [], third: [],
};

function highlightSetFor(nodeId: string | null): { nodes: Set<string>; segments: Set<string> } {
  if (!nodeId) return { nodes: new Set(), segments: new Set() };
  const chain = FORWARD_CHAIN[nodeId] ?? [];
  const nodes = new Set([nodeId, ...chain]);
  const segments = new Set<string>();
  let prev = nodeId;
  for (const next of chain) {
    segments.add(`${prev}-${next}`);
    prev = next;
  }
  return { nodes, segments };
}

/** Maç saati geldiğinde CANLI rozetinin otomatik belirmesi için periyodik yeniden render. */
function useTick(intervalMs: number) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
}

// ---------------------------------------------------------------------------
// Ortak bracket yerleşimi (masaüstü + mobil, tek kod yolu)
// ---------------------------------------------------------------------------

function CardSlot({
  card, variant, venueNamesById, justUpdatedIds, registerNode, isFinal, isThirdPlace,
  style, delayMs, hovered, onHoverChange,
}: {
  card: ResolvedCard;
  variant: BracketVariant;
  venueNamesById?: Map<string, string>;
  justUpdatedIds?: Set<string>;
  registerNode: (id: string, el: HTMLElement | null) => void;
  isFinal?: boolean;
  isThirdPlace?: boolean;
  style?: CSSProperties;
  delayMs?: number;
  hovered: boolean;
  onHoverChange: (nodeId: string, hovering: boolean) => void;
}) {
  return (
    <div
      className="ky-enter relative z-[3] w-full"
      style={{ ...style, animationDelay: delayMs !== undefined ? `${delayMs}ms` : undefined }}
    >
      <BracketMatchCard
        match={card.match}
        home={card.home}
        away={card.away}
        homePlaceholder={card.homePlaceholder}
        awayPlaceholder={card.awayPlaceholder}
        roundLabel={card.roundLabel}
        matchNumber={card.matchNumber}
        headerOverride={isFinal ? FINAL_HEADER : isThirdPlace ? THIRD_HEADER : undefined}
        venueName={card.match?.venue_id ? venueNamesById?.get(card.match.venue_id) : null}
        variant={variant}
        isFinal={isFinal}
        isThirdPlace={isThirdPlace}
        justUpdated={!!card.match && !!justUpdatedIds?.has(card.match.id)}
        className="h-full"
        nodeId={card.nodeId}
        registerNode={registerNode}
        advanceToMatchNumber={card.advanceToMatchNumber}
        loserAdvanceToMatchNumber={card.loserAdvanceToMatchNumber}
        fallbackDate={card.fallbackDate}
        fallbackTime={card.fallbackTime}
        pathHighlighted={hovered}
        onTeamHoverChange={(hovering) => onHoverChange(card.nodeId, hovering)}
      />
    </div>
  );
}

interface SideCards {
  r16: ResolvedCard[];
  qf: ResolvedCard[];
  sf: ResolvedCard;
}

function BracketFlow({
  left, right, finalCard, thirdCard, activeMap, variant, venueNamesById, justUpdatedIds,
  highlightedNodes, highlightedSegments, onHoverChange,
}: {
  left: SideCards;
  right: SideCards;
  finalCard: ResolvedCard;
  thirdCard: ResolvedCard;
  activeMap: Record<string, boolean>;
  variant: BracketVariant;
  venueNamesById?: Map<string, string>;
  justUpdatedIds?: Set<string>;
  highlightedNodes: Set<string>;
  highlightedSegments: Set<string>;
  onHoverChange: (nodeId: string, hovering: boolean) => void;
}) {
  const isFull = variant === "full";
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef(new Map<string, HTMLElement>());
  const registerNode = useCallback((id: string, el: HTMLElement | null) => {
    if (el) nodesRef.current.set(id, el);
    else nodesRef.current.delete(id);
  }, []);

  const geometry = useBracketGeometry({
    containerRef, nodesRef, activeMap,
    leftR16Ids: LEFT_R16_IDS, leftQFIds: LEFT_QF_IDS, leftSFId: LEFT_SF_ID,
    rightR16Ids: RIGHT_R16_IDS, rightQFIds: RIGHT_QF_IDS, rightSFId: RIGHT_SF_ID,
  });

  // Yatay kaydırma gerekiyorsa açılışta bracket'ın merkezini (final + kupa)
  // gösterir — hem masaüstünde hem mobilde sol kenardan başlamaz.
  const centered = useRef(false);
  useEffect(() => {
    if (!geometry.ready || centered.current) return;
    const el = containerRef.current;
    if (!el) return;
    el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
    centered.current = true;
  }, [geometry.ready]);

  const paths: BracketPath[] = geometry.paths.map((p) => ({ ...p, highlighted: highlightedSegments.has(p.key) }));

  // Kart genişlikleri yalnızca ölçek olarak küçülür; yerleşim her ekranda aynıdır.
  const sideCol = isFull
    ? "w-[188px] shrink-0 sm:w-[210px] lg:w-[232px]"
    : "w-[168px] shrink-0 sm:w-[184px] lg:w-[200px]";
  const centerCol = isFull
    ? "w-[228px] shrink-0 sm:w-[262px] lg:w-[300px]"
    : "w-[196px] shrink-0 sm:w-[220px] lg:w-[248px]";
  const rowGap = isFull ? "gap-7 sm:gap-10 lg:gap-[60px]" : "gap-5 sm:gap-7 lg:gap-9";

  const positionedStyle = (nodeId: string): CSSProperties => ({
    position: "absolute",
    left: 0,
    right: 0,
    top: geometry.tops[nodeId] ?? 0,
    visibility: geometry.ready ? "visible" : "hidden",
  });

  const headerLabels: { label: string; className: string }[] = [
    { label: "SOL SON 16", className: sideCol },
    { label: "SOL ÇEYREK FİNAL", className: sideCol },
    { label: "SOL YARI FİNAL", className: sideCol },
    { label: "FİNAL", className: centerCol },
    { label: "SAĞ YARI FİNAL", className: sideCol },
    { label: "SAĞ ÇEYREK FİNAL", className: sideCol },
    { label: "SAĞ SON 16", className: sideCol },
  ];

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="relative overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:thin]"
      >
        <div className="w-max">
          {isFull && (
            <div className={cn("flex pb-2", rowGap)}>
              {headerLabels.map((h) => (
                <p key={h.label} className={cn("text-center text-[10px] font-bold tracking-[0.12em] text-[var(--ky-accent-light)] sm:text-xs", h.className)}>
                  {h.label}
                </p>
              ))}
            </div>
          )}
          <div className={cn("flex items-stretch", rowGap)}>
            <div className={cn("flex flex-col justify-between gap-3 lg:gap-[18px]", sideCol)}>
              {left.r16.map((c, i) => (
                <CardSlot key={c.nodeId} card={c} variant={variant} venueNamesById={venueNamesById} justUpdatedIds={justUpdatedIds} registerNode={registerNode} delayMs={70 + i * 35} hovered={highlightedNodes.has(c.nodeId)} onHoverChange={onHoverChange} />
              ))}
            </div>
            <div className={cn("relative", sideCol)}>
              {left.qf.map((c, i) => (
                <CardSlot key={c.nodeId} card={c} variant={variant} venueNamesById={venueNamesById} justUpdatedIds={justUpdatedIds} registerNode={registerNode} style={positionedStyle(c.nodeId)} delayMs={420 + i * 60} hovered={highlightedNodes.has(c.nodeId)} onHoverChange={onHoverChange} />
              ))}
            </div>
            <div className={cn("relative", sideCol)}>
              <CardSlot card={left.sf} variant={variant} venueNamesById={venueNamesById} justUpdatedIds={justUpdatedIds} registerNode={registerNode} style={positionedStyle(left.sf.nodeId)} delayMs={640} hovered={highlightedNodes.has(left.sf.nodeId)} onHoverChange={onHoverChange} />
            </div>

            {/* Merkez: kupa + final + üçüncülük. JS ile konumlandırılmaz —
                her iki taraf simetrik olduğu için flex ortalama tam olarak
                bağlantıların birleştiği noktaya denk gelir. */}
            <div className={cn("flex flex-col items-center justify-center gap-4 lg:gap-5", centerCol)}>
              <div className="ky-enter relative z-[2]" style={{ animationDelay: "760ms" }}>
                <TrophyScene compact={!isFull} />
              </div>
              <CardSlot card={finalCard} variant={variant} venueNamesById={venueNamesById} justUpdatedIds={justUpdatedIds} registerNode={registerNode} isFinal delayMs={900} hovered={highlightedNodes.has("final")} onHoverChange={onHoverChange} />
              <CardSlot card={thirdCard} variant={variant} venueNamesById={venueNamesById} justUpdatedIds={justUpdatedIds} registerNode={registerNode} isThirdPlace delayMs={940} hovered={highlightedNodes.has("third")} onHoverChange={onHoverChange} />
            </div>

            <div className={cn("relative", sideCol)}>
              <CardSlot card={right.sf} variant={variant} venueNamesById={venueNamesById} justUpdatedIds={justUpdatedIds} registerNode={registerNode} style={positionedStyle(right.sf.nodeId)} delayMs={640} hovered={highlightedNodes.has(right.sf.nodeId)} onHoverChange={onHoverChange} />
            </div>
            <div className={cn("relative", sideCol)}>
              {right.qf.map((c, i) => (
                <CardSlot key={c.nodeId} card={c} variant={variant} venueNamesById={venueNamesById} justUpdatedIds={justUpdatedIds} registerNode={registerNode} style={positionedStyle(c.nodeId)} delayMs={420 + i * 60} hovered={highlightedNodes.has(c.nodeId)} onHoverChange={onHoverChange} />
              ))}
            </div>
            <div className={cn("flex flex-col justify-between gap-3 lg:gap-[18px]", sideCol)}>
              {right.r16.map((c, i) => (
                <CardSlot key={c.nodeId} card={c} variant={variant} venueNamesById={venueNamesById} justUpdatedIds={justUpdatedIds} registerNode={registerNode} delayMs={70 + i * 35} hovered={highlightedNodes.has(c.nodeId)} onHoverChange={onHoverChange} />
              ))}
            </div>
          </div>
          <BracketConnectors width={geometry.width} height={geometry.height} paths={paths} drawn={geometry.drawn} />
        </div>
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-[var(--ky-bg-1)] to-transparent sm:w-8" aria-hidden />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-[var(--ky-bg-1)] to-transparent sm:w-8" aria-hidden />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Şampiyon alanı ve arka plan efektleri
// ---------------------------------------------------------------------------

function ChampionReveal({ team, title }: { team: MatchCardTeamInfo; title: string }) {
  return (
    <div
      className="ky-enter relative z-[3] mx-auto flex max-w-xs flex-col items-center gap-2 rounded-2xl border border-[var(--ky-gold)]/60 bg-[rgba(19,57,52,0.98)] px-6 py-5 text-center shadow-[0_14px_34px_rgba(0,0,0,0.25),0_0_24px_rgba(242,202,100,0.12)]"
      style={{ animationDelay: "1050ms" }}
    >
      <TrophyIcon />
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--ky-gold)]">{title}</p>
      <div className="flex items-center gap-2">
        <TeamLogo logoUrl={team.logo_url} name={team.name} color={team.primary_color} code={team.code} size={40} />
        <span className="text-lg font-bold text-[var(--ky-text)]">{team.name}</span>
      </div>
    </div>
  );
}

function TrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-7 text-[var(--ky-gold)]" fill="currentColor" aria-hidden>
      <path d="M7 3h10v2h3a1 1 0 0 1 1 1v1a4 4 0 0 1-4 4h-.26A6.002 6.002 0 0 1 13 14.9V17h3v2H8v-2h3v-2.1A6.002 6.002 0 0 1 7.26 11H7a4 4 0 0 1-4-4V6a1 1 0 0 1 1-1h3V3Zm0 4H5a2 2 0 0 0 2 2V7Zm10 0v2a2 2 0 0 0 2-2h-2Z" />
    </svg>
  );
}

const PARTICLES = [
  { top: "12%", left: "8%", size: 3, delay: "0s" },
  { top: "22%", left: "40%", size: 2, delay: "1.2s" },
  { top: "68%", left: "16%", size: 2.5, delay: "2.4s" },
  { top: "80%", left: "58%", size: 3, delay: "0.6s" },
  { top: "34%", left: "78%", size: 2, delay: "1.8s" },
  { top: "55%", left: "92%", size: 2.5, delay: "3s" },
  { top: "8%", left: "68%", size: 2, delay: "2.1s" },
  { top: "90%", left: "30%", size: 2, delay: "0.9s" },
];

function BackgroundEffects() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="absolute -left-1/4 -top-1/3 size-[60%] rounded-full bg-[radial-gradient(circle,rgba(51,230,175,0.18),transparent_70%)] blur-2xl" />
      <div className="absolute -right-1/4 bottom-0 size-[55%] rounded-full bg-[radial-gradient(circle,rgba(54,220,212,0.16),transparent_70%)] blur-2xl" />
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "42px 42px",
        }}
      />
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="ky-particle absolute rounded-full bg-[var(--ky-accent-light)]"
          style={{ top: p.top, left: p.left, width: p.size, height: p.size, animationDelay: p.delay }}
        />
      ))}
      <div className="absolute inset-0 [box-shadow:inset_0_0_120px_40px_rgba(8,29,27,0.75)]" />
    </div>
  );
}

function HeaderBlock({
  title, description, ctaHref, ctaLabel, isFull,
}: {
  title?: string;
  description?: string;
  ctaHref?: string;
  ctaLabel?: string;
  isFull: boolean;
}) {
  if (!title && !description && !ctaHref) return null;
  if (!isFull) {
    return (
      <div className="ky-enter relative z-[3] flex flex-wrap items-end justify-between gap-3">
        <div>
          {title && <h2 className="text-base font-extrabold text-[var(--ky-text)]">{title}</h2>}
          {description && <p className="mt-0.5 text-xs text-[var(--ky-text-2)]">{description}</p>}
        </div>
        {ctaHref && (
          <Link
            href={ctaHref}
            className="shrink-0 rounded-full border border-[var(--ky-border)] bg-white/5 px-3 py-1.5 text-xs font-bold text-[var(--ky-text)] transition-colors hover:bg-white/10"
          >
            {ctaLabel ?? "Tüm Eleme Ağacını Gör"}
          </Link>
        )}
      </div>
    );
  }
  return (
    <div className="ky-enter relative z-[3] flex flex-col items-center gap-1.5 px-2 text-center">
      {title && (
        <h2 className="text-2xl font-extrabold uppercase tracking-[0.08em] text-[var(--ky-text)] sm:text-3xl lg:text-4xl">{title}</h2>
      )}
      {description && (
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--ky-accent-light)] sm:text-sm lg:text-base">{description}</p>
      )}
      {ctaHref && (
        <Link
          href={ctaHref}
          className="mt-1 inline-flex items-center gap-1 rounded-full border border-[var(--ky-border)] bg-white/5 px-4 py-2 text-xs font-bold text-[var(--ky-text)] transition-colors hover:bg-white/10"
        >
          {ctaLabel ?? "Tüm Eleme Ağacını Gör"}
        </Link>
      )}
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
  useTick(20_000);

  const { left, right, finalCard, thirdCard, activeMap } = useMemo(
    () => buildResolvedCards(bracket, teamsById),
    [bracket, teamsById]
  );

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const handleHoverChange = useCallback((nodeId: string, hovering: boolean) => {
    setHoveredNodeId((prev) => {
      if (hovering) return nodeId;
      return prev === nodeId ? null : prev;
    });
  }, []);
  const { nodes: highlightedNodes, segments: highlightedSegments } = useMemo(
    () => highlightSetFor(hoveredNodeId),
    [hoveredNodeId]
  );

  const champion = useMemo(() => {
    const match = finalCard.match;
    if (!match) return null;
    const winner = determineMatchWinner(match);
    if (!winner) return null;
    return winner === "home" ? finalCard.home : finalCard.away;
  }, [finalCard]);

  const isFull = variant === "full";
  const liveCount = useMemo(() => {
    const all = [...left.r16, ...left.qf, left.sf, ...right.r16, ...right.qf, right.sf, finalCard, thirdCard];
    const liveStatuses = ["in_progress", "half_time", "second_half", "extra_time", "penalties"];
    return all.filter((c) => c.match && liveStatuses.includes(c.match.status)).length;
  }, [left, right, finalCard, thirdCard]);

  return (
    <div
      className={cn("kupa-yolu relative overflow-hidden rounded-[22px]", isFull ? "px-2 py-6 sm:px-4 sm:py-8 lg:px-6 lg:py-9" : "px-2 py-5 sm:px-4")}
      style={{ background: "radial-gradient(120% 90% at 50% -10%, var(--ky-bg-2), var(--ky-bg-1) 60%)" }}
    >
      {isFull && <BackgroundEffects />}
      <div className="relative z-[3] space-y-5 sm:space-y-6">
        <HeaderBlock title={title} description={description} ctaHref={ctaHref} ctaLabel={ctaLabel} isFull={isFull} />
        {isFull && liveCount > 0 && (
          <p className="ky-enter flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--ky-live)]">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--ky-live)] opacity-75 motion-reduce:animate-none" />
              <span className="relative inline-flex size-2 rounded-full bg-[var(--ky-live)]" />
            </span>
            {liveCount} CANLI MAÇ
          </p>
        )}
        <BracketFlow
          left={left}
          right={right}
          finalCard={finalCard}
          thirdCard={thirdCard}
          activeMap={activeMap}
          variant={variant}
          venueNamesById={venueNamesById}
          justUpdatedIds={justUpdatedIds}
          highlightedNodes={highlightedNodes}
          highlightedSegments={highlightedSegments}
          onHoverChange={handleHoverChange}
        />
        {champion && <ChampionReveal team={champion} title={championTitle ?? "Şampiyon"} />}
      </div>
    </div>
  );
}
