import { createBrowserClient } from "@supabase/ssr";

const url = import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error("La configuration Supabase publique est manquante.");
}

export const supabase = createBrowserClient(url, key, {
  cookieOptions: {
    path: "/",
    sameSite: "lax",
    secure: import.meta.env.PROD,
  },
});
