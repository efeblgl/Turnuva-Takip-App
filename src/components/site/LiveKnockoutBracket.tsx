"use client";

/**
 * Eleme ağacı için minimal Supabase Realtime aboneliği.
 * Projede önceden bir Realtime kullanımı yoktu (bkz. AutoRefresh: interval
 * tabanlı router.refresh); burada yalnızca bracket alanı için, tek bir
 * kanal üzerinden matches tablosunun INSERT/UPDATE/DELETE olayları izlenir.
 * Bağlantı koparsa son bilinen veri ekranda kalır, sayfa yenilenmez.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { buildKnockoutBracket } from "@/lib/bracket";
import { KnockoutBracket, type BracketVariant } from "@/components/site/KnockoutBracket";
import { logger } from "@/lib/logger";
import type { Match, PublicTeam } from "@/lib/types";

const HIGHLIGHT_MS = 800;

export function LiveKnockoutBracket({
  tournamentId,
  initialMatches,
  teamsById,
  venueNamesById,
  variant,
  championTitle,
  title,
  description,
  ctaHref,
  ctaLabel,
}: {
  tournamentId: string;
  /** Yalnızca stage = 'knockout' maçlar (Son 16 -> Final dışındakiler de olabilir, filtre bracket.ts'te). */
  initialMatches: Match[];
  teamsById: Map<string, PublicTeam>;
  venueNamesById?: Map<string, string>;
  variant: BracketVariant;
  championTitle?: string;
  title?: string;
  description?: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  const [matches, setMatches] = useState(initialMatches);
  // Sunucudan gelen yeni ilk veri (ör. yeniden ziyaret) state'i sıfırlar; render
  // sırasında karşılaştırılır (useEffect içinde setState yerine react.dev'in
  // önerdiği "adjusting state during render" deseni).
  const [syncedInitialMatches, setSyncedInitialMatches] = useState(initialMatches);
  if (initialMatches !== syncedInitialMatches) {
    setSyncedInitialMatches(initialMatches);
    setMatches(initialMatches);
  }

  const [justUpdatedIds, setJustUpdatedIds] = useState<Set<string>>(new Set());
  const [announcement, setAnnouncement] = useState("");
  const highlightTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const timers = highlightTimers.current;
    const supabase = createClient();
    const channel = supabase
      .channel(`knockout-matches:${tournamentId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `tournament_id=eq.${tournamentId}` },
        (payload) => {
          const isDelete = payload.eventType === "DELETE";
          const row = (isDelete ? payload.old : payload.new) as Match | null;
          if (!row?.id) return;

          if (isDelete) {
            setMatches((prev) => prev.filter((x) => x.id !== row.id));
            return;
          }
          if (row.stage !== "knockout") return; // grup maçları bu bileşeni ilgilendirmez

          setMatches((prev) => {
            const idx = prev.findIndex((x) => x.id === row.id);
            if (!row.is_published) return idx === -1 ? prev : prev.filter((x) => x.id !== row.id);
            if (idx === -1) return [...prev, row];
            const next = [...prev];
            next[idx] = row;
            return next;
          });

          setJustUpdatedIds((prev) => {
            const next = new Set(prev);
            next.add(row.id);
            return next;
          });
          const existingTimer = highlightTimers.current.get(row.id);
          if (existingTimer) clearTimeout(existingTimer);
          highlightTimers.current.set(
            row.id,
            setTimeout(() => {
              setJustUpdatedIds((prev) => {
                const next = new Set(prev);
                next.delete(row.id);
                return next;
              });
              highlightTimers.current.delete(row.id);
            }, HIGHLIGHT_MS)
          );

          const homeName = row.home_team_id ? teamsById.get(row.home_team_id)?.name : null;
          const awayName = row.away_team_id ? teamsById.get(row.away_team_id)?.name : null;
          if (homeName && awayName && row.home_score !== null && row.away_score !== null) {
            setAnnouncement(`${homeName} - ${awayName}: ${row.home_score}-${row.away_score} olarak güncellendi.`);
          }
        }
      )
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          logger.warn("bracket-realtime", "Eleme ağacı canlı bağlantısı kurulamadı, son bilinen veri gösteriliyor.", {
            tournamentId, status,
          });
        }
      });

    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear();
      supabase.removeChannel(channel);
    };
  }, [tournamentId, teamsById]);

  const bracket = useMemo(() => buildKnockoutBracket(matches), [matches]);

  return (
    <div>
      <div aria-live="polite" className="sr-only">{announcement}</div>
      <KnockoutBracket
        bracket={bracket}
        teamsById={teamsById}
        venueNamesById={venueNamesById}
        variant={variant}
        championTitle={championTitle}
        justUpdatedIds={justUpdatedIds}
        title={title}
        description={description}
        ctaHref={ctaHref}
        ctaLabel={ctaLabel}
      />
    </div>
  );
}
