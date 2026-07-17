"use client";

import { savePlayerAction } from "@/lib/actions/teams";
import { SubmitButton, useActionForm } from "@/components/forms";
import { Field } from "@/components/ui";
import { ImageUpload } from "@/components/ImageUpload";
import { POSITION_LABELS } from "@/lib/labels";
import type { Player, PlayerPosition, Team } from "@/lib/types";

export function PlayerForm({
  teams,
  player,
  defaultTeamId,
}: {
  teams: Pick<Team, "id" | "name">[];
  player?: Player;
  defaultTeamId?: string;
}) {
  const form = useActionForm(savePlayerAction, { redirectTo: "/panel/oyuncular" });
  const e = form.errors;

  return (
    <form action={form.formAction} className="space-y-5">
      <input type="hidden" name="id" value={player?.id ?? ""} />

      <section className="card space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Oyuncu Bilgileri</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Takım" htmlFor="team_id" required error={e.team_id}>
            <select id="team_id" name="team_id" required defaultValue={player?.team_id ?? defaultTeamId ?? ""} className="input">
              <option value="" disabled>Takım seçin</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Forma numarası" htmlFor="shirt_number" error={e.shirt_number} hint="Aynı numara varsa uyarı verilir.">
            <input id="shirt_number" name="shirt_number" type="number" min={1} max={99} defaultValue={player?.shirt_number ?? ""} className="input" />
          </Field>
          <Field label="Ad" htmlFor="first_name" required error={e.first_name}>
            <input id="first_name" name="first_name" required defaultValue={player?.first_name ?? ""} className="input" />
          </Field>
          <Field label="Soyad" htmlFor="last_name" required error={e.last_name}>
            <input id="last_name" name="last_name" required defaultValue={player?.last_name ?? ""} className="input" />
          </Field>
          <Field label="Pozisyon" htmlFor="position" error={e.position}>
            <select id="position" name="position" defaultValue={player?.position ?? "unspecified"} className="input">
              {(Object.keys(POSITION_LABELS) as PlayerPosition[]).map((p) => (
                <option key={p} value={p}>{POSITION_LABELS[p]}</option>
              ))}
            </select>
          </Field>
          <Field label="Doğum yılı" htmlFor="birth_year" error={e.birth_year}>
            <input id="birth_year" name="birth_year" type="number" min={1940} max={2020} defaultValue={player?.birth_year ?? ""} className="input" />
          </Field>
        </div>

        <div className="flex flex-wrap gap-5">
          <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="is_captain" defaultChecked={player?.is_captain ?? false} className="size-4 accent-brand-700" />
            Takım kaptanı
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="is_goalkeeper" defaultChecked={player?.is_goalkeeper ?? false} className="size-4 accent-brand-700" />
            Kaleci
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="is_active" defaultChecked={player?.is_active ?? true} className="size-4 accent-brand-700" />
            Aktif oyuncu
          </label>
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Fotoğraf ve Notlar</h2>
        <ImageUpload name="photo_url" bucket="player-photos" defaultUrl={player?.photo_url} label="Oyuncu fotoğrafı" />
        <Field label="Notlar" htmlFor="notes" error={e.notes} hint="Yalnızca panelde görünür.">
          <textarea id="notes" name="notes" rows={2} defaultValue={player?.notes ?? ""} className="input min-h-16" />
        </Field>
      </section>

      <div className="flex justify-end">
        <SubmitButton>{player ? "Değişiklikleri Kaydet" : "Oyuncuyu Ekle"}</SubmitButton>
      </div>
    </form>
  );
}
