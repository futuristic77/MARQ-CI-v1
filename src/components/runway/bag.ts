import { findVariant, formatFCFA, type Product, type Variant } from "./data";

const STORAGE_KEY = "marqci-styling-bag-v1";
type LegacyEntry = { id: number; quantity: number };
type LiveEntry = { id: string; quantity: number; product: Product; size: string };
type StoredEntry = LegacyEntry | LiveEntry;
type BagSelection = { id: number | string; quantity: number; product: Product; variant: Variant };

export type BagApi = {
  add: (items: BagSelection[]) => void;
  destroy: () => void;
};

function isStoredEntry(value: unknown): value is StoredEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<StoredEntry>;
  if (
    !Number.isInteger(entry.quantity) ||
    (entry.quantity ?? 0) < 1 ||
    (entry.quantity ?? 0) > 20
  ) {
    return false;
  }
  if (typeof entry.id === "number")
    return Number.isSafeInteger(entry.id) && Boolean(findVariant(entry.id));
  if (
    typeof entry.id !== "string" ||
    !("product" in entry) ||
    !("size" in entry) ||
    !entry.product ||
    typeof entry.product !== "object"
  ) {
    return false;
  }
  return (
    typeof entry.size === "string" &&
    typeof entry.product.name === "string" &&
    Array.isArray(entry.product.variants) &&
    entry.product.variants.some((variant) => variant.size === entry.size)
  );
}

function load(): StoredEntry[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(raw) ? raw.filter(isStoredEntry).slice(0, 50) : [];
  } catch {
    return [];
  }
}

function save(entries: StoredEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* storage unavailable */
  }
}

function resolveEntry(entry: StoredEntry): { product: Product; variant: Variant } | null {
  if (typeof entry.id === "number") return findVariant(entry.id);
  if (!("product" in entry) || !("size" in entry)) return null;
  const variant = entry.product.variants.find((item) => item.size === entry.size);
  return variant ? { product: entry.product, variant } : null;
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
    const n = entries.reduce((sum, entry) => sum + entry.quantity, 0);
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
    for (const entry of entries) {
      const resolved = resolveEntry(entry);
      if (!resolved) continue;
      const { product, variant } = resolved;
      sum += product.priceFCFA * entry.quantity;
      const row = document.createElement("div");
      row.className = "bag-row";
      const imageUrl = product.photos[0]?.src;
      if (imageUrl) {
        const img = document.createElement("img");
        img.src = imageUrl;
        img.alt = product.name;
        img.width = 60;
        img.height = 80;
        row.append(img);
      }
      const info = document.createElement("div");
      const brand = document.createElement("span");
      brand.className = "bag-brand";
      brand.textContent = product.brand;
      const h3 = document.createElement("h3");
      h3.textContent = product.name;
      const meta = document.createElement("p");
      meta.textContent = `${product.option} ${variant.size} · Quantité ${entry.quantity} · ${formatFCFA(product.priceFCFA)}`;
      info.append(brand, h3, meta);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "bag-remove";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `Retirer ${product.name}`);
      remove.addEventListener("click", () => {
        entries = entries.filter((item) => item !== entry);
        save(entries);
        render();
      });
      row.append(info, remove);
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

  function add(items: BagSelection[]) {
    const additions: StoredEntry[] = items.map((item) => {
      const variant = item.product.variants.find((option) => String(option.id) === String(item.id));
      if (!variant || variant.size !== item.variant.size)
        throw new Error("Choisis une taille disponible.");
      if (typeof item.id === "number" && findVariant(item.id)) return { id: item.id, quantity: 1 };
      return {
        id: String(item.id),
        quantity: 1,
        product: item.product,
        size: variant.size,
      };
    });
    for (const addition of additions) {
      const existing = entries.find((entry) => entry.id === addition.id);
      if (existing) existing.quantity = Math.min(20, existing.quantity + 1);
      else entries.push(addition);
    }
    entries = entries.slice(0, 50);
    save(entries);
    render();
    showToast(
      items.length > 1 ? "Look ajouté à ton sac de style" : "Pièce ajoutée à ton sac de style",
    );
  }

  const onOpen = () => {
    render();
    dialog?.showModal();
  };
  const onClose = () => dialog?.close();
  const onBackdrop = (e: MouseEvent) => {
    if (!dialog || e.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    )
      dialog.close();
  };
  const onExport = () => {
    const lines = entries
      .map((entry) => {
        const resolved = resolveEntry(entry);
        return resolved
          ? `${resolved.product.brand} — ${resolved.product.name} · ${resolved.product.option} ${resolved.variant.size} · Quantité ${entry.quantity}`
          : "";
      })
      .filter(Boolean);
    const text = [
      "MARQ’CI — MA SÉLECTION",
      "Prix indicatifs ; aucune commande ni paiement n’a été effectué.",
      "",
      ...lines,
    ].join("\n\n");
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
