"use client";

import { saveMatchAction } from "@/lib/actions/matches";
import { SubmitButton, useActionForm } from "@/components/forms";
import { Field } from "@/components/ui";
import type { Group, Match, Team, Venue } from "@/lib/types";

export function MatchForm({
  tournamentId,
  teams,
  groups,
  venues,
  match,
}: {
  tournamentId: string;
  teams: Pick<Team, "id" | "name" | "group_id">[];
  groups: Group[];
  venues: Venue[];
  match?: Match;
}) {
  const form = useActionForm(saveMatchAction, {
    redirectTo: (r) => (match ? `/panel/maclar/${match.id}` : `/panel/maclar/${r.id}`),
  });
  const e = form.errors;

  return (
    <form action={form.formAction} className="card space-y-4">
      <input type="hidden" name="id" value={match?.id ?? ""} />
      <input type="hidden" name="tournament_id" value={tournamentId} />

      {(() => {
        // Eleme maçlarında takımlar "belirlenecek" olabilir
        const teamsRequired = !match || match.stage !== "knockout";
        return (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ev sahibi takım" htmlFor="home_team_id" required={teamsRequired} error={e.home_team_id}>
              <select id="home_team_id" name="home_team_id" required={teamsRequired} defaultValue={match?.home_team_id ?? ""} className="input">
                <option value="" disabled={teamsRequired}>{teamsRequired ? "Takım seçin" : "Belirlenecek"}</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
            <Field label="Deplasman takımı" htmlFor="away_team_id" required={teamsRequired} error={e.away_team_id}>
              <select id="away_team_id" name="away_team_id" required={teamsRequired} defaultValue={match?.away_team_id ?? ""} className="input">
                <option value="" disabled={teamsRequired}>{teamsRequired ? "Takım seçin" : "Belirlenecek"}</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
          </div>
        );
      })()}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tarih" htmlFor="match_date" required error={e.match_date}>
          <input id="match_date" name="match_date" type="date" required defaultValue={match?.match_date ?? ""} className="input" />
        </Field>
        <Field label="Saat" htmlFor="start_time" required error={e.start_time}>
          <input id="start_time" name="start_time" type="time" required defaultValue={match?.start_time?.slice(0, 5) ?? ""} className="input" />
        </Field>
        <Field label="Saha" htmlFor="venue_id" error={e.venue_id}>
          <select id="venue_id" name="venue_id" defaultValue={match?.venue_id ?? ""} className="input">
            <option value="">Saha seçilmedi</option>
            {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </Field>
        <Field label="Grup" htmlFor="group_id" error={e.group_id}>
          <select id="group_id" name="group_id" defaultValue={match?.group_id ?? ""} className="input">
            <option value="">Grup yok</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </Field>
        <Field label="Hafta numarası" htmlFor="week_number" error={e.week_number}>
          <input id="week_number" name="week_number" type="number" min={1} max={99} defaultValue={match?.week_number ?? ""} className="input" />
        </Field>
        <Field label="Tur adı" htmlFor="round_name" error={e.round_name} hint='Örn. "3. Hafta" veya "Çeyrek Final"'>
          <input id="round_name" name="round_name" defaultValue={match?.round_name ?? ""} className="input" />
        </Field>
        <Field label="Hakem" htmlFor="referee_name" error={e.referee_name}>
          <input id="referee_name" name="referee_name" defaultValue={match?.referee_name ?? ""} className="input" />
        </Field>
        <Field label="Yardımcı hakemler" htmlFor="assistant_referees" error={e.assistant_referees}>
          <input id="assistant_referees" name="assistant_referees" defaultValue={match?.assistant_referees ?? ""} className="input" />
        </Field>
      </div>

      <Field label="Maç notu" htmlFor="notes" error={e.notes}>
        <textarea id="notes" name="notes" rows={2} defaultValue={match?.notes ?? ""} className="input min-h-16" />
      </Field>

      <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="is_published" defaultChecked={match?.is_published ?? false} className="size-4 accent-brand-700" />
        Halka açık sitede yayınlansın
      </label>

      <div className="flex justify-end">
        <SubmitButton>{match ? "Değişiklikleri Kaydet" : "Maçı Ekle"}</SubmitButton>
      </div>
    </form>
  );
}
