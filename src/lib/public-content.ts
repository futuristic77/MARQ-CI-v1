import { createServerFn } from "@tanstack/react-start";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type Row = { [key: string]: JsonValue };

export type PublicHomeContent = {
  brands: Row[];
  products: Row[];
  collections: Row[];
  campaigns: Row[];
  looks: Row[];
  categories: string[];
};

const emptyContent: PublicHomeContent = {
  brands: [],
  products: [],
  collections: [],
  campaigns: [],
  looks: [],
  categories: [],
};

async function readPublicTable(table: string, select: string, filters: string[] = []) {
  const baseUrl = process.env["SUPABASE_URL"] ?? process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const anonKey = process.env["SUPABASE_ANON_KEY"] ?? process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];
  if (!baseUrl || !anonKey) return [];

  const url = new URL(`/rest/v1/${table}`, baseUrl);
  url.searchParams.set("select", select);
  for (const filter of filters) {
    const [key, value] = filter.split("=");
    if (key && value) url.searchParams.set(key, value);
  }
  const response = await fetch(url, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
  });
  if (!response.ok) throw new Error(`Public ${table} query failed (${response.status})`);
  return (await response.json()) as Row[];
}

export const getPublicHomeContent = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const [brands, products, collections, campaigns, looks, categoryRows] = await Promise.all([
      readPublicTable(
        "brands",
        "id,name,slug,creator_name,category,craft,city,description,logo_url,cover_url,gallery_urls,is_featured,display_order",
        ["status=eq.published", "order=is_featured.desc,display_order.asc"],
      ),
      readPublicTable(
        "products",
        "id,brand_id,collection_id,name,slug,description,category,price_cfa,photo_urls,sizes,created_at,brands!inner(name,slug,status)",
        ["status=eq.published", "brands.status=eq.published", "order=created_at.desc", "limit=12"],
      ),
      readPublicTable(
        "collections",
        "id,brand_id,name,slug,description,cover_url,updated_at,brands!inner(name,slug,status)",
        ["status=eq.published", "brands.status=eq.published", "order=updated_at.desc", "limit=8"],
      ),
      readPublicTable(
        "campaigns",
        "id,brand_id,title,description,image_url,target_url,placement,is_free,amount_cfa,payment_status,starts_at,ends_at,is_active,format,display_order,brands!inner(name,slug,status)",
        [
          "is_active=eq.true",
          "and=(or(is_free.eq.true,payment_status.eq.paid),or(starts_at.is.null,starts_at.lte.now()),or(ends_at.is.null,ends_at.gt.now()))",
          "brands.status=eq.published",
          "order=display_order.asc",
          "limit=8",
        ],
      ),
      readPublicTable(
        "looks",
        "id,name,slug,description,model_image_url,original_image_url,display_order",
        ["status=eq.published", "order=display_order.asc", "limit=8"],
      ),
      readPublicTable("products", "category,brands!inner(status)", [
        "status=eq.published",
        "brands.status=eq.published",
        "category=not.is.null",
      ]),
    ]);

    return {
      brands,
      products,
      collections,
      campaigns,
      looks,
      categories: [
        ...new Set(categoryRows.map((row) => String(row["category"] ?? "").trim()).filter(Boolean)),
      ].sort(),
    } satisfies PublicHomeContent;
  } catch (error) {
    console.error("[v0] Public homepage content unavailable:", error);
    return emptyContent;
  }
});
