import { createFileRoute, Link, notFound } from "@tanstack/react-router";

import { getPublicHomeContent } from "@/lib/public-content";

export const Route = createFileRoute("/decouvrir/$kind/$slug")({
  loader: async ({ params }) => {
    const content = await getPublicHomeContent();
    const groupByKind: Record<string, Record<string, unknown>[]> = {
      marques: content.brands,
      campagnes: content.campaigns,
      collections: content.collections,
      looks: content.looks,
      vetements: content.products,
    };
    if (params.kind === "categories") {
      const products = content.products.filter((product) => product["category"] === params.slug);
      if (!products.length) throw notFound();
      return { kind: "categories", title: params.slug, item: null, products };
    }
    const item = groupByKind[params.kind]?.find(
      (row) => String(row["slug"] ?? row["id"]) === params.slug,
    );
    if (!item) throw notFound();
    return {
      kind: params.kind,
      title: String(item["name"] ?? item["title"] ?? "MARQ’CI"),
      item,
      products: [],
    };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Découvrir"} — MARQ’CI` },
      { name: "description", content: "Découvre les créations et les univers de MARQ’CI." },
    ],
  }),
  component: DiscoverPage,
});

function DiscoverPage() {
  const { kind, title, item, products } = Route.useLoaderData();
  const description = typeof item?.["description"] === "string" ? item["description"] : "";
  const imageValue =
    item?.["image_url"] ??
    item?.["cover_url"] ??
    item?.["model_image_url"] ??
    item?.["original_image_url"] ??
    item?.["photo_urls"];
  const image =
    typeof imageValue === "string" ? imageValue : Array.isArray(imageValue) ? imageValue[0] : "";

  return (
    <main className="mq-detail">
      <Link to="/" className="mq-detail__back">
        ← Retour à MARQ’CI
      </Link>
      {image ? <img className="mq-detail__image" src={String(image)} alt={title} /> : null}
      <span className="mq-kicker">{kind}</span>
      <h1>{title}</h1>
      {description ? <p className="mq-detail__description">{description}</p> : null}
      {item?.["price_cfa"] ? (
        <p className="mq-editorial-card__price">
          {Number(item["price_cfa"]).toLocaleString("fr-FR")} FCFA
        </p>
      ) : null}
      {products.length ? (
        <section className="mq-detail__products" aria-labelledby="category-products-title">
          <h2 id="category-products-title">Pièces de cette catégorie</h2>
          <div className="mq-detail__product-list">
            {products.map((product) => (
              <Link
                key={String(product["id"])}
                to="/decouvrir/$kind/$slug"
                params={{ kind: "vetements", slug: String(product["slug"] ?? product["id"]) }}
              >
                <span>{String(product["name"])}</span>
                {product["price_cfa"] ? (
                  <span>{Number(product["price_cfa"]).toLocaleString("fr-FR")} FCFA</span>
                ) : null}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
