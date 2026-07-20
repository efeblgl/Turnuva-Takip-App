import { describe, expect, it } from "vitest";
import { isMatchLiveNow, selectLiveMatches } from "./live";

const TODAY = "2026-07-18";

const m = (status: string, start_time: string | null, match_date: string | null = TODAY) =>
  ({ status, start_time, match_date }) as Parameters<typeof isMatchLiveNow>[0];

describe("isMatchLiveNow", () => {
  it("canlı durumdaki maç her zaman canlıdır", () => {
    expect(isMatchLiveNow(m("in_progress", "19:00:00"), TODAY, "19:10")).toBe(true);
    expect(isMatchLiveNow(m("second_half", "19:00:00"), TODAY, "20:05")).toBe(true);
  });

  it("planlı maç saati gelince canlı sayılır", () => {
    expect(isMatchLiveNow(m("scheduled", "19:00:00"), TODAY, "18:59")).toBe(false);
    expect(isMatchLiveNow(m("scheduled", "19:00:00"), TODAY, "19:00")).toBe(true);
    expect(isMatchLiveNow(m("scheduled", "19:00:00"), TODAY, "20:30")).toBe(true);
  });

  it("canlılık penceresi dolunca planlı maç canlıdan düşer", () => {
    expect(isMatchLiveNow(m("scheduled", "19:00:00"), TODAY, "20:51")).toBe(false);
  });

  it("saat 20:00'de ikinci maç da canlıya girer", () => {
    expect(isMatchLiveNow(m("scheduled", "20:00:00"), TODAY, "20:00")).toBe(true);
  });

  it("başka günün maçı canlı olmaz", () => {
    expect(isMatchLiveNow(m("scheduled", "19:00:00", "2026-07-19"), TODAY, "19:30")).toBe(false);
  });

  it("geçmiş tarihli maç, durumu canlıda unutulsa bile canlı sayılmaz", () => {
    expect(isMatchLiveNow(m("second_half", "19:00:00", "2026-07-17"), TODAY, "19:30")).toBe(false);
    expect(isMatchLiveNow(m("in_progress", "19:00:00", TODAY), TODAY, "19:30")).toBe(true);
  });

  it("tamamlanan/iptal maç canlı olmaz", () => {
    expect(isMatchLiveNow(m("completed", "19:00:00"), TODAY, "19:30")).toBe(false);
    expect(isMatchLiveNow(m("cancelled", "19:00:00"), TODAY, "19:30")).toBe(false);
  });
});

const lm = (
  id: string,
  status: string,
  start_time: string | null,
  venue_id: string | null = "v1",
  match_date: string | null = TODAY
) => ({ id, status, start_time, venue_id, match_date }) as Parameters<typeof selectLiveMatches>[0][number];

describe("selectLiveMatches", () => {
  it("saati gelen maç canlıya girer, saati gelmeyen girmez", () => {
    const matches = [lm("a", "scheduled", "20:00:00"), lm("b", "scheduled", "21:00:00")];
    expect(selectLiveMatches(matches, TODAY, "20:30").map((x) => x.id)).toEqual(["a"]);
  });

  it("sonraki maçın saati gelince önceki maç düşer, yenisi girer", () => {
    const matches = [lm("a", "scheduled", "20:00:00"), lm("b", "scheduled", "21:00:00")];
    expect(selectLiveMatches(matches, TODAY, "21:00").map((x) => x.id)).toEqual(["b"]);
    expect(selectLiveMatches(matches, TODAY, "21:45").map((x) => x.id)).toEqual(["b"]);
  });

  it("durumu canlıya çekilmiş maç, sonraki maç başlasa da düşmez", () => {
    const matches = [lm("a", "second_half", "20:00:00"), lm("b", "scheduled", "21:00:00")];
    expect(selectLiveMatches(matches, TODAY, "21:05").map((x) => x.id)).toEqual(["a", "b"]);
  });

  it("farklı sahadaki maçlar birbirinin penceresini kapatmaz", () => {
    const matches = [lm("a", "scheduled", "20:00:00", "v1"), lm("b", "scheduled", "20:30:00", "v2")];
    expect(selectLiveMatches(matches, TODAY, "20:45").map((x) => x.id)).toEqual(["a", "b"]);
  });

  it("iptal/ertelenen sonraki maç öncekinin penceresini kapatmaz", () => {
    const matches = [lm("a", "scheduled", "20:00:00"), lm("b", "cancelled", "21:00:00")];
    expect(selectLiveMatches(matches, TODAY, "21:10").map((x) => x.id)).toEqual(["a"]);
  });

  it("tamamlanan maç canlı listeye girmez ama sonrakinin penceresini kapatır", () => {
    const matches = [lm("a", "scheduled", "20:00:00"), lm("b", "completed", "21:00:00")];
    expect(selectLiveMatches(matches, TODAY, "21:10").map((x) => x.id)).toEqual([]);
  });

  it("son maç, sonraki maç yoksa pencere süresi kadar canlı kalır", () => {
    const matches = [lm("a", "scheduled", "20:00:00")];
    expect(selectLiveMatches(matches, TODAY, "21:45").map((x) => x.id)).toEqual(["a"]);
    expect(selectLiveMatches(matches, TODAY, "21:51").map((x) => x.id)).toEqual([]);
  });
});
