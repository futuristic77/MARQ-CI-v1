import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";

import { BagDialog, SiteHeader } from "@/components/SiteChrome";
import { HomeEditorial } from "@/components/home-editorial";
import { Runway } from "@/components/runway/Runway";
import { mountBag } from "@/components/runway/bag";
import { mountRunway } from "@/components/runway/controller";
import { CATALOG, LOOKS } from "@/components/runway/data";
import { toRunwayCatalog, type LiveLook } from "@/components/runway/live-catalog";
import { getPublicHomeContent } from "@/lib/public-content";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/")({
  loader: () => getPublicHomeContent(),
  head: () => ({
    meta: [
      { title: "MARQ’CI — Les marques indépendantes ivoiriennes" },
      {
        name: "description",
        content:
          "Un regard éditorial sur les créateurs, les collections et les silhouettes de mode indépendantes.",
      },
      { property: "og:title", content: "MARQ’CI — Les marques indépendantes ivoiriennes" },
      {
        property: "og:description",
        content: "Découvre les créateurs, les collections et les silhouettes de MARQ’CI.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "preload", as: "image", href: LOOKS[0]!.model }],
  }),
  component: Index,
});

function Index() {
  const runwayRef = useRef<HTMLDivElement>(null);
  const content = Route.useLoaderData();
  const runwayQuery = useQuery({
    queryKey: ["public", "runway-catalog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("looks")
        .select(
          "id,name,slug,description,model_image_url,original_image_url,display_order,look_products!inner(pin_number,pin_x,pin_y,products!inner(id,name,brand_id,description,category,price_cfa,photo_urls,sizes,status,brands!inner(id,name,status)))",
        )
        .eq("status", "published")
        .eq("look_products.products.status", "published")
        .eq("look_products.products.brands.status", "published")
        .order("display_order", { ascending: true })
        .order("pin_number", { ascending: true, referencedTable: "look_products" });
      if (error) throw error;
      return (data ?? []) as unknown as LiveLook[];
    },
    staleTime: 60_000,
  });
  const liveCatalog = useMemo(
    () => (runwayQuery.data?.length ? toRunwayCatalog(runwayQuery.data) : null),
    [runwayQuery.data],
  );
  const catalog = liveCatalog?.looks.length ? liveCatalog : CATALOG;
  const requestedLookId =
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("look");

  useEffect(() => {
    const el = runwayRef.current;
    if (!el) return;
    const bag = mountBag();
    const destroyRunway = mountRunway(el, bag, requestedLookId);
    return () => {
      destroyRunway();
      bag.destroy();
    };
  }, [catalog, requestedLookId]);

  return (
    <>
      <SiteHeader />
      <main>
        <section className="mq-editorial-hero" aria-labelledby="editorial-title">
          <img src={LOOKS[0]!.model} alt="Silhouette complète présentée dans le défilé MARQ’CI" />
          <div className="mq-editorial-hero__copy">
            <span className="mq-kicker">Le vestiaire d’ici</span>
            <h1 id="editorial-title">La mode d’ici, en mouvement.</h1>
            <p>
              Un regard sur les créateurs indépendants et les silhouettes qui racontent leur époque.
            </p>
            <a href="#lookbook" className="mq-editorial-hero__link">
              Explorer le lookbook <span aria-hidden="true">↗</span>
            </a>
          </div>
          <span className="mq-editorial-hero__index">MARQ’CI · ÉDITION 01</span>
        </section>

        <section className="mq-runway-section" aria-label="Le défilé MARQ’CI">
          <Runway ref={runwayRef} catalog={catalog} />
        </section>

        <HomeEditorial content={content} />
      </main>
      <footer className="mq-footer">
        <strong>MARQ’CI</strong>
        <nav aria-label="Navigation de pied de page">
          <a href="#marques">Marques</a>
          <a href="#campagnes">Campagnes</a>
          <a href="#collections">Collections</a>
          <a href="#vetements">Vêtements</a>
          <a href="#lookbook">Lookbook</a>
        </nav>
        <span>Les marques indépendantes ivoiriennes, à l’honneur.</span>
        <a href="/admin">Espace administration</a>
      </footer>
      <BagDialog />
    </>
  );
}
