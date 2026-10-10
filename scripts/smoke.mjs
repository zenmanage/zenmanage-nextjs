#!/usr/bin/env node
// Builds a real Next.js app against the packed tarball of this package and checks what it serves.
//
//   npm run build && node scripts/smoke.mjs
//   SMOKE_NEXT_VERSION=16 node scripts/smoke.mjs    # another Next.js version
//   SMOKE_SERVE=1 node scripts/smoke.mjs            # keep the app running to try it in a browser
//   SMOKE_NEXT_VERSION=16 SMOKE_PROXY=1 node scripts/smoke.mjs   # proxy.ts (Node.js) instead of middleware.ts
//
// The app talks to a mock Zenmanage API started here. @zenmanage/sdk only accepts an https://
// rules CDN, so the mock serves it over TLS with a throwaway self-signed certificate that the
// Next.js server process is told to trust (NODE_EXTRA_CA_CERTS). Nothing disables verification.

import { execFileSync, spawn } from 'node:child_process';
import {
  cpSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createServer as createHttpServer } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { createServer as createNetServer } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const nextVersion = process.env.SMOKE_NEXT_VERSION;

const SERVER_KEY = 'srv_smoke_server_key';
const CLIENT_KEY = 'cli_smoke_client_key';

const work = mkdtempSync(join(tmpdir(), 'zenmanage-nextjs-smoke-'));
const appDir = join(work, 'app');
const requests = [];
const results = [];
let nextServer;
let apiServer;
let cdnServer;

function check(name, passed, detail = '') {
  results.push({ name, passed, detail });
  console.log(`${passed ? '✓' : '✗'} ${name}${!passed && detail ? `\n    ${detail}` : ''}`);
}

function run(command, args, options) {
  console.log(`$ ${command} ${args.join(' ')}`);
  return execFileSync(command, args, { stdio: ['ignore', 'inherit', 'inherit'], ...options });
}

function wrap(value) {
  if (typeof value === 'boolean') return { boolean: value };
  if (typeof value === 'number') return { number: value };
  if (typeof value === 'string') return { string: value };
  return { json: value };
}

function flag(key, value, rules = []) {
  const type =
    typeof value === 'object' ? 'json' : typeof value === 'string' ? 'string' : typeof value;
  return {
    version: `fla_${key}`,
    type,
    key,
    name: key,
    target: { version: 'tar_1', value: { version: 'val_1', value: wrap(value) } },
    rules: rules.map((rule) => ({ clauses: rule.clauses, value: { value: wrap(rule.value) } })),
  };
}

const rules = {
  version: '1',
  flags: [
    flag('new-checkout', true),
    flag('limit', 7),
    flag('theme', { color: 'teal' }),
    flag('beta-dashboard', false, [
      { clauses: [{ attribute: 'country', operator: 'equal', value: 'CA' }], value: true },
    ]),
  ],
};

function listen(server) {
  return new Promise((done) => server.listen(0, '127.0.0.1', () => done(server.address().port)));
}

function record(origin, req) {
  requests.push({ origin, method: req.method, url: req.url, headers: req.headers });
}

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
};

async function startMockApi() {
  run('openssl', [
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-keyout',
    join(work, 'key.pem'),
    '-out',
    join(work, 'cert.pem'),
    '-days',
    '1',
    '-subj',
    '/CN=localhost',
    '-addext',
    'subjectAltName=DNS:localhost,IP:127.0.0.1',
  ]);

  cdnServer = createHttpsServer(
    { key: readFileSync(join(work, 'key.pem')), cert: readFileSync(join(work, 'cert.pem')) },
    (req, res) => {
      record('cdn', req);
      res.writeHead(200, { 'content-type': 'application/json', ...cors });
      res.end(JSON.stringify(rules));
    }
  );
  const cdnPort = await listen(cdnServer);

  apiServer = createHttpServer((req, res) => {
    record('api', req);

    if (req.method === 'OPTIONS') {
      res.writeHead(204, cors).end();
    } else if (req.url === '/v1/flag-json') {
      res.writeHead(200, { 'content-type': 'application/json', ...cors });
      res.end(
        JSON.stringify({ data: { cdn: `https://localhost:${cdnPort}`, path: '/rules.json' } })
      );
    } else if (req.url.startsWith('/v1/flags/')) {
      res.writeHead(204, cors).end();
    } else {
      res.writeHead(404, cors).end();
    }
  });

  return `http://127.0.0.1:${await listen(apiServer)}`;
}

async function waitForServer(url, attempts = 60) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // Not listening yet.
    }
    await new Promise((done) => setTimeout(done, 500));
  }
  throw new Error(`Next.js did not start serving ${url}`);
}

// Asks the OS for an unused port, so two runs on one machine don't collide.
function freePort() {
  return new Promise((done, fail) => {
    const server = createNetServer();
    server.once('error', fail);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => done(port));
    });
  });
}

function filesUnder(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

async function get(path, headers = {}) {
  const response = await fetch(`http://127.0.0.1:${nextPort}${path}`, { headers });
  return { status: response.status, body: await response.text() };
}

let nextPort;

async function main() {
  const apiUrl = await startMockApi();

  const packed = JSON.parse(
    execFileSync('npm', ['pack', '--json', '--pack-destination', work], { cwd: root })
  );
  const tarball = join(work, packed[0].filename);

  cpSync(join(root, 'examples', 'smoke-app'), appDir, {
    recursive: true,
    filter: (source) => !/[\\/](node_modules|\.next)([\\/]|$)/.test(source),
  });

  if (process.env.SMOKE_PROXY) {
    // Next.js 16 renamed the middleware file to proxy.ts, which runs on Node.js.
    const middleware = readFileSync(join(appDir, 'middleware.js'), 'utf8');
    writeFileSync(
      join(appDir, 'proxy.js'),
      middleware.replace('export async function middleware', 'export async function proxy')
    );
    renameSync(join(appDir, 'middleware.js'), join(work, 'middleware.js.unused'));
  }

  const install = ['install', '--no-audit', '--no-fund', '--no-save', tarball];
  if (nextVersion) {
    install.push(`next@${nextVersion}`);
    // Next.js 13 and 14 need React 18; 15 and later accept 19, which the app is written for.
    if (Number.parseInt(nextVersion, 10) < 15) install.push('react@18', 'react-dom@18');
  }
  run('npm', install, { cwd: appDir });

  const installedNext = JSON.parse(
    readFileSync(join(appDir, 'node_modules', 'next', 'package.json'), 'utf8')
  ).version;
  console.log(`Next.js ${installedNext}, @zenmanage/nextjs ${version}`);

  const env = {
    ...process.env,
    NODE_EXTRA_CA_CERTS: join(work, 'cert.pem'),
    NEXT_TELEMETRY_DISABLED: '1',
    ZENMANAGE_ENVIRONMENT_TOKEN: SERVER_KEY,
    ZENMANAGE_API_ENDPOINT: apiUrl,
    NEXT_PUBLIC_ZENMANAGE_ENVIRONMENT_TOKEN: CLIENT_KEY,
    NEXT_PUBLIC_ZENMANAGE_API_ENDPOINT: apiUrl,
  };

  run('npx', ['next', 'build'], { cwd: appDir, env });

  nextPort = await freePort();
  nextServer = spawn('npx', ['next', 'start', '-p', String(nextPort)], {
    cwd: appDir,
    env,
    stdio: ['ignore', 'inherit', 'inherit'],
    detached: true,
  });
  await waitForServer(`http://127.0.0.1:${nextPort}/api/flag`);

  // App Router: a Server Component, and a Client Component rendered on the server.
  const home = await get('/');
  check('App Router page renders', home.status === 200, `status ${home.status}`);
  check(
    'server component reads the flags, JSON included',
    home.body.includes('server:checkout=true;limit=7;theme=teal'),
    home.body.slice(0, 600)
  );
  check(
    'client component renders the bootstrapped values, ready, during SSR with a client key',
    home.body.includes('client:checkout=true;limit=7;theme=teal;loading=false'),
    home.body.slice(0, 600)
  );

  // Route handler.
  const api = await get('/api/flag');
  check(
    'route handler evaluates flags',
    api.status === 200 && api.body === '{"enabled":true,"limit":7}',
    api.body
  );

  // Pages Router: getServerSideProps passes the payload through props.
  const legacy = await get('/legacy');
  check('Pages Router page renders', legacy.status === 200, `status ${legacy.status}`);
  check(
    'Pages Router client component renders the bootstrapped value',
    legacy.body.includes('Pages Router: checkout=true;loading=false'),
    legacy.body.slice(0, 600)
  );
  check(
    'Pages Router serializes the payload into __NEXT_DATA__',
    /__NEXT_DATA__[^>]*>[^<]*"new-checkout":true/.test(legacy.body)
  );

  // Middleware.
  const plain = await get('/dashboard');
  const canadian = await get('/dashboard', { 'x-vercel-ip-country': 'CA' });
  check(
    'middleware leaves the page alone when the flag is off',
    plain.body.includes('DASHBOARD PAGE'),
    plain.body.slice(0, 300)
  );
  check(
    'middleware rewrites when the flag targets the visitor',
    canadian.body.includes('BETA PAGE'),
    canadian.body.slice(0, 300)
  );

  // Identity: every request the app made carried this package's agent, never the SDK's.
  const apiRequests = requests.filter((request) => request.origin === 'api');
  const agents = new Set(apiRequests.map((request) => request.headers['x-zen-client-agent']));
  check(
    'every request identifies as zenmanage-nextjs',
    apiRequests.length > 0 && agents.size === 1 && agents.has(`zenmanage-nextjs/${version}`),
    JSON.stringify([...agents])
  );
  const keys = new Set(apiRequests.map((request) => request.headers['x-zen-api-key']));
  check(
    'the server and edge runtimes used the server key',
    keys.size === 1 && keys.has(SERVER_KEY),
    JSON.stringify([...keys])
  );

  const rulesLoads = apiRequests.filter((request) => request.url === '/v1/flag-json').length;
  check(
    'rules are shared across evaluations, not fetched per call',
    rulesLoads > 0 && rulesLoads <= 6,
    `${rulesLoads} rules loads`
  );

  // The server key must not reach the browser.
  const clientFiles = filesUnder(join(appDir, '.next', 'static')).filter((file) =>
    /\.(js|html)$/.test(file)
  );
  const leaked = clientFiles.filter((file) => readFileSync(file, 'utf8').includes(SERVER_KEY));
  const pages = [home, legacy, plain, canadian];
  check(
    'the server key appears in no client bundle and no page',
    leaked.length === 0 && pages.every((page) => !page.body.includes(SERVER_KEY)),
    leaked.join(', ')
  );
  check(
    'the client key reaches the browser bundle',
    clientFiles.some((file) => readFileSync(file, 'utf8').includes(CLIENT_KEY))
  );
}

try {
  await main();

  if (process.env.SMOKE_SERVE) {
    console.log(`\nServing http://127.0.0.1:${nextPort}/ and /legacy. Press Ctrl-C to stop.`);
    await new Promise((done) => process.once('SIGINT', done).once('SIGTERM', done));
  }
} catch (error) {
  check('smoke run completes', false, String(error?.stack ?? error));
} finally {
  if (nextServer?.pid) {
    try {
      process.kill(-nextServer.pid, 'SIGTERM');
    } catch {
      // Already gone.
    }
  }
  apiServer?.close();
  cdnServer?.close();
  rmSync(work, { recursive: true, force: true });
}

const failed = results.filter((result) => !result.passed);
console.log(`\n${results.length - failed.length}/${results.length} smoke checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
