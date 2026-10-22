// Minimal stand-in for Supabase Auth + PostgREST (and the Groq chat API), enough to exercise the
// app's accounts, billing and AI code.
import http from 'node:http';

const PORT = Number(process.env.PORT || 54321);
const USERS = {
    'free-token': { id: '11111111-1111-1111-1111-111111111111', email: 'free@example.com', app_metadata: { provider: 'email' }, user_metadata: { full_name: 'Free User' } },
    'premium-token': { id: '22222222-2222-2222-2222-222222222222', email: 'premium@example.com', app_metadata: { provider: 'email' }, user_metadata: { full_name: 'Premium User' } },
};
const store = {
    subscriptions: [
        {
            user_id: USERS['premium-token'].id,
            plan: 'premium',
            status: 'active',
            billing_interval: 'yearly',
            razorpay_subscription_id: 'sub_premium',
            current_period_end: new Date(Date.now() + 200 * 86400000).toISOString(),
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
        },
    ],
    payments: [],
    trial_claims: [],
    ai_usage: [],
};
/** Bodies of the requests the app sent to the Groq API, newest last. */
const aiRequests = [];
const log = [];

const send = (res, status, body, headers = {}) => {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*', ...headers });
    res.end(body === undefined ? '' : JSON.stringify(body));
};

function filterRows(table, params) {
    return store[table].filter((row) => {
        for (const [key, value] of params) {
            if (['select', 'order', 'limit', 'on_conflict', 'columns'].includes(key)) continue;
            if (value.startsWith('eq.') && String(row[key]) !== value.slice(3)) return false;
        }
        return true;
    });
}

http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') return send(res, 204);
    const url = new URL(req.url, `http://localhost:${PORT}`);
    let body = '';
    for await (const chunk of req) body += chunk;
    const token = (req.headers.authorization || '').replace(/^Bearer /, '');
    log.push({ method: req.method, path: url.pathname + url.search });

    if (url.pathname === '/__store') return send(res, 200, { store, log, aiRequests });
    if (url.pathname === '/__reset') {
        store.subscriptions = store.subscriptions.filter((s) => s.user_id === USERS['premium-token'].id);
        store.payments = [];
        store.trial_claims = [];
        store.ai_usage = [];
        aiRequests.length = 0;
        return send(res, 200, { ok: true });
    }

    if (url.pathname === '/auth/v1/user') {
        const user = USERS[token];
        return user ? send(res, 200, user) : send(res, 401, { code: 401, msg: 'invalid JWT' });
    }
    if (url.pathname.startsWith('/auth/v1/')) return send(res, 200, {});

    // Groq chat completions (OpenAI-compatible streaming). A document containing FAIL_UPSTREAM gets a 400 error.
    if (url.pathname === '/openai/v1/chat/completions' && req.method === 'POST') {
        const request = JSON.parse(body || '{}');
        aiRequests.push({ body: request, apiKey: String(req.headers.authorization || '').replace(/^Bearer /, '') });
        const system = request.messages.find((m) => m.role === 'system')?.content || '';
        if (system.includes('FAIL_UPSTREAM')) return send(res, 400, { error: { message: 'fake failure', type: 'invalid_request_error' } });
        const turns = request.messages.filter((m) => m.role !== 'system');
        const answer = `FAKE AI ANSWER (${turns.length} message${turns.length === 1 ? '' : 's'}): ${String(turns[turns.length - 1].content).slice(0, 60)}`;
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
        const chunk = (delta, finish = null) =>
            res.write(`data: ${JSON.stringify({ id: 'chatcmpl-fake', object: 'chat.completion.chunk', created: 0, model: request.model, choices: [{ index: 0, delta, finish_reason: finish }] })}\n\n`);
        chunk({ role: 'assistant', content: '' });
        for (const piece of answer.match(/.{1,12}/g)) chunk({ content: piece });
        chunk({}, 'stop');
        res.write('data: [DONE]\n\n');
        return res.end();
    }

    // AI credit functions (supabase/migrations/0003_ai_credits.sql)
    const rpc = url.pathname.match(/^\/rest\/v1\/rpc\/(consume_ai_credit|refund_ai_credit)$/);
    if (rpc) {
        if (token !== 'service-role-key') return send(res, 403, { message: 'permission denied' });
        const args = JSON.parse(body || '{}');
        let row = store.ai_usage.find((r) => r.user_id === args.p_user && r.month === args.p_month);
        if (rpc[1] === 'refund_ai_credit') {
            if (row) row.used = Math.max(0, row.used - 1);
            return send(res, 200, null);
        }
        if (!row) store.ai_usage.push((row = { user_id: args.p_user, month: args.p_month, used: 0 }));
        if (row.used >= args.p_limit) return send(res, 200, null);
        row.used += 1;
        return send(res, 200, row.used);
    }

    const match = url.pathname.match(/^\/rest\/v1\/(subscriptions|payments|trial_claims|ai_usage)$/);
    if (match) {
        const table = match[1];
        const isService = token === 'service-role-key';
        const requester = USERS[token];
        // Emulate row-level security: users only see their own rows; service role sees all.
        const visible = (rows) => (isService ? rows : rows.filter((r) => requester && r.user_id === requester.id));
        if (req.method === 'GET') {
            const rows = visible(filterRows(table, url.searchParams));
            const single = (req.headers.accept || '').includes('vnd.pgrst.object');
            return send(res, 200, single ? rows[0] ?? null : rows);
        }
        if (!isService) return send(res, 403, { message: 'permission denied (RLS: no write policy)' });
        if (req.method === 'POST') {
            const items = [].concat(JSON.parse(body || '[]'));
            const key = { subscriptions: 'user_id', payments: 'razorpay_payment_id', trial_claims: 'email_hash' }[table];
            for (const item of items) {
                const i = store[table].findIndex((r) => r[key] === item[key]);
                if (i >= 0) store[table][i] = { ...store[table][i], ...item };
                else store[table].push(item);
            }
            return send(res, 201, []);
        }
        if (req.method === 'PATCH') {
            const patch = JSON.parse(body || '{}');
            for (const row of filterRows(table, url.searchParams)) Object.assign(row, patch);
            return send(res, 204);
        }
    }
    send(res, 404, { message: `not faked: ${req.method} ${url.pathname}` });
}).listen(PORT, () => console.log(`fake supabase on ${PORT}`));
