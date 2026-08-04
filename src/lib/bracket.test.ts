import { describe, expect, it } from "vitest";
import { buildKnockoutBracket, determineMatchWinner, otherKnockoutMatches, winnerTeamId } from "./bracket";
import type { Match, MatchStatus } from "./types";

let seq = 0;
function m(overrides: Partial<Match> = {}): Match {
  seq += 1;
  return {
    id: overrides.id ?? `m${seq}`,
    tournament_id: "t1",
    group_id: null,
    venue_id: null,
    home_team_id: null,
    away_team_id: null,
    home_score: null,
    away_score: null,
    home_penalty_score: null,
    away_penalty_score: null,
    stage: "knockout",
    round_name: null,
    knockout_round: null,
    bracket_position: null,
    next_match_id: null,
    next_match_slot: null,
    loser_next_match_id: null,
    loser_next_match_slot: null,
    week_number: null,
    match_date: null,
    start_time: null,
    end_time: null,
    status: "scheduled",
    referee_name: null,
    assistant_referees: null,
    notes: null,
    is_forfeit: false,
    forfeit_type: null,
    original_match_date: null,
    postponement_reason: null,
    is_published: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

/** Tam 15 maçlık bir Son 16 -> Final ağacı üretir (takımsız, yer tutucu). */
function fullBracket(): Match[] {
  const matches: Match[] = [];
  for (let pos = 1; pos <= 8; pos++) {
    matches.push(m({ id: `r16-${pos}`, knockout_round: "round_of_16", bracket_position: pos }));
  }
  for (let pos = 1; pos <= 4; pos++) {
    matches.push(m({ id: `qf-${pos}`, knockout_round: "quarter_final", bracket_position: pos }));
  }
  for (let pos = 1; pos <= 2; pos++) {
    matches.push(m({ id: `sf-${pos}`, knockout_round: "semi_final", bracket_position: pos }));
  }
  matches.push(m({ id: "final", knockout_round: "final", bracket_position: 1 }));
  return matches;
}

describe("buildKnockoutBracket", () => {
  it("15 maçlık tam veriyi doğru taraflara ve turlara yerleştirir", () => {
    const bracket = buildKnockoutBracket(fullBracket());
    expect(bracket.hasAnyMatch).toBe(true);
    expect(bracket.left.roundOf16.map((c) => c.match?.id)).toEqual(["r16-1", "r16-2", "r16-3", "r16-4"]);
    expect(bracket.right.roundOf16.map((c) => c.match?.id)).toEqual(["r16-5", "r16-6", "r16-7", "r16-8"]);
    expect(bracket.left.quarterFinals.map((c) => c.match?.id)).toEqual(["qf-1", "qf-2"]);
    expect(bracket.right.quarterFinals.map((c) => c.match?.id)).toEqual(["qf-3", "qf-4"]);
    expect(bracket.left.semiFinal.match?.id).toBe("sf-1");
    expect(bracket.right.semiFinal.match?.id).toBe("sf-2");
    expect(bracket.final.match?.id).toBe("final");
  });

  it("yalnızca Son 16 maçları oluşturulduysa diğer turlar yer tutucu kalır", () => {
    const matches = Array.from({ length: 8 }, (_, i) =>
      m({ id: `r16-${i + 1}`, knockout_round: "round_of_16", bracket_position: i + 1 })
    );
    const bracket = buildKnockoutBracket(matches);
    expect(bracket.hasAnyMatch).toBe(true);
    expect(bracket.left.roundOf16.every((c) => c.match !== null)).toBe(true);
    expect(bracket.left.quarterFinals.every((c) => c.match === null)).toBe(true);
    expect(bracket.right.quarterFinals.every((c) => c.match === null)).toBe(true);
    expect(bracket.left.semiFinal.match).toBeNull();
    expect(bracket.final.match).toBeNull();
  });

  it("bazı maçlar hiç yoksa hata vermeden yer tutucu bırakır", () => {
    const matches = [
      m({ id: "r16-1", knockout_round: "round_of_16", bracket_position: 1 }),
      m({ id: "r16-6", knockout_round: "round_of_16", bracket_position: 6 }),
    ];
    const bracket = buildKnockoutBracket(matches);
    expect(bracket.left.roundOf16[0].match?.id).toBe("r16-1");
    expect(bracket.left.roundOf16[1].match).toBeNull();
    expect(bracket.right.roundOf16[1].match?.id).toBe("r16-6");
  });

  it("hiç eleme maçı yoksa hasAnyMatch false döner", () => {
    expect(buildKnockoutBracket([]).hasAnyMatch).toBe(false);
  });

  it("eleme dışı (grup) maçları yok sayar", () => {
    const bracket = buildKnockoutBracket([m({ stage: "group", knockout_round: null })]);
    expect(bracket.hasAnyMatch).toBe(false);
  });

  it("geçersiz/eksik bracket_position değerini güvenle yok sayar", () => {
    const matches = [
      m({ id: "bad", knockout_round: "round_of_16", bracket_position: null }),
      m({ id: "bad2", knockout_round: "round_of_16", bracket_position: 99 }),
    ];
    const bracket = buildKnockoutBracket(matches);
    expect(bracket.left.roundOf16.every((c) => c.match === null)).toBe(true);
    expect(bracket.right.roundOf16.every((c) => c.match === null)).toBe(true);
  });

  it("aynı bracket konumunda iki kayıt varsa ilkini kullanır, kırılmaz", () => {
    const matches = [
      m({ id: "first", knockout_round: "round_of_16", bracket_position: 1 }),
      m({ id: "second", knockout_round: "round_of_16", bracket_position: 1 }),
    ];
    const bracket = buildKnockoutBracket(matches);
    expect(bracket.left.roundOf16[0].match?.id).toBe("first");
  });

  it("birden fazla final kaydı varsa ilkini kullanır", () => {
    const matches = [
      m({ id: "final-a", knockout_round: "final", bracket_position: 1 }),
      m({ id: "final-b", knockout_round: "final", bracket_position: 1 }),
    ];
    expect(buildKnockoutBracket(matches).final.match?.id).toBe("final-a");
  });
});

describe("otherKnockoutMatches", () => {
  it("Son 32 ve üçüncülük maçlarını ayrı listede döner, ana ağacı etkilemez", () => {
    const bracket = [m({ knockout_round: "round_of_16", bracket_position: 1 })];
    const others = [
      m({ id: "third", knockout_round: "third_place", bracket_position: 1 }),
      m({ id: "r32", knockout_round: "round_of_32", bracket_position: 1 }),
    ];
    expect(otherKnockoutMatches([...bracket, ...others]).map((x) => x.id).sort()).toEqual(["r32", "third"]);
    expect(buildKnockoutBracket([...bracket, ...others]).left.roundOf16[0].match).not.toBeNull();
  });
});

describe("determineMatchWinner", () => {
  const base = { home_penalty_score: null as number | null, away_penalty_score: null as number | null };

  it("normal skorla kazananı belirler", () => {
    expect(determineMatchWinner({ ...base, status: "completed", home_score: 2, away_score: 1 })).toBe("home");
    expect(determineMatchWinner({ ...base, status: "completed", home_score: 0, away_score: 3 })).toBe("away");
  });

  it("0-0 skoru geçerli sonuç olarak işler (null zannetmez)", () => {
    expect(determineMatchWinner({ ...base, status: "completed", home_score: 0, away_score: 0 })).toBeNull();
  });

  it("penaltılarla eşitliği bozar", () => {
    expect(
      determineMatchWinner({
        status: "completed", home_score: 1, away_score: 1,
        home_penalty_score: 5, away_penalty_score: 4,
      })
    ).toBe("home");
  });

  it("penaltı da eşitse veya girilmemişse kazanan belirlenmez", () => {
    expect(determineMatchWinner({ ...base, status: "completed", home_score: 1, away_score: 1 })).toBeNull();
    expect(
      determineMatchWinner({
        status: "completed", home_score: 1, away_score: 1,
        home_penalty_score: 4, away_penalty_score: 4,
      })
    ).toBeNull();
  });

  it("hükmen sonuçta skora göre kazananı belirler", () => {
    expect(determineMatchWinner({ ...base, status: "forfeited", home_score: 3, away_score: 0 })).toBe("home");
  });

  it("maç tamamlanmadıysa (LIVE, planlı, ertelendi) kazanan belirlenmez", () => {
    (["scheduled", "in_progress", "postponed", "cancelled", "awaiting_decision"] as MatchStatus[]).forEach((status) => {
      expect(determineMatchWinner({ ...base, status, home_score: 2, away_score: 1 })).toBeNull();
    });
  });

  it("skorlardan biri null ise otomatik kazanan seçilmez", () => {
    expect(determineMatchWinner({ ...base, status: "completed", home_score: null, away_score: 1 })).toBeNull();
  });

  it("winnerTeamId doğru takım id'sini döner", () => {
    const match = m({ status: "completed", home_score: 2, away_score: 1, home_team_id: "a", away_team_id: "b" });
    expect(winnerTeamId(match)).toBe("a");
    const draw = m({ status: "completed", home_score: 1, away_score: 1, home_team_id: "a", away_team_id: "b" });
    expect(winnerTeamId(draw)).toBeNull();
  });
});

describe("sağ taraf yerleşimi ve final merkezleme", () => {
  it("çeyrek final sağ taraf 3-4 pozisyonlarını sağa yerleştirir", () => {
    const bracket = buildKnockoutBracket([
      m({ id: "qf3", knockout_round: "quarter_final", bracket_position: 3 }),
      m({ id: "qf4", knockout_round: "quarter_final", bracket_position: 4 }),
    ]);
    expect(bracket.right.quarterFinals.map((c) => c.match?.id)).toEqual(["qf3", "qf4"]);
    expect(bracket.left.quarterFinals.every((c) => c.match === null)).toBe(true);
  });

  it("yarı final pozisyon 2 sağa, final tektir ve sol/sağdan bağımsızdır", () => {
    const bracket = buildKnockoutBracket([
      m({ id: "sf2", knockout_round: "semi_final", bracket_position: 2 }),
      m({ id: "final", knockout_round: "final", bracket_position: 1 }),
    ]);
    expect(bracket.right.semiFinal.match?.id).toBe("sf2");
    expect(bracket.left.semiFinal.match).toBeNull();
    expect(bracket.final.match?.id).toBe("final");
  });
});
