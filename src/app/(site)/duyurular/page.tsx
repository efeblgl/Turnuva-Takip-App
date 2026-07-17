import type { Metadata } from "next";
import Link from "next/link";
import { Megaphone } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { fetchPublicTournament, getPublishedAnnouncements } from "@/lib/queries";
import { Badge, EmptyState } from "@/components/ui";
import { ANNOUNCEMENT_TYPE_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Duyurular",
  description: "Turnuva duyuruları: fikstür değişiklikleri, erteleme kararları ve haberler.",
};

export default async function AnnouncementsPage() {
  const tournament = await fetchPublicTournament();
  if (!tournament) {
    return (
      <div className="container-page py-10">
        <EmptyState title="Henüz duyuru yayınlanmadı" />
      </div>
    );
  }

  const supabase = await createClient();
  const announcements = await getPublishedAnnouncements(supabase, tournament.id, 50);

  return (
    <div className="container-page space-y-4 py-6">
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Duyurular</h1>

      {announcements.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="size-8" aria-hidden />}
          title="Henüz duyuru yayınlanmadı"
          description="Turnuva duyuruları burada listelenecek."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {announcements.map((a) => (
            <Link key={a.id} href={`/duyurular/${a.slug}`} className="card card-hover flex flex-col">
              <div className="flex items-center justify-between gap-2">
                <Badge
                  className={
                    a.is_important
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-line bg-gray-50 text-gray-600"
                  }
                >
                  {ANNOUNCEMENT_TYPE_LABELS[a.announcement_type]}
                </Badge>
                <span className="text-xs text-muted">{formatDate(a.publish_date)}</span>
              </div>
              <h2 className="mt-2 text-sm font-bold leading-snug">{a.title}</h2>
              {a.summary && <p className="mt-1 line-clamp-3 text-sm text-muted">{a.summary}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
