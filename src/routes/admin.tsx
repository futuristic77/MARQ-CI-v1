import { createFileRoute } from "@tanstack/react-router";
import { AdminApp } from "@/components/admin/AdminApp";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administration — MARQ’CI" },
      { name: "description", content: "Espace privé de gestion de la plateforme MARQ’CI." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminApp,
});
