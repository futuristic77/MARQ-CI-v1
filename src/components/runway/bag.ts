import { findVariant, formatFCFA } from "./data";

const STORAGE_KEY = "marqci-styling-bag-v1";
type Entry = { id: number; quantity: number };

export type BagApi = {
  add: (items: Entry[]) => void;
  destroy: () => void;
};

function load(): Entry[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(
        (e) =>
          e &&
          Number.isSafeInteger(e.id) &&
          Number.isInteger(e.quantity) &&
          e.quantity >= 1 &&
          e.quantity <= 20 &&
          findVariant(e.id),
      )
      .slice(0, 50);
  } catch {
    return [];
  }
}

function save(entries: Entry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* storage unavailable */
  }
}

/** Wires the header bag button, the bag dialog and the toast (all rendered as static markup). */
export function mountBag(): BagApi {
  let entries = load();
  const dialog = document.getElementById("bag-dialog") as HTMLDialogElement | null;
  const list = document.getElementById("bag-items");
  const total = document.getElementById("bag-total");
  const exportBtn = document.getElementById("export-bag") as HTMLButtonElement | null;
  const toast = document.getElementById("bag-status");
  let toastTimer = 0;

  function count() {
    const n = entries.reduce((s, e) => s + e.quantity, 0);
    document.querySelectorAll("[data-cart-count]").forEach((el) => (el.textContent = String(n)));
  }

  function render() {
    count();
    if (!list || !total || !exportBtn) return;
    list.replaceChildren();
    if (!entries.length) {
      const p = document.createElement("p");
      p.className = "bag-note";
      p.textContent = "Ton sac est vide. Choisis une taille à côté d’une pièce pour l’ajouter.";
      list.append(p);
      total.textContent = "";
      exportBtn.disabled = true;
      return;
    }
    let sum = 0;
    for (const e of entries) {
      const found = findVariant(e.id);
      if (!found) continue;
      const { product, variant } = found;
      sum += product.price * e.quantity;
      const row = document.createElement("div");
      row.className = "bag-row";
      const img = document.createElement("img");
      img.src = product.image;
      img.alt = product.name;
      img.width = 60;
      img.height = 80;
      const info = document.createElement("div");
      const brand = document.createElement("span");
      brand.className = "bag-brand";
      brand.textContent = product.brand;
      const h3 = document.createElement("h3");
      h3.textContent = product.name;
      const meta = document.createElement("p");
      meta.textContent = `${product.option} ${variant.size} · Quantité ${e.quantity} · ${formatFCFA(product.price)}`;
      info.append(brand, h3, meta);
      const rm = document.createElement("button");
      rm.type = "button";
      rm.className = "bag-remove";
      rm.textContent = "×";
      rm.setAttribute("aria-label", `Retirer ${product.name}`);
      rm.addEventListener("click", () => {
        entries = entries.filter((x) => x !== e);
        save(entries);
        render();
      });
      row.append(img, info, rm);
      list.append(row);
    }
    total.textContent = `Sous-total indicatif ${formatFCFA(sum)}`;
    exportBtn.disabled = false;
  }

  function showToast(text: string) {
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("is-on"), 2500);
  }

  function add(items: Entry[]) {
    for (const item of items) {
      if (!findVariant(item.id)) throw new Error("Choisis une taille disponible.");
    }
    for (const item of items) {
      const existing = entries.find((e) => e.id === item.id);
      if (existing) existing.quantity = Math.min(20, existing.quantity + 1);
      else entries.push({ id: item.id, quantity: 1 });
    }
    entries = entries.slice(0, 50);
    save(entries);
    render();
    showToast(items.length > 1 ? "Look ajouté à ton sac de style" : "Pièce ajoutée à ton sac de style");
  }

  const onOpen = () => {
    render();
    dialog?.showModal();
  };
  const onClose = () => dialog?.close();
  const onBackdrop = (e: MouseEvent) => {
    if (!dialog || e.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();
  };
  const onExport = () => {
    const lines = entries
      .map((e) => {
        const f = findVariant(e.id);
        return f ? `${f.product.brand} — ${f.product.name} · ${f.product.option} ${f.variant.size} · Quantité ${e.quantity}` : "";
      })
      .filter(Boolean);
    const text = ["MARQ’CI — MA SÉLECTION", "Prix indicatifs ; aucune commande ni paiement n’a été effectué.", "", ...lines].join("\n\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "marqci-selection.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const openBtn = document.getElementById("open-bag");
  const closeBtn = document.getElementById("close-bag");
  openBtn?.addEventListener("click", onOpen);
  closeBtn?.addEventListener("click", onClose);
  dialog?.addEventListener("click", onBackdrop);
  exportBtn?.addEventListener("click", onExport);
  render();

  return {
    add,
    destroy() {
      openBtn?.removeEventListener("click", onOpen);
      closeBtn?.removeEventListener("click", onClose);
      dialog?.removeEventListener("click", onBackdrop);
      exportBtn?.removeEventListener("click", onExport);
      clearTimeout(toastTimer);
    },
  };
}
