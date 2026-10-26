# SEO bot

Runs every day at 07:00 IST (Vercel Cron → `/api/cron/seo`). Results are on **/admin/seo**.

| Step | What it does |
| --- | --- |
| Search Console | Saves the last days of Google searches, clicks, impressions and positions per page. |
| Check earlier changes | Four weeks after a title change, keeps it if the click rate held up; undoes it if the rate fell by more than 20%. |
| Rewrite titles | Pages with 100+ impressions, on Google page 1-2, but under 60% of the usual click rate for their position get a new title and description from the AI. |
| Site audit | Crawls every URL in the sitemap: status, title and description length, canonical, one H1, valid structured data, no stray noindex, duplicate titles. |
| Google updates | Reads Google's Search Status Dashboard (core, spam and other ranking updates) and the Search Central blog; the AI notes what to check for each new ranking update. |
| Keyword ideas | Google autocomplete (India) for the main tool keywords; lists suggestions that no page title targets yet. |

## Guardrails for automatic changes

- At most 3 pages a day; a page is left alone for 28 days after a change, and for 90 days after a change was undone.
- Every AI draft is checked: title 30-65 characters keeping "| PDFAdore", description 110-165 characters, no claims such as "best", "#1" or "guaranteed", no ALL CAPS, quotes or emoji. Rejected drafts are logged, not used.
- The AI only gets facts from the page itself (free vs Premium, files stay on the device or not), so it cannot promise features that do not exist.
- Only titles and meta descriptions change, never page content. They live in the `seo_overrides` table; the defaults stay in `lib/seo.ts`.
- Any change can be undone from /admin/seo. Changed pages are refreshed within a minute and sent to Bing and other search engines that accept instant submissions (IndexNow).

## One-time setup

1. **Database**: run `supabase/migrations/0004_seo_bot.sql` in the Supabase SQL editor.
2. **Vercel env (Production)**: `CRON_SECRET` = any long random string. Vercel sends it to the cron route automatically.
3. **Google Search Console access** (needed for rankings and title changes; the audit, update watch and keyword ideas work without it):
   1. In [Google Cloud Console](https://console.cloud.google.com/), create a project (e.g. `pdfadore-seo`).
   2. **APIs & Services → Library**: enable **Google Search Console API**.
   3. **IAM & Admin → Service accounts → Create service account** (name `seo-bot`, no roles). Open it → **Keys → Add key → JSON** and download the file.
   4. In [Search Console](https://search.google.com/search-console) → property `pdfadore.com` → **Settings → Users and permissions → Add user**: the service account's email (`seo-bot@….iam.gserviceaccount.com`), permission **Restricted**.
   5. In Vercel → Settings → Environment Variables (Production), add from the JSON file:
      - `GSC_CLIENT_EMAIL` = `client_email`
      - `GSC_PRIVATE_KEY` = `private_key` (the whole value, from `-----BEGIN PRIVATE KEY-----` to `-----END PRIVATE KEY-----`)
      - Optional `GSC_SITE_URL` if the property is not the domain property `sc-domain:pdfadore.com`.
   6. Redeploy, then press **Run now** on /admin/seo.

Search Console data is 2-3 days behind, and a new site needs a few weeks of impressions before any page qualifies for a rewrite.

Tests: `npm run test:seo-bot` (rules), and the billing e2e suite covers the dashboard and live title overrides.
