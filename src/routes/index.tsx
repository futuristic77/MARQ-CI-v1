import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

import { BagDialog, SiteHeader } from "@/components/SiteChrome";
import { Runway } from "@/components/runway/Runway";
import { mountBag } from "@/components/runway/bag";
import { mountRunway } from "@/components/runway/controller";
import { BRANDS, LOOKS, PRODUCTS } from "@/components/runway/data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MARQ’CI — Les marques indépendantes ivoiriennes" },
      {
        name: "description",
        content:
          "Six looks signés par des marques indépendantes ivoiriennes. Explore le défilé, isole un look et touche un point pour découvrir la pièce.",
      },
      { property: "og:title", content: "MARQ’CI — Les marques indépendantes ivoiriennes" },
      {
        property: "og:description",
        content: "Explore le défilé MARQ’CI : six looks, de la tête aux pieds, par des créateurs indépendants d’ici.",
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

  useEffect(() => {
    const el = runwayRef.current;
    if (!el) return;
    const bag = mountBag();
    const destroyRunway = mountRunway(el, bag);
    return () => {
      destroyRunway();
      bag.destroy();
    };
  }, []);

  return (
    <>
      <SiteHeader />
      <main>
        <Runway ref={runwayRef} />
        <section id="marques" className="mq-brands" aria-labelledby="marques-title">
          <div className="mq-brands__head">
            <div>
              <span className="mq-kicker">Les créateurs</span>
              <h2 id="marques-title" className="mq-brands__title">
                Fait ici, porté partout.
              </h2>
            </div>
            <p className="mq-brands__lead">
              MARQ’CI met en lumière les marques indépendantes ivoiriennes : des ateliers à taille humaine, des
              pièces pensées pour durer.
            </p>
          </div>
          <ul className="mq-brands__list">
            {BRANDS.map((brand, i) => {
              const count = Object.values(PRODUCTS).filter((p) => p.brand === brand.name).length;
              return (
                <li key={brand.id} className="mq-brand">
                  <span className="mq-brand__num">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="mq-brand__name">{brand.name}</h3>
                  <span className="mq-brand__craft">{brand.craft}</span>
                  <span className="mq-brand__city">
                    {brand.city} · {count} pièces
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </main>
      <footer className="mq-footer">
        <strong>MARQ’CI</strong>
        <span>Les marques indépendantes ivoiriennes, à l’honneur.</span>
      </footer>
      <BagDialog />
    </>
  );
}
