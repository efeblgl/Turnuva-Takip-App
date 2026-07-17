import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="rounded-full bg-gray-100 p-4 text-gray-400">
        <SearchX className="size-10" aria-hidden />
      </span>
      <h1 className="text-2xl font-bold tracking-tight">Sayfa bulunamadı</h1>
      <p className="max-w-sm text-sm text-muted">
        Aradığınız sayfa taşınmış veya kaldırılmış olabilir. Ana sayfadan devam edebilirsiniz.
      </p>
      <Link href="/" className="btn-primary">Ana sayfaya dön</Link>
    </div>
  );
}
