"use client";

/**
 * Skor girişi ve maç olayları düzenleyicisi (şartname madde 21-22).
 * Kaydetmeden önce onay ekranı gösterilir; kayıt atomik RPC ile yapılır ve
 * puan durumu / gol krallığı / kartlar / eleme ilerlemesi otomatik güncellenir.
 */
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Save, Trash2, TriangleAlert } from "lucide-react";
import { saveScoreAction, type ScoreEventPayload } from "@/lib/actions/matches";
import { Modal } from "@/components/Modal";
import { EVENT_TYPE_LABELS, MATCH_STATUS_LABELS, PLAYER_EVENT_TYPES } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { Match, MatchEvent, MatchEventType, MatchStatus, Player } from "@/lib/types";

interface EditableEvent extends ScoreEventPayload {
  key: string;
}

const STATUS_OPTIONS: MatchStatus[] = [
  "in_progress", "half_time", "second_half", "extra_time", "penalties",
  "completed", "abandoned", "awaiting_decision",
];

const GOAL_TYPES = ["goal", "penalty_goal", "own_goal"];

export function ScoreEntry({
  match,
  homeTeam,
  awayTeam,
  homePlayers,
  awayPlayers,
  existingEvents,
  suspendedPlayerIds,
}: {
  match: Match;
  homeTeam: { id: string; name: string };
  awayTeam: { id: string; name: string };
  homePlayers: Pick<Player, "id" | "full_name" | "shirt_number">[];
  awayPlayers: Pick<Player, "id" | "full_name" | "shirt_number">[];
  existingEvents: MatchEvent[];
  suspendedPlayerIds: string[];
}) {
  const router = useRouter();
  const wasCompleted = ["completed", "forfeited"].includes(match.status);

  const [homeScore, setHomeScore] = useState<number>(match.home_score ?? 0);
  const [awayScore, setAwayScore] = useState<number>(match.away_score ?? 0);
  const [homePen, setHomePen] = useState<string>(match.home_penalty_score?.toString() ?? "");
  const [awayPen, setAwayPen] = useState<string>(match.away_penalty_score?.toString() ?? "");
  const [status, setStatus] = useState<MatchStatus>(
    wasCompleted ? (match.status as MatchStatus) : "completed"
  );
  const [referee, setReferee] = useState(match.referee_name ?? "");
  const [notes, setNotes] = useState(match.notes ?? "");
  const [events, setEvents] = useState<EditableEvent[]>(
    existingEvents
      .filter((e) => (PLAYER_EVENT_TYPES as string[]).includes(e.event_type))
      .map((e) => ({
        key: e.id,
        team_id: e.team_id,
        player_id: e.player_id,
        secondary_player_id: e.secondary_player_id,
        event_type: e.event_type,
        minute: e.minute,
        extra_minute: e.extra_minute,
        description: e.description,
      }))
  );
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const suspendedSet = useMemo(() => new Set(suspendedPlayerIds), [suspendedPlayerIds]);

  const playersOf = (teamId: string | null) =>
    teamId === homeTeam.id ? homePlayers : teamId === awayTeam.id ? awayPlayers : [];

  function addEvent() {
    setEvents((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        team_id: homeTeam.id,
        player_id: null,
        secondary_player_id: null,
        event_type: "goal",
        minute: null,
        extra_minute: null,
        description: null,
      },
    ]);
  }

  function updateEvent(key: string, patch: Partial<EditableEvent>) {
    setEvents((prev) => prev.map((e) => (e.key === key ? { ...e, ...patch } : e)));
  }

  function removeEvent(key: string) {
    setEvents((prev) => prev.filter((e) => e.key !== key));
  }

  const goalEventCount = events.filter((e) => GOAL_TYPES.includes(e.event_type)).length;
  const scoreMismatch = goalEventCount > 0 && goalEventCount !== homeScore + awayScore;
  const suspendedInEvents = events.some((e) => e.player_id && suspendedSet.has(e.player_id));
  const showPenalties = ["penalties", "completed", "forfeited"].includes(status);

  async function doSave() {
    setSaving(true);
    try {
      const result = await saveScoreAction(match.id, {
        home_score: homeScore,
        away_score: awayScore,
        home_penalty_score: homePen === "" ? null : Number(homePen),
        away_penalty_score: awayPen === "" ? null : Number(awayPen),
        status,
        referee_name: referee || null,
        assistant_referees: match.assistant_referees,
        notes: notes || null,
        events: events.map(({ key: _key, ...rest }) => rest),
      });
      if (result.ok) {
        toast.success(result.message);
        setConfirmOpen(false);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {wasCompleted && (
        <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          Tamamlanmış bir maçı düzenliyorsunuz. Kaydettiğinizde tüm istatistikler yeniden hesaplanır
          ve işlem geçmişine kaydedilir.
        </p>
      )}

      {/* Skor */}
      <section className="card">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted">Skor</h2>
        <div className="flex items-end justify-center gap-3 sm:gap-6">
          <div className="min-w-0 flex-1 text-center">
            <p className="mb-2 break-words text-sm font-bold">{homeTeam.name}</p>
            <input
              type="number" min={0} max={99} value={homeScore}
              onChange={(e) => setHomeScore(Math.max(0, Number(e.target.value)))}
              className="input mx-auto h-16 max-w-24 text-center text-3xl font-bold tabular-nums"
              aria-label={`${homeTeam.name} skoru`}
            />
          </div>
          <span className="pb-4 text-2xl font-bold text-gray-300">-</span>
          <div className="min-w-0 flex-1 text-center">
            <p className="mb-2 break-words text-sm font-bold">{awayTeam.name}</p>
            <input
              type="number" min={0} max={99} value={awayScore}
              onChange={(e) => setAwayScore(Math.max(0, Number(e.target.value)))}
              className="input mx-auto h-16 max-w-24 text-center text-3xl font-bold tabular-nums"
              aria-label={`${awayTeam.name} skoru`}
            />
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="se-status">Maç durumu</label>
            <select id="se-status" value={status} onChange={(e) => setStatus(e.target.value as MatchStatus)} className="input">
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{MATCH_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>
          {showPenalties && (
            <div className="sm:col-span-2">
              <span className="label">Penaltı skoru (uzatma sonrası berabere ise)</span>
              <div className="flex items-center gap-2">
                <input type="number" min={0} value={homePen} onChange={(e) => setHomePen(e.target.value)} className="input max-w-20 text-center" aria-label="Ev sahibi penaltı" placeholder="-" />
                <span className="text-muted">-</span>
                <input type="number" min={0} value={awayPen} onChange={(e) => setAwayPen(e.target.value)} className="input max-w-20 text-center" aria-label="Deplasman penaltı" placeholder="-" />
              </div>
            </div>
          )}
          <div className={showPenalties ? "" : "sm:col-span-2"}>
            <label className="label" htmlFor="se-referee">Hakem</label>
            <input id="se-referee" value={referee} onChange={(e) => setReferee(e.target.value)} className="input" />
          </div>
        </div>

        <div className="mt-3">
          <label className="label" htmlFor="se-notes">Maç notu</label>
          <textarea id="se-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="input min-h-16" />
        </div>
      </section>

      {/* Olaylar */}
      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
            Maç Olayları <span className="font-normal normal-case">({events.length})</span>
          </h2>
          <button type="button" className="btn-secondary btn-sm" onClick={addEvent}>
            <Plus className="size-3.5" aria-hidden /> Olay Ekle
          </button>
        </div>

        {scoreMismatch && (
          <p className="mb-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            Gol türündeki olay sayısı ({goalEventCount}) toplam skorla ({homeScore + awayScore}) uyuşmuyor.
            Yine de kaydedebilirsiniz.
          </p>
        )}
        {suspendedInEvents && (
          <p className="mb-3 flex items-start gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            Dikkat: olaylarda CEZALI görünen bir oyuncu seçili.
          </p>
        )}

        {events.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">
            Gol, kart ve değişiklikler için &quot;Olay Ekle&quot; düğmesini kullanın.
          </p>
        ) : (
          <ul className="space-y-2">
            {events.map((ev) => {
              const teamPlayers = playersOf(ev.team_id);
              const isSub = ev.event_type === "substitution";
              const isGoal = GOAL_TYPES.includes(ev.event_type);
              return (
                <li key={ev.key} className="rounded-xl border border-line p-3">
                  <div className="grid gap-2 sm:grid-cols-[110px_1fr_1fr_70px_auto]">
                    <label className="block">
                      <span className="sr-only">Dakika</span>
                      <input
                        type="number" min={0} max={130} placeholder="Dk"
                        value={ev.minute ?? ""}
                        onChange={(e) => updateEvent(ev.key, { minute: e.target.value === "" ? null : Number(e.target.value) })}
                        className="input"
                      />
                    </label>
                    <label className="block">
                      <span className="sr-only">Takım</span>
                      <select
                        value={ev.team_id ?? ""}
                        onChange={(e) => updateEvent(ev.key, { team_id: e.target.value, player_id: null, secondary_player_id: null })}
                        className="input"
                      >
                        <option value={homeTeam.id}>{homeTeam.name}</option>
                        <option value={awayTeam.id}>{awayTeam.name}</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="sr-only">Olay türü</span>
                      <select
                        value={ev.event_type}
                        onChange={(e) => updateEvent(ev.key, { event_type: e.target.value as MatchEventType })}
                        className="input"
                      >
                        {PLAYER_EVENT_TYPES.map((t) => (
                          <option key={t} value={t}>{EVENT_TYPE_LABELS[t]}</option>
                        ))}
                      </select>
                    </label>
                    <div className="hidden sm:block" />
                    <button
                      type="button"
                      className="btn-ghost btn-sm justify-self-end text-red-600"
                      onClick={() => removeEvent(ev.key)}
                      aria-label="Olayı sil"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <label className="block">
                      <span className="sr-only">Oyuncu</span>
                      <select
                        value={ev.player_id ?? ""}
                        onChange={(e) => updateEvent(ev.key, { player_id: e.target.value || null })}
                        className={cn("input", ev.player_id && suspendedSet.has(ev.player_id) && "border-red-400")}
                      >
                        <option value="">Oyuncu seçin</option>
                        {teamPlayers.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.shirt_number ?? "-"} · {p.full_name}{suspendedSet.has(p.id) ? " (CEZALI)" : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    {(isGoal || isSub) && (
                      <label className="block">
                        <span className="sr-only">{isSub ? "Çıkan oyuncu" : "Asist"}</span>
                        <select
                          value={ev.secondary_player_id ?? ""}
                          onChange={(e) => updateEvent(ev.key, { secondary_player_id: e.target.value || null })}
                          className="input"
                        >
                          <option value="">{isSub ? "Çıkan oyuncu (isteğe bağlı)" : "Asist (isteğe bağlı)"}</option>
                          {teamPlayers.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.shirt_number ?? "-"} · {p.full_name}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="flex justify-end">
        <button type="button" className="btn-primary" onClick={() => setConfirmOpen(true)}>
          <Save className="size-4" aria-hidden />
          Skoru Kaydet
        </button>
      </div>

      {/* Onay ekranı (şartname madde 21) */}
      <Modal open={confirmOpen} onClose={() => !saving && setConfirmOpen(false)} title="Skoru onaylıyor musunuz?">
        <div className="rounded-xl bg-gray-50 p-4 text-center">
          <p className="text-sm font-medium text-muted">{MATCH_STATUS_LABELS[status]}</p>
          <p className="mt-1 text-lg font-bold">
            {homeTeam.name} <span className="mx-1 text-2xl tabular-nums">{homeScore} - {awayScore}</span> {awayTeam.name}
          </p>
          {homePen !== "" && awayPen !== "" && (
            <p className="text-sm text-muted">Penaltılar: {homePen}-{awayPen}</p>
          )}
          <p className="mt-2 text-xs text-muted">{events.length} olay kaydedilecek</p>
        </div>
        <p className="mt-3 text-xs text-muted">
          Kaydettiğinizde puan durumu, gol krallığı, kart istatistikleri ve (eleme maçıysa) tur atlama
          otomatik olarak güncellenir.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => setConfirmOpen(false)} disabled={saving}>
            Vazgeç
          </button>
          <button type="button" className="btn-primary" onClick={doSave} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Onayla ve Kaydet
          </button>
        </div>
      </Modal>
    </div>
  );
}
