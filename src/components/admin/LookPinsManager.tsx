import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";
import "@/components/admin/look-pins.css";

type Look = { id: string; name: string; slug: string };
type Product = { id: string; name: string; brand_id: string };
type Pin = { pin_number: number; product_id: string; pin_x: number; pin_y: number };
type PinRow = Pin & { look_id: string };
type Drafts = Record<string, Pin[]>;

const emptyPins = (): Pin[] =>
  [1, 2, 3].map((pin_number) => ({ pin_number, product_id: "", pin_x: 50, pin_y: 50 }));

export function LookPinsManager() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState("");
  const [drafts, setDrafts] = useState<Drafts>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const looks = useQuery({
    queryKey: ["admin", "looks", "pin-editor"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("looks")
        .select("id,name,slug")
        .order("display_order");
      if (error) throw error;
      return (data ?? []) as Look[];
    },
  });
  const products = useQuery({
    queryKey: ["admin", "products", "pin-editor"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,brand_id")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Product[];
    },
  });
  const relations = useQuery({
    queryKey: ["admin", "look-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("look_products")
        .select("look_id,pin_number,product_id,pin_x,pin_y");
      if (error) throw error;
      return (data ?? []) as PinRow[];
    },
  });
  const lookId = selected || looks.data?.[0]?.id || "";
  const savedPins = (relations.data ?? [])
    .filter((pin) => pin.look_id === lookId)
    .map(({ look_id: _lookId, ...pin }) => pin);
  const pins =
    drafts[lookId] ??
    [
      ...savedPins,
      ...emptyPins().filter(
        (blank) => !savedPins.some((pin) => pin.pin_number === blank.pin_number),
      ),
    ].sort((left, right) => left.pin_number - right.pin_number);

  function setPin(pinNumber: number, field: keyof Pin, value: string | number) {
    const base = drafts[lookId] ?? pins;
    setDrafts((current) => ({
      ...current,
      [lookId]: base.map((pin) =>
        pin.pin_number === pinNumber ? { ...pin, [field]: value } : pin,
      ),
    }));
  }

  async function savePins() {
    if (!lookId) return;
    const chosen = pins.filter((pin) => pin.product_id);
    if (new Set(chosen.map((pin) => pin.product_id)).size !== chosen.length) {
      setMessage("Une même pièce ne peut apparaître qu’une fois dans un look.");
      return;
    }
    setSaving(true);
    setMessage("");
    const payload = chosen.map((pin) => ({
      look_id: lookId,
      ...pin,
      pin_x: Number(pin.pin_x),
      pin_y: Number(pin.pin_y),
    }));
    if (payload.length) {
      const { error } = await supabase
        .from("look_products")
        .upsert(payload, { onConflict: "look_id,pin_number" });
      if (error) {
        setMessage("Les repères n’ont pas pu être enregistrés. Vérifiez les pièces et vos droits.");
        setSaving(false);
        return;
      }
    }
    const unusedNumbers = pins.filter((pin) => !pin.product_id).map((pin) => pin.pin_number);
    for (const pinNumber of unusedNumbers) {
      const { error } = await supabase
        .from("look_products")
        .delete()
        .eq("look_id", lookId)
        .eq("pin_number", pinNumber);
      if (error) {
        setMessage("Une partie des repères n’a pas pu être retirée.");
        setSaving(false);
        return;
      }
    }
    await queryClient.invalidateQueries({ queryKey: ["admin", "look-products"] });
    setDrafts((current) => {
      const next = { ...current };
      delete next[lookId];
      return next;
    });
    setMessage("Les trois repères du look ont été enregistrés.");
    setSaving(false);
  }

  return (
    <section className="adm-card adm-pin-manager">
      <div className="adm-card-head">
        <div>
          <p className="adm-eyebrow">Éditorial</p>
          <h2>Repères du look</h2>
        </div>
        <span>Jusqu’à 3 pièces par visuel</span>
      </div>
      <p className="adm-section-note">
        Choisissez les pièces à associer à chaque photo et positionnez les marqueurs en pourcentage
        de l’image.
      </p>
      <label className="adm-field">
        <span>Look à éditer</span>
        <select
          value={lookId}
          onChange={(event) => {
            setSelected(event.target.value);
            setMessage("");
          }}
        >
          <option value="">Sélectionner un look…</option>
          {(looks.data ?? []).map((look) => (
            <option key={look.id} value={look.id}>
              {look.name}
            </option>
          ))}
        </select>
      </label>
      {lookId && (
        <div className="adm-pin-grid">
          {pins.map((pin) => (
            <article className="adm-pin-row" key={pin.pin_number}>
              <div className="adm-pin-label">
                <MapPin size={15} />
                <span>Point {pin.pin_number}</span>
              </div>
              <label className="adm-field">
                <span>Pièce associée</span>
                <select
                  value={pin.product_id}
                  onChange={(event) => setPin(pin.pin_number, "product_id", event.target.value)}
                >
                  <option value="">Aucune pièce</option>
                  {(products.data ?? [])
                    .filter(
                      (product) =>
                        !pins.some(
                          (other) =>
                            other.pin_number !== pin.pin_number && other.product_id === product.id,
                        ),
                    )
                    .map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                      </option>
                    ))}
                </select>
              </label>
              <label className="adm-field">
                <span>Position horizontale (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={pin.pin_x}
                  onChange={(event) => setPin(pin.pin_number, "pin_x", Number(event.target.value))}
                />
              </label>
              <label className="adm-field">
                <span>Position verticale (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={pin.pin_y}
                  onChange={(event) => setPin(pin.pin_number, "pin_y", Number(event.target.value))}
                />
              </label>
            </article>
          ))}
        </div>
      )}
      {message && (
        <p className="adm-section-note" role="status">
          {message}
        </p>
      )}
      <div className="adm-pin-footer">
        <button
          className="adm-primary"
          type="button"
          onClick={() => void savePins()}
          disabled={!lookId || saving}
        >
          <Save size={15} />
          {saving ? "Enregistrement…" : "Enregistrer les repères"}
        </button>
      </div>
    </section>
  );
}
