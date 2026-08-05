"use client";

/**
 * Eleme aşaması kurulumu (şartname madde 28):
 *  - Grup sıralamasından otomatik çapraz eşleşme (A1-B2, B1-A2 ...)
 *  - Rastgele eşleşme
 *  - Manuel eşleşme
 * Kazananlar skor girişinde otomatik olarak sonraki tura taşınır.
 */
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Shuffle, Trash2, Trophy, Upload, Wand2 } from "lucide-react";
import { generateKnockoutAction, deleteKnockoutAction, publishKnockoutAction, type KnockoutPairInput } from "@/lib/actions/matches";
import { crossGroupPairs, shuffle } from "@/lib/fixtures";
import { ConfirmButton } from "@/components/Modal";
import { Badge } from "@/components/ui";
import { KnockoutBracket } from "@/components/site/KnockoutBracket";
import { buildKnockoutBracket } from "@/lib/bracket";
import { KNOCKOUT_ROUND_LABELS, KNOCKOUT_ROUND_ORDER, MATCH_STATUS_BADGE, MATCH_STATUS_LABELS } from "@/lib/labels";
import { formatDateShort, formatTime } from "@/lib/utils";
import type { KnockoutRound, Match, PublicTeam } from "@/lib/types";

interface TeamOption {
  id: string;
  name: string;
}

export interface QualifiedGroup {
  groupName: string;
  qualifiers: TeamOption[]; // sıralı: 1., 2., ...
}

const START_ROUNDS: Array<{ round: KnockoutRound; pairCount: number }> = [
  { round: "round_of_32", pairCount: 16 },
  { round: "round_of_16", pairCount: 8 },
  { round: "quarter_final", pairCount: 4 },
  { round: "semi_final", pairCount: 2 },
  { round: "final", pairCount: 1 },
];

export function KnockoutManager({
  tournamentId,
  teams,
  qualifiedGroups,
  knockoutMatches,
  teamNames,
  allTeams,
}: {
  tournamentId: string;
  teams: TeamOption[];
  qualifiedGroups: QualifiedGroup[];
  knockoutMatches: Match[];
  teamNames: Record<string, string>;
  /** Bracket önizlemesi için logo/renk dahil tam takım verisi. */
  allTeams: PublicTeam[];
}) {
  const router = useRouter();
  const teamsById = useMemo(() => new Map(allTeams.map((t) => [t.id, t])), [allTeams]);
  const suggestedPairCount = Math.max(1, Math.floor((qualifiedGroups.reduce((s, g) => s + g.qualifiers.length, 0)) / 2));
  const defaultRound =
    START_ROUNDS.find((r) => r.pairCount === suggestedPairCount)?.round ?? "quarter_final";

  const [startRound, setStartRound] = useState<KnockoutRound>(defaultRound);
  const [includeThird, setIncludeThird] = useState(true);
  const pairCount = START_ROUNDS.find((r) => r.round === startRound)?.pairCount ?? 4;
  const [pairs, setPairs] = useState<KnockoutPairInput[]>(
    Array.from({ length: pairCount }, () => ({ home: null, away: null }))
  );
  const [saving, setSaving] = useState(false);

  function resizePairs(round: KnockoutRound) {
    const count = START_ROUNDS.find((r) => r.round === round)?.pairCount ?? 4;
    setStartRound(round);
    setPairs(Array.from({ length: count }, (_, i) => pairs[i] ?? { home: null, away: null }));
  }

  function autoFill() {
    const rankings = qualifiedGroups.map((g) => ({
      groupName: g.groupName,
      qualifiers: g.qualifiers.map((q) => q.id),
    }));
    const generated = crossGroupPairs(rankings);
    if (generated.length === 0) {
      toast.error("Grup sıralamasından eşleşme üretilemedi. Grupların ilk sıraları belli olmalı.");
      return;
    }
    setPairs(
      Array.from({ length: pairCount }, (_, i) => ({
        home: generated[i]?.home ?? null,
        away: generated[i]?.away ?? null,
      }))
    );
    toast.info("Grup sıralamasına göre çapraz eşleşme dolduruldu. Kontrol edip oluşturun.");
  }

  function randomFill() {
    const qualified = qualifiedGroups.flatMap((g) => g.qualifiers.map((q) => q.id));
    const pool = shuffle(qualified.length >= pairCount * 2 ? qualified : teams.map((t) => t.id));
    setPairs(
      Array.from({ length: pairCount }, (_, i) => ({
        home: pool[i * 2] ?? null,
        away: pool[i * 2 + 1] ?? null,
      }))
    );
    toast.info("Rastgele eşleşme hazırlandı. Kontrol edip oluşturun.");
  }

  async function create() {
    if (pairs.some((p) => !p.home || !p.away)) {
      toast.error("Tüm eşleşmelerde iki takım da seçilmelidir.");
      return;
    }
    const used = pairs.flatMap((p) => [p.home, p.away]);
    if (new Set(used).size !== used.length) {
      toast.error("Bir takım birden fazla eşleşmede yer alamaz.");
      return;
    }
    setSaving(true);
    try {
      const result = await generateKnockoutAction(tournamentId, startRound, pairs, includeThird);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } finally {
      setSaving(false);
    }
  }

  // Mevcut eleme ağacı varsa listeyi göster
  if (knockoutMatches.length > 0) {
    const rounds = KNOCKOUT_ROUND_ORDER.filter((r) => knockoutMatches.some((m) => m.knockout_round === r));
    const bracket = buildKnockoutBracket(knockoutMatches);
    const draftCount = knockoutMatches.filter((m) => !m.is_published).length;
    return (
      <div className="space-y-5">
        {draftCount > 0 && (
          <div className="card flex flex-wrap items-center justify-between gap-3 border-amber-200 bg-amber-50">
            <p className="text-sm text-amber-800">
              {draftCount} eleme maçı taslak durumunda — halka açık sitede ve ana sayfada görünmüyor.
            </p>
            <ConfirmButton
              action={publishKnockoutAction.bind(null, tournamentId)}
              title="Eleme maçlarını yayınla"
              description={`${draftCount} taslak maç halka açık sitede yayınlanacak.`}
              confirmLabel="Yayınla"
              className="btn-sm"
            >
              <Upload className="size-3.5" aria-hidden />
              Taslakları Yayınla ({draftCount})
            </ConfirmButton>
          </div>
        )}
        {bracket.hasAnyMatch && (
          <section className="card overflow-x-auto">
            <KnockoutBracket
              bracket={bracket}
              teamsById={teamsById}
              variant="full"
              title="Bracket Önizleme"
              description="Sol/sağ yerleşimin doğru kurulduğunu buradan kontrol edebilirsiniz."
            />
          </section>
        )}
        {rounds.map((round) => (
          <section key={round}>
            <h2 className="mb-2 flex items-center gap-2 text-base font-bold">
              <Trophy className="size-4 text-brand-700" aria-hidden />
              {KNOCKOUT_ROUND_LABELS[round]}
            </h2>
            <div className="grid gap-2 md:grid-cols-2">
              {knockoutMatches
                .filter((m) => m.knockout_round === round)
                .sort((a, b) => (a.bracket_position ?? 0) - (b.bracket_position ?? 0))
                .map((m) => (
                  <Link key={m.id} href={`/panel/maclar/${m.id}`} className="card card-hover flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">
                        {m.home_team_id ? teamNames[m.home_team_id] : "Belirlenecek"}
                        {" - "}
                        {m.away_team_id ? teamNames[m.away_team_id] : "Belirlenecek"}
                      </p>
                      <p className="text-xs text-muted">
                        {m.match_date ? `${formatDateShort(m.match_date)} · ${formatTime(m.start_time)}` : "Tarih belirlenmedi"}
                        {!m.is_published && " · Taslak"}
                      </p>
                    </div>
                    {m.home_score !== null && m.away_score !== null && (
                      <span className="font-bold tabular-nums">{m.home_score}-{m.away_score}</span>
                    )}
                    <Badge className={MATCH_STATUS_BADGE[m.status]}>{MATCH_STATUS_LABELS[m.status]}</Badge>
                  </Link>
                ))}
            </div>
          </section>
        ))}

        <div className="card border-red-200">
          <h3 className="text-sm font-bold text-red-700">Tehlikeli Bölge</h3>
          <p className="mt-1 text-xs text-muted">
            Eleme ağacını yanlış kurduysanız tamamını silip yeniden oluşturabilirsiniz.
            Eleme maçlarına girilmiş skorlar da silinir.
          </p>
          <div className="mt-3">
            <ConfirmButton
              action={deleteKnockoutAction.bind(null, tournamentId)}
              title="Eleme ağacını sil"
              description="Tüm eleme maçları ve skorları kalıcı olarak silinecek. Bu işlem geri alınamaz."
              confirmLabel="Evet, tamamını sil"
              danger
              className="btn-sm"
            >
              <Trash2 className="size-3.5" aria-hidden />
              Eleme Ağacını Sil
            </ConfirmButton>
          </div>
        </div>
      </div>
    );
  }

  // Kurulum ekranı
  return (
    <div className="space-y-4">
      <section className="card space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="label">Başlangıç turu</span>
            <select value={startRound} onChange={(e) => resizePairs(e.target.value as KnockoutRound)} className="input">
              {START_ROUNDS.map((r) => (
                <option key={r.round} value={r.round}>
                  {KNOCKOUT_ROUND_LABELS[r.round]} ({r.pairCount * 2} takım)
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2 pb-0.5">
            <button type="button" className="btn-secondary btn-sm" onClick={autoFill}>
              <Wand2 className="size-3.5" aria-hidden />
              Grup Sıralamasından Doldur
            </button>
            <button type="button" className="btn-secondary btn-sm" onClick={randomFill}>
              <Shuffle className="size-3.5" aria-hidden />
              Rastgele
            </button>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={includeThird} onChange={(e) => setIncludeThird(e.target.checked)} className="size-4 accent-brand-700" />
          Üçüncülük maçı oynansın (yarı final kaybedenleri)
        </label>

        <div className="space-y-2">
          {pairs.map((pair, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-xl border border-line p-2">
              <select
                value={pair.home ?? ""}
                onChange={(e) => setPairs((prev) => prev.map((p, j) => (j === i ? { ...p, home: e.target.value || null } : p)))}
                className="input"
                aria-label={`${i + 1}. eşleşme ev sahibi`}
              >
                <option value="">Takım seçin</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <span className="text-xs font-bold text-muted">vs</span>
              <select
                value={pair.away ?? ""}
                onChange={(e) => setPairs((prev) => prev.map((p, j) => (j === i ? { ...p, away: e.target.value || null } : p)))}
                className="input"
                aria-label={`${i + 1}. eşleşme deplasman`}
              >
                <option value="">Takım seçin</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <button type="button" className="btn-primary" onClick={create} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Eleme Ağacını Oluştur
          </button>
        </div>
        <p className="text-xs text-muted">
          Ağaç oluşturulduğunda sonraki turların maçları &quot;belirlenecek&quot; olarak açılır ve
          kazananlar skor girildikçe otomatik yerleşir. Maç tarihlerini Maçlar sayfasından düzenleyip
          yayınlamayı unutmayın.
        </p>
      </section>
    </div>
  );
}
