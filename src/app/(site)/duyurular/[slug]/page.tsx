/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { fetchPublicTournament, getAnnouncementBySlug } from "@/lib/queries";
import { Badge } from "@/components/ui";
import { ANNOUNCEMENT_TYPE_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tournament = await fetchPublicTournament();
  if (!tournament) return { title: "Duyuru" };
  const supabase = await createClient();
  const a = await getAnnouncementBySlug(supabase, tournament.id, slug);
  return {
    title: a?.title ?? "Duyuru",
    description: a?.summary ?? undefined,
    openGraph: a?.image_url ? { images: [a.image_url] } : undefined,
  };
}

export default async function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tournament = await fetchPublicTournament();
  if (!tournament) notFound();

  const supabase = await createClient();
  const announcement = await getAnnouncementBySlug(supabase, tournament.id, slug);
  if (!announcement) notFound();

  return (
    <div className="container-page max-w-3xl space-y-4 py-6">
      <Link href="/duyurular" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
        <ArrowLeft className="size-4" aria-hidden />
        Tüm duyurular
      </Link>

      <article className="card p-5 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className={
              announcement.is_important
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-line bg-gray-50 text-gray-600"
            }
          >
            {ANNOUNCEMENT_TYPE_LABELS[announcement.announcement_type]}
          </Badge>
          <time className="text-xs text-muted" dateTime={announcement.publish_date}>
            {formatDate(announcement.publish_date)}
          </time>
        </div>

        <h1 className="mt-3 text-xl font-bold leading-tight tracking-tight sm:text-2xl">
          {announcement.title}
        </h1>

        {announcement.summary && (
          <p className="mt-3 text-base font-medium text-muted">{announcement.summary}</p>
        )}

        {announcement.image_url && (
          <img
            src={announcement.image_url}
            alt=""
            className="mt-4 w-full rounded-xl border border-line object-cover"
          />
        )}

        {announcement.content && (
          <div className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink">
            {announcement.content}
          </div>
        )}
      </article>
    </div>
  );
}
