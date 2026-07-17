import { createClient } from "@/utils/supabase/server";
import { requireRole, ROLES_VIEW_AUDIT } from "@/lib/auth";
import { Badge, EmptyState } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";
import type { AuditLog, Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

const ACTION_LABELS: Record<string, { label: string; className: string }> = {
  INSERT: { label: "Ekleme", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  UPDATE: { label: "Güncelleme", className: "border-blue-200 bg-blue-50 text-blue-700" },
  DELETE: { label: "Silme", className: "border-red-200 bg-red-50 text-red-700" },
};

const TABLE_LABELS: Record<string, string> = {
  tournaments: "Turnuva", teams: "Takım", players: "Oyuncu", groups: "Grup",
  matches: "Maç", match_events: "Maç olayı", suspensions: "Ceza",
  announcements: "Duyuru", profiles: "Kullanıcı", settings: "Ayar", venues: "Saha",
};

function summarize(log: AuditLog): string {
  const source = (log.new_data ?? log.old_data) as Record<string, unknown> | null;
  if (!source) return "";
  const name =
    (source["name"] as string | undefined) ??
    (source["full_name"] as string | undefined) ??
    (source["title"] as string | undefined) ??
    (source["setting_key"] as string | undefined) ??
    (source["email"] as string | undefined);
  if (name) return name;
  if (log.table_name === "matches") {
    const hs = source["home_score"];
    const as = source["away_score"];
    if (hs !== null && hs !== undefined) return `Skor: ${hs}-${as}`;
  }
  return "";
}

export default async function AuditLogPage() {
  await requireRole(ROLES_VIEW_AUDIT);
  const supabase = await createClient();

  const [logsRes, profilesRes] = await Promise.all([
    supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(150),
    supabase.from("profiles").select("id, full_name, email"),
  ]);
  const logs = (logsRes.data as AuditLog[] | null) ?? [];
  const profiles = new Map(
    ((profilesRes.data as Pick<Profile, "id" | "full_name" | "email">[] | null) ?? []).map((p) => [
      p.id,
      p.full_name ?? p.email,
    ])
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">İşlem Geçmişi</h1>
        <p className="mt-0.5 text-sm text-muted">Son 150 işlem; eski ve yeni veriler kayıt altındadır.</p>
      </div>

      {logs.length === 0 ? (
        <EmptyState title="Henüz işlem kaydı yok" />
      ) : (
        <div className="card divide-y divide-line p-0">
          {logs.map((log) => {
            const action = ACTION_LABELS[log.action_type] ?? { label: log.action_type, className: "" };
            const summary = summarize(log);
            return (
              <details key={log.id} className="group">
                <summary className="flex cursor-pointer flex-wrap items-center gap-2 px-4 py-2.5 hover:bg-gray-50">
                  <Badge className={action.className}>{action.label}</Badge>
                  <span className="text-sm font-semibold">{TABLE_LABELS[log.table_name] ?? log.table_name}</span>
                  {summary && <span className="min-w-0 flex-1 truncate text-sm text-muted">{summary}</span>}
                  {!summary && <span className="flex-1" />}
                  <span className="text-xs text-muted">
                    {log.user_id ? profiles.get(log.user_id) ?? "Sistem" : "Sistem"} · {formatDateTime(log.created_at)}
                  </span>
                </summary>
                <div className="grid gap-2 bg-gray-50/60 px-4 py-3 text-xs lg:grid-cols-2">
                  <div>
                    <p className="mb-1 font-semibold text-muted">Eski veri</p>
                    <pre className="max-h-48 overflow-auto rounded-lg bg-white p-2 font-mono text-[11px] leading-relaxed">
                      {log.old_data ? JSON.stringify(log.old_data, null, 1) : "-"}
                    </pre>
                  </div>
                  <div>
                    <p className="mb-1 font-semibold text-muted">Yeni veri</p>
                    <pre className="max-h-48 overflow-auto rounded-lg bg-white p-2 font-mono text-[11px] leading-relaxed">
                      {log.new_data ? JSON.stringify(log.new_data, null, 1) : "-"}
                    </pre>
                  </div>
                </div>
              </details>
            );
          })}
        </div>
      )}
    </div>
  );
}
