import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { fetchPublicTournament, fetchSettings } from "@/lib/queries";
import { EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Turnuva Kuralları",
  description: "Maç süresi, oyuncu sayısı, kart cezaları ve turnuva kuralları.",
};

export default async function RulesPage() {
  const tournament = await fetchPublicTournament();
  const settings = tournament ? await fetchSettings(tournament.id) : {};
  const rules = settings["rules_content"] as { html?: string } | undefined;

  return (
    <div className="container-page max-w-3xl space-y-4 py-6">
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Turnuva Kuralları</h1>

      {!rules?.html ? (
        <EmptyState
          icon={<BookOpen className="size-8" aria-hidden />}
          title="Kurallar henüz yayınlanmadı"
          description="Turnuva kuralları yönetim tarafından yayınlandığında burada görünecek."
        />
      ) : (
        <article
          className="card prose-sm p-5 sm:p-8 [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-bold first:[&_h2]:mt-0 [&_li]:my-1.5 [&_p]:my-2 [&_p]:text-sm [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ul]:text-sm"
          // İçerik yalnızca yetkili yöneticiler tarafından panelden girilir
          dangerouslySetInnerHTML={{ __html: rules.html }}
        />
      )}
    </div>
  );
}
