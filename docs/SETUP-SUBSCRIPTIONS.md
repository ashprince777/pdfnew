# Setting up accounts and Premium subscriptions

The code for login, sign-up, the pricing page, the account page and Razorpay subscriptions is
already in the app. It stays switched off (the site runs as a free tool site) until the
environment variables below are set. Allow about an hour, plus Razorpay's account review.

All variables are listed in [`.env.example`](../.env.example).

## 1. Supabase (accounts + database)

1. Create a free project at <https://supabase.com> (choose the **Mumbai** region for Indian users).
2. **SQL Editor → New query**: paste and run each migration, in order:
   - [`0001_billing.sql`](../supabase/migrations/0001_billing.sql): `subscriptions` and `payments` tables
   - [`0002_free_trial.sql`](../supabase/migrations/0002_free_trial.sql): 7-day free trial (`trial_ends_at`, `trial_claims`)
   - [`0003_ai_credits.sql`](../supabase/migrations/0003_ai_credits.sql): monthly AI credits (`ai_usage` + two functions)

   All tables use row-level security (users can only read their own rows; only the server can write).
   If you already ran 0001 earlier, just run 0002 and 0003. Until 0002 is run, checkout simply
   charges straight away (no trial); until 0003 is run, AI tools answer "not available yet".
3. **Authentication → URL Configuration**
   - Site URL: `https://www.pdfadore.com` (or your custom domain)
   - Redirect URLs: add `https://www.pdfadore.com/auth/callback` and `http://localhost:3000/auth/callback`
4. **Authentication → Sign In / Providers → Google**: enable it. Create OAuth credentials in
   Google Cloud Console (APIs & Services → Credentials → OAuth client ID → Web application) with the
   authorised redirect URI Supabase shows you, then paste the client ID and secret into Supabase.
5. **Authentication → Emails**: Supabase's built-in email sender is rate-limited (a few emails per
   hour). Before launch, set up custom SMTP (e.g. Resend, Brevo or Amazon SES) under
   *Authentication → Emails → SMTP Settings* so confirmation and reset emails always arrive.
6. **Project Settings → API**: copy the Project URL, the `anon` public key and the
   `service_role` secret key into the env variables.

## 2. Razorpay (payments)

1. Sign up at <https://razorpay.com> and complete KYC. Until the account is activated, use **Test mode**.
2. Make sure the website has the pages Razorpay checks: Contact, Terms, Privacy, Refund policy.
   They exist; fill in `NEXT_PUBLIC_LEGAL_NAME`, `NEXT_PUBLIC_BUSINESS_ADDRESS` and
   `NEXT_PUBLIC_SUPPORT_EMAIL` so they show your real details.
3. **Subscriptions → Plans → Create plan** (twice):
   - Monthly: period *monthly*, interval 1, amount **₹299**
   - Yearly: period *yearly*, interval 1, amount **₹1,999**

   Copy the two `plan_...` IDs into `RAZORPAY_PLAN_MONTHLY` / `RAZORPAY_PLAN_YEARLY`.
   If you change prices later, create new plans and update both the IDs and `PREMIUM_PRICES_INR`
   in [`lib/plans.ts`](../lib/plans.ts).
4. **Account & Settings → API Keys**: generate a key pair. The key ID goes in both
   `RAZORPAY_KEY_ID` and `NEXT_PUBLIC_RAZORPAY_KEY_ID`; the secret in `RAZORPAY_KEY_SECRET`.
5. **Account & Settings → Webhooks → Add new webhook**
   - URL: `https://www.pdfadore.com/api/billing/webhook`
   - Secret: a long random string, also set as `RAZORPAY_WEBHOOK_SECRET`
   - Events: all `subscription.*` events (activated, charged, pending, halted, cancelled, completed, paused, resumed, updated)
6. Subscriptions with UPI AutoPay / card mandates may need to be enabled for your account. Ask
   Razorpay support if the Subscriptions menu is missing.

## 3. Groq (AI tools)

1. Create an account at <https://console.groq.com> and create an API key.
2. Set `GROQ_API_KEY` (server only, never `NEXT_PUBLIC_`). The AI pages switch from "coming soon"
   to working as soon as the key and the Supabase variables are set.
3. The default model is `openai/gpt-oss-120b`. Change it with `GROQ_MODEL` (models your key can use
   are listed at <https://console.groq.com/docs/models>).

**Limits on the free tier.** Groq's free tier allows about **8,000 tokens per minute for the whole
site**, shared by every user. That is why one request is limited to about 20,000 characters of text
(roughly 8-10 pages; 8,000 characters for translations, whose output is as long as the input), and why
users may see "The AI service is busy" when several people use AI in the same minute (their credit is
returned). Before promoting the AI tools, upgrade to Groq's paid Developer tier in the Groq console
and raise `AI_MAX_TEXT_CHARS` (for example to `200000`). The monthly credit amounts are in
`AI_CREDITS` in [`lib/plans.ts`](../lib/plans.ts).

**Cost on a paid tier.** gpt-oss-120b is billed per token and costs well under ₹1 for a typical
summary, so 200 Premium credits a month cost far less than the ₹299 subscription. Check current
prices at <https://groq.com/pricing>.

## 4. Vercel

Add every variable from `.env.example` in **Project → Settings → Environment Variables**
(Production and Preview), then redeploy. Variables starting with `NEXT_PUBLIC_` are built into the
page, so a redeploy is required after changing them.

## 5. Test before going live (Razorpay Test mode)

1. Sign up on the site, confirm the email, and open **Pricing → Start 7-day free trial**. A new
   account gets the trial: Razorpay sets up the mandate now (your bank may show a small refundable
   verification charge) and the first real charge happens after 7 days.
2. Pay with Razorpay's test card `4111 1111 1111 1111` (any future expiry, any CVV) or test UPI
   `success@razorpay`.
3. You should land on **Account** showing *Premium*, and Merge PDF should accept more than 10 files.
4. In Razorpay, check **Webhooks → your webhook** shows successful deliveries.
5. The account page shows a *Free trial* badge and the first payment date. Cancel the trial: it should
   say Premium stays until the trial ends and you will not be charged.
6. Open **Summarize PDF**, accept the AI notice and summarize a PDF: the credit counter goes down by one.

Then switch the Razorpay keys and plan IDs to **live** values and redeploy.

## How it works

| Piece | Where |
| --- | --- |
| Plans, prices, limits, Premium features | `lib/plans.ts` |
| Who is Premium (shared rule) | `lib/billing/entitlement.ts` |
| Razorpay API + signature checks | `lib/billing/razorpay.ts` |
| Start / verify / cancel subscription | `app/api/billing/*` |
| Webhook (renewals, failures, cancellations) | `app/api/billing/webhook/route.ts` |
| Login, sign-up, password reset, Google | `components/auth/AuthForms.tsx`, `app/auth/callback` |
| Session refresh, `/account` protection | `proxy.ts` |
| Plan state in the UI | `components/PlanProvider.tsx` |
| Free trial (eligibility, one per email) | `lib/billing/razorpay.ts` (`isTrialEligible`, `claimTrial`), `app/api/billing/trial` |
| AI prompts and validation | `lib/ai/prompts.ts` |
| AI route (credits, streaming, refunds) | `app/api/ai/route.ts`, `lib/ai/server.ts` |
| AI page UI and privacy notice | `components/AiPdfTool.tsx` |

Notes:

- Files are still processed only in the browser; accounts just identify the plan.
- Because tools run in the browser, plan limits are enforced in the app. They stop normal use,
  but a technical user could bypass them. Anything with real per-use cost (e.g. future AI
  features) should be checked on the server.
- Unit tests for the billing rules: `npm run test:billing`.
