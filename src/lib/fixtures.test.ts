import { describe, expect, it } from "vitest";
import { crossGroupPairs, generateFixture, roundRobinRounds } from "./fixtures";

const teams = (n: number) => Array.from({ length: n }, (_, i) => `T${i + 1}`);

describe("roundRobinRounds", () => {
  it("çift sayıda takımda n-1 tur ve her turda n/2 maç üretir", () => {
    const rounds = roundRobinRounds(teams(6));
    expect(rounds).toHaveLength(5);
    for (const round of rounds) expect(round).toHaveLength(3);
  });

  it("tek sayıda takımda bay uygular: n tur, her turda (n-1)/2 maç", () => {
    const rounds = roundRobinRounds(teams(7));
    expect(rounds).toHaveLength(7);
    for (const round of rounds) expect(round).toHaveLength(3);
  });

  it("her ikili tam olarak bir kez eşleşir", () => {
    const ids = teams(8);
    const seen = new Set<string>();
    for (const round of roundRobinRounds(ids)) {
      for (const p of round) {
        const key = [p.home, p.away].sort().join("-");
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    }
    expect(seen.size).toBe((8 * 7) / 2);
  });

  it("bir takım aynı turda iki kez oynamaz", () => {
    for (const round of roundRobinRounds(teams(9))) {
      const inRound = new Set<string>();
      for (const p of round) {
        expect(inRound.has(p.home)).toBe(false);
        expect(inRound.has(p.away)).toBe(false);
        inRound.add(p.home);
        inRound.add(p.away);
      }
    }
  });

  it("çift devrede maç sayısı iki katıdır ve ev/deplasman ters döner", () => {
    const single = roundRobinRounds(teams(4));
    const double = roundRobinRounds(teams(4), true);
    expect(double.flat()).toHaveLength(single.flat().length * 2);
    const firstLeg = double.slice(0, single.length).flat();
    const secondLeg = double.slice(single.length).flat();
    for (const p of firstLeg) {
      expect(
        secondLeg.some((q) => q.home === p.away && q.away === p.home)
      ).toBe(true);
    }
  });
});

describe("generateFixture", () => {
  const opts = {
    startDate: "2026-07-20", // Pazartesi
    matchDays: [1, 3, 6],    // Pzt, Çar, Cmt
    dailyMatchCount: 2,
    firstMatchTime: "18:00",
    matchDurationMin: 70,
    restBetweenMin: 20,
    venueIds: ["V1"],
    minTeamRestDays: 1,
    double: false,
  };

  it("tüm maçları yerleştirir ve saha çakışması olmaz", () => {
    const { matches, warnings } = generateFixture(
      [{ groupId: "G1", teamIds: teams(6) }],
      opts
    );
    expect(warnings).toHaveLength(0);
    expect(matches).toHaveLength(15); // C(6,2)
    const slotKeys = new Set(matches.map((m) => `${m.venueId}|${m.matchDate}|${m.startTime}`));
    expect(slotKeys.size).toBe(matches.length);
  });

  it("aynı takım aynı gün iki maç oynamaz", () => {
    const { matches } = generateFixture([{ groupId: "G1", teamIds: teams(7) }], opts);
    const perDay = new Set<string>();
    for (const m of matches) {
      for (const t of [m.homeTeamId, m.awayTeamId]) {
        const key = `${t}|${m.matchDate}`;
        expect(perDay.has(key)).toBe(false);
        perDay.add(key);
      }
    }
  });

  it("yalnızca seçilen günlere maç koyar ve saatleri doğru üretir", () => {
    const { matches } = generateFixture([{ groupId: "G1", teamIds: teams(4) }], opts);
    for (const m of matches) {
      const weekday = new Date(`${m.matchDate}T12:00:00Z`).getUTCDay();
      expect(opts.matchDays).toContain(weekday);
      expect(["18:00", "19:30"]).toContain(m.startTime); // 70 + 20 dk aralık
    }
  });

  it("minimum dinlenme gününe uyar", () => {
    const { matches } = generateFixture(
      [{ groupId: "G1", teamIds: teams(4) }],
      { ...opts, minTeamRestDays: 3, matchDays: [0, 1, 2, 3, 4, 5, 6], dailyMatchCount: 4 }
    );
    const lastDate = new Map<string, string>();
    for (const m of matches) {
      for (const t of [m.homeTeamId, m.awayTeamId]) {
        const last = lastDate.get(t);
        if (last) {
          const diff =
            (Date.parse(m.matchDate) - Date.parse(last)) / 86_400_000;
          expect(diff).toBeGreaterThanOrEqual(3);
        }
        lastDate.set(t, m.matchDate);
      }
    }
  });

  it("iki grubu ortak takvime yerleştirir", () => {
    const { matches } = generateFixture(
      [
        { groupId: "A", teamIds: ["A1", "A2", "A3", "A4"] },
        { groupId: "B", teamIds: ["B1", "B2", "B3", "B4"] },
      ],
      { ...opts, dailyMatchCount: 4 }
    );
    expect(matches).toHaveLength(12);
    expect(matches.filter((m) => m.groupId === "A")).toHaveLength(6);
    expect(matches.filter((m) => m.groupId === "B")).toHaveLength(6);
  });
});

describe("crossGroupPairs", () => {
  it("A1-B2 / B1-A2 çapraz eşleşmesini üretir", () => {
    const pairs = crossGroupPairs([
      { groupName: "A Grubu", qualifiers: ["A1", "A2"] },
      { groupName: "B Grubu", qualifiers: ["B1", "B2"] },
    ]);
    expect(pairs).toEqual([
      { home: "A1", away: "B2", label: "A Grubu 1. - B Grubu 2." },
      { home: "B1", away: "A2", label: "B Grubu 1. - A Grubu 2." },
    ]);
  });
});
