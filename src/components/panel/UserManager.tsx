"use client";

/**
 * Kullanıcı yönetimi (yalnızca süper yönetici).
 * Yeni kullanıcı oluşturma sunucuda SUPABASE_SECRET_KEY gerektirir;
 * rol ve aktiflik güncellemeleri RLS ile korunur.
 */
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { createUserAction, updateUserAction } from "@/lib/actions/content";
import { SubmitButton, useActionForm } from "@/components/forms";
import { Badge, Field } from "@/components/ui";
import { ROLE_LABELS } from "@/lib/labels";
import { formatDateTime } from "@/lib/utils";
import type { Profile, UserRole } from "@/lib/types";

export function UserManager({
  profiles,
  currentUserId,
}: {
  profiles: Profile[];
  currentUserId: string;
}) {
  const router = useRouter();
  const form = useActionForm(createUserAction);
  const e = form.errors;

  async function update(userId: string, updates: { role?: string; is_active?: boolean }) {
    const result = await updateUserAction(userId, updates);
    if (result.ok) {
      toast.success(result.message);
      router.refresh();
    } else {
      toast.error(result.message);
    }
  }

  return (
    <div className="space-y-5">
      <section className="card">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted">
          <UserPlus className="size-4" aria-hidden />
          Yeni Kullanıcı
        </h2>
        <form action={form.formAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="E-posta" htmlFor="nu-email" required error={e.email}>
            <input id="nu-email" name="email" type="email" required className="input" />
          </Field>
          <Field label="Ad soyad" htmlFor="nu-name" error={e.full_name}>
            <input id="nu-name" name="full_name" className="input" />
          </Field>
          <Field label="Rol" htmlFor="nu-role" error={e.role}>
            <select id="nu-role" name="role" defaultValue="viewer" className="input">
              {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </Field>
          <Field label="Geçici şifre" htmlFor="nu-pass" required error={e.password} hint="En az 8 karakter.">
            <input id="nu-pass" name="password" type="text" required minLength={8} className="input" />
          </Field>
          <input type="hidden" name="is_active" value="true" />
          <div className="flex items-end">
            <SubmitButton pendingText="Oluşturuluyor...">Oluştur</SubmitButton>
          </div>
        </form>
        {form.state && !form.state.ok && (
          <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{form.state.message}</p>
        )}
      </section>

      <section className="table-wrap">
        <table className="w-full">
          <thead className="border-b border-line bg-gray-50/70">
            <tr>
              <th className="th">Kullanıcı</th>
              <th className="th">Rol</th>
              <th className="th text-center">Durum</th>
              <th className="th hidden md:table-cell">Kayıt</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.id} className="border-b border-line last:border-b-0">
                <td className="td">
                  <span className="block text-sm font-semibold">{p.full_name ?? "-"}</span>
                  <span className="block text-xs text-muted">{p.email}</span>
                </td>
                <td className="td">
                  <select
                    className="input !min-h-9 max-w-44 !py-1 text-xs"
                    value={p.role}
                    onChange={(ev) => update(p.id, { role: ev.target.value })}
                    aria-label={`${p.email} rolü`}
                  >
                    {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                </td>
                <td className="td text-center">
                  {p.id === currentUserId ? (
                    <Badge className="border-brand-200 bg-brand-50 text-brand-800">Siz</Badge>
                  ) : (
                    <button
                      type="button"
                      className={`badge cursor-pointer ${p.is_active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-line bg-gray-100 text-gray-500"}`}
                      onClick={() => update(p.id, { is_active: !p.is_active })}
                      title="Durumu değiştirmek için tıklayın"
                    >
                      {p.is_active ? "Aktif" : "Pasif"}
                    </button>
                  )}
                </td>
                <td className="td hidden text-xs text-muted md:table-cell">{formatDateTime(p.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
