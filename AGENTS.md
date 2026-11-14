<!-- LOVABLE:BEGIN -->
Database management

This repository uses the existing Supabase project as its only backend.

- Database schema changes must be managed through SQL migrations versioned in "supabase/migrations/".
- Use Supabase CLI to develop, test and apply migrations.
- Review all migrations through GitHub before merging.
- Test migrations against a development database before production.
- Production migrations require explicit approval from the project owner.
- Do not use Lovable Cloud or create a parallel backend.
- Do not expose Supabase service_role credentials in frontend code.
- Never apply unversioned SQL changes directly to production.
- GitHub is the source of truth for application code and database migrations.
- Supabase remains the backend infrastructure..
<!-- LOVABLE:END -->

## Project rules

- The runway (`src/components/runway/`) renders static markup in React once, and `controller.ts` owns all motion and interactive state imperatively; why: the spring/ring math runs per animation frame and must not trigger React re-renders.
- Runway and site styling lives in plain CSS files (`runway.css`, `site.css`) imported from `src/styles.css` and reads colours only from the design tokens there; why: one source of truth for the palette.
- The styling bag is local to the browser (localStorage), with no checkout; why: the site showcases brands rather than selling directly.
