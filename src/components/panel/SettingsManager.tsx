"use client";

/**
 * Sistem ayarları: puan durumu sıralama kriterleri, gol krallığı kriterleri,
 * hükmen kuralları, kurallar sayfası içeriği, alt bilgi (footer) ve
 * tehlikeli bölge (turnuva verilerini sıfırlama).
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Loader2, Save, Trash2 } from "lucide-react";
import { resetTournamentDataAction, saveSettingAction } from "@/lib/actions/structure";
import { ConfirmButton } from "@/components/Modal";
import type { ForfeitRules, ScorerTiebreaker, StandingsTiebreaker } from "@/lib/types";

const TIEBREAKER_LABELS: Record<StandingsTiebreaker, string> = {
  points: "Toplam puan",
  goal_difference: "Genel averaj",
  goals_for: "Atılan gol",
  h2h_points: "İkili maç puanı",
  h2h_goal_difference: "İkili averaj",
  h2h_goals_for: "İkili maçta atılan gol",
  fewest_red_cards: "Daha az kırmızı kart",
  fewest_yellow_cards: "Daha az sarı kart",
};

const SCORER_TB_LABELS: Record<ScorerTiebreaker, string> = {
  fewest_matches: "Daha az maçta gol atan",
  most_assists: "Daha fazla asist yapan",
  fewest_cards: "Daha az kart gören",
};

function useSave(tournamentId: string) {
  const router = useRouter();
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function save(key: string, value: unknown, isPublic: boolean) {
    setBusyKey(key);
    try {
      const result = await saveSettingAction(tournamentId, key, value, isPublic);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } finally {
      setBusyKey(null);
    }
  }
  return { save, busyKey };
}

export function SettingsManager({
  tournamentId,
  initialTiebreakers,
  initialScorerTiebreakers,
  initialForfeitRules,
  initialRulesHtml,
}: {
  tournamentId: string;
  initialTiebreakers: StandingsTiebreaker[];
  initialScorerTiebreakers: ScorerTiebreaker[];
  initialForfeitRules: ForfeitRules;
  initialRulesHtml: string;
}) {
  const { save, busyKey } = useSave(tournamentId);

  const [tiebreakers, setTiebreakers] = useState<StandingsTiebreaker[]>(initialTiebreakers);
  const [scorerTbs, setScorerTbs] = useState<ScorerTiebreaker[]>(initialScorerTiebreakers);
  const [forfeit, setForfeit] = useState<ForfeitRules>(initialForfeitRules);
  const [rulesHtml, setRulesHtml] = useState(initialRulesHtml);

  function move<T>(list: T[], index: number, dir: -1 | 1): T[] {
    const next = [...list];
    const target = index + dir;
    if (target < 0 || target >= next.length) return next;
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  }

  return (
    <div className="space-y-5">
      {/* Puan durumu sıralama kriterleri */}
      <section className="card space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
          Puan Durumu Sıralama Kriterleri
        </h2>
        <p className="text-xs text-muted">
          Eşitlik durumunda kriterler yukarıdan aşağı sırayla uygulanır. İkili kriterler,
          eşit takımların kendi aralarındaki maçlardan kurulan mini lige bakar.
        </p>
        <ol className="space-y-1.5">
          {tiebreakers.map((tb, i) => (
            <li key={tb} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2">
              <span className="w-5 text-center text-xs font-bold text-muted">{i + 1}</span>
              <span className="flex-1 text-sm font-medium">{TIEBREAKER_LABELS[tb]}</span>
              <button type="button" className="btn-ghost btn-sm" disabled={i === 0} onClick={() => setTiebreakers(move(tiebreakers, i, -1))} aria-label="Yukarı taşı">
                <ArrowUp className="size-3.5" aria-hidden />
              </button>
              <button type="button" className="btn-ghost btn-sm" disabled={i === tiebreakers.length - 1} onClick={() => setTiebreakers(move(tiebreakers, i, 1))} aria-label="Aşağı taşı">
                <ArrowDown className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ol>
        <div className="flex justify-end">
          <button
            type="button"
            className="btn-primary btn-sm"
            disabled={busyKey === "standings_tiebreakers"}
            onClick={() => save("standings_tiebreakers", tiebreakers, true)}
          >
            {busyKey === "standings_tiebreakers" ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Save className="size-3.5" aria-hidden />}
            Kriterleri Kaydet
          </button>
        </div>
      </section>

      {/* Gol krallığı kriterleri */}
      <section className="card space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Gol Krallığı Eşitlik Kriterleri</h2>
        <ol className="space-y-1.5">
          {scorerTbs.map((tb, i) => (
            <li key={tb} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2">
              <span className="w-5 text-center text-xs font-bold text-muted">{i + 1}</span>
              <span className="flex-1 text-sm font-medium">{SCORER_TB_LABELS[tb]}</span>
              <button type="button" className="btn-ghost btn-sm" disabled={i === 0} onClick={() => setScorerTbs(move(scorerTbs, i, -1))} aria-label="Yukarı taşı">
                <ArrowUp className="size-3.5" aria-hidden />
              </button>
              <button type="button" className="btn-ghost btn-sm" disabled={i === scorerTbs.length - 1} onClick={() => setScorerTbs(move(scorerTbs, i, 1))} aria-label="Aşağı taşı">
                <ArrowDown className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ol>
        <div className="flex justify-end">
          <button
            type="button"
            className="btn-primary btn-sm"
            disabled={busyKey === "top_scorer_tiebreakers"}
            onClick={() => save("top_scorer_tiebreakers", scorerTbs, true)}
          >
            {busyKey === "top_scorer_tiebreakers" ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Save className="size-3.5" aria-hidden />}
            Kriterleri Kaydet
          </button>
        </div>
      </section>

      {/* Hükmen kuralları */}
      <section className="card space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Hükmen Sonuç Kuralları</h2>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={forfeit.award_points} onChange={(e) => setForfeit({ ...forfeit, award_points: e.target.checked })} className="size-4 accent-brand-700" />
            Hükmen galibiyette puan verilsin
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={forfeit.count_in_goal_stats} onChange={(e) => setForfeit({ ...forfeit, count_in_goal_stats: e.target.checked })} className="size-4 accent-brand-700" />
            Hükmen skor gol averajına eklensin
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={forfeit.count_player_goals} onChange={(e) => setForfeit({ ...forfeit, count_player_goals: e.target.checked })} className="size-4 accent-brand-700" />
            Hükmen goller oyuncu istatistiklerine yazılsın
          </label>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            className="btn-primary btn-sm"
            disabled={busyKey === "forfeit_rules"}
            onClick={() => save("forfeit_rules", forfeit, false)}
          >
            {busyKey === "forfeit_rules" ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Save className="size-3.5" aria-hidden />}
            Kuralları Kaydet
          </button>
        </div>
      </section>

      {/* Turnuva kuralları içeriği */}
      <section className="card space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Turnuva Kuralları Sayfası</h2>
        <p className="text-xs text-muted">
          HTML kullanabilirsiniz (&lt;h2&gt;, &lt;ul&gt;, &lt;li&gt;, &lt;p&gt;). İçerik halka açık
          &quot;Turnuva Kuralları&quot; sayfasında gösterilir.
        </p>
        <textarea
          value={rulesHtml}
          onChange={(e) => setRulesHtml(e.target.value)}
          rows={10}
          className="input min-h-48 font-mono text-xs"
          aria-label="Kurallar içeriği (HTML)"
        />
        <div className="flex justify-end">
          <button
            type="button"
            className="btn-primary btn-sm"
            disabled={busyKey === "rules_content"}
            onClick={() => save("rules_content", { html: rulesHtml }, true)}
          >
            {busyKey === "rules_content" ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Save className="size-3.5" aria-hidden />}
            Kuralları Yayınla
          </button>
        </div>
      </section>

      {/* Tehlikeli bölge */}
      <section className="card space-y-3 border-red-200">
        <h2 className="text-sm font-bold uppercase tracking-wide text-red-700">Tehlikeli Bölge</h2>
        <p className="text-xs text-muted">
          Turnuvayı sıfırlamak tüm maçları, maç olaylarını, kartları ve cezaları siler.
          Takımlar, oyuncular, gruplar ve duyurular korunur. Demo verilerini temizlemek için de kullanılabilir.
        </p>
        <ConfirmButton
          action={resetTournamentDataAction.bind(null, tournamentId)}
          title="Turnuva verilerini sıfırla"
          description="TÜM maçlar, skorlar, maç olayları ve cezalar kalıcı olarak silinecek. Bu işlem geri alınamaz. Devam etmek istediğinizden emin misiniz?"
          confirmLabel="Evet, sıfırla"
          danger
          className="btn-sm"
        >
          <Trash2 className="size-3.5" aria-hidden />
          Turnuvayı Sıfırla
        </ConfirmButton>
      </section>
    </div>
  );
}
