"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { KeyRound, Trophy } from "lucide-react";
import { signInAction, resetPasswordAction } from "@/lib/actions/auth";
import { SubmitButton, useActionForm } from "@/components/forms";
import { Field } from "@/components/ui";

function LoginForm() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"login" | "reset">("login");
  const login = useActionForm(signInAction);
  const reset = useActionForm(resetPasswordAction);

  const inactive = searchParams.get("hata") === "pasif";
  const connectionError = searchParams.get("hata") === "baglanti";

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-brand-700 text-white">
          <Trophy className="size-6" aria-hidden />
        </span>
        <h1 className="text-lg font-bold">Yönetim Paneli</h1>
        <p className="text-sm text-muted">
          {mode === "login"
            ? "Turnuva yönetimi için giriş yapın."
            : "Şifre sıfırlama bağlantısı e-postanıza gönderilir."}
        </p>
      </div>

      {inactive && (
        <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          Hesabınız pasif durumda. Yöneticinizle iletişime geçin.
        </p>
      )}

      {connectionError && (
        <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Sunucuyla bağlantı kurulamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.
        </p>
      )}

      {mode === "login" ? (
        <form action={login.formAction} className="card space-y-4">
          <Field label="E-posta veya kullanıcı adı" htmlFor="email" required>
            <input
              id="email"
              name="email"
              type="text"
              autoComplete="username"
              required
              className="input"
              placeholder="ornek@eposta.com veya kullanıcı adı"
            />
          </Field>
          <Field label="Şifre" htmlFor="password" required>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="input"
            />
          </Field>
          {login.state && !login.state.ok && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{login.state.message}</p>
          )}
          <SubmitButton className="w-full" pendingText="Giriş yapılıyor...">
            Giriş Yap
          </SubmitButton>
          <button
            type="button"
            className="w-full text-center text-sm font-medium text-brand-700 hover:underline"
            onClick={() => setMode("reset")}
          >
            Şifremi unuttum
          </button>
        </form>
      ) : (
        <form action={reset.formAction} className="card space-y-4">
          <Field label="E-posta" htmlFor="reset-email" required>
            <input
              id="reset-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="input"
              placeholder="ornek@eposta.com"
            />
          </Field>
          {reset.state && (
            <p
              className={`rounded-xl px-3 py-2 text-sm ${reset.state.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
            >
              {reset.state.message}
            </p>
          )}
          <SubmitButton className="w-full" pendingText="Gönderiliyor...">
            <KeyRound className="size-4" aria-hidden />
            Sıfırlama Bağlantısı Gönder
          </SubmitButton>
          <button
            type="button"
            className="w-full text-center text-sm font-medium text-brand-700 hover:underline"
            onClick={() => setMode("login")}
          >
            Girişe geri dön
          </button>
        </form>
      )}

      <p className="mt-6 text-center">
        <Link href="/" className="text-sm text-muted hover:text-ink hover:underline">
          ← Turnuva sitesine dön
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-page px-4 py-10">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
