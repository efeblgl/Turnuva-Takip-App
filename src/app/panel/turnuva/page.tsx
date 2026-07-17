import { createClient } from "@/utils/supabase/server";
import { getAdminTournament } from "@/lib/queries";
import { requireRole, ROLES_MANAGE_TOURNAMENT } from "@/lib/auth";
import { TournamentForm } from "@/components/panel/TournamentForm";

export const dynamic = "force-dynamic";

export default async function TournamentSettingsPage() {
  await requireRole(ROLES_MANAGE_TOURNAMENT);
  const supabase = await createClient();
  const tournament = await getAdminTournament(supabase);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Turnuva Ayarları</h1>
        {!tournament && (
          <p className="mt-0.5 text-sm text-muted">
            Henüz turnuva yok; aşağıdaki formu doldurarak oluşturun.
          </p>
        )}
      </div>
      <TournamentForm tournament={tournament ?? undefined} />
    </div>
  );
}
