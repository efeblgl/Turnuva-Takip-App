import { createClient } from "@/utils/supabase/server";
import { requireRole, ROLES_MANAGE_USERS } from "@/lib/auth";
import { UserManager } from "@/components/panel/UserManager";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PanelUsersPage() {
  const session = await requireRole(ROLES_MANAGE_USERS);
  const supabase = await createClient();

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Kullanıcılar</h1>
        <p className="mt-0.5 text-sm text-muted">
          Halka açık kayıt yoktur; panel kullanıcıları yalnızca buradan oluşturulur.
        </p>
      </div>
      <UserManager
        profiles={(data as Profile[] | null) ?? []}
        currentUserId={session.userId}
      />
    </div>
  );
}
