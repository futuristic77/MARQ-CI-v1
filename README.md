# MARQ’CI

MARQ’CI met en valeur les marques indépendantes ivoiriennes à travers un lookbook interactif : six looks sur un défilé en anneau 3D, un panneau « Dans ce look » avec choix de taille, et un sac de style enregistré dans le navigateur (aucun paiement).

> Les marques (Atelier Akwaba, Lagune Studio, Maison Gbêkê), les pièces et les prix en FCFA sont des exemples à remplacer.

## Stack

- TanStack Start (React 19) + Vite
- Tailwind CSS v4 (tokens dans `src/styles.css`)
- TypeScript, Vitest

## Structure

- `src/routes/index.tsx` — page d’accueil (en-tête, défilé, section Marques, sac)
- `src/components/runway/` — défilé : données (`data.ts`), balisage (`Runway.tsx`), moteur d’animation (`controller.ts`), sac (`bag.ts`), styles (`runway.css`)
- `src/components/SiteChrome.tsx`, `src/components/site.css` — en-tête, dialogue du sac, notification
- `src/assets/products/` — photos des produits

Les photos des mannequins sont chargées depuis `https://reel-ref-try-the-look.vercel.app/assets/`.

## Lancer en local

```sh
npm install   # ou bun install
npm run dev   # http://localhost:8080
npm test      # tests des prix
npm run build
```
