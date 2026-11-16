import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import "./live-directory.css";

type Brand = {
  id: string;
  name: string;
  slug: string;
  creator_name: string;
  city: string;
  category: string;
  craft: string;
  description: string;
  logo_url: string;
  cover_url: string;
  is_featured: boolean;
  display_order: number;
};
type Campaign = {
  id: string;
  title: string;
  description: string;
  image_url: string;
  target_url: string;
  brand_id: string;
};

export function LiveDirectory() {
  const brandsQuery = useQuery({
    queryKey: ["public", "brands"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select(
          "id,name,slug,creator_name,city,category,craft,description,logo_url,cover_url,is_featured,display_order",
        )
        .eq("status", "published")
        .order("is_featured", { ascending: false })
        .order("display_order", { ascending: true })
        .order("name");
      if (error) throw error;
      return (data ?? []) as Brand[];
    },
    staleTime: 60_000,
  });
  const campaignsQuery = useQuery({
    queryKey: ["public", "campaigns", "home"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select(
          "id,title,description,image_url,target_url,brand_id,format,is_free,payment_status,starts_at,ends_at,display_order",
        )
        .eq("placement", "home")
        .eq("is_active", true)
        .lte("starts_at", new Date().toISOString())
        .gte("ends_at", new Date().toISOString())
        .or("is_free.eq.true,payment_status.eq.paid")
        .order("display_order", { ascending: true })
        .order("starts_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Campaign[];
    },
    staleTime: 60_000,
  });
  const brands = brandsQuery.data ?? [];
  const campaigns = (campaignsQuery.data ?? []).filter((campaign) =>
    brands.some((brand) => brand.id === campaign.brand_id),
  );
  if (!brands.length && !campaigns.length) return null;

  return (
    <section className="mq-live-directory" aria-labelledby="mq-directory-title">
      <div className="mq-live-inner">
        {campaigns.length > 0 && (
          <>
            <div className="mq-live-heading">
              <span className="mq-kicker">À l’affiche</span>
              <h2>Les maisons du moment.</h2>
            </div>
            <div className="adm-campaign-grid">
              {campaigns.map((campaign) => {
                const brand = brands.find((item) => item.id === campaign.brand_id);
                const href =
                  campaign.target_url || (brand ? `/marques/${brand.slug}` : "/#marques");
                return (
                  <a
                    className="adm-campaign-tile"
                    href={href}
                    key={campaign.id}
                    target={href.startsWith("http") ? "_blank" : undefined}
                    rel={href.startsWith("http") ? "noreferrer" : undefined}
                  >
                    {campaign.image_url && <img src={campaign.image_url} alt="" loading="lazy" />}
                    <div>
                      <span>{brand?.name ?? "Sélection MARQ’CI"}</span>
                      <h3>{campaign.title}</h3>
                    </div>
                  </a>
                );
              })}
            </div>
          </>
        )}
        {brands.length > 0 && (
          <>
            <div className="mq-live-heading">
              <span className="mq-kicker">Le répertoire</span>
              <h2 id="mq-directory-title">Les maisons à découvrir.</h2>
              <p>
                Des créateurs d’ici, leurs histoires et leurs pièces, réunis dans un même espace.
              </p>
            </div>
            <div className="mq-live-brand-grid">
              {brands.map((brand) => (
                <Link
                  className="mq-live-brand"
                  to="/marques/$slug"
                  params={{ slug: brand.slug }}
                  key={brand.id}
                >
                  <div className="mq-live-brand-image">
                    {brand.cover_url ? (
                      <img src={brand.cover_url} alt="" loading="lazy" />
                    ) : brand.logo_url ? (
                      <img src={brand.logo_url} alt={`${brand.name} — logo`} loading="lazy" />
                    ) : (
                      <span>{brand.name.slice(0, 1)}</span>
                    )}
                  </div>
                  <div className="mq-live-brand-meta">
                    <div>
                      <span className="mq-live-brand-city">
                        {brand.is_featured ? "À la une · " : ""}
                        {[brand.city, brand.category].filter(Boolean).join(" · ") ||
                          "Côte d’Ivoire"}
                      </span>
                      <h3>{brand.name}</h3>
                      <p>{brand.craft || brand.creator_name || brand.description}</p>
                    </div>
                    <span className="mq-live-arrow" aria-hidden="true">
                      ↗
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
