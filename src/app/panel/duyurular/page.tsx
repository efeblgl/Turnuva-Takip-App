import Link from "next/link";
import { EyeOff, Pencil, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { getAdminTournament } from "@/lib/queries";
import { deleteAnnouncementAction, unpublishAnnouncementAction } from "@/lib/actions/content";
import { requireRole, ROLES_MANAGE_ANNOUNCEMENTS } from "@/lib/auth";
import { Badge, EmptyState } from "@/components/ui";
import { ConfirmButton } from "@/components/Modal";
import { ANNOUNCEMENT_TYPE_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/utils";
import type { Announcement } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PanelAnnouncementsPage() {
  await requireRole(ROLES_MANAGE_ANNOUNCEMENTS);
  const supabase = await createClient();
  const tournament = await getAdminTournament(supabase);
  if (!tournament) return <EmptyState title="Önce turnuva oluşturun" />;

  const { data } = await supabase
    .from("announcements")
    .select("*")
    .eq("tournament_id", tournament.id)
    .order("publish_date", { ascending: false });
  const announcements = (data as Announcement[] | null) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight">Duyurular</h1>
        <Link href="/panel/duyurular/yeni" className="btn-primary btn-sm">
          <Plus className="size-4" aria-hidden />
          Duyuru Oluştur
        </Link>
      </div>

      {announcements.length === 0 ? (
        <EmptyState title="Henüz duyuru yok" />
      ) : (
        <div className="grid gap-2">
          {announcements.map((a) => (
            <div key={a.id} className="card flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{a.title}</p>
                <p className="text-xs text-muted">
                  {ANNOUNCEMENT_TYPE_LABELS[a.announcement_type]} · {formatDate(a.publish_date)}
                  {a.expire_date && ` · Bitiş: ${formatDate(a.expire_date)}`}
                </p>
              </div>
              {a.is_important && <Badge className="border-amber-200 bg-amber-50 text-amber-800">Önemli</Badge>}
              <Badge className={a.is_published ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-line bg-gray-100 text-gray-500"}>
                {a.is_published ? "Yayında" : "Taslak"}
              </Badge>
              <div className="flex gap-1.5">
                <Link href={`/panel/duyurular/${a.id}`} className="btn-secondary btn-sm" aria-label="Düzenle">
                  <Pencil className="size-3.5" aria-hidden />
                </Link>
                {a.is_published && (
                  <ConfirmButton
                    action={unpublishAnnouncementAction.bind(null, a.id)}
                    title="Yayından kaldır"
                    description="Duyuru halka açık sitede görünmez olacak (silinmez)."
                    confirmLabel="Yayından Kaldır"
                    className="btn-sm"
                  >
                    <EyeOff className="size-3.5" aria-hidden />
                  </ConfirmButton>
                )}
                <ConfirmButton
                  action={deleteAnnouncementAction.bind(null, a.id)}
                  title="Duyuruyu sil"
                  description="Duyuru kalıcı olarak silinecek. Bu işlem geri alınamaz."
                  confirmLabel="Sil"
                  danger
                  className="btn-sm"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </ConfirmButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
