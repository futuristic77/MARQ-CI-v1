import type { Catalog, Look, Product } from "./data";

type LiveProduct = {
  id: string;
  name: string;
  brand_id: string;
  description: string | null;
  category: string | null;
  price_cfa: number;
  photo_urls: string[] | null;
  sizes: string[] | null;
  brands: { id: string; name: string } | null;
};

type LiveLookProduct = {
  pin_number: number;
  pin_x: number;
  pin_y: number;
  products: LiveProduct | null;
};

export type LiveLook = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  model_image_url: string | null;
  original_image_url: string | null;
  look_products: LiveLookProduct[] | null;
};

export function toRunwayCatalog(rows: LiveLook[]): Catalog {
  const products: Record<string, Product> = {};
  const looks: Look[] = [];

  for (const row of rows) {
    const associations = [...(row.look_products ?? [])]
      .filter((association) => association.products)
      .sort((a, b) => a.pin_number - b.pin_number);
    const lookProducts: string[] = [];
    const pins: Look["pins"] = [];

    for (const association of associations) {
      const source = association.products;
      if (!source) continue;

      const photos = (source.photo_urls ?? []).filter(Boolean).map((src) => ({
        src,
        alt: source.name,
      }));
      const sizes = source.sizes ?? [];
      products[source.id] = {
        id: source.id,
        name: source.name,
        brandId: source.brand_id,
        brand: source.brands?.name ?? "",
        description: source.description ?? "",
        priceFCFA: source.price_cfa,
        option: sizes.some((size) => /^\d+$/.test(size)) ? "Pointure" : "Taille",
        photos,
        variants: sizes.map((size, index) => ({ id: `${source.id}:${index}`, size })),
      };
      lookProducts.push(source.id);
      pins.push({ x: Number(association.pin_x), y: Number(association.pin_y) });
    }

    if (lookProducts.length === 0 || (!row.model_image_url && !row.original_image_url)) continue;
    looks.push({
      key: row.id,
      name: row.name,
      description: row.description ?? "",
      model: row.model_image_url || row.original_image_url || "",
      original: row.original_image_url || row.model_image_url || "",
      products: lookProducts,
      pins,
    });
  }

  return { brands: [], collections: [], products, looks };
}
