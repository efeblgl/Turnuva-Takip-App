"use client";

import { saveTeamAction } from "@/lib/actions/teams";
import { SubmitButton, useActionForm } from "@/components/forms";
import { Field } from "@/components/ui";
import { ColorInput } from "@/components/ColorInput";
import { ImageUpload } from "@/components/ImageUpload";
import { TEAM_STATUS_LABELS } from "@/lib/labels";
import type { Group, Team, TeamStatus } from "@/lib/types";

export function TeamForm({
  tournamentId,
  groups,
  team,
}: {
  tournamentId: string;
  groups: Group[];
  team?: Team;
}) {
  const form = useActionForm(saveTeamAction, { redirectTo: "/panel/takimlar" });
  const e = form.errors;

  return (
    <form action={form.formAction} className="space-y-5">
      <input type="hidden" name="id" value={team?.id ?? ""} />
      <input type="hidden" name="tournament_id" value={tournamentId} />

      {/* Temel bilgiler */}
      <section className="card space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Temel Bilgiler</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Takım adı" htmlFor="name" required error={e.name}>
            <input id="name" name="name" required defaultValue={team?.name ?? ""} className="input" placeholder="Örn. Yağcılar Spor" />
          </Field>
          <Field label="Kısa ad" htmlFor="short_name" error={e.short_name} hint="Dar alanlarda gösterilir.">
            <input id="short_name" name="short_name" defaultValue={team?.short_name ?? ""} className="input" placeholder="Örn. Yağcılar" />
          </Field>
          <Field label="Takım kodu" htmlFor="code" error={e.code} hint="2-5 karakter (örn. YAG).">
            <input id="code" name="code" defaultValue={team?.code ?? ""} className="input uppercase" maxLength={5} />
          </Field>
          <Field label="Grup" htmlFor="group_id" error={e.group_id}>
            <select id="group_id" name="group_id" defaultValue={team?.group_id ?? ""} className="input">
              <option value="">Grup belirlenmedi</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Mahalle / Köy" htmlFor="neighborhood" error={e.neighborhood}>
            <input id="neighborhood" name="neighborhood" defaultValue={team?.neighborhood ?? ""} className="input" />
          </Field>
          <Field label="Kuruluş yılı" htmlFor="founded_year" error={e.founded_year}>
            <input id="founded_year" name="founded_year" type="number" min={1900} max={2100} defaultValue={team?.founded_year ?? ""} className="input" />
          </Field>
          <Field label="Takım durumu" htmlFor="status" error={e.status}>
            <select id="status" name="status" defaultValue={team?.status ?? "active"} className="input">
              {(Object.keys(TEAM_STATUS_LABELS) as TeamStatus[]).map((s) => (
                <option key={s} value={s}>{TEAM_STATUS_LABELS[s]}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Takım açıklaması" htmlFor="description" error={e.description}>
          <textarea id="description" name="description" rows={3} defaultValue={team?.description ?? ""} className="input min-h-20" />
        </Field>
      </section>

      {/* Görsel ve renkler */}
      <section className="card space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Logo ve Renkler</h2>
        <ImageUpload name="logo_url" bucket="team-logos" defaultUrl={team?.logo_url} label="Takım logosu" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ColorInput name="primary_color" label="Ana renk" defaultValue={team?.primary_color} />
          <ColorInput name="secondary_color" label="İkinci renk" defaultValue={team?.secondary_color} />
          <ColorInput name="text_color" label="Yazı rengi" defaultValue={team?.text_color} />
          <ColorInput name="kit_primary_color" label="Forma ana rengi" defaultValue={team?.kit_primary_color} />
          <ColorInput name="kit_secondary_color" label="Forma ikinci rengi" defaultValue={team?.kit_secondary_color} />
          <ColorInput name="goalkeeper_color" label="Kaleci forma rengi" defaultValue={team?.goalkeeper_color} />
        </div>
        {(e.primary_color || e.secondary_color || e.text_color) && (
          <p className="field-error">{e.primary_color ?? e.secondary_color ?? e.text_color}</p>
        )}
      </section>

      {/* İletişim (halka açık gösterilmez) */}
      <section className="card space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Sorumlular</h2>
        <p className="rounded-xl bg-gray-50 px-3 py-2 text-xs text-muted">
          Takım sorumlusu adı ve telefonu yalnızca panelde görünür; halka açık sitede paylaşılmaz.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Takım sorumlusu" htmlFor="manager_name" error={e.manager_name}>
            <input id="manager_name" name="manager_name" defaultValue={team?.manager_name ?? ""} className="input" />
          </Field>
          <Field label="Sorumlu telefonu" htmlFor="manager_phone" error={e.manager_phone}>
            <input id="manager_phone" name="manager_phone" type="tel" defaultValue={team?.manager_phone ?? ""} className="input" placeholder="05xx xxx xx xx" />
          </Field>
          <Field label="Teknik sorumlu" htmlFor="coach_name" error={e.coach_name}>
            <input id="coach_name" name="coach_name" defaultValue={team?.coach_name ?? ""} className="input" />
          </Field>
        </div>
      </section>

      <div className="flex justify-end gap-2">
        <SubmitButton>{team ? "Değişiklikleri Kaydet" : "Takımı Ekle"}</SubmitButton>
      </div>
    </form>
  );
}
