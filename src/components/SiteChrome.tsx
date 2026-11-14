import { Link } from "@tanstack/react-router";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link to="/" className="brand" aria-label="MARQ’CI — accueil">
        MARQ<span className="brand__tick">’</span>CI
      </Link>
      <nav className="site-nav" aria-label="Navigation principale">
        <a href="/">Accueil</a>
        <a href="#marques">Marques</a>
        <a href="#lookbook" aria-current="page">
          Lookbook
        </a>
      </nav>
      <button type="button" id="open-bag" className="bag-btn" aria-label="Ouvrir le sac de style">
        <svg width="22" height="24" viewBox="0 0 24 26" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
          <path d="M4 8h16l1 16H3L4 8zM8 8V6a4 4 0 0 1 8 0v2" />
        </svg>
        <span data-cart-count="">0</span>
      </button>
    </header>
  );
}

export function BagDialog() {
  return (
    <>
      <dialog id="bag-dialog" className="bag-dialog" aria-labelledby="bag-title">
        <div className="bag-heading">
          <h2 id="bag-title">Ton sac de style</h2>
          <button type="button" id="close-bag" className="bag-close" aria-label="Fermer le sac de style">
            ×
          </button>
        </div>
        <p className="bag-note">
          Une sélection locale de tes pièces préférées. Aucune commande ni paiement n’est effectué ici.
        </p>
        <div id="bag-items" />
        <p id="bag-total" className="bag-total" />
        <button type="button" id="export-bag" className="bag-export" disabled>
          Télécharger ma sélection
        </button>
      </dialog>
      <div id="bag-status" className="bag-toast" role="status" aria-live="polite" />
    </>
  );
}
