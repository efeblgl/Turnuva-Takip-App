"use client";

/**
 * Grup yönetimi: grup ekleme/düzenleme ve takımların gruplara dağıtımı.
 * Rastgele dağıtım önce ÖN İZLEME olarak gösterilir; onaylanmadan kaydedilmez
 * (şartname madde 16).
 */
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Shuffle, Trash2 } from "lucide-react";
import {
  assignTeamsToGroupsAction, deleteGroupAction, saveGroupAction,
} from "@/lib/actions/structure";
import { SubmitButton, useActionForm } from "@/components/forms";
import { ConfirmButton, Modal } from "@/components/Modal";
import { Field } from "@/components/ui";
import { shuffle } from "@/lib/fixtures";
import { cn, compareTr } from "@/lib/utils";
import type { Group, Team } from "@/lib/types";

function GroupForm({
  tournamentId,
  group,
  onDone,
}: {
  tournamentId: string;
  group?: Group;
  onDone?: () => void;
}) {
  const form = useActionForm(saveGroupAction);
  return (
    <form
      action={form.formAction}
      className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto_auto]"
      onSubmit={() => onDone?.()}
    >
      <input type="hidden" name="id" value={group?.id ?? ""} />
      <input type="hidden" name="tournament_id" value={tournamentId} />
      <Field label="Grup adı" htmlFor={`gname-${group?.id ?? "new"}`} required error={form.errors.name}>
        <input id={`gname-${group?.id ?? "new"}`} name="name" required defaultValue={group?.name ?? ""} className="input" placeholder="Örn. A Grubu" />
      </Field>
      <Field label="Kısa ad" htmlFor={`gshort-${group?.id ?? "new"}`}>
        <input id={`gshort-${group?.id ?? "new"}`} name="short_name" defaultValue={group?.short_name ?? ""} className="input w-20" maxLength={3} />
      </Field>
      <Field label="Renk" htmlFor={`gcolor-${group?.id ?? "new"}`}>
        <input id={`gcolor-${group?.id ?? "new"}`} name="color" type="color" defaultValue={group?.color ?? "#2563EB"} className="h-11 w-14 rounded-lg border border-line p-1" />
      </Field>
      <Field label="Tur atlayan" htmlFor={`gqual-${group?.id ?? "new"}`}>
        <input id={`gqual-${group?.id ?? "new"}`} name="qualification_count" type="number" min={0} max={10} defaultValue={group?.qualification_count ?? 2} className="input w-20" />
      </Field>
      <input type="hidden" name="sort_order" value={group?.sort_order ?? 0} />
      <div className="flex items-end">
        <SubmitButton pendingText="...">{group ? "Kaydet" : <><Plus className="size-4" aria-hidden />Ekle</>}</SubmitButton>
      </div>
    </form>
  );
}

export function GroupsManager({
  tournamentId,
  groups,
  teams,
}: {
  tournamentId: string;
  groups: Group[];
  teams: Team[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Group | null>(null);
  // Taslak atamalar: takım -> grup (önizleme; kaydedilene dek veri tabanına yazılmaz)
  const [draft, setDraft] = useState<Map<string, string | null> | null>(null);
  const [saving, setSaving] = useState(false);

  const activeTeams = useMemo(
    () => [...teams].sort((a, b) => compareTr(a.name, b.name)),
    [teams]
  );

  const assignmentOf = (teamId: string): string | null => {
    if (draft?.has(teamId)) return draft.get(teamId) ?? null;
    return activeTeams.find((t) => t.id === teamId)?.group_id ?? null;
  };

  function setAssignment(teamId: string, groupId: string | null) {
    const next = new Map(draft ?? []);
    next.set(teamId, groupId);
    setDraft(next);
  }

  function randomDistribute() {
    if (groups.length === 0) {
      toast.error("Önce en az bir grup oluşturun.");
      return;
    }
    const shuffled = shuffle(activeTeams.map((t) => t.id));
    const next = new Map<string, string | null>();
    shuffled.forEach((teamId, index) => {
      next.set(teamId, groups[index % groups.length].id);
    });
    setDraft(next);
    toast.info("Rastgele dağıtım hazırlandı. Kaydetmeden önce kontrol edin.");
  }

  async function saveDraft() {
    if (!draft || draft.size === 0) return;
    setSaving(true);
    try {
      const result = await assignTeamsToGroupsAction(
        [...draft.entries()].map(([teamId, groupId]) => ({ teamId, groupId }))
      );
      if (result.ok) {
        toast.success(result.message);
        setDraft(null);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } finally {
      setSaving(false);
    }
  }

  const hasDraft = draft !== null && draft.size > 0;

  return (
    <div className="space-y-5">
      {/* Grup oluşturma */}
      <section className="card">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">Yeni Grup</h2>
        <GroupForm tournamentId={tournamentId} />
      </section>

      {/* Mevcut gruplar */}
      <section className="grid gap-3 md:grid-cols-2">
        {groups.map((group) => {
          const groupTeams = activeTeams.filter((t) => assignmentOf(t.id) === group.id);
          return (
            <div key={group.id} className="card">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-sm font-bold">
                  <span aria-hidden className="size-3 rounded-full" style={{ backgroundColor: group.color ?? "#64748B" }} />
                  {group.name}
                  <span className="text-xs font-normal text-muted">({groupTeams.length} takım)</span>
                </p>
                <div className="flex gap-1">
                  <button type="button" className="btn-ghost btn-sm" onClick={() => setEditing(group)} aria-label={`${group.name} düzenle`}>
                    <Pencil className="size-3.5" aria-hidden />
                  </button>
                  <ConfirmButton
                    action={deleteGroupAction.bind(null, group.id)}
                    title="Grubu sil"
                    description={`${group.name} silinecek. Grupta takım varsa silme işlemi engellenir.`}
                    confirmLabel="Sil"
                    danger
                    className="btn-sm !bg-transparent !text-red-600 hover:!bg-red-50"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </ConfirmButton>
                </div>
              </div>
              {groupTeams.length === 0 ? (
                <p className="py-2 text-xs text-muted">Bu grupta takım yok.</p>
              ) : (
                <ul className="space-y-1">
                  {groupTeams.map((t) => (
                    <li key={t.id} className="flex items-center gap-2 text-sm">
                      <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: t.primary_color ?? "#94A3B8" }} />
                      <span className="min-w-0 flex-1 truncate">{t.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </section>

      {/* Takım dağıtımı */}
      <section className="card space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">Takım Dağıtımı</h2>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary btn-sm" onClick={randomDistribute}>
              <Shuffle className="size-3.5" aria-hidden />
              Rastgele Dağıt
            </button>
            {hasDraft && (
              <>
                <button type="button" className="btn-ghost btn-sm" onClick={() => setDraft(null)}>
                  Vazgeç
                </button>
                <button type="button" className="btn-primary btn-sm" onClick={saveDraft} disabled={saving}>
                  {saving && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
                  Dağıtımı Kaydet
                </button>
              </>
            )}
          </div>
        </div>

        {hasDraft && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Ön izleme modundasınız: değişiklikler &quot;Dağıtımı Kaydet&quot; düğmesine basana kadar kaydedilmez.
          </p>
        )}

        <div className="grid gap-1.5 sm:grid-cols-2">
          {activeTeams.map((team) => {
            const current = assignmentOf(team.id);
            const changed = draft?.has(team.id) && (draft.get(team.id) ?? null) !== (team.group_id ?? null);
            return (
              <div key={team.id} className={cn("flex items-center gap-2 rounded-xl border px-3 py-2", changed ? "border-amber-300 bg-amber-50" : "border-line")}>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{team.name}</span>
                <select
                  className="input !min-h-9 max-w-36 !py-1 text-xs"
                  value={current ?? ""}
                  onChange={(e) => setAssignment(team.id, e.target.value || null)}
                  aria-label={`${team.name} grubu`}
                >
                  <option value="">Grupsuz</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </section>

      {/* Grup düzenleme modalı */}
      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Grubu Düzenle" wide>
        {editing && (
          <GroupForm tournamentId={tournamentId} group={editing} onDone={() => setEditing(null)} />
        )}
      </Modal>
    </div>
  );
}
