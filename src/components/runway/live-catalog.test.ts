import { describe, expect, it } from "vitest";
import { toRunwayCatalog, type LiveLook } from "./live-catalog";

const row: LiveLook = {
  id: "look-uuid-1",
  name: "Silhouette test",
  slug: "silhouette-test",
  description: "Une silhouette composée de deux pièces.",
  model_image_url: "https://example.test/model.webp",
  original_image_url: "https://example.test/original.webp",
  look_products: [
    {
      pin_number: 2,
      pin_x: 68,
      pin_y: 82,
      products: {
        id: "product-uuid-2",
        name: "Sneaker",
        brand_id: "brand-uuid-2",
        description: "Chaussure artisanale",
        category: "Chaussures",
        price_cfa: 55000,
        photo_urls: ["https://example.test/sneaker.webp"],
        sizes: ["40", "41"],
        brands: { id: "brand-uuid-2", name: "Atelier" },
      },
    },
    {
      pin_number: 1,
      pin_x: 45,
      pin_y: 25,
      products: {
        id: "product-uuid-1",
        name: "Chemise",
        brand_id: "brand-uuid-1",
        description: "Coton tissé",
        category: "Hauts",
        price_cfa: 30000,
        photo_urls: [],
        sizes: ["S", "M"],
        brands: { id: "brand-uuid-1", name: "Maison" },
      },
    },
  ],
};

describe("Supabase Lookbook adapter", () => {
  it("keeps the UUID as the stable look key and orders products with their numbered pins", () => {
    const catalog = toRunwayCatalog([row]);

    expect(catalog.looks).toHaveLength(1);
    expect(catalog.looks[0]).toMatchObject({
      key: "look-uuid-1",
      products: ["product-uuid-1", "product-uuid-2"],
      pins: [
        { x: 45, y: 25 },
        { x: 68, y: 82 },
      ],
    });
    expect(catalog.products["product-uuid-1"]?.variants.map((variant) => variant.size)).toEqual([
      "S",
      "M",
    ]);
    expect(catalog.products["product-uuid-2"]?.option).toBe("Pointure");
  });

  it("omits a look when no associated published product is available", () => {
    const catalog = toRunwayCatalog([{ ...row, look_products: [] }]);
    expect(catalog.looks).toEqual([]);
  });
});
