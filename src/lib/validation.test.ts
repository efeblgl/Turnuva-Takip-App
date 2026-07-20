import { describe, expect, it } from "vitest";
import { scoreEntrySchema } from "./validation";

// Skor girişi payload'ı ScoreEntry bileşeninin gönderdiği biçimde: boş alanlar
// "" değil null gelir. Şemanın null'ları kabul etmesi zorunludur (aksi halde
// hiçbir skor kaydedilemez — 2026-07-18'de yaşanan hata).
const basePayload = {
  home_score: 2,
  away_score: 1,
  home_penalty_score: null,
  away_penalty_score: null,
  status: "completed",
  referee_name: null,
  assistant_referees: null,
  notes: null,
  events: [] as unknown[],
};

describe("scoreEntrySchema", () => {
  it("null metin/penaltı alanlarıyla skoru kabul eder", () => {
    const r = scoreEntrySchema.safeParse(basePayload);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.home_penalty_score).toBeNull();
      expect(r.data.away_penalty_score).toBeNull();
      expect(r.data.referee_name).toBeNull();
    }
  });

  it("null oyuncu/dakika alanlı olayları kabul eder", () => {
    const r = scoreEntrySchema.safeParse({
      ...basePayload,
      events: [
        {
          team_id: "a0000000-0000-4000-8000-000000000001",
          player_id: null,
          secondary_player_id: null,
          event_type: "goal",
          minute: null,
          extra_minute: null,
          description: null,
        },
      ],
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.events[0].player_id).toBeNull();
      expect(r.data.events[0].minute).toBeNull();
    }
  });

  it("canlı durumları (in_progress vb.) kabul eder", () => {
    const r = scoreEntrySchema.safeParse({ ...basePayload, status: "in_progress" });
    expect(r.success).toBe(true);
  });

  it("negatif skoru reddeder", () => {
    const r = scoreEntrySchema.safeParse({ ...basePayload, home_score: -1 });
    expect(r.success).toBe(false);
  });

  it("uygunsuz durumda penaltı skorunu reddeder", () => {
    const r = scoreEntrySchema.safeParse({
      ...basePayload,
      status: "in_progress",
      home_penalty_score: 4,
      away_penalty_score: 2,
    });
    expect(r.success).toBe(false);
  });
});
