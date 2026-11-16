import { useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Field = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "number" | "url" | "select" | "boolean" | "date" | "json" | "images";
  required?: boolean;
  options?: { value: string; label: string }[];
  relation?: "brands" | "collections" | "products";
};
type ResourceSpec = {
  table: string;
  title: string;
  singular: string;
  description: string;
  columns: { key: string; label: string }[];
  fields: Field[];
  search: string[];
};
type Row = {
  [key: string]: unknown;
  id?: string;
  name?: string;
  title?: string;
  slug?: string;
};

const statusOptions = [
  { value: "draft", label: "Brouillon" },
  { value: "published", label: "Publié" },
  { value: "disabled", label: "Désactivé" },
];

export const RESOURCE_SPECS: Record<string, ResourceSpec> = {
  brands: {
    table: "brands",
    title: "Marques",
    singular: "une marque",
    description: "Présentez les maisons, leurs créateurs et leurs univers.",
    columns: [
      { key: "name", label: "Marque" },
      { key: "creator_name", label: "Créateur·rice" },
      { key: "city", label: "Ville" },
      { key: "status", label: "État" },
    ],
    search: ["name", "creator_name", "city"],
    fields: [
      { name: "name", label: "Nom de la marque", required: true },
      { name: "slug", label: "Identifiant d’URL", required: true },
      { name: "creator_name", label: "Nom du créateur ou de la créatrice" },
      { name: "category", label: "Catégorie" },
      { name: "craft", label: "Savoir-faire" },
      { name: "city", label: "Ville" },
      { name: "description", label: "À propos", type: "textarea" },
      { name: "logo_url", label: "Logo", type: "url" },
      { name: "cover_url", label: "Image de couverture", type: "url" },
      { name: "gallery_urls", label: "Galerie d’images", type: "images" },
      { name: "external_links", label: "Liens (JSON)", type: "json" },
      { name: "is_featured", label: "Afficher en marque à la une", type: "boolean" },
      { name: "display_order", label: "Ordre d’affichage", type: "number" },
      { name: "status", label: "Publication", type: "select", options: statusOptions },
    ],
  },
  collections: {
    table: "collections",
    title: "Collections",
    singular: "une collection",
    description: "Organisez les pièces par maison et par saison.",
    columns: [
      { key: "name", label: "Collection" },
      { key: "brand_id", label: "Maison" },
      { key: "status", label: "État" },
    ],
    search: ["name", "slug"],
    fields: [
      { name: "brand_id", label: "Maison", type: "select", relation: "brands", required: true },
      { name: "name", label: "Nom de la collection", required: true },
      { name: "slug", label: "Identifiant d’URL", required: true },
      { name: "description", label: "Description", type: "textarea" },
      { name: "cover_url", label: "Image de couverture", type: "url" },
      { name: "status", label: "Publication", type: "select", options: statusOptions },
    ],
  },
  products: {
    table: "products",
    title: "Produits",
    singular: "un produit",
    description: "Gérez les fiches, les prix en FCFA et les stocks.",
    columns: [
      { key: "name", label: "Pièce" },
      { key: "brand_id", label: "Maison" },
      { key: "price_cfa", label: "Prix" },
      { key: "stock_quantity", label: "Stock" },
      { key: "status", label: "État" },
    ],
    search: ["name", "slug", "category"],
    fields: [
      { name: "brand_id", label: "Maison", type: "select", relation: "brands", required: true },
      { name: "collection_id", label: "Collection", type: "select", relation: "collections" },
      { name: "name", label: "Nom de la pièce", required: true },
      { name: "slug", label: "Identifiant d’URL", required: true },
      { name: "category", label: "Catégorie" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "price_cfa", label: "Prix (FCFA)", type: "number", required: true },
      { name: "compare_at_price_cfa", label: "Prix barré (FCFA)", type: "number" },
      { name: "stock_quantity", label: "Quantité en stock", type: "number" },
      { name: "sizes", label: "Tailles ou pointures (séparées par des virgules)", type: "images" },
      { name: "photo_urls", label: "Photographies", type: "images" },
      { name: "status", label: "Publication", type: "select", options: statusOptions },
    ],
  },
  looks: {
    table: "looks",
    title: "Looks & défilé",
    singular: "un look",
    description: "Composez le défilé et positionnez jusqu’à trois pièces par look.",
    columns: [
      { key: "name", label: "Look" },
      { key: "display_order", label: "Ordre" },
      { key: "status", label: "État" },
    ],
    search: ["name", "slug"],
    fields: [
      { name: "name", label: "Nom du look", required: true },
      { name: "slug", label: "Identifiant d’URL", required: true },
      { name: "description", label: "Description", type: "textarea" },
      { name: "model_image_url", label: "Visuel porté", type: "url" },
      { name: "original_image_url", label: "Visuel haute définition", type: "url" },
      { name: "display_order", label: "Position dans le défilé", type: "number" },
      { name: "status", label: "Publication", type: "select", options: statusOptions },
    ],
  },
  campaigns: {
    table: "campaigns",
    title: "Campagnes",
    singular: "une campagne",
    description: "Réservez les mises en avant et contrôlez leur diffusion.",
    columns: [
      { key: "title", label: "Campagne" },
      { key: "format", label: "Format" },
      { key: "brand_id", label: "Maison" },
      { key: "amount_cfa", label: "Montant" },
      { key: "payment_status", label: "Paiement" },
      { key: "is_active", label: "Diffusion" },
      { key: "display_order", label: "Ordre" },
    ],
    search: ["title", "description"],
    fields: [
      { name: "brand_id", label: "Maison", type: "select", relation: "brands", required: true },
      { name: "title", label: "Titre", required: true },
      { name: "description", label: "Texte", type: "textarea" },
      {
        name: "format",
        label: "Format de mise en avant",
        type: "select",
        required: true,
        options: [
          { value: "brand_feature", label: "Marque à la une" },
          { value: "campaign", label: "Campagne de marque" },
          { value: "brand_selection", label: "Sélection de marques" },
          { value: "editorial", label: "Sélection éditoriale" },
        ],
      },
      { name: "image_url", label: "Visuel", type: "url" },
      { name: "target_url", label: "Lien de destination", type: "url" },
      {
        name: "placement",
        label: "Emplacement",
        type: "select",
        options: [
          { value: "home", label: "Accueil" },
          { value: "brand", label: "Page marque" },
        ],
      },
      { name: "is_free", label: "Mise en avant offerte", type: "boolean" },
      { name: "amount_cfa", label: "Montant convenu (FCFA)", type: "number" },
      { name: "display_order", label: "Ordre d’affichage", type: "number" },
      { name: "starts_at", label: "Début de diffusion", type: "date", required: true },
      { name: "ends_at", label: "Fin de diffusion", type: "date", required: true },
      { name: "is_active", label: "Activer la diffusion", type: "boolean" },
    ],
  },
};

const emptyValue = (field: Field) =>
  field.type === "boolean" ? false : field.type === "json" ? "{}" : "";
const formatPrice = (value: unknown) =>
  `${new Intl.NumberFormat("fr-FR").format(Number(value) || 0)} FCFA`;

async function writeActivity(action: string, entityType: string, entityId?: string) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return false;
  const { error } = await supabase.from("admin_activity").insert({
    actor_id: session.user.id,
    action,
    entity_type: entityType,
    entity_id: entityId ?? "",
  });
  return !error;
}

function displayValue(value: unknown, field: Field, relations: Record<string, Row[]>) {
  if (field.name === "status")
    return statusOptions.find((option) => option.value === value)?.label ?? value;
  if (field.name === "payment_status")
    return (
      (
        {
          pending: "À confirmer",
          paid: "Réglé",
          cancelled: "Annulé",
          rejected: "Refusé",
          refunded: "Remboursé",
        } as Record<string, string>
      )[String(value)] ?? value
    );
  if (field.name === "is_active") return value ? "En diffusion" : "En pause";
  if (field.name === "is_free") return value ? "Offerte" : "Payante";
  if (field.name === "amount_cfa" || field.name === "price_cfa") return formatPrice(value);
  if (field.relation && value)
    return relations[field.relation]?.find((row) => row.id === value)?.name ?? "—";
  return typeof value === "string" && value.length > 42
    ? `${value.slice(0, 42)}…`
    : String(value || "—");
}

export function ResourceManager({ resource }: { resource: keyof typeof RESOURCE_SPECS }) {
  const queryClient = useQueryClient();
  const spec = RESOURCE_SPECS[resource]!;
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Row | null | undefined>(undefined);
  const [notice, setNotice] = useState("");
  const rowsQuery = useQuery({
    queryKey: ["admin", spec.table],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(spec.table)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
  const relationsQuery = useQuery({
    queryKey: ["admin", "relations", resource],
    enabled: spec.fields.some((field) => field.relation),
    queryFn: async () => {
      const names = [
        ...new Set(spec.fields.map((field) => field.relation).filter(Boolean)),
      ] as string[];
      const result = await Promise.all(
        names.map(async (name) => {
          const { data, error } = await supabase
            .from(name)
            .select("id,name,brand_id,status")
            .order("name");
          if (error) throw error;
          return [name, data ?? []] as const;
        }),
      );
      return Object.fromEntries(result) as Record<string, Row[]>;
    },
  });
  const relations = relationsQuery.data ?? {};
  const rows = useMemo(
    () =>
      (rowsQuery.data ?? []).filter((row) => {
        const term = search.trim().toLocaleLowerCase("fr");
        return (
          !term ||
          spec.search.some((key) =>
            String(row[key] ?? "")
              .toLocaleLowerCase("fr")
              .includes(term),
          )
        );
      }),
    [rowsQuery.data, search, spec.search],
  );

  async function save(values: Row) {
    const { id, ...payload } = values;
    let entityId = id;
    let action = "UPDATE";
    if (id) {
      const { error } = await supabase.from(spec.table).update(payload).eq("id", id);
      if (error) throw error;
    } else {
      const { data, error } = await supabase.from(spec.table).insert(payload).select("id").single();
      if (error) throw error;
      entityId = data.id;
      action = "INSERT";
    }
    const logged = await writeActivity(action, spec.table, entityId);
    await queryClient.invalidateQueries({ queryKey: ["admin"] });
    setEditing(undefined);
    setNotice(
      `${spec.singular.replace("une ", "La ").replace("un ", "Le ")} a été enregistré${spec.singular.startsWith("une") ? "e" : ""}.${logged ? "" : " Le journal d’activité n’a pas pu être mis à jour."}`,
    );
  }

  async function remove(row: Row) {
    if (
      !window.confirm(
        `Supprimer « ${row.name ?? row.title ?? "cet élément"} » ? Cette action est définitive.`,
      )
    )
      return;
    const { error } = await supabase.from(spec.table).delete().eq("id", row.id);
    if (error) {
      setNotice(error.message);
      return;
    }
    const logged = await writeActivity("DELETE", spec.table, row.id);
    await queryClient.invalidateQueries({ queryKey: ["admin"] });
    setNotice(
      logged
        ? "Élément supprimé."
        : "Élément supprimé, mais le journal n’a pas pu être mis à jour.",
    );
  }

  return (
    <section className="adm-content">
      <div className="adm-page-head">
        <div>
          <p className="adm-eyebrow">Catalogue & diffusion</p>
          <h1>{spec.title}</h1>
          <p>{spec.description}</p>
        </div>
        <button className="adm-primary" type="button" onClick={() => setEditing(null)}>
          <Plus size={16} /> Ajouter {spec.singular}
        </button>
      </div>
      {notice && (
        <div className="adm-notice" role="status">
          {notice}
          <button type="button" aria-label="Fermer" onClick={() => setNotice("")}>
            <X size={16} />
          </button>
        </div>
      )}
      <div className="adm-table-tools">
        <span>
          {rows.length} {rows.length > 1 ? "résultats" : "résultat"}
        </span>
        <label className="adm-search">
          <Search size={16} />
          <span className="sr-only">Rechercher</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Rechercher dans ${spec.title.toLocaleLowerCase("fr")}…`}
          />
        </label>
      </div>
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              {spec.columns.map((column) => (
                <th key={column.key}>{column.label}</th>
              ))}
              <th>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                {spec.columns.map((column) => {
                  const field = spec.fields.find((item) => item.name === column.key);
                  const value = field
                    ? displayValue(row[column.key], field, relations)
                    : displayValue(
                        row[column.key],
                        { name: column.key, label: column.label },
                        relations,
                      );
                  const isStatus = column.key === "status" || column.key === "payment_status";
                  return (
                    <td key={column.key}>
                      {isStatus ? (
                        <span className={`adm-badge adm-badge--${row[column.key]}`}>
                          {String(value)}
                        </span>
                      ) : (
                        <span
                          className={
                            column.key === "name" || column.key === "title" ? "adm-cell-strong" : ""
                          }
                        >
                          {String(value ?? "—")}
                        </span>
                      )}
                    </td>
                  );
                })}
                <td className="adm-actions">
                  <button
                    className="adm-icon-btn"
                    type="button"
                    aria-label={`Modifier ${row.name ?? row.title ?? "l’élément"}`}
                    onClick={() => setEditing(row)}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="adm-icon-btn adm-icon-btn--danger"
                    type="button"
                    aria-label={`Supprimer ${row.name ?? row.title ?? "l’élément"}`}
                    onClick={() => void remove(row)}
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {!rowsQuery.isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={spec.columns.length + 1} className="adm-empty">
                  {rowsQuery.error
                    ? "Impossible de charger les données. Vérifiez votre accès administrateur."
                    : search
                      ? "Aucun résultat pour cette recherche."
                      : "Aucun élément pour le moment. Commencez par en ajouter un."}
                </td>
              </tr>
            )}
            {rowsQuery.isLoading && (
              <tr>
                <td colSpan={spec.columns.length + 1} className="adm-empty">
                  Chargement du catalogue…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {editing !== undefined && (
        <ResourceForm
          spec={spec}
          initial={editing}
          relations={relations}
          onClose={() => setEditing(undefined)}
          onSave={save}
        />
      )}
    </section>
  );
}

function ResourceForm({
  spec,
  initial,
  relations,
  onClose,
  onSave,
}: {
  spec: ResourceSpec;
  initial: Row | null;
  relations: Record<string, Row[]>;
  onClose: () => void;
  onSave: (value: Row) => Promise<void>;
}) {
  const [values, setValues] = useState<Row>(() =>
    Object.fromEntries(
      spec.fields
        .map((field) => {
          const current = initial?.[field.name];
          const value = current ?? emptyValue(field);
          if (field.type === "images" && Array.isArray(value))
            return [field.name, value.join(", ")];
          if (field.type === "json" && typeof value !== "string")
            return [field.name, JSON.stringify(value, null, 2)];
          if (field.type === "date" && (typeof value === "string" || typeof value === "number"))
            return [field.name, new Date(value).toISOString().slice(0, 16)];
          return [field.name, value];
        })
        .concat(initial?.id ? [["id", initial.id]] : []),
    ),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);

  function setField(name: string, value: unknown) {
    setValues((current: Row) => {
      const next = { ...current, [name]: value };
      if (name === "name" && !initial && !current.slug)
        next.slug = String(value)
          .trim()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
      return next;
    });
  }

  async function upload(field: Field, file?: File) {
    if (!file) return;
    const extensions: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/avif": "avif",
    };
    const extension = extensions[file.type];
    if (!extension || file.size > 10 * 1024 * 1024) {
      setError("Choisissez un fichier JPEG, PNG, WebP ou AVIF de 10 Mo maximum.");
      return;
    }
    setUploading(field.name);
    setError("");
    const path = `${spec.table}/${crypto.randomUUID()}.${extension}`;
    try {
      const { error: uploadError } = await supabase.storage
        .from("marqci-media")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      setField(field.name, supabase.storage.from("marqci-media").getPublicUrl(path).data.publicUrl);
    } catch {
      setError("Le téléversement a échoué. Vérifiez vos droits et réessayez.");
    } finally {
      setUploading(null);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload: Row = { ...values };
      for (const field of spec.fields) {
        const value = payload[field.name];
        if (field.type === "number")
          payload[field.name] = value === "" || value == null ? null : Number(value);
        if (field.type === "boolean") payload[field.name] = Boolean(value);
        if (field.type === "images")
          payload[field.name] = String(value ?? "")
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean);
        if (field.type === "json") {
          try {
            payload[field.name] = JSON.parse(String(value || "{}"));
          } catch {
            throw new Error(`Le champ « ${field.label} » doit contenir un JSON valide.`);
          }
        }
        if (field.type === "date")
          payload[field.name] =
            typeof value === "string" && value ? new Date(value).toISOString() : null;
        if (field.relation && !value) payload[field.name] = null;
      }
      if (resourceHasTable(spec, "campaigns") && payload["is_free"]) payload["amount_cfa"] = 0;
      await onSave(payload);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="adm-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="adm-form-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="adm-form-title"
      >
        <header className="adm-form-head">
          <div>
            <p className="adm-eyebrow">{initial ? "Modifier" : "Nouvelle fiche"}</p>
            <h2 id="adm-form-title">
              {initial ? `Modifier ${spec.singular}` : `Ajouter ${spec.singular}`}
            </h2>
          </div>
          <button className="adm-icon-btn" type="button" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </header>
        <form onSubmit={submit} className="adm-form">
          <div className="adm-form-grid">
            {spec.fields.map((field) => (
              <label
                className={`adm-field${field.type === "textarea" || field.type === "json" || field.type === "images" ? " adm-field--wide" : ""}`}
                key={field.name}
              >
                <span>
                  {field.label}
                  {field.required && <i aria-hidden="true"> *</i>}
                </span>
                {field.type === "select" && (
                  <select
                    required={field.required}
                    value={String(values[field.name] ?? "")}
                    onChange={(event) => setField(field.name, event.target.value)}
                  >
                    <option value="">Sélectionner…</option>
                    {(
                      field.options ??
                      relations[field.relation ?? ""]?.map((row) => ({
                        value: String(row.id ?? ""),
                        label: String(row.name ?? ""),
                      })) ??
                      []
                    ).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
                {field.type === "boolean" && (
                  <span className="adm-switch-row">
                    <input
                      type="checkbox"
                      checked={Boolean(values[field.name])}
                      onChange={(event) => setField(field.name, event.target.checked)}
                    />
                    <span>{values[field.name] ? "Oui" : "Non"}</span>
                  </span>
                )}
                {(field.type === "textarea" ||
                  field.type === "json" ||
                  field.type === "images") && (
                  <textarea
                    required={field.required}
                    rows={field.type === "textarea" ? 4 : 3}
                    value={String(values[field.name] ?? "")}
                    onChange={(event) => setField(field.name, event.target.value)}
                    placeholder={
                      field.type === "json"
                        ? '{"instagram":"https://…"}'
                        : field.type === "images"
                          ? "https://…/image.jpg, https://…/detail.jpg"
                          : ""
                    }
                  />
                )}
                {(!field.type ||
                  field.type === "text" ||
                  field.type === "url" ||
                  field.type === "number" ||
                  field.type === "date") && (
                  <input
                    required={field.required}
                    type={
                      field.type === "url"
                        ? "url"
                        : field.type === "number"
                          ? "number"
                          : field.type === "date"
                            ? "datetime-local"
                            : "text"
                    }
                    min={field.type === "number" ? "0" : undefined}
                    step={field.type === "number" ? "1" : undefined}
                    value={String(values[field.name] ?? "")}
                    onChange={(event) => setField(field.name, event.target.value)}
                  />
                )}
                {field.type === "url" && (
                  <span className="adm-upload">
                    <label>
                      <ImagePlus size={15} />
                      {uploading === field.name ? "Téléversement…" : "Choisir une image"}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        disabled={Boolean(uploading)}
                        onChange={(event) => void upload(field, event.target.files?.[0])}
                      />
                    </label>
                    <small>10 Mo max · JPEG, PNG, WebP ou AVIF</small>
                  </span>
                )}
              </label>
            ))}
          </div>
          {error && (
            <p className="adm-error" role="alert">
              {error}
            </p>
          )}
          <footer className="adm-form-actions">
            <button type="button" className="adm-secondary" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="adm-primary" disabled={busy || Boolean(uploading)}>
              {busy ? "Enregistrement…" : "Enregistrer"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function resourceHasTable(spec: ResourceSpec, table: string) {
  return spec.table === table;
}
