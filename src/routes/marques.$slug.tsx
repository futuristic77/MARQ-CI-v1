import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import "@/components/admin/admin.css";
import "@/components/public/live-directory.css";

export const Route = createFileRoute("/marques/$slug")({
  head: () => ({
    meta: [
      { title: "Marque indépendante — MARQ’CI" },
      {
        name: "description",
        content:
          "Découvrez le savoir-faire et les créations d’une marque indépendante ivoirienne sur MARQ’CI.",
      },
    ],
  }),
  component: BrandProfile,
});

type Product = {
  id: string;
  name: string;
  description: string;
  category: string;
  price_cfa: number;
  photo_urls: string[];
  sizes: string[];
};
type Brand = {
  id: string;
  name: string;
  slug: string;
  creator_name: string;
  category: string;
  craft: string;
  city: string;
  description: string;
  logo_url: string;
  cover_url: string;
  gallery_urls: string[];
};
type BrandLook = {
  id: string;
  name: string;
  slug: string;
  description: string;
  model_image_url: string;
  original_image_url: string;
  look_products: {
    pin_number: number;
    pin_x: number;
    pin_y: number;
    products: {
      id: string;
      name: string;
      brand_id: string;
      photo_urls: string[];
    };
  }[];
};

function BrandProfile() {
  const { slug } = Route.useParams();
  const brandQuery = useQuery({
    queryKey: ["public", "brand", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      return data as Brand | null;
    },
  });
  const brand = brandQuery.data;
  const productsQuery = useQuery({
    queryKey: ["public", "brand-products", brand?.id],
    enabled: Boolean(brand?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,description,category,price_cfa,photo_urls,sizes")
        .eq("brand_id", brand!.id)
        .eq("status", "published")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Product[];
    },
  });
  const looksQuery = useQuery({
    queryKey: ["public", "brand-looks", brand?.id],
    enabled: Boolean(brand?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("looks")
        .select(
          "id,name,slug,description,model_image_url,original_image_url,look_products!inner(pin_number,pin_x,pin_y,products!inner(id,name,brand_id,photo_urls))",
        )
        .eq("status", "published")
        .eq("look_products.products.brand_id", brand!.id)
        .eq("look_products.products.status", "published")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as BrandLook[];
    },
    staleTime: 60_000,
  });
  return (
    <main className="adm-public-main">
      <header className="adm-public-header">
        <Link to="/">MARQ’CI</Link>
        <nav>
          <a href="/#marques">Les créateurs</a>
          <Link to="/">Le défilé</Link>
        </nav>
      </header>
      <div className="adm-public-wrap">
        {brandQuery.isLoading ? (
          <p className="adm-public-empty">La maison se prépare…</p>
        ) : !brand ? (
          <div className="adm-public-empty">
            <p>Cette maison n’est pas disponible.</p>
            <Link to="/">Retour au défilé</Link>
          </div>
        ) : (
          <>
            <section className="adm-public-hero">
              <div>
                {brand.cover_url && <img src={brand.cover_url} alt={`Univers de ${brand.name}`} />}
                {!brand.cover_url && brand.logo_url && (
                  <img src={brand.logo_url} alt={`${brand.name} — logo`} />
                )}
              </div>
              <div>
                <span className="adm-eyebrow">
                  {[brand.city, brand.category].filter(Boolean).join(" · ") ||
                    "Création indépendante ivoirienne"}
                </span>
                <h1>{brand.name}</h1>
                {brand.creator_name && (
                  <p className="adm-public-byline">Par {brand.creator_name}</p>
                )}
                {brand.craft && <p className="adm-public-byline">{brand.craft}</p>}
                <p>
                  {brand.description ||
                    "Une maison de création indépendante à découvrir sur MARQ’CI."}
                </p>
              </div>
            </section>
            {brand.gallery_urls?.length > 0 && (
              <div className="adm-gallery-grid">
                {brand.gallery_urls.map((url, index) => (
                  <img
                    key={`${url}-${index}`}
                    src={url}
                    alt={`${brand.name}, image ${index + 1}`}
                    loading="lazy"
                  />
                ))}
              </div>
            )}
            <section className="adm-brand-looks" aria-labelledby="brand-looks-title">
              <div className="mq-live-heading">
                <span className="mq-kicker">Portés dans le lookbook</span>
                <h2 id="brand-looks-title">Les silhouettes de la maison.</h2>
                <p>
                  Retrouvez les looks du défilé où apparaissent les pièces publiées de {brand.name}.
                </p>
              </div>
              {looksQuery.isLoading ? (
                <p className="adm-public-empty">Recherche des silhouettes…</p>
              ) : looksQuery.data?.length ? (
                <div className="adm-brand-look-grid">
                  {looksQuery.data.map((look) => (
                    <article className="adm-brand-look" key={look.id}>
                      <a className="adm-brand-look-image" href="/#lookbook">
                        <img
                          src={look.model_image_url || look.original_image_url}
                          alt={`${look.name}, mannequin portant une pièce de ${brand.name}`}
                          loading="lazy"
                        />
                        <span>Voir le lookbook</span>
                      </a>
                      <div className="adm-brand-look-info">
                        <h3>{look.name}</h3>
                        {look.description && <p>{look.description}</p>}
                        <ul aria-label={`Articles de ${brand.name} dans le look ${look.name}`}>
                          {look.look_products
                            .filter((item) => item.products?.brand_id === brand.id)
                            .map((item) => (
                              <li key={item.products.id}>{item.products.name}</li>
                            ))}
                        </ul>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="adm-public-empty">
                  Les silhouettes de {brand.name} apparaîtront ici dès qu&apos;une de ses pièces
                  sera publiée dans un lookbook.
                </p>
              )}
            </section>
            <section aria-labelledby="brand-products-title">
              <div className="mq-live-heading">
                <span className="mq-kicker">La sélection</span>
                <h2 id="brand-products-title">Les pièces de la maison.</h2>
              </div>
              {productsQuery.data?.length ? (
                <div className="adm-product-grid">
                  {productsQuery.data.map((product) => (
                    <article className="adm-product-card" key={product.id}>
                      {product.photo_urls?.[0] && (
                        <img src={product.photo_urls[0]} alt={product.name} loading="lazy" />
                      )}
                      <small>{product.category || brand.craft || "Création"}</small>
                      <strong>{product.name}</strong>
                      <p>{product.description}</p>
                      <div className="adm-price">
                        {new Intl.NumberFormat("fr-FR").format(product.price_cfa)} FCFA
                      </div>
                      {product.sizes?.length > 0 && (
                        <small>Tailles : {product.sizes.join(", ")}</small>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="adm-public-empty">
                  La prochaine sélection de {brand.name} arrive bientôt.
                </p>
              )}
            </section>
          </>
        )}
      </div>
      <footer className="adm-public-header">
        <Link to="/">MARQ’CI</Link>
        <Link to="/">Retour au défilé</Link>
      </footer>
    </main>
  );
}
