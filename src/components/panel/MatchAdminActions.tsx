"use client";

/**
 * Maç yönetim işlemleri: erteleme, iptal, hükmen sonuç, yayınlama, silme.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarOff, Eye, EyeOff, Gavel, Loader2, Trash2 } from "lucide-react";
import {
  cancelMatchAction, deleteMatchAction, forfeitMatchAction, postponeMatchAction,
} from "@/lib/actions/matches";
import { ConfirmButton, Modal } from "@/components/Modal";
import { ActionButton } from "@/components/forms";
import { createClient } from "@/utils/supabase/client";
import { FORFEIT_TYPE_LABELS } from "@/lib/labels";
import type { ActionResult, ForfeitType, Match } from "@/lib/types";

async function togglePublish(match: Match): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase
    .from("matches")
    .update({ is_published: !match.is_published })
    .eq("id", match.id);
  if (error) return { ok: false, message: `İşlem gerçekleştirilemedi: ${error.message}` };
  return { ok: true, message: match.is_published ? "Maç yayından kaldırıldı." : "Maç yayınlandı." };
}

export function MatchAdminActions({ match }: { match: Match }) {
  const router = useRouter();
  const [postponeOpen, setPostponeOpen] = useState(false);
  const [forfeitOpen, setForfeitOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Erteleme formu
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [reason, setReason] = useState("");
  const [makeAnnouncement, setMakeAnnouncement] = useState(true);

  // Hükmen formu
  const [forfeitType, setForfeitType] = useState<ForfeitType>("home_win");
  const [customScore, setCustomScore] = useState(false);
  const [fHome, setFHome] = useState(3);
  const [fAway, setFAway] = useState(0);
  const [forfeitReason, setForfeitReason] = useState("");

  async function doPostpone() {
    if (!reason.trim()) {
      toast.error("Erteleme sebebi yazılmalıdır.");
      return;
    }
    setBusy(true);
    try {
      const result = await postponeMatchAction(match.id, {
        new_date: newDate,
        new_time: newTime,
        reason,
        create_announcement: makeAnnouncement,
      });
      if (result.ok) {
        toast.success(result.message);
        setPostponeOpen(false);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function doForfeit() {
    setBusy(true);
    try {
      const result = await forfeitMatchAction(
        match.id,
        forfeitType,
        customScore ? { home: fHome, away: fAway } : undefined,
        forfeitReason || undefined
      );
      if (result.ok) {
        toast.success(result.message);
        setForfeitOpen(false);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">Maç İşlemleri</h2>
      <div className="flex flex-wrap gap-2">
        <ActionButton action={() => togglePublish(match)} className="btn-sm">
          {match.is_published ? <EyeOff className="size-3.5" aria-hidden /> : <Eye className="size-3.5" aria-hidden />}
          {match.is_published ? "Yayından Kaldır" : "Yayınla"}
        </ActionButton>

        <button type="button" className="btn-secondary btn-sm" onClick={() => setPostponeOpen(true)}>
          <CalendarOff className="size-3.5" aria-hidden />
          Ertele
        </button>

        <button type="button" className="btn-secondary btn-sm" onClick={() => setForfeitOpen(true)}>
          <Gavel className="size-3.5" aria-hidden />
          Hükmen Sonuç
        </button>

        <ConfirmButton
          action={async () => cancelMatchAction(match.id, "Yönetim kararıyla iptal edildi")}
          title="Maçı iptal et"
          description="Maç iptal edildi olarak işaretlenecek ve puan durumuna dahil edilmeyecek."
          confirmLabel="İptal Et"
          className="btn-sm"
        >
          Maçı İptal Et
        </ConfirmButton>

        <ConfirmButton
          action={deleteMatchAction.bind(null, match.id)}
          title="Maçı sil"
          description="Maç ve tüm olay kayıtları kalıcı olarak silinecek. Bu işlem geri alınamaz."
          confirmLabel="Kalıcı Olarak Sil"
          danger
          className="btn-sm"
        >
          <Trash2 className="size-3.5" aria-hidden />
          Sil
        </ConfirmButton>
      </div>

      {/* Erteleme modalı */}
      <Modal open={postponeOpen} onClose={() => !busy && setPostponeOpen(false)} title="Maçı Ertele">
        <div className="space-y-3">
          <p className="text-xs text-muted">
            Eski tarih ({match.match_date ?? "-"}) kayıtlarda saklanır. Yeni tarih belirlemezseniz maç
            &quot;Ertelendi&quot; durumunda bekler.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="label">Yeni tarih</span>
              <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="input" />
            </label>
            <label className="block">
              <span className="label">Yeni saat</span>
              <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="input" />
            </label>
          </div>
          <label className="block">
            <span className="label">Erteleme sebebi *</span>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="input min-h-16" placeholder="Örn. Olumsuz hava koşulları" />
          </label>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={makeAnnouncement} onChange={(e) => setMakeAnnouncement(e.target.checked)} className="size-4 accent-brand-700" />
            Otomatik duyuru oluştur ve yayınla
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-secondary" onClick={() => setPostponeOpen(false)} disabled={busy}>Vazgeç</button>
            <button type="button" className="btn-primary" onClick={doPostpone} disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Maçı Ertele
            </button>
          </div>
        </div>
      </Modal>

      {/* Hükmen modalı */}
      <Modal open={forfeitOpen} onClose={() => !busy && setForfeitOpen(false)} title="Hükmen Sonuç Ver">
        <div className="space-y-3">
          <label className="block">
            <span className="label">Hükmen türü</span>
            <select value={forfeitType} onChange={(e) => setForfeitType(e.target.value as ForfeitType)} className="input">
              {(Object.keys(FORFEIT_TYPE_LABELS) as ForfeitType[]).map((t) => (
                <option key={t} value={t}>{FORFEIT_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </label>

          {forfeitType !== "both_lose" && forfeitType !== "cancelled" && (
            <>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={customScore} onChange={(e) => setCustomScore(e.target.checked)} className="size-4 accent-brand-700" />
                Varsayılan skor yerine özel skor gir
              </label>
              {customScore && (
                <div className="flex items-center gap-2">
                  <input type="number" min={0} value={fHome} onChange={(e) => setFHome(Number(e.target.value))} className="input max-w-20 text-center" aria-label="Galip skoru" />
                  <span className="text-muted">-</span>
                  <input type="number" min={0} value={fAway} onChange={(e) => setFAway(Number(e.target.value))} className="input max-w-20 text-center" aria-label="Mağlup skoru" />
                  <span className="text-xs text-muted">(galip - mağlup)</span>
                </div>
              )}
            </>
          )}

          <label className="block">
            <span className="label">Karar açıklaması</span>
            <textarea value={forfeitReason} onChange={(e) => setForfeitReason(e.target.value)} rows={2} className="input min-h-16" placeholder="Örn. Rakip takım sahaya çıkmadı" />
          </label>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-secondary" onClick={() => setForfeitOpen(false)} disabled={busy}>Vazgeç</button>
            <button type="button" className="btn-primary" onClick={doForfeit} disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Hükmen Sonucu Kaydet
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
