import type { BagApi } from "./bag";

type Body = {
  el: HTMLElement;
  a: number;
  w: number;
  blur: number;
  // classic (phone) line state
  x: number;
  v: number;
  g: number;
  goal: number;
  trip: boolean;
  from: number;
};

const TAU = Math.PI * 2;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

const MSG_CHOOSE = "Choisis une taille pour : [items]";
const MSG_ERROR = "Impossible d’ajouter au sac. Réessaie.";

/**
 * Imperative engine for the runway section: 3D ring (desktop) / diagonal line (phone),
 * autoplay, drag, custom cursor, "Voir le look" popup, size pickers and bundle add.
 * React renders the static markup once; this owns all motion and state afterwards.
 */
export function mountRunway(root: HTMLElement, bag: BagApi): () => void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const n = Number(root.dataset["count"] || 6);
  const N = n * Math.ceil(8 / n);
  const K = 95;
  const C = 2 * Math.sqrt(K);
  const SPEED = 5000;
  const START = reduced ? 0 : 1.15;

  const $ = <T extends Element>(s: string, r: ParentNode = root) => r.querySelector(s) as T;
  const $$ = <T extends Element>(s: string, r: ParentNode = root) => Array.from(r.querySelectorAll(s)) as T[];

  const stage = $<HTMLElement>("[data-rw-stage]");
  const actors = $<HTMLElement>("[data-rw-actors]");
  const heroes = $$<HTMLElement>("[data-rw-hero]");
  const ticks = $$<HTMLElement>("[data-rw-tick]");
  const panels = $$<HTMLElement>("[data-rw-panel]");
  const live = $<HTMLElement>("[data-rw-live]");
  const piecesLabel = $<HTMLElement>("[data-rw-pieces]");
  const autoBtn = $<HTMLButtonElement>("[data-rw-auto]");
  const lb = $<HTMLElement>("[data-rw-lb]");
  const lbStage = $<HTMLElement>("[data-rw-lb-stage]");
  const lbKicker = $<HTMLElement>("[data-rw-lb-kicker]");
  const lbName = $<HTMLElement>("[data-rw-lb-name]");
  const lbClose = $<HTMLButtonElement>("[data-rw-zoom-close]");
  const cursor = $<HTMLElement>("[data-rw-cursor]");
  const panelEl = $<HTMLElement>(".rw__panel");

  // ---- clone bodies so the ring is always full -------------------------------------------
  const originals = $$<HTMLElement>("[data-rw-model]", actors);
  const clones: HTMLElement[] = [];
  for (let c = n; c < N; c++) {
    const src = originals[c % n]!;
    const clone = src.cloneNode(true) as HTMLElement;
    clone.dataset["rwClone"] = "";
    clone.dataset["index"] = String(c);
    clone.querySelectorAll("img").forEach((img) => (img.loading = "lazy"));
    actors.appendChild(clone);
    clones.push(clone);
  }
  const bodies: Body[] = $$<HTMLElement>("[data-rw-model]", actors).map((el) => ({
    el,
    a: Number(el.dataset["index"]),
    w: 0,
    blur: -1,
    x: 0,
    v: 0,
    g: 0,
    goal: 0,
    trip: false,
    from: 0,
  }));

  // ---- image decode ------------------------------------------------------------------------
  $$<HTMLImageElement>("img[data-model-image]").forEach((img) => {
    const mark = () => img.classList.add("is-decoded");
    img
      .decode()
      .then(mark)
      .catch(() => {
        if (img.naturalWidth) mark();
        else img.addEventListener("load", mark, { once: true });
      });
  });

  // ---- feet detection (so soles touch the floor line) --------------------------------------
  heroes.forEach((hero, i) => {
    const url = hero.dataset["probe"];
    if (!url) return;
    const probe = new Image();
    probe.crossOrigin = "anonymous";
    probe.onload = () => {
      try {
        const w = 48;
        const h = Math.max(1, Math.round((w * probe.naturalHeight) / probe.naturalWidth));
        const cv = document.createElement("canvas");
        cv.width = w;
        cv.height = h;
        const ctx = cv.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(probe, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;
        let last = h - 1;
        outer: for (let y = h - 1; y >= 0; y--) {
          for (let x = 0; x < w; x++) {
            if ((data[(y * w + x) * 4 + 3] ?? 0) > 40) {
              last = y;
              break outer;
            }
          }
        }
        const foot = clamp((h - 1 - last) / h, 0, 0.4).toFixed(4);
        hero.style.setProperty("--rw-foot", foot);
        bodies.filter((b) => b.a % n === i).forEach((b) => b.el.style.setProperty("--rw-foot", foot));
      } catch {
        /* tainted canvas: keep offset 0 */
      }
    };
    probe.src = url;
  });

  // ---- state -------------------------------------------------------------------------------
  let index = 0;
  let target = 0;
  let cur = -START;
  let vel = 0;
  let mobile = window.innerWidth <= 749;
  let ring = !mobile;
  let W = 0;
  let H = 0;
  let fs = 1;
  let still = false;
  let visible = true;
  let dragging = false;
  let playing = false;
  let engaged = false;
  let panelHover = false;
  let zoomed = false;
  let latchW = 0;
  let latchH = 0;
  let timer = 0;
  let raf = 0;
  let last = 0;
  let suppressUntil = 0;
  let destroyed = false;

  const wrapN = (x: number) => ((x % N) + N) % N;
  const mod = (x: number, m: number) => ((x % m) + m) % m;

  function initLine(offset: number) {
    for (const b of bodies) {
      b.goal = wrapN(b.a - target);
      b.x = b.g = b.goal + offset;
      b.v = 0;
      b.trip = false;
    }
  }

  function headerHeight() {
    let h = 0;
    document.querySelectorAll<HTMLElement>(".site-header").forEach((el) => {
      if (!el.contains(root) && el.offsetParent !== null) h += el.getBoundingClientRect().height;
    });
    return h;
  }

  function measure() {
    const wasRing = ring;
    mobile = window.innerWidth <= 749;
    ring = !mobile;
    let frameH: number;
    if (!mobile) {
      frameH = Math.max(380, window.innerHeight - headerHeight());
    } else {
      if (latchW !== window.innerWidth || Math.abs(latchH - window.innerHeight) >= 160 || !latchH) {
        latchW = window.innerWidth;
        latchH = window.innerHeight;
      }
      frameH = (latchH * clamp(109, 50, 120)) / 100;
    }
    root.style.setProperty("--rw-frame-h", `${Math.round(frameH)}px`);
    const r = stage.getBoundingClientRect();
    W = r.width;
    H = r.height;
    fs = ring ? 1.08 : 1;
    const modelH = ring ? Math.max(200, Math.round((H - 34 - 18) / 1.08)) : Math.max(200, Math.round(H - 24 - 18));
    const hx = ring ? 0.5 * W : 0.3 * W;
    const hy = ring ? 34 : 22;
    stage.style.setProperty("--rw-model-h", `${modelH}px`);
    stage.style.setProperty("--rw-hx", `${hx}px`);
    stage.style.setProperty("--rw-hy", `${hy}px`);
    stage.style.setProperty("--rw-fs", String(fs));
    root.style.setProperty("--rw-ax", `${W ? ((hx / W) * 100).toFixed(2) : 40}%`);
    for (const b of bodies) b.w = b.el.offsetWidth;
    if (wasRing !== ring) {
      cur = target;
      vel = 0;
      initLine(0);
      if (!mobile) dockAll();
    }
  }

  function unit() {
    if (ring) return Math.max(mobile ? 90 : 120, 0.3 * W);
    return Math.max(90, W * 0.32 * 1.6);
  }

  function put(b: Body, x: number, bottom: number, scale: number, op: number, blur: number, z: number) {
    const half = (b.w * scale) / 2;
    if (x + half < -4 || x - half > W + 4) op = 0;
    const s = b.el.style;
    s.transform = `translate3d(${x.toFixed(2)}px, ${(-bottom).toFixed(2)}px, 0) translateX(-50%) scale(${scale.toFixed(4)})`;
    s.opacity = op.toFixed(3);
    s.zIndex = String(z);
    s.visibility = op < 0.01 ? "hidden" : "";
    s.pointerEvents = op < 0.5 ? "none" : "";
    const br = Math.round(blur * 10) / 10;
    if (br !== b.blur) {
      b.blur = br;
      s.filter = br > 0.05 ? `blur(${br}px)` : "";
    }
  }

  function renderRing() {
    const cx = 0.5 * W;
    const R = (mobile ? 0.72 : 0.62) * W;
    const P = (mobile ? 1.9 : 1.65) * W;
    const floor = H - 34;
    const horizon = 0.36 * H;
    const step = TAU / N;
    for (const b of bodies) {
      let phi = mod((b.a - cur) * step, TAU);
      if (phi > Math.PI) phi -= TAU;
      const cos = Math.cos(phi);
      const z = R * (1 - cos);
      const persp = P / (P + z);
      const sl = Math.abs(phi) / step;
      const scale = persp * (1 + (fs - 1) * clamp(1 - sl, 0, 1));
      const x = cx + R * Math.sin(phi) * persp;
      const feet = horizon + (floor - horizon) * persp;
      const blur = sl <= 1 ? 1.8 * sl : Math.min(1.8 + (sl - 1) * 2, 6.5);
      let op = clamp((cos + 0.55) / 0.3, 0, 1);
      if (still && sl < 0.02) op = 0;
      put(b, x, H - feet, scale, op, blur, Math.round(scale * 1000));
    }
  }

  function renderLine() {
    const ax = 0.3, ay = 22, sx = 0.32, sy = 22, sr = 0.76, ex = 0.55, d = 4;
    for (const b of bodies) {
      let k = b.x;
      let e = -1;
      if (b.trip) {
        const span = Math.abs(b.goal - b.from) || 1;
        const u = clamp(Math.abs(b.x - b.from) / span, 0, 1);
        if (b.goal > b.from) {
          if (u < 0.5) e = 2 * u * 1.4;
          else k = b.goal + 2 * (1 - u);
        } else if (u < 0.5) k = b.from + 2 * u;
        else e = 2 * (1 - u) * 1.4;
      } else if (k < 0) e = Math.min(-k, 1.4);
      if (e >= 0) {
        put(b, W * (ax - ex * e), ay - 22 * e, 1 + 0.14 * e, Math.max(0, 1 - 1.05 * e), 4 * Math.min(e, 1), 1100);
      } else {
        let op = k <= d - 1 ? 1 - 0.13 * k : Math.max(0, 0.61 * (d - k));
        if (still && Math.abs(k) < 0.02) op = 0;
        put(b, W * (ax + sx * k), ay + sy * k, Math.pow(sr, k), op, Math.min(0.9 * k, 3.2), 1000 - Math.round(10 * k));
      }
    }
  }

  const renderAll = () => (ring ? renderRing() : renderLine());

  function stepRing(dt: number) {
    if (reduced && !dragging) {
      cur = target;
      vel = 0;
      return true;
    }
    const h = dt / 3;
    for (let i = 0; i < 3; i++) {
      const acc = -K * (cur - target) - C * vel;
      vel += acc * h;
      cur += vel * h;
    }
    if (Math.abs(cur - target) <= 0.0005 && Math.abs(vel) <= 0.0005) {
      cur = target;
      vel = 0;
      return true;
    }
    return false;
  }

  function stepLine(dt: number) {
    let settled = true;
    for (const b of bodies) {
      const goal = wrapN(b.a - target);
      if (Math.abs(goal - b.goal) > N / 2) {
        b.trip = true;
        b.from = b.x;
      }
      b.goal = goal;
      if (reduced && !dragging) {
        b.x = b.g = goal;
        b.v = 0;
        b.trip = false;
        continue;
      }
      const tau = dragging ? 0.016 : b.trip ? 0.1 : 0.03 + 0.04 * Math.min(goal, 4);
      b.g += (goal - b.g) * (1 - Math.exp(-dt / tau));
      const h = dt / 3;
      for (let i = 0; i < 3; i++) {
        const acc = -K * (b.x - b.g) - C * b.v;
        b.v += acc * h;
        b.x += b.v * h;
      }
      if (b.trip && Math.abs(b.x - goal) < 0.02) b.trip = false;
      if (Math.abs(b.x - goal) < 0.0006 && Math.abs(b.v) < 0.0006 && Math.abs(b.g - goal) < 0.0006) {
        b.x = b.g = goal;
        b.v = 0;
      } else settled = false;
    }
    return settled;
  }

  function setStill(on: boolean) {
    if (still === on) return;
    still = on;
    root.classList.toggle("rw--still", on);
  }

  function frame(now: number) {
    raf = 0;
    if (destroyed) return;
    const dt = last ? Math.min(0.034, (now - last) / 1000) : 1 / 60;
    last = now;
    const settled = ring ? stepRing(dt) : stepLine(dt);
    if (settled && !dragging) {
      setStill(true);
      renderAll();
      last = 0;
      return;
    }
    setStill(false);
    renderAll();
    raf = requestAnimationFrame(frame);
  }

  function kick() {
    if (raf || destroyed || !visible || document.hidden) return;
    last = 0;
    raf = requestAnimationFrame(frame);
  }

  // ---- index / navigation ------------------------------------------------------------------
  function rank(a: number) {
    const T = Math.round(target);
    if (ring) {
      let k = mod(a - T, N);
      if (k > N / 2) k -= N;
      return k;
    }
    return wrapN(a - T);
  }

  function updateBodyA11y() {
    for (const b of bodies) {
      const k = rank(b.a);
      const on = k !== 0 && Math.abs(k) <= (ring ? 2 : 3);
      const hit = b.el.querySelector<HTMLButtonElement>(".rw__hit");
      if (hit) hit.tabIndex = on ? 0 : -1;
      if (on) b.el.removeAttribute("aria-hidden");
      else b.el.setAttribute("aria-hidden", "true");
    }
  }

  function replay(el: Element | null, cls: string) {
    if (!el) return;
    el.classList.remove(cls);
    void (el as HTMLElement).offsetWidth;
    el.classList.add(cls);
  }

  function setIndex(i: number, silent = false) {
    const prev = index;
    const changed = i !== prev;
    if (changed) {
      closeLb();
      if (mobile) closeAllPickers();
    }
    index = i;
    updateBodyA11y();
    kick();
    if (changed || silent) {
      root.style.setProperty("--rw-progress", ((i + 1) / n).toFixed(3));
      heroes.forEach((h, j) => {
        h.classList.toggle("is-on", j === i);
        h.classList.toggle("was", changed && j === prev);
        h.setAttribute("aria-hidden", j === i ? "false" : "true");
        const z = h.querySelector<HTMLButtonElement>("[data-rw-zoom]");
        if (z) z.tabIndex = j === i ? 0 : -1;
      });
      ticks.forEach((t, j) => {
        t.setAttribute("aria-current", j === i ? "true" : "false");
        t.classList.toggle("is-past", j < i);
      });
      panels.forEach((p, j) => (p.hidden = j !== i));
      const pieces = panels[i]?.dataset["pieces"];
      if (piecesLabel && pieces) piecesLabel.textContent = pieces;
      if (!silent) {
        panels.forEach((p) => p.classList.remove("is-in"));
        const panel = panels[i]!;
        void panel.offsetWidth;
        panel.classList.add("is-in");
        replay(piecesLabel, "is-swap");
        replay(panel.querySelector(".rw__mhead"), "is-swap");
        if (!reduced) replay(stage, "is-sweep");
        if (live) live.textContent = heroes[i]?.dataset["label"] || "";
      }
    }
    clearHot();
    restartBar();
  }

  function moveTo(T: number) {
    target = T;
    setStill(false);
    setIndex(mod(T, n));
    kick();
  }
  const next = () => moveTo(Math.round(target) + 1);
  const prev = () => moveTo(Math.round(target) - 1);
  function go(i: number) {
    let d = mod(i - index, n);
    if (d > n / 2) d -= n;
    moveTo(Math.round(target) + d);
  }

  // ---- autoplay ----------------------------------------------------------------------------
  function restartBar() {
    clearTimeout(timer);
    ticks.forEach((t) => t.classList.remove("is-run"));
    if (!playing) return;
    void root.offsetWidth;
    ticks[index]?.classList.add("is-run");
    timer = window.setTimeout(onTimer, SPEED);
  }
  function onTimer() {
    if (playing && visible && !dragging && !document.hidden && !panelHover && !zoomed && !engaged) next();
    else restartBar();
  }
  function play(on: boolean) {
    playing = on;
    root.classList.toggle("is-playing", on);
    autoBtn?.setAttribute("aria-pressed", String(on));
    restartBar();
  }
  function engage() {
    engaged = true;
    if (playing) play(false);
  }

  // ---- hot linking pins <-> rows -----------------------------------------------------------
  function clearHot() {
    root.querySelectorAll(".is-hot").forEach((el) => el.classList.remove("is-hot"));
  }
  function reveal(card: HTMLElement) {
    const list = card.closest<HTMLElement>(".rw__items");
    const behavior: ScrollBehavior = reduced ? "auto" : "smooth";
    if (!list) return;
    const cr = card.getBoundingClientRect();
    const lr = list.getBoundingClientRect();
    if (list.scrollWidth > list.clientWidth + 1) {
      list.scrollTo({ left: list.scrollLeft + cr.left - lr.left - 20, behavior });
    } else if (list.scrollHeight > list.clientHeight + 1) {
      list.scrollTo({ top: list.scrollTop + cr.top - lr.top - 12, behavior });
    } else if (cr.top < 0 || cr.bottom > window.innerHeight - 140) {
      window.scrollBy({ top: cr.top - 0.3 * window.innerHeight, behavior });
    }
  }
  function hot(num: number, scroll = false) {
    clearHot();
    const scope = zoomed ? lbStage : heroes[index];
    scope?.querySelector(`[data-rw-pin="${num}"]`)?.classList.add("is-hot");
    const card = panels[index]?.querySelector<HTMLElement>(`[data-rw-card="${num}"]`);
    if (card) {
      card.classList.add("is-hot");
      if (scroll) reveal(card);
    }
  }

  // ---- pickers -----------------------------------------------------------------------------
  let host: HTMLElement | null = null;
  let sheetCard: HTMLElement | null = null;
  const pickerOf = (card: HTMLElement) =>
    document.getElementById(card.querySelector("[data-rw-add]")?.getAttribute("aria-controls") || "") as HTMLElement | null;
  const cardOfPicker = (picker: HTMLElement) =>
    root.querySelector<HTMLElement>(`[aria-controls="${picker.id}"]`)?.closest<HTMLElement>("[data-rw-card]") || null;

  const SHEET_VARS = [
    "--rw-panel", "--rw-text", "--rw-muted", "--rw-line", "--rw-accent", "--rw-on-accent", "--rw-btn-bg",
    "--rw-btn-fg", "--rw-btn-radius", "--rw-pill-radius", "--rw-bar-r", "--rw-thumb-radius", "--rw-pt-size",
    "--rw-price", "--rw-opt", "--rw-ease", "--rw-ease-sheet", "--rw-ease-spring",
  ];
  function ensureHost() {
    if (host) return host;
    host = document.createElement("div");
    host.className = "rw-sheet-host";
    const cs = getComputedStyle(root);
    SHEET_VARS.forEach((v) => host!.style.setProperty(v, cs.getPropertyValue(v)));
    host.style.fontFamily = cs.fontFamily;
    host.style.color = cs.color;
    const scrim = document.createElement("button");
    scrim.type = "button";
    scrim.className = "rw__pick-scrim";
    scrim.dataset["rwPickClose"] = "";
    scrim.tabIndex = -1;
    scrim.setAttribute("aria-hidden", "true");
    host.appendChild(scrim);
    host.addEventListener("click", onClick);
    host.addEventListener("change", onChange);
    host.addEventListener("keydown", onKey);
    document.body.appendChild(host);
    return host;
  }
  function dock(card: HTMLElement, picker: HTMLElement) {
    if (picker.parentElement !== card) card.appendChild(picker);
    if (sheetCard === card) {
      sheetCard = null;
      host?.classList.remove("is-open");
      root.classList.remove("rw--picking");
    }
  }
  function openPicker(card: HTMLElement) {
    const picker = pickerOf(card);
    const btn = card.querySelector<HTMLButtonElement>("[data-rw-add]");
    if (!picker || card.classList.contains("is-added")) return;
    if (mobile) {
      if (sheetCard && sheetCard !== card) closePicker(sheetCard);
      const h = ensureHost();
      h.appendChild(picker);
      sheetCard = card;
      root.classList.add("rw--picking");
      requestAnimationFrame(() => h.classList.add("is-open"));
    }
    picker.hidden = false;
    card.classList.add("is-picking");
    btn?.setAttribute("aria-expanded", "true");
    picker.querySelector<HTMLInputElement>("input:checked")?.focus({ preventScroll: true });
    if (!mobile) reveal(card);
  }
  function closePicker(card: HTMLElement, refocus = false) {
    const picker = pickerOf(card);
    const btn = card.querySelector<HTMLButtonElement>("[data-rw-add]");
    if (!picker) return;
    picker.hidden = true;
    card.classList.remove("is-picking");
    if (!card.classList.contains("is-added")) btn?.setAttribute("aria-expanded", "false");
    dock(card, picker);
    if (refocus) btn?.focus({ preventScroll: true });
  }
  function closeAllPickers() {
    root.querySelectorAll<HTMLElement>("[data-rw-card].is-picking").forEach((c) => closePicker(c));
    if (sheetCard) closePicker(sheetCard);
  }
  function dockAll() {
    if (!host) return;
    host.querySelectorAll<HTMLElement>("[data-rw-picker]").forEach((p) => {
      const card = cardOfPicker(p);
      if (card) dock(card, p);
    });
    host.classList.remove("is-open");
    sheetCard = null;
    root.classList.remove("rw--picking");
  }

  function syncSelection(card: HTMLElement, touched: boolean) {
    const picker = pickerOf(card);
    const checked = picker?.querySelector<HTMLInputElement>("input[data-rw-option]:checked");
    if (checked) card.dataset["selected"] = checked.value;
    if (touched) card.dataset["touched"] = "1";
  }

  function setMsg(panel: HTMLElement, text: string) {
    const msg = panel.querySelector<HTMLElement>("[data-rw-msg]");
    if (!msg) return;
    msg.textContent = text;
    msg.hidden = !text;
    if (text) replay(msg, "is-new");
  }

  function markAdded(card: HTMLElement) {
    card.classList.remove("is-loading");
    closePicker(card);
    card.classList.add("is-added");
    const btn = card.querySelector<HTMLButtonElement>("[data-rw-add]");
    if (btn) {
      btn.setAttribute("aria-label", btn.dataset["addedLabel"] || "");
      btn.removeAttribute("aria-expanded");
    }
    if (mobile && !reduced && "vibrate" in navigator) {
      try {
        navigator.vibrate(12);
      } catch {
        /* ignore */
      }
    }
  }

  function checkComplete(panel: HTMLElement) {
    const cards = $$<HTMLElement>("[data-rw-card]", panel);
    if (cards.length >= 2 && cards.every((c) => c.classList.contains("is-added"))) {
      panel.classList.add("is-complete");
      setMsg(panel, "");
    }
  }

  function addCards(cards: HTMLElement[], panel: HTMLElement, cta?: HTMLElement) {
    cards.forEach((c) => c.classList.add("is-loading"));
    cta?.classList.add("is-loading");
    window.setTimeout(
      () => {
        if (destroyed) return;
        try {
          bag.add(cards.map((c) => ({ id: Number(c.dataset["selected"]), quantity: 1 })));
          cards.forEach(markAdded);
        } catch {
          cards.forEach((c) => c.classList.remove("is-loading"));
          setMsg(panel, MSG_ERROR);
        }
        cta?.classList.remove("is-loading");
        checkComplete(panel);
      },
      reduced ? 0 : 420,
    );
  }

  function addAll(panel: HTMLElement, cta: HTMLElement) {
    if (panel.classList.contains("is-complete") || cta.classList.contains("is-loading")) return;
    setMsg(panel, "");
    const cards = $$<HTMLElement>("[data-rw-card]", panel).filter(
      (c) => !c.classList.contains("is-added") && !c.classList.contains("is-loading"),
    );
    const ready = cards.filter((c) => c.dataset["touched"] === "1" && c.dataset["selected"]);
    const pending = cards.filter((c) => !ready.includes(c));
    if (ready.length) addCards(ready, panel, cta);
    if (pending.length) {
      (mobile ? pending.slice(0, 1) : pending).forEach((c) => openPicker(c));
      if (!mobile && pending[0]) reveal(pending[0]);
      setMsg(panel, MSG_CHOOSE.replace("[items]", pending.map((c) => c.dataset["title"]).join(", ")));
    }
  }

  // ---- popup ("Voir le look") --------------------------------------------------------------
  let lbTimer = 0;
  function openLb() {
    if (zoomed) return;
    const hero = heroes[index];
    const fig = hero?.querySelector<HTMLElement>(".rw__figure");
    const shadow = hero?.querySelector<HTMLElement>(".rw__shadow");
    if (!hero || !fig || !shadow) return;
    engage();
    clearHot();
    clearTimeout(lbTimer);
    const wrap = document.createElement("div");
    wrap.className = "rw__lb-model";
    wrap.append(shadow.cloneNode(true), fig.cloneNode(true));
    wrap.querySelector("[data-rw-zoom]")?.remove();
    wrap.querySelectorAll<HTMLElement>("[data-rw-pin]").forEach((p) => (p.tabIndex = 0));
    const foot = hero.style.getPropertyValue("--rw-foot");
    if (foot) wrap.style.setProperty("--rw-foot", foot);
    lbStage.replaceChildren(wrap);
    const sr = lbStage.getBoundingClientRect();
    const h = Math.max(160, Math.min(sr.height, sr.width / 0.5625));
    wrap.style.setProperty("--rw-model-h", `${h}px`);
    wrap.querySelectorAll("img").forEach((img) => {
      img.loading = "eager";
      img.sizes = `${Math.round(h * 0.5625)}px`;
      img.classList.add("is-decoded");
    });
    lbKicker.textContent = `Look ${String(index + 1).padStart(2, "0")}`;
    lbName.textContent = hero.dataset["name"] || "";
    zoomed = true;
    root.classList.add("rw--zoom");
    lb.setAttribute("aria-hidden", "false");
    if (!reduced) {
      const a = fig.getBoundingClientRect();
      const b = wrap.querySelector(".rw__figure")!.getBoundingClientRect();
      wrap.style.transition = "none";
      wrap.style.transformOrigin = "0 100%";
      wrap.style.transform = `translate3d(${a.left - b.left}px, ${a.bottom - b.bottom}px, 0) scale(${a.height / b.height})`;
      void wrap.offsetWidth;
      wrap.style.transition = "";
      wrap.style.transform = "";
    }
    lbClose?.focus({ preventScroll: true });
  }
  function closeLb() {
    if (!zoomed) return;
    zoomed = false;
    const wrap = lbStage.firstElementChild as HTMLElement | null;
    const fig = heroes[index]?.querySelector(".rw__figure");
    if (wrap && fig && !reduced) {
      wrap.style.transform = "";
      const a = fig.getBoundingClientRect();
      const b = wrap.querySelector(".rw__figure")!.getBoundingClientRect();
      wrap.style.transformOrigin = "0 100%";
      wrap.style.transform = `translate3d(${a.left - b.left}px, ${a.bottom - b.bottom}px, 0) scale(${a.height / b.height})`;
    }
    root.classList.remove("rw--zoom");
    lb.setAttribute("aria-hidden", "true");
    const hadFocus = lb.contains(document.activeElement);
    lbTimer = window.setTimeout(() => {
      if (!zoomed) lbStage.replaceChildren();
    }, 950);
    if (hadFocus) stage.focus({ preventScroll: true });
    restartBar();
  }

  // ---- events ------------------------------------------------------------------------------
  function onClick(e: Event) {
    const t = e.target as Element;
    if (!(t instanceof Element)) return;
    const c = <T extends Element = HTMLElement>(s: string) => t.closest(s) as T | null;

    if (c(".rw__panel") && c("button, a, input, select, label")) engage();

    if (c("[data-rw-pick-close]")) {
      const picker = c("[data-rw-picker]");
      const card = picker ? cardOfPicker(picker) : sheetCard;
      if (card) closePicker(card, true);
      return;
    }
    if (c("[data-rw-zoom-close]")) return closeLb();
    if (zoomed && (t === lb || t === lbStage || (c("[data-rw-lb]") && !c(".rw__lb-model") && !c(".rw__lb-top"))))
      return closeLb();
    if (c("[data-rw-zoom]")) return openLb();
    if (c("[data-rw-next]")) return next();
    if (c("[data-rw-prev]")) return prev();
    const tick = c("[data-rw-tick]");
    if (tick) return go(Number(tick.dataset["rwTick"]));
    if (c("[data-rw-auto]")) {
      if (!playing) engaged = false;
      return play(!playing);
    }
    const pin = c("[data-rw-pin]");
    if (pin) {
      engage();
      return hot(Number(pin.dataset["rwPin"]), true);
    }
    const hit = c("[data-rw-go]");
    if (hit) {
      const body = hit.closest<HTMLElement>("[data-rw-model]");
      const k = body ? rank(Number(body.dataset["index"])) : 0;
      if (k !== 0 && Math.abs(k) < N / 2) moveTo(Math.round(target) + k);
      else openLb();
      return;
    }
    const confirm = c("[data-rw-confirm]");
    if (confirm) {
      const picker = confirm.closest<HTMLElement>("[data-rw-picker]");
      const card = picker ? cardOfPicker(picker) : null;
      if (!card || card.classList.contains("is-added") || card.classList.contains("is-loading")) return;
      syncSelection(card, true);
      const panel = card.closest<HTMLElement>("[data-rw-panel]")!;
      setMsg(panel, "");
      addCards([card], panel);
      return;
    }
    const add = c("[data-rw-add]");
    if (add) {
      const card = add.closest<HTMLElement>("[data-rw-card]")!;
      if (card.classList.contains("is-added") || card.classList.contains("is-loading")) return;
      if (card.classList.contains("is-picking")) closePicker(card);
      else openPicker(card);
      return;
    }
    const all = c("[data-rw-all]");
    if (all) {
      const panel = all.closest<HTMLElement>("[data-rw-panel]");
      if (panel) addAll(panel, all);
    }
  }

  function onChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (!input.matches?.("input[data-rw-option]")) return;
    engage();
    const picker = input.closest<HTMLElement>("[data-rw-picker]");
    const card = picker ? cardOfPicker(picker) : null;
    if (card) syncSelection(card, true);
  }

  function onKey(e: KeyboardEvent) {
    if (e.key !== "Escape") return;
    if (sheetCard) {
      closePicker(sheetCard, true);
      return;
    }
    closeLb();
  }

  function onStageKey(e: KeyboardEvent) {
    if (e.target !== stage) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      next();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      prev();
    }
  }

  function onClickCapture(e: Event) {
    if (performance.now() < suppressUntil) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  // drag
  type Ptr = { id: number; x0: number; y0: number; t: number; drag: boolean; samples: { x: number; t: number }[] };
  let ptr: Ptr | null = null;
  function onDown(e: PointerEvent) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (zoomed) return;
    ptr = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t: target, drag: false, samples: [{ x: e.clientX, t: e.timeStamp }] };
  }
  function onMove(e: PointerEvent) {
    if (e.pointerType === "mouse") moveCursor(e);
    if (!ptr || e.pointerId !== ptr.id) return;
    if (e.pointerType === "mouse" && !(e.buttons & 1)) return endDrag(e);
    const dx = e.clientX - ptr.x0;
    const dy = e.clientY - ptr.y0;
    ptr.samples.push({ x: e.clientX, t: e.timeStamp });
    if (ptr.samples.length > 6) ptr.samples.shift();
    if (!ptr.drag) {
      if (Math.abs(dy) > 10 && Math.abs(dy) >= Math.abs(dx)) {
        ptr = null;
        return;
      }
      if (Math.abs(dx) > 8 && Math.abs(dx) > 1.2 * Math.abs(dy)) {
        ptr.drag = true;
        dragging = true;
        root.classList.add("is-dragging");
        try {
          stage.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      } else return;
    }
    target = ptr.t - dx / unit();
    setStill(false);
    kick();
  }
  function endDrag(e: PointerEvent) {
    if (!ptr || e.pointerId !== ptr.id) return;
    const p = ptr;
    ptr = null;
    if (!p.drag) return;
    dragging = false;
    root.classList.remove("is-dragging");
    suppressUntil = performance.now() + 60;
    const s = p.samples;
    const first = s[0]!;
    const lastS = s[s.length - 1]!;
    const vx = s.length > 1 ? (lastS.x - first.x) / Math.max(1, lastS.t - first.t) : 0;
    const dx = e.clientX - p.x0;
    const from = Math.round(p.t);
    const sign = -1;
    if (mobile) {
      if (Math.abs(dx) > 30 || Math.abs(vx) > 0.3) moveTo(from + sign * (dx > 0 ? 1 : -1));
      else moveTo(from);
    } else {
      let i = Math.round(target + (sign * vx * 160) / unit());
      if (i === from && Math.abs(vx) > 0.3) i = from + sign * Math.sign(vx);
      moveTo(clamp(i, from - 2, from + 2));
    }
  }

  // trackpad
  let wheelAcc = 0;
  let wheelLock = 0;
  function onWheel(e: WheelEvent) {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    if (performance.now() < wheelLock) return;
    wheelAcc += e.deltaX;
    if (Math.abs(wheelAcc) > 45) {
      if (wheelAcc > 0) next();
      else prev();
      wheelAcc = 0;
      wheelLock = performance.now() + 520;
    }
  }

  // custom cursor
  let cx = 0, cy = 0, tx = 0, ty = 0, cOn = false, craf = 0;
  if (!finePointer) cursor?.remove();
  else root.classList.add("rw--cursor");
  function cursorLoop() {
    craf = 0;
    const f = reduced ? 1 : 0.18;
    cx += (tx - cx) * f;
    cy += (ty - cy) * f;
    if (cursor) cursor.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
    if (Math.hypot(tx - cx, ty - cy) > 0.2) craf = requestAnimationFrame(cursorLoop);
  }
  function moveCursor(e: PointerEvent) {
    if (!finePointer || !cursor) return;
    const r = stage.getBoundingClientRect();
    tx = e.clientX - r.left;
    ty = e.clientY - r.top;
    if (!cOn) {
      cx = tx;
      cy = ty;
      cOn = true;
      cursor.classList.add("is-on");
    }
    const t = e.target as Element;
    cursor.classList.toggle("is-view", !dragging && !!t.closest?.("[data-rw-zoom]"));
    cursor.classList.toggle("is-link", !dragging && !!t.closest?.("[data-rw-pin], [data-rw-go]"));
    if (!craf) craf = requestAnimationFrame(cursorLoop);
  }
  function onStageLeave() {
    cOn = false;
    cursor?.classList.remove("is-on", "is-link", "is-view");
  }

  // panel hover
  function onPanelEnter(e: PointerEvent) {
    if (e.pointerType === "mouse") panelHover = true;
  }
  function onPanelLeave(e: PointerEvent) {
    if (e.pointerType !== "mouse") return;
    panelHover = false;
    restartBar();
  }
  function onPanelOver(e: PointerEvent) {
    if (e.pointerType !== "mouse") return;
    const card = (e.target as Element).closest?.<HTMLElement>("[data-rw-card]");
    if (card && !card.classList.contains("is-hot")) hot(Number(card.dataset["rwCard"]));
  }
  function onPanelOut(e: PointerEvent) {
    if (e.pointerType !== "mouse") return;
    const card = (e.target as Element).closest?.("[data-rw-card]");
    if (card && !card.contains(e.relatedTarget as Node)) clearHot();
  }

  // resize / visibility
  let resizeT = 0;
  function onResize() {
    clearTimeout(resizeT);
    resizeT = window.setTimeout(() => {
      measure();
      renderAll();
      kick();
    }, 120);
  }
  const ro = new ResizeObserver(() => {
    measure();
    renderAll();
  });
  ro.observe(stage);

  const io = new IntersectionObserver(
    ([entry]) => {
      visible = !!entry?.isIntersecting;
      if (visible) {
        kick();
        restartBar();
      } else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    },
    { threshold: 0 },
  );
  io.observe(root);

  let revealIo: IntersectionObserver | null = null;
  if (reduced) root.classList.add("is-revealed");
  else {
    revealIo = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        revealIo?.disconnect();
        requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add("is-revealed")));
      },
      { threshold: 0, rootMargin: "0px 0px -22% 0px" },
    );
    revealIo.observe(root);
  }

  function onVis() {
    if (!document.hidden) {
      kick();
      restartBar();
    }
  }

  // ---- init --------------------------------------------------------------------------------
  root.classList.add("rw--js");
  measure();
  cur = ring ? -START : target;
  initLine(START);
  $$<HTMLElement>("[data-rw-card]").forEach((card) => syncSelection(card, false));
  setIndex(0, true);
  renderAll();
  if (!reduced) play(true);
  kick();

  root.addEventListener("click", onClickCapture, true);
  root.addEventListener("click", onClick);
  root.addEventListener("change", onChange);
  root.addEventListener("keydown", onKey);
  stage.addEventListener("keydown", onStageKey);
  stage.addEventListener("pointerdown", onDown);
  stage.addEventListener("pointermove", onMove);
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);
  stage.addEventListener("pointerleave", onStageLeave);
  stage.addEventListener("wheel", onWheel, { passive: false });
  panelEl?.addEventListener("pointerenter", onPanelEnter);
  panelEl?.addEventListener("pointerleave", onPanelLeave);
  panelEl?.addEventListener("pointerover", onPanelOver);
  panelEl?.addEventListener("pointerout", onPanelOut);
  window.addEventListener("resize", onResize);
  document.addEventListener("visibilitychange", onVis);

  return () => {
    destroyed = true;
    cancelAnimationFrame(raf);
    cancelAnimationFrame(craf);
    clearTimeout(timer);
    clearTimeout(resizeT);
    clearTimeout(lbTimer);
    ro.disconnect();
    io.disconnect();
    revealIo?.disconnect();
    root.removeEventListener("click", onClickCapture, true);
    root.removeEventListener("click", onClick);
    root.removeEventListener("change", onChange);
    root.removeEventListener("keydown", onKey);
    stage.removeEventListener("keydown", onStageKey);
    stage.removeEventListener("pointerdown", onDown);
    stage.removeEventListener("pointermove", onMove);
    stage.removeEventListener("pointerup", endDrag);
    stage.removeEventListener("pointercancel", endDrag);
    stage.removeEventListener("pointerleave", onStageLeave);
    stage.removeEventListener("wheel", onWheel);
    panelEl?.removeEventListener("pointerenter", onPanelEnter);
    panelEl?.removeEventListener("pointerleave", onPanelLeave);
    panelEl?.removeEventListener("pointerover", onPanelOver);
    panelEl?.removeEventListener("pointerout", onPanelOut);
    window.removeEventListener("resize", onResize);
    document.removeEventListener("visibilitychange", onVis);
    dockAll();
    host?.remove();
    clones.forEach((c) => c.remove());
    root.classList.remove("rw--js", "rw--still", "rw--cursor", "rw--zoom", "is-playing", "is-revealed", "is-dragging");
  };
}
