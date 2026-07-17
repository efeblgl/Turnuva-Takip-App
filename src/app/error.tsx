"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="rounded-full bg-red-50 p-4 text-red-500">
        <TriangleAlert className="size-10" aria-hidden />
      </span>
      <h1 className="text-xl font-bold tracking-tight">Bir sorun oluştu</h1>
      <p className="max-w-sm text-sm text-muted">
        Veriler yüklenirken beklenmeyen bir hata oluştu. İnternet bağlantınızı
        kontrol edip tekrar deneyebilirsiniz.
      </p>
      {error.digest && <p className="text-xs text-gray-400">Hata kodu: {error.digest}</p>}
      <button type="button" onClick={reset} className="btn-primary">
        <RotateCcw className="size-4" aria-hidden />
        Tekrar dene
      </button>
    </div>
  );
}
