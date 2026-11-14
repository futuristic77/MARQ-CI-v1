import { describe, expect, it } from "vitest";
import { CATALOG, LOOKS, formatFCFA, lookTotals } from "./data";

describe("central catalog", () => {
  it("models brands, collections, products, and composed looks in one catalog", () => {
    expect(CATALOG.brands).toHaveLength(3);
    expect(CATALOG.collections).toEqual([]);
    expect(Object.keys(CATALOG.products)).toHaveLength(8);
    expect(CATALOG.looks).toHaveLength(6);
  });

  it("keeps product references, FCFA prices, available sizes, and photos connected", () => {
    const brandIds = new Set(CATALOG.brands.map((brand) => brand.id));
    const collectionIds = new Set(CATALOG.collections.map((collection) => collection.id));
    const productIds = new Set(Object.keys(CATALOG.products));

    for (const product of Object.values(CATALOG.products)) {
      expect(brandIds.has(product.brandId)).toBe(true);
      expect(product.priceFCFA).toBeGreaterThan(0);
      expect(product.variants.length).toBeGreaterThan(0);
      expect(product.photos.length).toBeGreaterThan(0);
      if (product.collectionId) expect(collectionIds.has(product.collectionId)).toBe(true);
    }

    for (const look of CATALOG.looks) {
      for (const productId of look.products) expect(productIds.has(productId)).toBe(true);
    }
  });
});

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
