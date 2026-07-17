"use client";

/**
 * Otomatik fikstür sihirbazı (şartname madde 17).
 * Adımlar: 1) Kapsam  2) Takvim ayarları  3) Ön izleme ve onay.
 * Üretim tarayıcıda yapılır; onay verilmeden veri tabanına yazılmaz.
 */
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CalendarCheck, Loader2, TriangleAlert } from "lucide-react";
import { generateFixture, type DraftMatch, type ScheduleOptions } from "@/lib/fixtures";
import { saveGeneratedFixtureAction } from "@/lib/actions/matches";
import { WEEKDAY_LABELS } from "@/lib/labels";
import { cn, formatDate } from "@/lib/utils";
import type { Group, Tournament, Venue } from "@/lib/types";

export interface WizardGroup {
  group: Group | null;
  teamIds: string[];
  teamNames: Map<string, string>;
}

export function FixtureWizard({
  tournament,
  wizardGroups,
  venues,
  existingMatchCount,
}: {
  tournament: Tournament;
  wizardGroups: Array<{ group: Group | null; teams: Array<{ id: string; name: string }> }>;
  venues: Venue[];
  existingMatchCount: number;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Adım 1: kapsam
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(
    new Set(wizardGroups.map((g) => g.group?.id ?? "__all__"))
  );
  const [double, setDouble] = useState(tournament.format === "double_league");

  // Adım 2: takvim
  const [startDate, setStartDate] = useState("");
  const [matchDays, setMatchDays] = useState<Set<number>>(new Set([6, 0])); // Cmt, Paz
  const [dailyMatchCount, setDailyMatchCount] = useState(4);
  const [firstMatchTime, setFirstMatchTime] = useState("16:00");
  const [matchDurationMin, setMatchDurationMin] = useState(70);
  const [restBetweenMin, setRestBetweenMin] = useState(20);
  const [selectedVenues, setSelectedVenues] = useState<Set<string>>(
    new Set(venues.filter((v) => v.is_active).slice(0, 1).map((v) => v.id))
  );
  const [minTeamRestDays, setMinTeamRestDays] = useState(2);

  const teamNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const wg of wizardGroups) for (const t of wg.teams) map.set(t.id, t.name);
    return map;
  }, [wizardGroups]);

  // Adım 3: ön izleme
  const [preview, setPreview] = useState<{ matches: DraftMatch[]; warnings: string[] } | null>(null);

  function buildPreview() {
    if (!startDate) {
      toast.error("Başlangıç tarihi seçmelisiniz.");
      return;
    }
    if (matchDays.size === 0) {
      toast.error("En az bir maç günü seçmelisiniz.");
      return;
    }
    if (selectedVenues.size === 0) {
      toast.error("En az bir saha seçmelisiniz.");
      return;
    }
    const groupsInput = wizardGroups
      .filter((wg) => selectedGroups.has(wg.group?.id ?? "__all__"))
      .map((wg) => ({ groupId: wg.group?.id ?? null, teamIds: wg.teams.map((t) => t.id) }));

    if (groupsInput.every((g) => g.teamIds.length < 2)) {
      toast.error("Seçilen gruplarda fikstür üretecek kadar takım yok.");
      return;
    }

    const options: ScheduleOptions = {
      startDate,
      matchDays: [...matchDays],
      dailyMatchCount,
      firstMatchTime,
      matchDurationMin,
      restBetweenMin,
      venueIds: [...selectedVenues],
      minTeamRestDays,
      double,
    };
    const result = generateFixture(groupsInput, options);
    setPreview(result);
    setStep(3);
  }

  async function save(publish: boolean) {
    if (!preview || preview.matches.length === 0) return;
    setSaving(true);
    try {
      const result = await saveGeneratedFixtureAction(tournament.id, preview.matches, publish);
      if (result.ok) {
        toast.success(result.message);
        router.push("/panel/maclar");
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } finally {
      setSaving(false);
    }
  }

  const stepTitles = ["Kapsam", "Takvim", "Ön İzleme"];

  return (
    <div className="space-y-4">
      {/* Adım göstergesi */}
      <ol className="flex gap-2" aria-label="Sihirbaz adımları">
        {stepTitles.map((title, i) => (
          <li
            key={title}
            className={cn(
              "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold",
              step === i + 1 ? "bg-brand-700 text-white" : step > i + 1 ? "bg-brand-100 text-brand-800" : "bg-gray-100 text-gray-500"
            )}
            aria-current={step === i + 1 ? "step" : undefined}
          >
            <span className="flex size-4 items-center justify-center rounded-full bg-white/25 text-[10px]">{i + 1}</span>
            {title}
          </li>
        ))}
      </ol>

      {existingMatchCount > 0 && step === 1 && (
        <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          Bu turnuvada zaten {existingMatchCount} maç var. Yeni fikstür mevcut maçlara EK olarak oluşturulur.
          Baştan kurmak istiyorsanız önce Sistem Ayarları&apos;ndan turnuvayı sıfırlayın.
        </p>
      )}

      {step === 1 && (
        <section className="card space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">1. Kapsam</h2>

          <fieldset>
            <legend className="label">Fikstürü oluşturulacak gruplar</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {wizardGroups.map((wg) => {
                const key = wg.group?.id ?? "__all__";
                const checked = selectedGroups.has(key);
                return (
                  <label
                    key={key}
                    className={cn(
                      "flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2",
                      checked ? "border-brand-600 bg-brand-50" : "border-line"
                    )}
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-brand-700"
                      checked={checked}
                      onChange={(e) => {
                        const next = new Set(selectedGroups);
                        if (e.target.checked) next.add(key);
                        else next.delete(key);
                        setSelectedGroups(next);
                      }}
                    />
                    <span className="text-sm font-medium">
                      {wg.group?.name ?? "Tüm takımlar (lig usulü)"}
                    </span>
                    <span className="ml-auto text-xs text-muted">{wg.teams.length} takım</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="label">Devre sayısı</legend>
            <div className="flex gap-2">
              {[
                { value: false, label: "Tek devre" },
                { value: true, label: "Çift devre (rövanşlı)" },
              ].map((opt) => (
                <label
                  key={String(opt.value)}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-4",
                    double === opt.value ? "border-brand-600 bg-brand-50" : "border-line"
                  )}
                >
                  <input
                    type="radio"
                    name="double"
                    className="size-4 accent-brand-700"
                    checked={double === opt.value}
                    onChange={() => setDouble(opt.value)}
                  />
                  <span className="text-sm font-medium">{opt.label}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex justify-end">
            <button type="button" className="btn-primary" onClick={() => setStep(2)}>
              Devam Et <ArrowRight className="size-4" aria-hidden />
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="card space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">2. Takvim Ayarları</h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="label" htmlFor="fw-start">Başlangıç tarihi</label>
              <input id="fw-start" type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="fw-daily">Günlük maç sayısı</label>
              <input id="fw-daily" type="number" min={1} max={12} className="input" value={dailyMatchCount} onChange={(e) => setDailyMatchCount(Number(e.target.value))} />
            </div>
            <div>
              <label className="label" htmlFor="fw-first">İlk maç saati</label>
              <input id="fw-first" type="time" className="input" value={firstMatchTime} onChange={(e) => setFirstMatchTime(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="fw-duration">Maç süresi (dk)</label>
              <input id="fw-duration" type="number" min={30} max={150} step={5} className="input" value={matchDurationMin} onChange={(e) => setMatchDurationMin(Number(e.target.value))} />
            </div>
            <div>
              <label className="label" htmlFor="fw-rest">Maçlar arası boşluk (dk)</label>
              <input id="fw-rest" type="number" min={0} max={120} step={5} className="input" value={restBetweenMin} onChange={(e) => setRestBetweenMin(Number(e.target.value))} />
            </div>
            <div>
              <label className="label" htmlFor="fw-teamrest">Takım dinlenmesi (gün)</label>
              <input id="fw-teamrest" type="number" min={0} max={14} className="input" value={minTeamRestDays} onChange={(e) => setMinTeamRestDays(Number(e.target.value))} />
            </div>
          </div>

          <fieldset>
            <legend className="label">Maç oynanacak günler</legend>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAY_LABELS.map((label, day) => {
                const checked = matchDays.has(day);
                return (
                  <label
                    key={day}
                    className={cn(
                      "flex min-h-10 cursor-pointer items-center rounded-xl border px-3 text-sm font-medium",
                      checked ? "border-brand-600 bg-brand-50 text-brand-800" : "border-line text-gray-600"
                    )}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={(e) => {
                        const next = new Set(matchDays);
                        if (e.target.checked) next.add(day);
                        else next.delete(day);
                        setMatchDays(next);
                      }}
                    />
                    {label}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="label">Kullanılacak sahalar</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {venues.map((v) => {
                const checked = selectedVenues.has(v.id);
                return (
                  <label
                    key={v.id}
                    className={cn(
                      "flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3",
                      checked ? "border-brand-600 bg-brand-50" : "border-line"
                    )}
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-brand-700"
                      checked={checked}
                      onChange={(e) => {
                        const next = new Set(selectedVenues);
                        if (e.target.checked) next.add(v.id);
                        else next.delete(v.id);
                        setSelectedVenues(next);
                      }}
                    />
                    <span className="text-sm font-medium">{v.name}</span>
                  </label>
                );
              })}
              {venues.length === 0 && (
                <p className="text-sm text-muted">Önce Sahalar sayfasından saha ekleyin.</p>
              )}
            </div>
          </fieldset>

          <div className="flex justify-between">
            <button type="button" className="btn-secondary" onClick={() => setStep(1)}>
              <ArrowLeft className="size-4" aria-hidden /> Geri
            </button>
            <button type="button" className="btn-primary" onClick={buildPreview}>
              Ön İzlemeyi Oluştur <ArrowRight className="size-4" aria-hidden />
            </button>
          </div>
        </section>
      )}

      {step === 3 && preview && (
        <section className="space-y-4">
          {preview.warnings.map((w) => (
            <p key={w} className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              {w}
            </p>
          ))}

          <div className="card p-3">
            <p className="mb-3 text-sm">
              <strong>{preview.matches.length} maç</strong> üretildi
              {preview.matches.length > 0 && (
                <> · {formatDate(preview.matches[0].matchDate)} - {formatDate(preview.matches[preview.matches.length - 1].matchDate)}</>
              )}
            </p>
            <div className="max-h-96 overflow-y-auto rounded-xl border border-line">
              <table className="w-full text-sm">
                <thead className="sticky top-0 border-b border-line bg-gray-50">
                  <tr>
                    <th className="th">Hafta</th>
                    <th className="th">Tarih</th>
                    <th className="th">Saat</th>
                    <th className="th">Eşleşme</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.matches.map((m, i) => (
                    <tr key={i} className="border-b border-line last:border-b-0">
                      <td className="td whitespace-nowrap text-xs text-muted">{m.roundName}</td>
                      <td className="td whitespace-nowrap">{formatDate(m.matchDate)}</td>
                      <td className="td tabular-nums">{m.startTime}</td>
                      <td className="td font-medium">
                        {teamNameById.get(m.homeTeamId)} - {teamNameById.get(m.awayTeamId)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-wrap justify-between gap-2">
            <button type="button" className="btn-secondary" onClick={() => setStep(2)} disabled={saving}>
              <ArrowLeft className="size-4" aria-hidden /> Ayarlara Dön
            </button>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary" onClick={() => save(false)} disabled={saving || preview.matches.length === 0}>
                {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
                Taslak Olarak Kaydet
              </button>
              <button type="button" className="btn-primary" onClick={() => save(true)} disabled={saving || preview.matches.length === 0}>
                {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <CalendarCheck className="size-4" aria-hidden />}
                Kaydet ve Yayınla
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
