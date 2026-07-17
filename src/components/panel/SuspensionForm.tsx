"use client";

import { useState } from "react";
import { saveSuspensionAction } from "@/lib/actions/content";
import { SubmitButton, useActionForm } from "@/components/forms";
import { Field } from "@/components/ui";
import { SUSPENSION_TYPE_LABELS } from "@/lib/labels";
import type { Suspension, SuspensionType } from "@/lib/types";

interface PlayerOption {
  id: string;
  full_name: string;
  team_id: string;
}

export function SuspensionForm({
  tournamentId,
  teams,
  players,
  suspension,
}: {
  tournamentId: string;
  teams: Array<{ id: string; name: string }>;
  players: PlayerOption[];
  suspension?: Suspension;
}) {
  const form = useActionForm(saveSuspensionAction, { redirectTo: "/panel/cezalar" });
  const e = form.errors;
  const [teamId, setTeamId] = useState(
    suspension?.team_id ?? (suspension?.player_id ? players.find((p) => p.id === suspension.player_id)?.team_id ?? "" : "")
  );
  const [type, setType] = useState<SuspensionType>(suspension?.suspension_type ?? "one_match");

  const teamPlayers = players.filter((p) => p.team_id === teamId);
  const needsMatches = type === "one_match" || type === "multi_match";
  const needsDates = type === "until_date";
  const needsPoints = type === "point_deduction";

  return (
    <form action={form.formAction} className="card space-y-4">
      <input type="hidden" name="id" value={suspension?.id ?? ""} />
      <input type="hidden" name="tournament_id" value={tournamentId} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Ceza türü" htmlFor="suspension_type" required error={e.suspension_type}>
          <select
            id="suspension_type"
            name="suspension_type"
            value={type}
            onChange={(ev) => setType(ev.target.value as SuspensionType)}
            className="input"
          >
            {(Object.keys(SUSPENSION_TYPE_LABELS) as SuspensionType[]).map((t) => (
              <option key={t} value={t}>{SUSPENSION_TYPE_LABELS[t]}</option>
            ))}
          </select>
        </Field>
        <Field label="Takım" htmlFor="team_id" error={e.team_id} hint="Takım cezasında oyuncu boş bırakılabilir.">
          <select
            id="team_id"
            name="team_id"
            value={teamId}
            onChange={(ev) => setTeamId(ev.target.value)}
            className="input"
          >
            <option value="">Takım seçin</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Field>
        <Field label="Oyuncu" htmlFor="player_id" error={e.player_id}>
          <select id="player_id" name="player_id" defaultValue={suspension?.player_id ?? ""} className="input">
            <option value="">Oyuncu seçilmedi (takım cezası)</option>
            {teamPlayers.map((p) => (
              <option key={p.id} value={p.id}>{p.full_name}</option>
            ))}
          </select>
        </Field>
        {needsMatches && (
          <Field label="Toplam ceza (maç)" htmlFor="total_matches" error={e.total_matches}>
            <input
              id="total_matches" name="total_matches" type="number" min={1} max={99}
              defaultValue={suspension?.total_matches ?? (type === "one_match" ? 1 : 2)}
              className="input"
            />
          </Field>
        )}
        {needsPoints && (
          <Field label="Silinecek puan" htmlFor="penalty_points" error={e.penalty_points}>
            <input id="penalty_points" name="penalty_points" type="number" min={1} max={99} defaultValue={suspension?.penalty_points ?? 3} className="input" />
          </Field>
        )}
        <Field label="Karar tarihi" htmlFor="decision_date" error={e.decision_date} hint="Kalan maç sayısı bu tarihten sonraki maçlara göre hesaplanır.">
          <input id="decision_date" name="decision_date" type="date" defaultValue={suspension?.decision_date ?? ""} className="input" />
        </Field>
        {needsDates && (
          <>
            <Field label="Ceza başlangıcı" htmlFor="start_date" error={e.start_date}>
              <input id="start_date" name="start_date" type="date" defaultValue={suspension?.start_date ?? ""} className="input" />
            </Field>
            <Field label="Ceza bitişi" htmlFor="end_date" error={e.end_date}>
              <input id="end_date" name="end_date" type="date" defaultValue={suspension?.end_date ?? ""} className="input" />
            </Field>
          </>
        )}
      </div>

      <Field label="Ceza sebebi" htmlFor="reason" error={e.reason}>
        <input id="reason" name="reason" defaultValue={suspension?.reason ?? ""} className="input" placeholder="Örn. Direkt kırmızı kart" />
      </Field>
      <Field label="İç not" htmlFor="notes" error={e.notes} hint="Halka açık sitede gösterilmez.">
        <textarea id="notes" name="notes" rows={2} defaultValue={suspension?.notes ?? ""} className="input min-h-16" />
      </Field>

      <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
        <input type="checkbox" name="is_active" defaultChecked={suspension?.is_active ?? true} className="size-4 accent-brand-700" />
        Ceza aktif
      </label>

      <div className="flex justify-end">
        <SubmitButton>{suspension ? "Cezayı Güncelle" : "Cezayı Kaydet"}</SubmitButton>
      </div>
    </form>
  );
}
