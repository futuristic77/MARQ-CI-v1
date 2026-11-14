import { forwardRef } from "react";
import { LOOKS, PRODUCTS, formatFCFA, lookTotals, type Look } from "./data";

const SIZES_ATTR = "(min-width: 1800px) 540px, (min-width: 750px) 420px, 320px";
const label = (i: number, look: Look) => `Look ${i + 1}\u00a0: ${look.name}`;

function ModelImage({ look }: { look: Look }) {
  return (
    <img
      src={look.model}
      srcSet={`${look.model} 640w, ${look.original} 1080w`}
      sizes={SIZES_ATTR}
      loading="eager"
      decoding="async"
      width={1100}
      height={1956}
      draggable={false}
      data-model-image=""
      alt={look.name}
    />
  );
}

const Arrow = ({ d }: { d: string }) => (
  <svg width="26" height="14" viewBox="0 0 26 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

export const Runway = forwardRef<HTMLDivElement>(function Runway(_props, ref) {
  return (
    <div
      ref={ref}
      id="lookbook"
      className="rw rw--popup rw--list"
      data-count={LOOKS.length}
    >
      <div className="rw__sticky">
        <div className="rw__grid">
          <div className="rw__left">
            <div className="rw__head">
              <div className="rw__intro">
                <h1 className="rw__title">Essaie le look.</h1>
                <p className="rw__sub">
                  Six looks signés par des marques indépendantes d’ici, de la tête aux pieds. Touche un point pour voir la pièce.
                </p>
              </div>
              <span className="rw__sr" aria-live="polite" aria-atomic="true" data-rw-live />
            </div>

            <div
              className="rw__stage"
              data-rw-stage=""
              tabIndex={0}
              role="region"
              aria-roledescription="carrousel"
              aria-label="Essaie le look — utilise les flèches ou glisse pour changer de look"
            >
              <div className="rw__actors" data-rw-actors="">
                {LOOKS.map((look, i) => (
                  <div key={look.key} className="rw__model" data-rw-model="" data-index={i} aria-hidden="true">
                    <span className="rw__shadow" />
                    <div className="rw__figure">
                      <div className="rw__art">
                        <ModelImage look={look} />
                        <button type="button" className="rw__hit" data-rw-go={i} aria-label={label(i, look)} tabIndex={-1} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rw__heroes" data-rw-heroes="">
                {LOOKS.map((look, i) => (
                  <div
                    key={look.key}
                    className={`rw__hero${i === 0 ? " is-on" : ""}`}
                    data-rw-hero=""
                    data-index={i}
                    data-name={look.name}
                    data-label={label(i, look)}
                    data-probe={look.model}
                    aria-hidden={i === 0 ? "false" : "true"}
                  >
                    <div className="rw__morph">
                      <span className="rw__shadow" />
                      <div className="rw__figure">
                        <div className="rw__art">
                          <ModelImage look={look} />
                          <button type="button" className="rw__zoom" data-rw-zoom="" aria-label={`Voir le look : ${look.name}`} tabIndex={-1} />
                          <div className="rw__pins">
                            {look.pins.map((pin, p) => {
                              const product = PRODUCTS[look.products[p]!]!;
                              return (
                                <button
                                  key={p}
                                  type="button"
                                  className="rw__pin"
                                  data-rw-pin={p + 1}
                                  data-tip={product.name}
                                  style={{ left: `${pin.x}%`, top: `${pin.y}%`, ["--pi" as string]: p + 1 }}
                                  aria-label={`${p + 1} : ${product.name}`}
                                  tabIndex={-1}
                                >
                                  <span className="rw__pin-dot">{p + 1}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <span className="rw__sweep" />
              <span className="rw__cursor" data-rw-cursor="">
                <span className="rw__cursor-in">
                  <span className="rw__cursor-label rw__cursor-drag">Glisser</span>
                  <span className="rw__cursor-label rw__cursor-view">Voir</span>
                </span>
              </span>
              <span className="rw__walk">
                <span className="rw__walk-line" />
              </span>
            </div>

            <div className="rw__controls">
              <button type="button" className="rw__icon rw__prev" data-rw-prev="" aria-label="Look précédent">
                <Arrow d="M25 7H1M7 1L1 7l6 6" />
              </button>
              <div className="rw__ticks">
                {LOOKS.map((look, i) => (
                  <button
                    key={look.key}
                    type="button"
                    className="rw__tick"
                    data-rw-tick={i}
                    aria-current={i === 0 ? "true" : "false"}
                    aria-label={label(i, look)}
                  >
                    <span className="rw__tick-bar" />
                    <span className="rw__tick-label">
                      {String(i + 1).padStart(2, "0")}
                      <span className="rw__tick-name">{`\u00a0\u00a0${look.name}`}</span>
                    </span>
                  </button>
                ))}
              </div>
              <button type="button" className="rw__icon rw__auto" data-rw-auto="" aria-pressed="false" aria-label="Lecture automatique">
                <svg className="rw__play" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M7 4.5v15l12.5-7.5z" />
                </svg>
                <svg className="rw__pause" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M6.5 4.5h3.5v15H6.5zM14 4.5h3.5v15H14z" />
                </svg>
              </button>
              <button type="button" className="rw__icon rw__next" data-rw-next="" aria-label="Look suivant">
                <Arrow d="M1 7h24M19 1l6 6-6 6" />
              </button>
            </div>

            <div className="rw__lb" data-rw-lb="" role="region" aria-label="Voir le look" aria-hidden="true">
              <div className="rw__lb-stage" data-rw-lb-stage="" />
              <div className="rw__lb-top">
                <p className="rw__lb-cap">
                  <span className="rw__lb-kicker" data-rw-lb-kicker="" />
                  <span className="rw__lb-name" data-rw-lb-name="" />
                </p>
                <button type="button" className="rw__lb-close" data-rw-zoom-close="" aria-label="Fermer">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                    <path d="M5 5l14 14M19 5L5 19" />
                  </svg>
                </button>
              </div>
              <p className="rw__lb-hint">Touche un point pour découvrir la pièce</p>
            </div>
          </div>

          <div className="rw__panel">
            <div className="rw__panel-inner">
              <div className="rw__panel-head">
                <h2 className="rw__panel-title">Dans ce look</h2>
                <span className="rw__label" data-rw-pieces="">3 pièces</span>
              </div>
              {LOOKS.map((look, i) => (
                <LookPanel key={look.key} look={look} index={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

function LookPanel({ look, index }: { look: Look; index: number }) {
  const { full, bundle } = lookTotals(look);
  const pieces = `${look.products.length} pièces`;
  return (
    <div className={`rw__look-panel${index === 0 ? " is-in" : ""}`} data-rw-panel={index} data-pieces={pieces} hidden={index !== 0}>
      <div className="rw__mhead">
        <span className="rw__mhead-title">{look.name}</span>
        <span className="rw__label">{pieces}</span>
      </div>
      <ul className="rw__items" role="list">
        {look.products.map((pid, p) => {
          const product = PRODUCTS[pid]!;
          const num = p + 1;
          const pickerId = `rw-picker-${look.key}-${num}`;
          return (
            <li key={pid + p} className="rw__item" data-rw-card={num} style={{ ["--i" as string]: num }} data-title={product.name}>
              {look.tagged?.includes(num) && (
                <span className="rw__tag">
                  <span className="rw__tag-text">Nouveau</span>
                </span>
              )}
              <span className="rw__media" aria-hidden="true">
                <img src={product.photos[0].src} loading="lazy" decoding="async" alt="" width={800} height={1008} />
                <span className="rw__num">{num}</span>
              </span>
              <div className="rw__info">
                <span className="rw__type">{product.brand}</span>
                <span className="rw__name">{product.name}</span>
                <span className="rw__price">
                  <span>{formatFCFA(product.priceFCFA)}</span>
                </span>
              </div>
              <button
                type="button"
                className="rw__add"
                data-rw-add=""
                aria-expanded="false"
                aria-controls={pickerId}
                aria-label={`Ajouter au sac : ${product.name}`}
                data-added-label={`Ajouté au sac : ${product.name}`}
              >
                <svg className="rw__add-plus" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
                  <path d="M12 4v16M4 12h16" />
                </svg>
                <svg className="rw__add-check" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4.5 12.5l5 5L19.5 7" />
                </svg>
                <svg className="rw__add-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
                  <path d="M12 3a9 9 0 1 1-9 9" />
                </svg>
              </button>
              <div className="rw__picker" id={pickerId} data-rw-picker="" hidden>
                <div className="rw__picker-head">
                  <img src={product.photos[0].src} alt="" width={160} height={202} loading="lazy" />
                  <div>
                    <span className="rw__picker-title">{product.name}</span>
                    <span className="rw__picker-price">{formatFCFA(product.priceFCFA)}</span>
                  </div>
                  <button type="button" className="rw__picker-close" data-rw-pick-close="" aria-label="Fermer">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                      <path d="M5 5l14 14M19 5L5 19" />
                    </svg>
                  </button>
                </div>
                <fieldset className="rw__opt">
                  <legend className="rw__opt-name">{product.option}</legend>
                  <div className="rw__opt-values">
                    {product.variants.map((v, vi) => (
                      <label key={v.id} className="rw__pill">
                        <input
                          type="radio"
                          name={`rw-opt-${look.key}-${num}`}
                          value={v.id}
                          defaultChecked={vi === 0}
                          data-rw-option="0"
                        />
                        <span className="rw__pill-label">{v.size}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <button type="button" className="rw__confirm" data-rw-confirm="">
                  <span>Ajouter au sac</span>
                  <span className="rw__sr"> — {product.name}</span>
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="rw__bundle">
        <p className="rw__msg" data-rw-msg="" role="status" aria-live="polite" hidden />
        <div className="rw__bundle-row">
          <div className="rw__bundle-copy">
            <span className="rw__bundle-title">Le look complet</span>
            <span className="rw__bundle-note">Les 3 pièces ensemble, −10&nbsp;%</span>
          </div>
          <div className="rw__bundle-price">
            <s>{formatFCFA(full)}</s>
            <strong>{formatFCFA(bundle)}</strong>
          </div>
        </div>
        <button type="button" className="rw__cta" data-rw-all="">
          <span className="rw__cta-add">Ajouter le look complet au sac</span>
          <span className="rw__cta-m">Ajouter le look — {formatFCFA(bundle)}</span>
          <span className="rw__cta-done">Look complet dans ton sac</span>
          <svg className="rw__cta-arrow" width="22" height="12" viewBox="0 0 26 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M1 7h24M19 1l6 6-6 6" />
          </svg>
          <svg className="rw__cta-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M12 3a9 9 0 1 1-9 9" />
          </svg>
        </button>
      </div>
    </div>
  );
}
