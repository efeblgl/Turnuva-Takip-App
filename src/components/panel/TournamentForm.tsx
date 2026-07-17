"use client";

import { saveTournamentAction } from "@/lib/actions/structure";
import { SubmitButton, useActionForm } from "@/components/forms";
import { Field } from "@/components/ui";
import { ImageUpload } from "@/components/ImageUpload";
import { TOURNAMENT_FORMAT_LABELS, TOURNAMENT_STATUS_LABELS } from "@/lib/labels";
import type { Tournament, TournamentFormat, TournamentStatus } from "@/lib/types";

export function TournamentForm({ tournament }: { tournament?: Tournament }) {
  const form = useActionForm(saveTournamentAction);
  const e = form.errors;

  return (
    <form action={form.formAction} className="space-y-5">
      <input type="hidden" name="id" value={tournament?.id ?? ""} />

      <section className="card space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Temel Bilgiler</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Turnuva adı" htmlFor="name" required error={e.name}>
            <input id="name" name="name" required defaultValue={tournament?.name ?? "Yığılca Futbol Turnuvası 2026"} className="input" />
          </Field>
          <Field label="Kısa ad" htmlFor="short_name" error={e.short_name}>
            <input id="short_name" name="short_name" defaultValue={tournament?.short_name ?? ""} className="input" />
          </Field>
          <Field label="Sezon" htmlFor="season" error={e.season}>
            <input id="season" name="season" defaultValue={tournament?.season ?? "2026"} className="input" />
          </Field>
          <Field label="Turnuva yeri" htmlFor="location" error={e.location}>
            <input id="location" name="location" defaultValue={tournament?.location ?? ""} className="input" />
          </Field>
          <Field label="Başlangıç tarihi" htmlFor="start_date" error={e.start_date}>
            <input id="start_date" name="start_date" type="date" defaultValue={tournament?.start_date ?? ""} className="input" />
          </Field>
          <Field label="Bitiş tarihi" htmlFor="end_date" error={e.end_date}>
            <input id="end_date" name="end_date" type="date" defaultValue={tournament?.end_date ?? ""} className="input" />
          </Field>
          <Field label="Turnuva durumu" htmlFor="status" error={e.status}>
            <select id="status" name="status" defaultValue={tournament?.status ?? "preparation"} className="input">
              {(Object.keys(TOURNAMENT_STATUS_LABELS) as TournamentStatus[]).map((s) => (
                <option key={s} value={s}>{TOURNAMENT_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </Field>
          <Field label="Turnuva formatı" htmlFor="format" error={e.format} hint="Format değişikliği mevcut maçları etkilemez ama fikstür kurgusunu değiştirir.">
            <select id="format" name="format" defaultValue={tournament?.format ?? "group_knockout"} className="input">
              {(Object.keys(TOURNAMENT_FORMAT_LABELS) as TournamentFormat[]).map((f) => (
                <option key={f} value={f}>{TOURNAMENT_FORMAT_LABELS[f]}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Kısa açıklama" htmlFor="description" error={e.description}>
          <textarea id="description" name="description" rows={3} defaultValue={tournament?.description ?? ""} className="input min-h-20" />
        </Field>
        <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
          <input type="checkbox" name="is_public" defaultChecked={tournament?.is_public ?? false} className="size-4 accent-brand-700" />
          Turnuva halka açık sitede yayında
        </label>
      </section>

      <section className="card space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Logolar</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <ImageUpload name="logo_url" bucket="tournament-logos" defaultUrl={tournament?.logo_url} label="Turnuva logosu" />
          <ImageUpload name="municipality_logo_url" bucket="tournament-logos" defaultUrl={tournament?.municipality_logo_url} label="Belediye logosu" />
          <ImageUpload name="organizer_logo_url" bucket="sponsor-logos" defaultUrl={tournament?.organizer_logo_url} label="Organizatör logosu" />
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Puanlama ve Hükmen Kuralları</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <Field label="Galibiyet puanı" htmlFor="win_points" error={e.win_points}>
            <input id="win_points" name="win_points" type="number" min={0} max={10} defaultValue={tournament?.win_points ?? 3} className="input" />
          </Field>
          <Field label="Beraberlik puanı" htmlFor="draw_points" error={e.draw_points}>
            <input id="draw_points" name="draw_points" type="number" min={0} max={10} defaultValue={tournament?.draw_points ?? 1} className="input" />
          </Field>
          <Field label="Mağlubiyet puanı" htmlFor="loss_points" error={e.loss_points}>
            <input id="loss_points" name="loss_points" type="number" min={0} max={10} defaultValue={tournament?.loss_points ?? 0} className="input" />
          </Field>
          <Field label="Hükmen galip skoru" htmlFor="forfeit_home_score" error={e.forfeit_home_score}>
            <input id="forfeit_home_score" name="forfeit_home_score" type="number" min={0} max={20} defaultValue={tournament?.forfeit_home_score ?? 3} className="input" />
          </Field>
          <Field label="Hükmen mağlup skoru" htmlFor="forfeit_away_score" error={e.forfeit_away_score}>
            <input id="forfeit_away_score" name="forfeit_away_score" type="number" min={0} max={20} defaultValue={tournament?.forfeit_away_score ?? 0} className="input" />
          </Field>
        </div>
      </section>

      <div className="flex justify-end">
        <SubmitButton>{tournament ? "Ayarları Kaydet" : "Turnuvayı Oluştur"}</SubmitButton>
      </div>
    </form>
  );
}
