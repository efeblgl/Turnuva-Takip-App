import Link from "next/link";
import { MapPin, Pencil, Plus } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { getAdminTournament, getVenues } from "@/lib/queries";
import { requireRole, ROLES_MANAGE_TEAMS } from "@/lib/auth";
import { Badge, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function PanelVenuesPage() {
  await requireRole(ROLES_MANAGE_TEAMS);
  const supabase = await createClient();
  const tournament = await getAdminTournament(supabase);
  if (!tournament) return <EmptyState title="Önce turnuva oluşturun" />;

  const venues = await getVenues(supabase, tournament.id);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight">Sahalar</h1>
        <Link href="/panel/sahalar/yeni" className="btn-primary btn-sm">
          <Plus className="size-4" aria-hidden />
          Saha Ekle
        </Link>
      </div>

      {venues.length === 0 ? (
        <EmptyState
          icon={<MapPin className="size-8" aria-hidden />}
          title="Henüz saha eklenmedi"
          description="Fikstür oluşturmadan önce en az bir saha ekleyin."
        />
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {venues.map((v) => (
            <div key={v.id} className="card flex items-center gap-3 py-3">
              <span className="rounded-full bg-brand-50 p-2.5 text-brand-700">
                <MapPin className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{v.name}</p>
                <p className="truncate text-xs text-muted">{v.address ?? "Adres girilmedi"}</p>
              </div>
              <Badge className={v.is_active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-line bg-gray-100 text-gray-500"}>
                {v.is_active ? "Aktif" : "Pasif"}
              </Badge>
              <Link href={`/panel/sahalar/${v.id}`} className="btn-secondary btn-sm" aria-label={`${v.name} düzenle`}>
                <Pencil className="size-3.5" aria-hidden />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
