import sneakerPlateau from "@/assets/products/sneaker-plateau.jpg";
import sneakerTreichville from "@/assets/products/sneaker-treichville.jpg";
import sneakerNuit from "@/assets/products/sneaker-nuit.jpg";
import tshirtLagune from "@/assets/products/tshirt-lagune.jpg";
import sweatBassam from "@/assets/products/sweat-bassam.jpg";
import hoodieBanco from "@/assets/products/hoodie-banco.jpg";
import hoodieCocody from "@/assets/products/hoodie-cocody.jpg";
import hoodieYop from "@/assets/products/hoodie-yop.jpg";

/** Remote cut-out model photos (transparent WebP) from the original runway export. */
export const MODEL_BASE = "https://reel-ref-try-the-look.vercel.app/assets";

export const BUNDLE_DISCOUNT = 0.1;

export type CatalogPhoto = { src: string; alt?: string };
export type Brand = {
  id: string;
  name: string;
  creatorName?: string;
  craft: string;
  city: string;
  photos?: CatalogPhoto[];
};
export type Collection = {
  id: string;
  brandId: string;
  name: string;
  description?: string;
  photos?: CatalogPhoto[];
};
export type Variant = { id: number; size: string };
export type Product = {
  id: string;
  name: string;
  brandId: string;
  collectionId?: string;
  brand: string;
  description?: string;
  priceFCFA: number;
  option: "Pointure" | "Taille";
  photos: [CatalogPhoto, ...CatalogPhoto[]];
  variants: Variant[];
};

const brands: Brand[] = [
  {
    id: "akwaba",
    name: "Atelier Akwaba",
    craft: "Sneakers montées à la main",
    city: "Treichville",
  },
  {
    id: "lagune",
    name: "Lagune Studio",
    craft: "Coton lourd & sérigraphie",
    city: "Grand-Bassam",
  },
  {
    id: "gbeke",
    name: "Maison Gbêkê",
    craft: "Hoodies & tissages",
    city: "Bouaké",
  },
];

const collections: Collection[] = [];
const SHOE_SIZES = ["40", "41", "42", "43", "44", "45", "46"];
const APPAREL_SIZES = ["S", "M", "L", "XL"];

function make(
  id: string,
  name: string,
  brandId: string,
  priceFCFA: number,
  option: Product["option"],
  sizes: string[],
  photo: string,
  base: number,
): Product {
  const brand = brands.find((entry) => entry.id === brandId)?.name ?? brandId;
  return {
    id,
    name,
    brandId,
    brand,
    priceFCFA,
    option,
    photos: [{ src: photo, alt: name }],
    variants: sizes.map((size, i) => ({ id: base * 100 + i + 1, size })),
  };
}

const products: Record<string, Product> = Object.fromEntries(
  [
    make(
      "sneaker-plateau",
      "Sneaker Plateau",
      "akwaba",
      55000,
      "Pointure",
      SHOE_SIZES,
      sneakerPlateau,
      7101,
    ),
    make(
      "sneaker-treichville",
      "Sneaker Treichville",
      "akwaba",
      55000,
      "Pointure",
      SHOE_SIZES,
      sneakerTreichville,
      7102,
    ),
    make(
      "sneaker-nuit",
      "Sneaker Nuit",
      "akwaba",
      55000,
      "Pointure",
      SHOE_SIZES,
      sneakerNuit,
      7103,
    ),
    make(
      "tshirt-lagune",
      "T-shirt Lagune",
      "lagune",
      30000,
      "Taille",
      APPAREL_SIZES,
      tshirtLagune,
      7201,
    ),
    make(
      "sweat-bassam",
      "Sweat Bassam",
      "lagune",
      30000,
      "Taille",
      APPAREL_SIZES,
      sweatBassam,
      7202,
    ),
    make(
      "hoodie-banco",
      "Hoodie Banco",
      "gbeke",
      30000,
      "Taille",
      APPAREL_SIZES,
      hoodieBanco,
      7301,
    ),
    make(
      "hoodie-cocody",
      "Hoodie Cocody",
      "gbeke",
      30000,
      "Taille",
      APPAREL_SIZES,
      hoodieCocody,
      7302,
    ),
    make("hoodie-yop", "Hoodie Yop", "gbeke", 30000, "Taille", APPAREL_SIZES, hoodieYop, 7303),
  ].map((product) => [product.id, product]),
);

export type Pin = { x: number; y: number };
export type Look = {
  key: string;
  name: string;
  description: string;
  model: string;
  original: string;
  products: [string, string, string];
  /** 1-based row numbers that carry the "Nouveau" tag */
  tagged?: number[];
  pins: [Pin, Pin, Pin];
};

const pins = (shoeTop = 92): [Pin, Pin, Pin] => [
  { x: 50, y: 33 },
  { x: 46, y: 20 },
  { x: 45, y: shoeTop },
];

const looks: Look[] = [
  {
    key: "plateau",
    name: "Plateau",
    description: "Une maille grise et un denim facile.",
    model: `${MODEL_BASE}/model-1-640.webp`,
    original: `${MODEL_BASE}/original-look-1.webp`,
    products: ["hoodie-cocody", "tshirt-lagune", "sneaker-plateau"],
    pins: pins(95),
  },
  {
    key: "vernissage",
    name: "Vernissage",
    description: "Un t-shirt net et un denim ample.",
    model: `${MODEL_BASE}/model-5-640.webp`,
    original: `${MODEL_BASE}/original-look-5.webp`,
    products: ["hoodie-yop", "tshirt-lagune", "sneaker-treichville"],
    tagged: [1],
    pins: pins(),
  },
  {
    key: "galerie",
    name: "Galerie",
    description: "Vert profond, palette terre.",
    model: `${MODEL_BASE}/model-4-640.webp`,
    original: `${MODEL_BASE}/original-look-4.webp`,
    products: ["hoodie-banco", "tshirt-lagune", "sneaker-plateau"],
    tagged: [1],
    pins: pins(),
  },
  {
    key: "studio",
    name: "Studio",
    description: "Noir, blanc et denim décontracté.",
    model: `${MODEL_BASE}/model-6-640.webp`,
    original: `${MODEL_BASE}/original-look-6.webp`,
    products: ["hoodie-yop", "tshirt-lagune", "sneaker-treichville"],
    pins: pins(),
  },
  {
    key: "cocody",
    name: "Cocody",
    description: "Superpositions chaudes, allure tailleur.",
    model: `${MODEL_BASE}/model-3-640.webp`,
    original: `${MODEL_BASE}/original-look-3.webp`,
    products: ["sweat-bassam", "tshirt-lagune", "sneaker-nuit"],
    pins: pins(),
  },
  {
    key: "zone-4",
    name: "Zone 4",
    description: "Un col rond gris et ton denim préféré.",
    model: `${MODEL_BASE}/model-2-640.webp`,
    original: `${MODEL_BASE}/original-look-2.webp`,
    products: ["hoodie-cocody", "tshirt-lagune", "sneaker-treichville"],
    pins: pins(),
  },
];

export type Catalog = {
  brands: Brand[];
  collections: Collection[];
  products: Record<string, Product>;
  looks: Look[];
};

export const CATALOG: Catalog = {
  brands,
  collections,
  products,
  looks,
};
export const {
  brands: BRANDS,
  collections: COLLECTIONS,
  products: PRODUCTS,
  looks: LOOKS,
} = CATALOG;

/** "115 000 FCFA" — thin no-break spaces so it never wraps and renders the same on server and browser. */
export function formatFCFA(amount: number): string {
  const digits = String(Math.round(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
  return `${digits}\u00a0FCFA`;
}

export function lookTotals(look: Look): { full: number; bundle: number } {
  const full = look.products.reduce((sum, id) => sum + (CATALOG.products[id]?.priceFCFA ?? 0), 0);
  return { full, bundle: Math.round(full * (1 - BUNDLE_DISCOUNT)) };
}

export function findVariant(variantId: number): { product: Product; variant: Variant } | null {
  for (const product of Object.values(CATALOG.products)) {
    const variant = product.variants.find((v) => v.id === variantId);
    if (variant) return { product, variant };
  }
  return null;
}
