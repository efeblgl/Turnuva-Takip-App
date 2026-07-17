"use client";

import { saveAnnouncementAction } from "@/lib/actions/content";
import { SubmitButton, useActionForm } from "@/components/forms";
import { Field } from "@/components/ui";
import { ImageUpload } from "@/components/ImageUpload";
import { ANNOUNCEMENT_TYPE_LABELS } from "@/lib/labels";
import type { Announcement, AnnouncementType } from "@/lib/types";

export function AnnouncementForm({
  tournamentId,
  announcement,
}: {
  tournamentId: string;
  announcement?: Announcement;
}) {
  const form = useActionForm(saveAnnouncementAction, { redirectTo: "/panel/duyurular" });
  const e = form.errors;

  return (
    <form action={form.formAction} className="space-y-5">
      <input type="hidden" name="id" value={announcement?.id ?? ""} />
      <input type="hidden" name="tournament_id" value={tournamentId} />

      <section className="card space-y-4">
        <Field label="Başlık" htmlFor="title" required error={e.title}>
          <input id="title" name="title" required defaultValue={announcement?.title ?? ""} className="input" />
        </Field>
        <Field label="Kısa açıklama" htmlFor="summary" error={e.summary} hint="Listelerde ve ana sayfada görünür.">
          <textarea id="summary" name="summary" rows={2} defaultValue={announcement?.summary ?? ""} className="input min-h-16" />
        </Field>
        <Field label="Detaylı içerik" htmlFor="content" error={e.content}>
          <textarea id="content" name="content" rows={6} defaultValue={announcement?.content ?? ""} className="input min-h-32" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Duyuru türü" htmlFor="announcement_type" error={e.announcement_type}>
            <select id="announcement_type" name="announcement_type" defaultValue={announcement?.announcement_type ?? "general"} className="input">
              {(Object.keys(ANNOUNCEMENT_TYPE_LABELS) as AnnouncementType[]).map((t) => (
                <option key={t} value={t}>{ANNOUNCEMENT_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </Field>
          <Field label="Yayın tarihi" htmlFor="publish_date" error={e.publish_date} hint="Boşsa hemen yayınlanır.">
            <input id="publish_date" name="publish_date" type="date" defaultValue={announcement?.publish_date?.slice(0, 10) ?? ""} className="input" />
          </Field>
          <Field label="Bitiş tarihi" htmlFor="expire_date" error={e.expire_date} hint="Bu tarihten sonra otomatik gizlenir.">
            <input id="expire_date" name="expire_date" type="date" defaultValue={announcement?.expire_date?.slice(0, 10) ?? ""} className="input" />
          </Field>
        </div>

        <ImageUpload name="image_url" bucket="announcement-images" defaultUrl={announcement?.image_url} label="Kapak görseli" />

        <div className="flex flex-wrap gap-5">
          <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="is_important" defaultChecked={announcement?.is_important ?? false} className="size-4 accent-brand-700" />
            Önemli duyuru (ana sayfanın üstünde vurgulanır)
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
            <input type="checkbox" name="is_published" defaultChecked={announcement?.is_published ?? true} className="size-4 accent-brand-700" />
            Yayında
          </label>
        </div>
      </section>

      <div className="flex justify-end">
        <SubmitButton>{announcement ? "Duyuruyu Güncelle" : "Duyuruyu Kaydet"}</SubmitButton>
      </div>
    </form>
  );
}
