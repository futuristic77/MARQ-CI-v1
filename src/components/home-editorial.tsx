import type { PublicHomeContent } from "@/lib/public-content";

type EditorialProps = { content: PublicHomeContent };

function text(row: Record<string, unknown>, key: string) {
  const value = row[key];
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function image(row: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value;
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  }
  return "";
}

function slug(row: Record<string, unknown>) {
  return text(row, "slug") || text(row, "id");
}

function EmptyEditorial({ children }: { children: string }) {
  return <p className="mq-editorial-empty">{children}</p>;
}

function EditorialSection({
  id,
  kicker,
  title,
  children,
}: {
  id: string;
  kicker: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mq-editorial-section" id={id} aria-labelledby={`${id}-title`}>
      <div className="mq-editorial-section__heading">
        <span className="mq-kicker">{kicker}</span>
        <h2 id={`${id}-title`}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function EditorialGrid({
  items,
  kind,
  imageKeys,
  titleKey,
  descriptionKey,
}: {
  items: Record<string, unknown>[];
  kind: string;
  imageKeys: string[];
  titleKey: string;
  descriptionKey?: string;
}) {
  if (!items.length) return null;
  return (
    <div className={`mq-editorial-grid mq-editorial-grid--${kind}`}>
      {items.map((item) => {
        const photo = image(item, ...imageKeys);
        const label = text(item, titleKey);
        const path = `/decouvrir/${kind}/${encodeURIComponent(slug(item))}`;
        return (
          <a className="mq-editorial-card" href={path} key={slug(item)}>
            {photo ? (
              <img src={photo} alt={label} loading="lazy" />
            ) : (
              <span className="mq-editorial-card__no-image" aria-hidden="true" />
            )}
            <span className="mq-editorial-card__meta">
              <span className="mq-editorial-card__name">{label}</span>
              {descriptionKey && text(item, descriptionKey) ? (
                <span className="mq-editorial-card__description">{text(item, descriptionKey)}</span>
              ) : null}
              {text(item, "price_cfa") ? (
                <span className="mq-editorial-card__price">
                  {Number(item["price_cfa"]).toLocaleString("fr-FR")} FCFA
                </span>
              ) : null}
            </span>
          </a>
        );
      })}
    </div>
  );
}

export function HomeEditorial({ content }: EditorialProps) {
  const publishedProducts = content.products;
  const categoryImages = new Map<string, string>();
  for (const product of publishedProducts) {
    const category = text(product, "category");
    const photo = image(product, "photo_urls");
    if (category && photo && !categoryImages.has(category)) categoryImages.set(category, photo);
  }

  return (
    <>
      <EditorialSection id="marques" kicker="Les créateurs" title="Des signatures, des histoires.">
        {content.brands.length ? (
          <EditorialGrid
            items={content.brands}
            kind="marques"
            imageKeys={["cover_url", "gallery_urls"]}
            titleKey="name"
            descriptionKey="description"
          />
        ) : (
          <EmptyEditorial>
            Les prochaines histoires de créateurs seront présentées ici.
          </EmptyEditorial>
        )}
      </EditorialSection>

      <EditorialSection id="campagnes" kicker="En ce moment" title="Campagnes éditoriales.">
        {content.campaigns.length ? (
          <EditorialGrid
            items={content.campaigns}
            kind="campagnes"
            imageKeys={["image_url"]}
            titleKey="title"
            descriptionKey="description"
          />
        ) : (
          <EmptyEditorial>Aucune campagne n’est actuellement diffusée.</EmptyEditorial>
        )}
      </EditorialSection>

      <EditorialSection id="collections" kicker="Nouveaux chapitres" title="Collections récentes.">
        {content.collections.length ? (
          <EditorialGrid
            items={content.collections}
            kind="collections"
            imageKeys={["cover_url"]}
            titleKey="name"
            descriptionKey="description"
          />
        ) : (
          <EmptyEditorial>Les collections publiées apparaîtront ici.</EmptyEditorial>
        )}
      </EditorialSection>

      <EditorialSection id="categories" kicker="Le vestiaire" title="Explorer les catégories.">
        {content.categories.length ? (
          <div className="mq-category-list">
            {content.categories.map((category) => (
              <a
                key={category}
                href={`/decouvrir/categories/${encodeURIComponent(category)}`}
                className="mq-category"
              >
                {categoryImages.get(category) ? (
                  <img src={categoryImages.get(category)} alt="" loading="lazy" />
                ) : null}
                <span>{category}</span>
                <span aria-hidden="true">↗</span>
              </a>
            ))}
          </div>
        ) : (
          <EmptyEditorial>
            Les catégories seront révélées avec les premières créations publiées.
          </EmptyEditorial>
        )}
      </EditorialSection>

      <EditorialSection id="silhouettes" kicker="Le lookbook" title="La mode en mouvement.">
        {content.looks.length ? (
          <EditorialGrid
            items={content.looks}
            kind="looks"
            imageKeys={["model_image_url", "original_image_url"]}
            titleKey="name"
            descriptionKey="description"
          />
        ) : (
          <EmptyEditorial>
            Les silhouettes du lookbook apparaîtront ici dès leur publication.
          </EmptyEditorial>
        )}
      </EditorialSection>

      <EditorialSection
        id="vetements"
        kicker="Les dernières pièces"
        title="Créations récemment ajoutées."
      >
        {publishedProducts.length ? (
          <EditorialGrid
            items={publishedProducts}
            kind="vetements"
            imageKeys={["photo_urls"]}
            titleKey="name"
          />
        ) : (
          <EmptyEditorial>
            Les vêtements publiés seront présentés ici, sans sélection fictive.
          </EmptyEditorial>
        )}
      </EditorialSection>

      <EditorialSection id="selection" kicker="Le regard MARQ’CI" title="Sélection éditoriale.">
        {content.products.length || content.looks.length ? (
          <div className="mq-editorial-selection">
            <EditorialGrid
              items={[...content.looks.slice(0, 2), ...content.products.slice(0, 4)]}
              kind="selection"
              imageKeys={["model_image_url", "photo_urls", "original_image_url"]}
              titleKey="name"
            />
          </div>
        ) : (
          <EmptyEditorial>
            La sélection MARQ’CI prendra forme au fil des premières publications.
          </EmptyEditorial>
        )}
      </EditorialSection>
    </>
  );
}
