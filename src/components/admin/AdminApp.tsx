import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowUpRight,
  Box,
  CreditCard,
  Layers,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Package,
  Sparkles,
  Store,
} from "lucide-react";
import { RESOURCE_SPECS, ResourceManager } from "@/components/admin/ResourceManager";
import { LookPinsManager } from "@/components/admin/LookPinsManager";
import "@/components/admin/look-pins.css";
import "@/components/admin/admin.css";
import { supabase } from "@/lib/supabase";

type AdminUser = { id: string; email?: string };
type PageKey =
  | "overview"
  | "brands"
  | "collections"
  | "products"
  | "looks"
  | "campaigns"
  | "payments"
  | "activity";
const navigation: { id: PageKey; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Vue d’ensemble", icon: LayoutDashboard },
  { id: "brands", label: "Marques", icon: Store },
  { id: "collections", label: "Collections", icon: Layers },
  { id: "products", label: "Produits", icon: Package },
  { id: "looks", label: "Looks & défilé", icon: Sparkles },
  { id: "campaigns", label: "Campagnes", icon: Megaphone },
  { id: "payments", label: "Paiements", icon: CreditCard },
  { id: "activity", label: "Journal d’activité", icon: Activity },
];

export function AdminApp() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState<PageKey>("overview");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const access = useQuery({
    queryKey: ["admin-session"],
    queryFn: async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) throw error;
      const user = session?.user;
      if (!user) return { user: null as AdminUser | null, isAdmin: false };
      const { data, error: roleError } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (roleError) throw roleError;
      return { user: { id: user.id, email: user.email } as AdminUser, isAdmin: Boolean(data) };
    },
    retry: false,
    staleTime: 30_000,
  });

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void queryClient.invalidateQueries({ queryKey: ["admin-session"] });
    });
    return () => subscription.unsubscribe();
  }, [queryClient]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSigningIn(true);
    setLoginError("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setSigningIn(false);
    if (error) setLoginError("Identifiants invalides ou connexion momentanément indisponible.");
    else await queryClient.invalidateQueries({ queryKey: ["admin-session"] });
  }

  async function signOut() {
    await supabase.auth.signOut();
    queryClient.clear();
  }

  if (access.isLoading || access.isFetching)
    return (
      <div className="adm-login-wrap">
        <div className="adm-login">
          <BrandMark />
          <p>Ouverture de l’espace sécurisé…</p>
        </div>
      </div>
    );
  if (access.error)
    return (
      <div className="adm-login-wrap">
        <div className="adm-denied">
          <h1>Connexion indisponible</h1>
          <p>Le service Supabase n’est pas joignable. Réessayez dans un instant.</p>
          <button className="adm-secondary" type="button" onClick={() => void access.refetch()}>
            Réessayer
          </button>
        </div>
      </div>
    );
  const session = access.data;
  if (!session?.user)
    return (
      <div className="adm-login-wrap">
        <section className="adm-login">
          <BrandMark />
          <p className="adm-eyebrow">Espace privé · Abidjan</p>
          <h1>Ravie de vous retrouver.</h1>
          <p>Connectez-vous avec le compte administrateur MARQ’CI qui vous a été attribué.</p>
          <form onSubmit={(event) => void signIn(event)}>
            <label className="adm-field" htmlFor="adm-email">
              <span>Adresse e-mail</span>
              <input
                id="adm-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label className="adm-field" htmlFor="adm-password">
              <span>Mot de passe</span>
              <input
                id="adm-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {loginError && (
              <p className="adm-auth-error" role="alert">
                {loginError}
              </p>
            )}
            <button className="adm-primary" type="submit" disabled={signingIn}>
              {signingIn ? "Connexion…" : "Se connecter"}
              <ArrowUpRight size={14} />
            </button>
          </form>
          <p className="adm-login-note">
            L’accès est réservé aux comptes autorisés. L’inscription publique est désactivée.
          </p>
        </section>
      </div>
    );
  if (!session.isAdmin)
    return (
      <div className="adm-login-wrap">
        <section className="adm-denied">
          <BrandMark />
          <h1>Accès non autorisé</h1>
          <p>
            Ce compte ne dispose pas du rôle administrateur MARQ’CI. Contactez le propriétaire de la
            plateforme pour faire provisionner votre accès.
          </p>
          <button className="adm-secondary" type="button" onClick={() => void signOut()}>
            Se déconnecter
          </button>
        </section>
      </div>
    );

  const current = navigation.find((item) => item.id === page)!;
  return (
    <div className="adm-shell">
      <div className="adm-layout">
        <aside className="adm-sidebar">
          <BrandMark />
          <p className="adm-side-label">Administration</p>
          <nav className="adm-nav" aria-label="Navigation de l’administration">
            {navigation.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className={page === id ? "is-active" : ""}
                aria-current={page === id ? "page" : undefined}
                onClick={() => setPage(id)}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </nav>
          <div className="adm-sidebar-bottom">
            <a className="adm-quiet-btn" href="/" target="_blank" rel="noreferrer">
              <ArrowUpRight size={15} /> Voir le site
            </a>
            <div className="adm-user">
              <span className="adm-avatar">
                {(session.user.email?.[0] ?? "M").toLocaleUpperCase("fr")}
              </span>
              <div className="adm-user-copy">
                <strong>{session.user.email ?? "Administrateur"}</strong>
                <span>Compte administrateur</span>
              </div>
            </div>
            <button className="adm-quiet-btn" type="button" onClick={() => void signOut()}>
              <LogOut size={15} /> Se déconnecter
            </button>
          </div>
        </aside>
        <main className="adm-main">
          <header className="adm-topbar">
            <div className="adm-crumb">
              MARQ’CI <span aria-hidden="true">/</span> <strong>{current.label}</strong>
            </div>
            <div className="adm-top-actions">
              <a className="adm-site-link" href="/" target="_blank" rel="noreferrer">
                Ouvrir le site <ArrowUpRight size={13} />
              </a>
            </div>
          </header>
          {page === "overview" && <Overview onNavigate={setPage} />}
          {RESOURCE_SPECS[page] && (
            <ResourceManager resource={page as keyof typeof RESOURCE_SPECS} />
          )}
          {page === "looks" && <LookPinsManager />}
          {page === "payments" && <Payments />}
          {page === "activity" && <ActivityLog />}
        </main>
      </div>
    </div>
  );
}

function BrandMark() {
  return (
    <div className="adm-brand">
      <span className="adm-brand-mark">M</span>
      <span>
        MARQ’CI<small>Administration</small>
      </span>
    </div>
  );
}

function Overview({ onNavigate }: { onNavigate: (page: PageKey) => void }) {
  const stats = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const [brands, products, active, pending, expired] = await Promise.all([
        supabase
          .from("brands")
          .select("*", { count: "exact", head: true })
          .eq("status", "published"),
        supabase
          .from("products")
          .select("*", { count: "exact", head: true })
          .eq("status", "published"),
        supabase
          .from("campaigns")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true)
          .lte("starts_at", now)
          .gte("ends_at", now)
          .or("is_free.eq.true,payment_status.eq.paid"),
        supabase
          .from("campaigns")
          .select("*", { count: "exact", head: true })
          .eq("payment_status", "pending"),
        supabase.from("campaigns").select("*", { count: "exact", head: true }).lt("ends_at", now),
      ]);
      for (const result of [brands, products, active, pending, expired]) {
        if (result.error) throw result.error;
      }
      return {
        publishedBrands: brands.count ?? 0,
        publishedProducts: products.count ?? 0,
        active: active.count ?? 0,
        pending: pending.count ?? 0,
        expired: expired.count ?? 0,
      };
    },
  });
  const recent = useQuery({
    queryKey: ["admin", "recent-activity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_activity")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data ?? [];
    },
  });
  const cards = [
    "Marques publiées",
    "Articles publiés",
    "Campagnes actives",
    "Paiements à confirmer",
    "Campagnes expirées",
  ];
  const statPages: PageKey[] = ["brands", "products", "campaigns", "payments", "campaigns"];
  const amounts = [
    stats.data?.publishedBrands ?? 0,
    stats.data?.publishedProducts ?? 0,
    stats.data?.active ?? 0,
    stats.data?.pending ?? 0,
    stats.data?.expired ?? 0,
  ];
  return (
    <section className="adm-content">
      <div className="adm-page-head">
        <div>
          <p className="adm-eyebrow">Votre maison de création</p>
          <h1>Bonjour, bienvenue.</h1>
          <p>Le catalogue MARQ’CI, les créateurs et les campagnes réunis au même endroit.</p>
        </div>
      </div>
      <div className="adm-stat-grid">
        {cards.map((label, index) => (
          <button
            type="button"
            key={label}
            className="adm-stat"
            onClick={() => {
              const target = statPages[index];
              if (target) onNavigate(target);
            }}
          >
            <span>{label}</span>
            <strong>{stats.isLoading ? "—" : amounts[index]}</strong>
          </button>
        ))}
      </div>
      <div className="adm-overview-grid">
        <section className="adm-card">
          <div className="adm-card-head">
            <h2>À suivre</h2>
            <span>Les dernières opérations</span>
          </div>
          <div className="adm-activity-list">
            {(recent.data ?? []).map((entry) => (
              <div className="adm-activity-row" key={entry.id}>
                <span className="adm-activity-dot" />
                <div>
                  <strong>{activityLabel(entry.action, entry.entity_type)}</strong>
                  <small>{formatDate(entry.created_at)}</small>
                </div>
              </div>
            ))}
            {!recent.isLoading && !recent.data?.length && (
              <p className="adm-activity-empty">
                L’activité apparaîtra ici au fil des mises à jour.
              </p>
            )}
          </div>
        </section>
        <section className="adm-card">
          <div className="adm-card-head">
            <h2>En un geste</h2>
          </div>
          <p className="adm-section-note">
            Mettez à jour les fiches et préparez une nouvelle mise en avant pour les marques de
            votre sélection.
          </p>
          <div className="adm-activity-list">
            <button className="adm-quiet-btn" type="button" onClick={() => onNavigate("brands")}>
              <Store size={15} /> Ajouter une marque <ArrowUpRight size={13} />
            </button>
            <button className="adm-quiet-btn" type="button" onClick={() => onNavigate("products")}>
              <Box size={15} /> Ajouter une pièce <ArrowUpRight size={13} />
            </button>
            <button className="adm-quiet-btn" type="button" onClick={() => onNavigate("campaigns")}>
              <Megaphone size={15} /> Créer une campagne <ArrowUpRight size={13} />
            </button>
          </div>
        </section>
      </div>
    </section>
  );
}

function Payments() {
  const queryClient = useQueryClient();
  const campaigns = useQuery({
    queryKey: ["admin", "payment-campaigns"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id,title,brand_id,amount_cfa,payment_status,is_free,is_active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const { data: brands } = await supabase.from("brands").select("id,name");
      const names = new Map((brands ?? []).map((brand) => [brand.id, brand.name]));
      return (data ?? []).map((campaign) => ({
        ...campaign,
        brand_name: names.get(campaign.brand_id) ?? "—",
      }));
    },
  });
  const payments = useQuery({
    queryKey: ["admin", "campaign-payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaign_payments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      const { data: campaignsData } = await supabase.from("campaigns").select("id,title");
      const names = new Map((campaignsData ?? []).map((campaign) => [campaign.id, campaign.title]));
      return (data ?? []).map((payment) => ({
        ...payment,
        campaign_title: names.get(payment.campaign_id) ?? "Campagne supprimée",
      }));
    },
  });
  const [campaignId, setCampaignId] = useState("");
  const [status, setStatus] = useState("paid");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [proof, setProof] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const selected = campaigns.data?.find((campaign) => campaign.id === campaignId);
  async function record(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const { data, error: userError } = await supabase.auth.getSession();
    if (userError || !data.session?.user) {
      setMessage("Votre session a expiré. Reconnectez-vous.");
      setBusy(false);
      return;
    }
    const { error } = await supabase.rpc("record_campaign_payment", {
      p_campaign_id: campaignId,
      p_status: status,
      p_amount_cfa: Number(amount),
      p_reference: reference,
      p_proof_url: proof,
      p_notes: notes,
    });
    setBusy(false);
    if (error)
      setMessage("Le paiement n’a pas pu être enregistré. Vérifiez le montant et vos droits.");
    else {
      setMessage("Le statut et l’historique du paiement ont été mis à jour.");
      setReference("");
      setProof("");
      setNotes("");
      await queryClient.invalidateQueries({ queryKey: ["admin"] });
    }
  }
  return (
    <section className="adm-content">
      <div className="adm-page-head">
        <div>
          <p className="adm-eyebrow">Suivi commercial</p>
          <h1>Paiements</h1>
          <p>Confirmez les virements et gardez une trace de chaque vérification.</p>
        </div>
      </div>
      <div className="adm-payment-layout">
        <section className="adm-card">
          <div className="adm-card-head">
            <h2>Campagnes à suivre</h2>
            <span>{campaigns.data?.length ?? 0} campagnes</span>
          </div>
          {(campaigns.data ?? []).map((campaign) => (
            <div className="adm-campaign-card" key={campaign.id}>
              <div>
                <strong>{campaign.title}</strong>
                <small>
                  {campaign.brand_name} ·{" "}
                  {campaign.is_free
                    ? "Mise en avant offerte"
                    : `${new Intl.NumberFormat("fr-FR").format(campaign.amount_cfa)} FCFA`}{" "}
                  · {campaign.is_active ? "En diffusion" : "En pause"}
                </small>
              </div>
              <span className={`adm-badge adm-badge--${campaign.payment_status}`}>
                {statusLabel(campaign.payment_status)}
              </span>
            </div>
          ))}
          {!campaigns.isLoading && !campaigns.data?.length && (
            <p className="adm-activity-empty">Les campagnes créées s’afficheront ici.</p>
          )}
        </section>
        <section className="adm-card">
          <div className="adm-card-head">
            <h2>Consigner un paiement</h2>
            <span>Historique auditable</span>
          </div>
          <form className="adm-inline-form" onSubmit={(event) => void record(event)}>
            <label className="adm-field">
              <span>Campagne</span>
              <select
                required
                value={campaignId}
                onChange={(event) => {
                  setCampaignId(event.target.value);
                  const item = campaigns.data?.find(
                    (campaign) => campaign.id === event.target.value,
                  );
                  if (item) setAmount(String(item.amount_cfa));
                }}
              >
                <option value="">Sélectionner une campagne…</option>
                {(campaigns.data ?? []).map((campaign) => (
                  <option value={campaign.id} key={campaign.id}>
                    {campaign.title} · {campaign.brand_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="adm-field">
              <span>Vérification</span>
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="paid">Réglé · confirmer le virement</option>
                <option value="pending">En attente</option>
                <option value="cancelled">Annulé</option>
                <option value="rejected">Refusé</option>
                <option value="refunded">Remboursé</option>
              </select>
            </label>
            <label className="adm-field">
              <span>Montant reçu (FCFA)</span>
              <input
                type="number"
                min="0"
                required
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </label>
            <label className="adm-field">
              <span>Référence de virement</span>
              <input
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                maxLength={200}
              />
            </label>
            <label className="adm-field">
              <span>Justificatif (URL)</span>
              <input type="url" value={proof} onChange={(event) => setProof(event.target.value)} />
            </label>
            <label className="adm-field">
              <span>Note interne</span>
              <textarea
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                maxLength={2000}
              />
            </label>
            {selected && (
              <p className="adm-section-note">
                Campagne « {selected.title} » · montant prévu :{" "}
                {new Intl.NumberFormat("fr-FR").format(selected.amount_cfa)} FCFA.
              </p>
            )}
            {message && (
              <p
                className={message.startsWith("Le statut") ? "adm-section-note" : "adm-error"}
                role="status"
              >
                {message}
              </p>
            )}
            <button className="adm-primary" disabled={busy || !campaignId}>
              {busy ? "Enregistrement…" : "Enregistrer la vérification"}
            </button>
          </form>
        </section>
      </div>
      <section className="adm-card" style={{ marginTop: 16 }}>
        <div className="adm-card-head">
          <h2>Historique récent</h2>
          <span>{payments.data?.length ?? 0} entrées</span>
        </div>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Campagne</th>
                <th>Montant</th>
                <th>Statut</th>
                <th>Référence</th>
              </tr>
            </thead>
            <tbody>
              {(payments.data ?? []).map((payment) => (
                <tr key={payment.id}>
                  <td>{formatDate(payment.created_at)}</td>
                  <td>{payment.campaign_title}</td>
                  <td>{new Intl.NumberFormat("fr-FR").format(payment.amount_cfa)} FCFA</td>
                  <td>
                    <span className={`adm-badge adm-badge--${payment.status}`}>
                      {statusLabel(payment.status)}
                    </span>
                  </td>
                  <td>{payment.reference || "—"}</td>
                </tr>
              ))}
              {!payments.isLoading && !payments.data?.length && (
                <tr>
                  <td colSpan={5} className="adm-empty">
                    Les vérifications enregistrées apparaîtront ici.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

function ActivityLog() {
  const log = useQuery({
    queryKey: ["admin", "activity-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_activity")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
  return (
    <section className="adm-content">
      <div className="adm-page-head">
        <div>
          <p className="adm-eyebrow">Traçabilité</p>
          <h1>Journal d’activité</h1>
          <p>Les actions de gestion et les vérifications de paiement restent consultables ici.</p>
        </div>
      </div>
      <section className="adm-card">
        <div className="adm-activity-list">
          {(log.data ?? []).map((entry) => (
            <div className="adm-activity-row" key={entry.id}>
              <span className="adm-activity-dot" />
              <div>
                <strong>
                  {activityLabel(entry.action, entry.entity_type)}{" "}
                  {entry.entity_id ? `· ${entry.entity_id.slice(0, 8)}` : ""}
                </strong>
                <small>
                  {formatDate(entry.created_at)} ·{" "}
                  {entry.actor_id ? `compte ${entry.actor_id.slice(0, 8)}` : "système"}
                </small>
              </div>
            </div>
          ))}
          {!log.isLoading && !log.data?.length && (
            <p className="adm-activity-empty">Aucune activité à afficher pour l’instant.</p>
          )}
        </div>
      </section>
    </section>
  );
}

function activityLabel(action: string, entity: string) {
  const noun =
    (
      {
        brands: "une marque",
        collections: "une collection",
        products: "un produit",
        looks: "un look",
        campaigns: "une campagne",
        campaign: "un paiement",
      } as Record<string, string>
    )[entity] ?? entity;
  const verb = action.startsWith("payment.")
    ? `Paiement ${statusLabel(action.split(".")[1] ?? "")}`
    : ((
        {
          INSERT: "Création",
          UPDATE: "Modification",
          DELETE: "Suppression",
          create: "Création",
        } as Record<string, string>
      )[action] ?? action);
  return `${verb} · ${noun}`;
}
function statusLabel(status: string) {
  return (
    (
      {
        pending: "À confirmer",
        paid: "Réglé",
        cancelled: "Annulé",
        rejected: "Refusé",
        refunded: "Remboursé",
      } as Record<string, string>
    )[status] ?? status
  );
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}
