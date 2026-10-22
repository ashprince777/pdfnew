// Runs every end-to-end suite against production builds.
//   npm run test:e2e              build + run all suites
//   npm run test:e2e -- --skip-build   reuse the existing builds in .next-test-*
import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { ROOT } from './env.mjs';

const skipBuild = process.argv.includes('--skip-build');
const isWin = process.platform === 'win32';
const children = [];

/** Accounts/billing variables: blanked for the free-site build so local .env.local keys don't apply. */
const BILLING_VARS = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_RAZORPAY_KEY_ID',
    'SUPABASE_SERVICE_ROLE_KEY',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
    'RAZORPAY_PLAN_MONTHLY',
    'RAZORPAY_PLAN_YEARLY',
    'RAZORPAY_WEBHOOK_SECRET',
    'GROQ_API_KEY',
    'GROQ_BASE_URL',
    'GROQ_MODEL',
    'AI_MAX_TEXT_CHARS',
];
const blank = Object.fromEntries(BILLING_VARS.map((k) => [k, '']));

const FAKE_SUPABASE = 'http://127.0.0.1:54321';
const billingEnv = {
    NEXT_PUBLIC_SUPABASE_URL: FAKE_SUPABASE,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
    NEXT_PUBLIC_RAZORPAY_KEY_ID: 'rzp_test_fake',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
    RAZORPAY_KEY_ID: 'rzp_test_fake',
    RAZORPAY_KEY_SECRET: 'rzp_secret_fake',
    RAZORPAY_PLAN_MONTHLY: 'plan_month',
    RAZORPAY_PLAN_YEARLY: 'plan_year',
    RAZORPAY_WEBHOOK_SECRET: 'whsec_test',
    // The fake server also answers the Groq chat API (see tests/fake-supabase.mjs).
    GROQ_API_KEY: 'test-groq-key',
    GROQ_BASE_URL: FAKE_SUPABASE,
    GROQ_MODEL: '',
    AI_MAX_TEXT_CHARS: '',
};

function run(cmd, args, env = {}, { background = false } = {}) {
    const child = spawn(cmd, args, { cwd: ROOT, env: { ...process.env, ...env }, stdio: background ? 'ignore' : 'inherit', shell: isWin });
    if (background) {
        children.push(child);
        return child;
    }
    return new Promise((resolve) => child.on('exit', (code) => resolve(code ?? 1)));
}

function waitForPort(port, timeoutMs = 120_000) {
    const deadline = Date.now() + timeoutMs;
    return new Promise((resolve, reject) => {
        const attempt = () => {
            const socket = net.connect(port, '127.0.0.1');
            socket.once('connect', () => {
                socket.end();
                resolve();
            });
            socket.once('error', () => {
                socket.destroy();
                if (Date.now() > deadline) reject(new Error(`port ${port} did not open`));
                else setTimeout(attempt, 500);
            });
        };
        attempt();
    });
}

function stopAll() {
    for (const child of children.splice(0)) {
        if (isWin) spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
        else child.kill('SIGTERM');
    }
}
process.on('exit', stopAll);
process.on('SIGINT', () => process.exit(130));

const next = path.join('node_modules', '.bin', isWin ? 'next.cmd' : 'next');
const results = [];
async function suite(name, file, env) {
    console.log(`\n=== ${name} ===`);
    const code = await run('node', [file], env);
    results.push([name, code]);
}

if ((await run('node', ['tests/make-fixtures.mjs'])) !== 0) process.exit(1);

// 1. The free tool site (no accounts configured).
const freeDist = '.next-test-free';
if (!skipBuild && (await run(next, ['build'], { ...blank, NEXT_DIST_DIR: freeDist })) !== 0) process.exit(1);
run(next, ['start', '--port', '3210'], { ...blank, NEXT_DIST_DIR: freeDist }, { background: true });
await waitForPort(3210);
await suite('Tools', 'tests/tools.e2e.mjs', { BASE_URL: 'http://localhost:3210' });
await suite('Edit PDF', 'tests/editor.e2e.mjs', { BASE_URL: 'http://localhost:3210' });
stopAll();

// 2. Accounts + billing against a fake Supabase.
const billingDist = '.next-test-billing';
if (!skipBuild && (await run(next, ['build'], { ...billingEnv, NEXT_DIST_DIR: billingDist })) !== 0) process.exit(1);
run('node', ['tests/fake-supabase.mjs'], {}, { background: true });
await waitForPort(54321);
run(next, ['start', '--port', '3212'], { ...billingEnv, NEXT_DIST_DIR: billingDist }, { background: true });
await waitForPort(3212);
await suite('Accounts & billing', 'tests/billing.e2e.mjs', { BASE_URL: 'http://localhost:3212', FAKE_SUPABASE_URL: FAKE_SUPABASE });
stopAll();

console.log('\n=== Summary ===');
for (const [name, code] of results) console.log(`${code === 0 ? 'PASS' : 'FAIL'}  ${name}`);
process.exitCode = results.every(([, code]) => code === 0) ? 0 : 1;
