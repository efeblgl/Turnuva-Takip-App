"use client";

import { saveVenueAction } from "@/lib/actions/structure";
import { SubmitButton, useActionForm } from "@/components/forms";
import { Field } from "@/components/ui";
import { ImageUpload } from "@/components/ImageUpload";
import type { Venue } from "@/lib/types";

export function VenueForm({
  tournamentId,
  venue,
}: {
  tournamentId: string;
  venue?: Venue;
}) {
  const form = useActionForm(saveVenueAction, { redirectTo: "/panel/sahalar" });
  const e = form.errors;

  return (
    <form action={form.formAction} className="card space-y-4">
      <input type="hidden" name="id" value={venue?.id ?? ""} />
      <input type="hidden" name="tournament_id" value={tournamentId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Saha adı" htmlFor="name" required error={e.name}>
          <input id="name" name="name" required defaultValue={venue?.name ?? ""} className="input" />
        </Field>
        <Field label="Kapasite" htmlFor="capacity" error={e.capacity}>
          <input id="capacity" name="capacity" type="number" min={0} defaultValue={venue?.capacity ?? ""} className="input" />
        </Field>
      </div>
      <Field label="Adres" htmlFor="address" error={e.address}>
        <input id="address" name="address" defaultValue={venue?.address ?? ""} className="input" />
      </Field>
      <Field label="Harita bağlantısı" htmlFor="map_url" error={e.map_url} hint="Google Haritalar bağlantısı yapıştırabilirsiniz.">
        <input id="map_url" name="map_url" type="url" defaultValue={venue?.map_url ?? ""} className="input" />
      </Field>
      <Field label="Açıklama" htmlFor="description" error={e.description}>
        <textarea id="description" name="description" rows={2} defaultValue={venue?.description ?? ""} className="input min-h-16" />
      </Field>
      <ImageUpload name="image_url" bucket="venue-images" defaultUrl={venue?.image_url} label="Saha fotoğrafı" />
      <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="is_active" defaultChecked={venue?.is_active ?? true} className="size-4 accent-brand-700" />
        Saha aktif (fikstürde kullanılabilir)
      </label>

      <div className="flex justify-end">
        <SubmitButton>{venue ? "Değişiklikleri Kaydet" : "Sahayı Ekle"}</SubmitButton>
      </div>
    </form>
  );
}
