"use client";

import { KeyRound } from "lucide-react";
import { updatePasswordAction } from "@/lib/actions/auth";
import { SubmitButton, useActionForm } from "@/components/forms";
import { Field } from "@/components/ui";

export default function ResetPasswordPage() {
  const form = useActionForm(updatePasswordAction);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-page px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-brand-700 text-white">
            <KeyRound className="size-6" aria-hidden />
          </span>
          <h1 className="text-lg font-bold">Yeni Şifre Belirle</h1>
          <p className="text-sm text-muted">E-postanızdaki bağlantı ile bu sayfaya geldiyseniz yeni şifrenizi girin.</p>
        </div>

        <form action={form.formAction} className="card space-y-4">
          <Field label="Yeni şifre" htmlFor="password" required>
            <input id="password" name="password" type="password" autoComplete="new-password" required minLength={6} className="input" />
          </Field>
          <Field label="Yeni şifre (tekrar)" htmlFor="confirm" required>
            <input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={6} className="input" />
          </Field>
          {form.state && !form.state.ok && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{form.state.message}</p>
          )}
          <SubmitButton className="w-full" pendingText="Güncelleniyor...">Şifreyi Güncelle</SubmitButton>
        </form>
      </div>
    </div>
  );
}
