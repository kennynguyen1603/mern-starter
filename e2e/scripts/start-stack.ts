/**
 * Playwright webServer: boots an isolated backend (in-memory Mongo, ephemeral
 * Redis, fake Resend mailbox, API) and tears every child down on exit.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { API_ENV, PORTS } from '../env';

const apiDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../apps/api',
);
const children: ChildProcess[] = [];
let mongod: MongoMemoryServer | undefined;
let mail: http.Server | undefined;
let stopping = false;

async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  mail?.close();
  await mongod?.stop({ doCleanup: true, force: true });
  process.exit(code);
}

process.on('SIGINT', () => void stop());
process.on('SIGTERM', () => void stop());
process.on('exit', () => children.forEach((c) => c.kill('SIGKILL')));

function run(
  cmd: string,
  args: string[],
  opts: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
) {
  const child = spawn(cmd, args, {
    ...opts,
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  children.push(child);
  child.on('exit', (code) => {
    if (!stopping) {
      console.error(`[stack] ${cmd} exited (${code}), shutting down`);
      void stop(1);
    }
  });
  return child;
}

function waitForPort(port: number, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise<void>((resolve, reject) => {
    const attempt = () => {
      const socket = net.connect(port, '127.0.0.1');
      socket.once('connect', () => (socket.destroy(), resolve()));
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() > deadline) reject(new Error(`port ${port} not ready`));
        else setTimeout(attempt, 200);
      });
    };
    attempt();
  });
}

/** Captures outgoing emails in memory instead of sending them. */
function startMailbox() {
  let emails: unknown[] = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      if (req.method === 'POST' && req.url === '/emails') {
        emails.push(JSON.parse(body));
        res.end(JSON.stringify({ id: `fake-${emails.length}` }));
      } else if (req.method === 'GET' && req.url === '/__emails') {
        res.end(JSON.stringify(emails));
      } else if (req.method === 'DELETE' && req.url === '/__emails') {
        emails = [];
        res.end('[]');
      } else {
        res.statusCode = 404;
        res.end('{}');
      }
    });
  });
  return new Promise<http.Server>((resolve) =>
    server.listen(PORTS.mail, '127.0.0.1', () => resolve(server)),
  );
}

async function main() {
  mongod = await MongoMemoryServer.create({
    instance: { port: PORTS.mongo, ip: '127.0.0.1' },
    binary: { version: '8.2.6' },
  });

  run('redis-server', [
    '--port',
    String(PORTS.redis),
    '--bind',
    '127.0.0.1',
    '--save',
    '',
    '--appendonly',
    'no',
  ]);
  await waitForPort(PORTS.redis);

  mail = await startMailbox();

  // `--env e2e` points dotenv at a file that does not exist, so no real
  // `.env.*` secrets are ever loaded — config comes only from API_ENV.
  run(
    path.join(apiDir, 'node_modules/.bin/tsx'),
    ['src/server.ts', '--env', 'e2e'],
    {
      cwd: apiDir,
      env: { PATH: process.env.PATH, HOME: process.env.HOME, ...API_ENV },
    },
  );
}

main().catch((err) => {
  console.error('[stack] failed to start', err);
  void stop(1);
});
