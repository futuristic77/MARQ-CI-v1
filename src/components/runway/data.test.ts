import { describe, expect, it } from "vitest";
import { LOOKS, formatFCFA, lookTotals } from "./data";

describe("look pricing", () => {
  it("prices a full look at 115 000 FCFA (one sneaker + two clothing pieces)", () => {
    expect(lookTotals(LOOKS[0]!).full).toBe(115000);
  });

  it("gives 10% off when the three pieces are bundled: 103 500 FCFA", () => {
    expect(lookTotals(LOOKS[0]!).bundle).toBe(103500);
  });

  it("formats prices in FCFA with French digit grouping", () => {
    expect(formatFCFA(103500)).toBe("103\u202f500\u00a0FCFA");
  });
});
