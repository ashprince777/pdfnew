// Integration tests for accounts + billing against the production build and a fake Supabase.
import { createHmac } from 'node:crypto';

// Needs a build made with the fake Supabase settings (see tests/run.mjs).
import { BASE_URL as APP, FIXTURES as FX, OUTPUT, launchBrowser } from './env.mjs';

const SB = process.env.FAKE_SUPABASE_URL || 'http://127.0.0.1:54321';
const FREE_ID = '11111111-1111-1111-1111-111111111111';
const results = [];
const check = async (name, fn) => {
    try {
        results.push(`PASS  ${name}${(await fn()) ? `: ${await fn.note}` : ''}`);
    } catch (e) {
        results.push(`FAIL  ${name}: ${e.message.split('\n')[0]}`);
    }
    console.log(results[results.length - 1]);
};
const assert = (c, m) => {
    if (!c) throw new Error(m);
};
const store = async () => (await (await fetch(`${SB}/__store`)).json()).store;
const freeSub = async () => (await store()).subscriptions.find((s) => s.user_id === FREE_ID);

async function webhook(event, { secret = 'whsec_test' } = {}) {
    const body = JSON.stringify(event);
    const sig = createHmac('sha256', secret).update(body).digest('hex');
    return fetch(`${APP}/api/billing/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Razorpay-Signature': sig }, body });
}
const sub = (status, extra = {}) => ({
    id: 'sub_free_user',
    plan_id: 'plan_month',
    status,
    current_end: Math.floor(Date.now() / 1000) + 30 * 86400,
    notes: { user_id: FREE_ID, email: 'free@example.com' },
    ...extra,
});

function sessionCookie(token) {
    const users = {
        'free-token': { id: FREE_ID, email: 'free@example.com' },
        'premium-token': { id: '22222222-2222-2222-2222-222222222222', email: 'premium@example.com' },
    };
    const session = {
        access_token: token,
        refresh_token: 'refresh',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: { ...users[token], aud: 'authenticated', app_metadata: { provider: 'email' }, user_metadata: {} },
    };
    return { name: 'sb-127-auth-token', value: 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url'), domain: 'localhost', path: '/' };
}
const cookieHeader = (token) => {
    const c = sessionCookie(token);
    return `${c.name}=${c.value}`;
};

await fetch(`${SB}/__reset`);

// ---------- Free trial ----------
const trialEligible = async (token) => (await (await fetch(`${APP}/api/billing/trial`, { headers: { Cookie: cookieHeader(token) } })).json()).eligible;
const trialEnd = Math.floor(Date.now() / 1000) + 7 * 86400;
const trialSub = (status, extra = {}) =>
    sub(status, { id: 'sub_trial', current_end: null, start_at: trialEnd, notes: { user_id: FREE_ID, email: 'Free+promo@Example.com', trial: '1' }, ...extra });

await check('trial: new users are eligible, past subscribers are not', async () => {
    assert((await trialEligible('free-token')) === true, 'free user should be eligible');
    assert((await trialEligible('premium-token')) === false, 'existing subscriber should not be eligible');
});
await check('trial: authenticated trial grants Premium until the first charge and is claimed once', async () => {
    const res = await webhook({ event: 'subscription.authenticated', payload: { subscription: { entity: trialSub('authenticated') } } });
    assert(res.status === 200, `status ${res.status}`);
    const row = await freeSub();
    const end = new Date(trialEnd * 1000).toISOString();
    assert(row.status === 'authenticated' && row.trial_ends_at === end && row.current_period_end === end, JSON.stringify(row));
    const claims = (await store()).trial_claims;
    assert(claims.length === 1 && /^[0-9a-f]{64}$/.test(claims[0].email_hash), JSON.stringify(claims));
    assert((await trialEligible('free-token')) === false, 'trial should not be offered twice');
});
await check('trial: account page shows the trial and first payment date', async () => {
    const browser = await launchBrowser();
    const ctx = await browser.newContext();
    await ctx.addCookies([sessionCookie('free-token')]);
    const page = await ctx.newPage();
    await page.goto(`${APP}/account`, { waitUntil: 'networkidle' });
    await page.getByTestId('trial-badge').waitFor({ timeout: 10000 });
    const text = await page.getByText(/Your free trial ends on/).textContent();
    assert(await page.getByRole('button', { name: 'Cancel free trial' }).isVisible(), 'no cancel trial button');
    await browser.close();
    check.note = text.trim();
});
await check('trial: cancelled during the trial keeps Premium until the trial ends, never charged', async () => {
    await webhook({ event: 'subscription.cancelled', payload: { subscription: { entity: trialSub('cancelled', { ended_at: Math.floor(Date.now() / 1000) }) } } });
    const row = await freeSub();
    assert(row.status === 'cancelled' && row.cancel_at_period_end && row.current_period_end === new Date(trialEnd * 1000).toISOString(), JSON.stringify(row));
});
await fetch(`${SB}/__reset`);

// ---------- Webhook ----------
await check('webhook rejects a bad signature', async () => {
    const res = await webhook({ event: 'subscription.activated', payload: { subscription: { entity: sub('active') } } }, { secret: 'wrong' });
    assert(res.status === 400, `status ${res.status}`);
    assert(!(await freeSub()), 'subscription was stored despite bad signature');
});
await check('subscription.activated grants Premium', async () => {
    const res = await webhook({ event: 'subscription.activated', payload: { subscription: { entity: sub('active') } } });
    assert(res.status === 200, `status ${res.status}`);
    const row = await freeSub();
    assert(row && row.plan === 'premium' && row.status === 'active' && row.billing_interval === 'monthly', JSON.stringify(row));
});
await check('subscription.charged records the payment', async () => {
    const res = await webhook({
        event: 'subscription.charged',
        payload: { subscription: { entity: sub('active') }, payment: { entity: { id: 'pay_123', amount: 29900, currency: 'INR', status: 'captured', invoice_id: 'inv_1' } } },
    });
    assert(res.status === 200, `status ${res.status}`);
    const p = (await store()).payments.find((x) => x.razorpay_payment_id === 'pay_123');
    assert(p && p.amount_paise === 29900 && p.user_id === FREE_ID, JSON.stringify(p));
});
await check('subscription.cancelled at cycle end keeps Premium until period end', async () => {
    await webhook({ event: 'subscription.cancelled', payload: { subscription: { entity: sub('cancelled') } } });
    const row = await freeSub();
    assert(row.status === 'cancelled' && row.cancel_at_period_end === true && new Date(row.current_period_end) > new Date(), JSON.stringify(row));
});
await check('subscription.halted (failed renewals) is stored', async () => {
    await webhook({ event: 'subscription.activated', payload: { subscription: { entity: sub('active') } } });
    await webhook({ event: 'subscription.halted', payload: { subscription: { entity: sub('halted') } } });
    assert((await freeSub()).status === 'halted', 'not halted');
});
await check('events without our user_id or of other types are acknowledged and ignored', async () => {
    const a = await webhook({ event: 'subscription.activated', payload: { subscription: { entity: { ...sub('active'), id: 'sub_x', notes: [] } } } });
    const b = await webhook({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_x' } } } });
    assert(a.status === 200 && b.status === 200, `${a.status} ${b.status}`);
    assert(!(await store()).subscriptions.some((s) => s.razorpay_subscription_id === 'sub_x'), 'foreign subscription stored');
});

// ---------- API auth ----------
await check('subscribe requires login', async () => {
    const res = await fetch(`${APP}/api/billing/subscribe`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"interval":"monthly"}' });
    assert(res.status === 401, `status ${res.status}`);
});
await check('subscribe refuses a second subscription for an active Premium user', async () => {
    const res = await fetch(`${APP}/api/billing/subscribe`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookieHeader('premium-token') }, body: '{"interval":"monthly"}' });
    assert(res.status === 409, `status ${res.status}`);
});
await check('verify rejects a forged payment signature', async () => {
    const res = await fetch(`${APP}/api/billing/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookieHeader('free-token') },
        body: JSON.stringify({ razorpay_payment_id: 'pay_fake', razorpay_subscription_id: 'sub_fake', razorpay_signature: 'deadbeef' }),
    });
    const data = await res.json();
    assert(res.status === 400 && /verification failed/i.test(data.error), `${res.status} ${JSON.stringify(data)}`);
});
await check('/account redirects to login when signed out', async () => {
    const res = await fetch(`${APP}/account`, { redirect: 'manual' });
    assert(res.status === 307 && /\/login\?next=%2Faccount/.test(res.headers.get('location')), `${res.status} ${res.headers.get('location')}`);
});

// ---------- AI ----------
const aiStore = async () => (await (await fetch(`${SB}/__store`)).json());
const aiPost = (token, body) =>
    fetch(`${APP}/api/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Cookie: cookieHeader(token) } : {}) },
        body: JSON.stringify({ consent: true, task: 'summarize', text: '[Page 1]\nInvoice 1001', language: '', ...body }),
    });

await check('ai: login, consent and valid input are required', async () => {
    assert((await aiPost(null, {})).status === 401, 'signed out should be 401');
    const noConsent = await aiPost('free-token', { consent: false });
    assert(noConsent.status === 400, `no consent: ${noConsent.status}`);
    const bad = await aiPost('free-token', { task: 'translate', language: '' });
    assert(bad.status === 400 && /Choose a language/.test((await bad.json()).error), 'missing language accepted');
    const credits = await (await fetch(`${APP}/api/ai/credits?task=translate`, { headers: { Cookie: cookieHeader('free-token') } })).json();
    assert(credits.enabled && credits.signedIn && credits.plan === 'free' && credits.used === 0 && credits.limit === 3, JSON.stringify(credits));
    assert(credits.maxChars === 8000, `translate text limit ${credits.maxChars}`);
    const tooLong = await aiPost('free-token', { text: 'x'.repeat(20001) });
    assert(tooLong.status === 400 && /too long/.test((await tooLong.json()).error), 'over-long document accepted');
});
await check('ai: upstream failure refunds the credit', async () => {
    const res = await aiPost('free-token', { text: '[Page 1]\nFAIL_UPSTREAM' });
    assert(res.status === 502, `status ${res.status}`);
    const usage = (await aiStore()).store.ai_usage.find((r) => r.user_id === FREE_ID);
    assert(usage && usage.used === 0, `credit not refunded: ${JSON.stringify(usage)}`);
});
await check('ai: free plan gets 3 requests a month, then 402 with upgrade message', async () => {
    for (let i = 0; i < 3; i++) {
        const res = await aiPost('free-token', {});
        assert(res.status === 200, `request ${i + 1}: ${res.status}`);
        assert((await res.text()).startsWith('FAKE AI ANSWER'), 'unexpected answer');
        assert(res.headers.get('x-ai-credits-used') === String(i + 1), 'credit header');
    }
    const over = await aiPost('free-token', {});
    const data = await over.json();
    assert(over.status === 402 && data.code === 'NO_CREDITS' && /Upgrade to Premium/.test(data.error), `${over.status} ${JSON.stringify(data)}`);
    const sent = (await aiStore()).aiRequests.at(-1);
    assert(sent.body.model === 'openai/gpt-oss-120b' && sent.body.stream === true, `model/stream: ${sent.body.model}`);
    const system = sent.body.messages[0];
    assert(system.role === 'system' && system.content.includes('Invoice 1001') && sent.apiKey === 'test-groq-key', `document or key not sent: key=${sent.apiKey}`);
});

// ---------- Browser UI ----------
const browser = await launchBrowser();
async function pageAs(token) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    if (token) await ctx.addCookies([sessionCookie(token)]);
    const page = await ctx.newPage();
    page.errors = [];
    page.on('pageerror', (e) => page.errors.push(e.message));
    return page;
}
const elevenPdfs = Array.from({ length: 11 }, () => `${FX}/sample.pdf`);

await check('signed out: navbar shows Pricing, Log in and Sign up', async () => {
    const page = await pageAs(null);
    await page.goto(`${APP}/`, { waitUntil: 'networkidle' });
    for (const name of ['Pricing', 'Log in', 'Sign up']) await page.getByRole('link', { name, exact: true }).first().waitFor({ timeout: 10000 });
    await page.context().close();
});
await check('free limits: 11 files in Merge shows upgrade prompt', async () => {
    const page = await pageAs(null);
    await page.goto(`${APP}/merge-pdf`, { waitUntil: 'networkidle' });
    await page.locator('input[type=file]').first().setInputFiles(elevenPdfs);
    await page.getByText('Free plan limit reached').waitFor({ timeout: 10000 });
    const msg = await page.getByText(/Free plan allows up to 10 files/).textContent();
    assert(await page.getByRole('link', { name: /Upgrade to Premium/ }).isVisible(), 'no upgrade link');
    await page.screenshot({ path: `${OUTPUT}/billing-limit.png` });
    await page.context().close();
    check.note = msg;
});
await check('free: PDF/A is locked with an upgrade prompt', async () => {
    const page = await pageAs('free-token');
    await page.goto(`${APP}/pdf-to-pdfa`, { waitUntil: 'networkidle' });
    await page.locator('input[type=file]').first().setInputFiles(`${FX}/sample.pdf`);
    await page.getByText('is a Premium feature').waitFor({ timeout: 10000 });
    assert(await page.getByRole('button', { name: /Convert to PDF\/A/ }).isDisabled(), 'convert not disabled');
    await page.context().close();
});
await check('free: account page shows Free plan and upgrade', async () => {
    const page = await pageAs('free-token');
    await page.goto(`${APP}/account`, { waitUntil: 'networkidle' });
    await page.getByText('Signed in as').waitFor({ timeout: 10000 });
    assert(await page.getByRole('link', { name: /Upgrade to Premium/ }).isVisible(), 'no upgrade link');
    // halted subscription message from the webhook test above
    assert(await page.getByText(/paused after repeated failed payments/).isVisible(), 'halted message missing');
    await page.context().close();
});
await check('premium: no limits, PDF/A unlocked, navbar badge, account renewal', async () => {
    const page = await pageAs('premium-token');
    await page.goto(`${APP}/merge-pdf`, { waitUntil: 'networkidle' });
    await page.getByRole('link', { name: 'Your account (Premium)' }).waitFor({ timeout: 10000 });
    await page.locator('input[type=file]').first().setInputFiles(elevenPdfs);
    await page.getByText(/11 files/).waitFor({ timeout: 10000 });
    await page.goto(`${APP}/pdf-to-pdfa`, { waitUntil: 'networkidle' });
    await page.locator('input[type=file]').first().setInputFiles(`${FX}/sample.pdf`);
    await page.getByRole('button', { name: /Convert to PDF\/A/ }).waitFor();
    assert(!(await page.getByRole('button', { name: /Convert to PDF\/A/ }).isDisabled()), 'PDF/A locked for premium');
    await page.goto(`${APP}/account`, { waitUntil: 'networkidle' });
    await page.getByText('Premium (yearly)').waitFor({ timeout: 10000 });
    const renews = await page.getByText(/Renews on/).textContent();
    await page.screenshot({ path: `${OUTPUT}/billing-account.png`, fullPage: true });
    assert(!page.errors.length, page.errors.join(' | '));
    await page.context().close();
    check.note = renews.trim();
});
await check('pricing page and auth pages render', async () => {
    const page = await pageAs(null);
    await page.goto(`${APP}/pricing`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /Start 7-day free trial/ }).waitFor({ timeout: 10000 });
    assert(await page.getByTestId('trial-note').isVisible(), 'trial note missing');
    await page.getByRole('radio', { name: /Monthly/ }).click();
    await page.getByText('₹299', { exact: true }).waitFor();
    // Prices must be in the server-rendered HTML (payment reviewers and search engines read it without JavaScript).
    const html = await (await fetch(`${APP}/pricing`)).text();
    assert(html.includes('₹299') && html.includes('1,999') && html.includes('7-day free trial'), 'prices missing from server HTML');
    await page.screenshot({ path: `${OUTPUT}/billing-pricing.png`, fullPage: true });
    await page.goto(`${APP}/login`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Continue with Google' }).waitFor();
    await page.goto(`${APP}/signup`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Sign up' }).waitFor();
    // Signed-out "Start free trial" goes to sign-up and back to checkout
    await page.goto(`${APP}/pricing`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /Start 7-day free trial/ }).click();
    await page.waitForURL(/\/signup\?next=/);
    const next = decodeURIComponent(new URL(page.url()).searchParams.get('next'));
    assert(next === '/pricing?interval=yearly&checkout=1', next);
    await page.context().close();
});

await check('ai: premium user chats with a PDF after confirming the privacy notice', async () => {
    const page = await pageAs('premium-token');
    await page.goto(`${APP}/chat-with-pdf`, { waitUntil: 'networkidle' });
    await page.getByTestId('ai-consent').waitFor({ timeout: 10000 });
    assert(await page.getByRole('button', { name: 'Continue' }).isDisabled(), 'continue enabled before ticking');
    await page.getByLabel(/text of my document is sent to the Groq AI service/).check();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByText(/of 200 AI credits left/).waitFor({ timeout: 10000 });
    await page.locator('input[type=file]').first().setInputFiles(`${FX}/sample.pdf`);
    await page.getByLabel('Your question').fill('What is the invoice number?');
    await page.getByRole('button', { name: 'Send question' }).click();
    await page.getByTestId('chat-assistant').filter({ hasText: 'FAKE AI ANSWER (1 message)' }).waitFor({ timeout: 15000 });
    await page.getByLabel('Your question').fill('And the total?');
    await page.getByRole('button', { name: 'Send question' }).click();
    await page.getByTestId('chat-assistant').filter({ hasText: 'FAKE AI ANSWER (3 messages)' }).waitFor({ timeout: 15000 });
    const sent = (await aiStore()).aiRequests.at(-1).body;
    assert(sent.messages[0].content.includes('[Page 1]') && sent.messages[0].content.includes('Invoice 1001'), 'extracted text with page markers not sent');
    assert(sent.messages.map((m) => m.role).join() === 'system,user,assistant,user', 'history not sent');
    await page.getByText(/198 of 200 AI credits left/).waitFor();
    await page.screenshot({ path: `${OUTPUT}/ai-chat.png`, fullPage: true });
    // Consent is remembered.
    await page.goto(`${APP}/summarize-pdf`, { waitUntil: 'networkidle' });
    await page.locator('input[type=file]').first().waitFor({ state: 'attached', timeout: 10000 });
    assert(!(await page.getByTestId('ai-consent').count()), 'consent asked twice');
    assert(!page.errors.length, page.errors.join(' | '));
    await page.context().close();
});

await check('admin dashboard: admin sees numbers, others get 404', async () => {
    const page = await pageAs('premium-token');
    const res = await page.goto(`${APP}/admin`, { waitUntil: 'networkidle' });
    assert(res.status() === 200, `admin got ${res.status()}`);
    await page.getByRole('heading', { name: 'Dashboard' }).waitFor({ timeout: 10000 });
    for (const label of ['Total accounts', 'Paying Premium', 'In free trial', 'Revenue, last 30 days', 'Latest sign-ups']) {
        assert(await page.getByText(label).first().isVisible(), `missing ${label}`);
    }
    await page.screenshot({ path: `${OUTPUT}/admin-dashboard.png`, fullPage: true });
    assert(!page.errors.length, page.errors.join(' | '));
    await page.context().close();
    const other = await pageAs('free-token');
    const denied = await other.goto(`${APP}/admin`);
    assert(denied.status() === 404, `non-admin got ${denied.status()}`);
    await other.context().close();
});

await browser.close();
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exitCode = failed ? 1 : 0;
