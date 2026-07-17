import { describe, expect, it } from "vitest";
import {
  computeStandings,
  type StandingsMatchInput,
  type StandingsTeamInput,
} from "./standings";

const team = (id: string, extra?: Partial<StandingsTeamInput>): StandingsTeamInput => ({
  id,
  name: id,
  yellowCards: 0,
  redCards: 0,
  deductedPoints: 0,
  ...extra,
});

const match = (
  home: string, away: string, hs: number, as: number,
  extra?: Partial<StandingsMatchInput>
): StandingsMatchInput => ({
  homeTeamId: home,
  awayTeamId: away,
  homeScore: hs,
  awayScore: as,
  matchDate: "2026-07-11",
  isForfeit: false,
  forfeitType: null,
  ...extra,
});

describe("computeStandings", () => {
  it("galibiyet 3, beraberlik 1 puan verir; O/G/B/M/A/Y doğru sayılır", () => {
    const rows = computeStandings(
      [team("A"), team("B"), team("C")],
      [match("A", "B", 2, 1), match("A", "C", 1, 1)]
    );
    const a = rows.find((r) => r.teamId === "A")!;
    expect(a.rank).toBe(1);
    expect(a).toMatchObject({
      played: 2, won: 1, drawn: 1, lost: 0,
      goalsFor: 3, goalsAgainst: 2, goalDifference: 1, points: 4,
    });
    const b = rows.find((r) => r.teamId === "B")!;
    expect(b).toMatchObject({ played: 1, lost: 1, points: 0 });
  });

  it("eşit puanda averaj, sonra atılan gol belirler", () => {
    const rows = computeStandings(
      [team("A"), team("B"), team("C"), team("D")],
      [
        match("A", "C", 3, 0), // A: +3, 3 gol
        match("B", "D", 4, 1), // B: +3, 4 gol -> B üstte
      ]
    );
    expect(rows.map((r) => r.teamId).slice(0, 2)).toEqual(["B", "A"]);
  });

  it("ikili averaj: puan/averaj/gol eşitken aralarındaki maçların averajı belirler", () => {
    // A ve B genel tabloda tamamen eşit (P6, AV +2, atılan 4).
    // Aralarındaki iki maçta A toplamda 2-1 üstün -> A üstte olmalı.
    const rows = computeStandings(
      [team("A"), team("B"), team("C")],
      [
        match("A", "B", 2, 0), // ikili: A +2
        match("B", "A", 1, 0), // ikili: B +1 -> ikili averaj A +1, B -1
        match("A", "C", 2, 1),
        match("B", "C", 3, 0),
      ]
    );
    // Genel: A P6 GF4 GA2, B P6 GF4 GA2 -> puan/averaj/gol eşit -> ikili averaj A'yı öne çıkarır
    expect(rows.map((r) => r.teamId)).toEqual(["A", "B", "C"]);
  });

  it("üç takımlı eşitlikte mini lig tablosu kurar", () => {
    // A, B, C genel tabloda tamamen eşit: P6, GF6, GA3.
    // Aralarındaki maçlardan kurulan mini ligde: A +2, C 0, B -2.
    const rows = computeStandings(
      [team("A"), team("B"), team("C"), team("D")],
      [
        match("A", "B", 3, 0), // mini lig: A güçlü
        match("B", "C", 1, 0),
        match("C", "A", 1, 0),
        // D'ye karşı sonuçlar genel toplamları eşitler
        match("A", "D", 3, 2),
        match("B", "D", 5, 0),
        match("C", "D", 5, 2),
      ]
    );
    // Genel: hepsi P6, AV +3, atılan 6 -> mini lig averajı: A +2 > C 0 > B -2
    expect(rows.map((r) => r.teamId)).toEqual(["A", "C", "B", "D"]);
  });

  it("hükmen 'iki takım mağlup' iki tarafa da mağlubiyet yazar", () => {
    const rows = computeStandings(
      [team("A"), team("B")],
      [match("A", "B", 0, 0, { isForfeit: true, forfeitType: "both_lose" })]
    );
    for (const r of rows) {
      expect(r).toMatchObject({ played: 1, lost: 1, points: 0, goalsAgainst: 3 });
    }
  });

  it("puan silme cezası toplam puandan düşülür", () => {
    const rows = computeStandings(
      [team("A", { deductedPoints: 3 }), team("B")],
      [match("A", "B", 1, 0), match("B", "A", 0, 2)]
    );
    const a = rows.find((r) => r.teamId === "A")!;
    expect(a.points).toBe(3); // 6 - 3
    expect(a.deductedPoints).toBe(3);
  });

  it("form son 5 maçı eskiden yeniye listeler", () => {
    const rows = computeStandings(
      [team("A"), team("B")],
      [
        match("A", "B", 1, 0, { matchDate: "2026-07-01" }),
        match("B", "A", 2, 2, { matchDate: "2026-07-05" }),
        match("A", "B", 0, 1, { matchDate: "2026-07-09" }),
      ]
    );
    const a = rows.find((r) => r.teamId === "A")!;
    expect(a.form).toEqual(["G", "B", "M"]);
  });
});
