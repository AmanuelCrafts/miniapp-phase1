/**
 * Boot regression tests.
 *
 * Why this file exists
 * --------------------
 * The rest of the suite imports the app through Vite, which shims CommonJS
 * interop. That shim hides a whole class of bug: a named import that Node's
 * native ESM resolver cannot satisfy still type-checks and still passes 100% of
 * the unit tests, while `npm run dev` and `npm start` die on the first import.
 *
 * That is exactly what happened with `import { models } from 'mongoose'`:
 * Mongoose is CommonJS and assigns `models` at runtime, so Node's static
 * named-export detection cannot see it. The suite was green and the server
 * could not boot.
 *
 * These tests therefore spawn the real entry point as a child process under
 * Node's native ESM loader and assert that it actually boots.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { TEST_BOT_TOKEN, testSessionSecret } from './setup.js';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entryPoint = path.join(serverRoot, 'src', 'server.ts');
const compiledEntryPoint = path.join(serverRoot, 'dist', 'server.js');

/**
 * Boots `src/server.ts` in a child process and captures its output.
 *
 * `launcher` defaults to `tsx`, which is how `npm run dev` starts the server.
 * Passing `[]` runs the file directly with plain Node, which is how the
 * compiled `dist/server.js` that `npm start` uses is executed.
 */
function bootServer(env: NodeJS.ProcessEnv, launcher: string[] = ['--import', 'tsx']): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [...launcher, entryPoint], {      cwd: serverRoot,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        LOG_LEVEL: 'silent',
        TELEGRAM_BOT_TOKEN: TEST_BOT_TOKEN,
        SESSION_SECRET: testSessionSecret,
        FRONTEND_URL: 'http://localhost:3000',
        ...env,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });

    child.on('error', reject);
    child.on('close', (code) => resolve({ code, stdout, stderr }));
  });
}

/** Reserves an ephemeral port and releases it for the child to bind. */
async function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.on('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address();
      if (address === null || typeof address === 'string') {
        probe.close();
        reject(new Error('Could not determine a free port'));
        return;
      }
      const { port } = address;
      probe.close(() => resolve(port));
    });
  });
}

describe('server bootstrap under native ESM', () => {
  let mongo: MongoMemoryServer;
  let port: number;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    port = await findFreePort();
  }, 300_000);

  afterAll(async () => {
    await mongo?.stop();
  });

  it('loads the whole module graph without an unresolved named import', async () => {
    // An unreachable database makes the process exit quickly, but only *after*
    // every import has been evaluated. A bad named import would instead die
    // with a SyntaxError long before any connection is attempted.
    const result = await bootServer({
      PORT: String(port),
      MONGODB_URI: 'mongodb://127.0.0.1:1/unreachable',
      // Logging has to be on, otherwise the connection failure that proves the
      // module graph loaded is swallowed along with everything else.
      LOG_LEVEL: 'info',
    });

    const output = result.stdout + result.stderr;

    expect(output).not.toContain('does not provide an export named');
    expect(output).not.toContain('SyntaxError');
    expect(output).not.toContain('ERR_MODULE_NOT_FOUND');

    // It got far enough to actually try connecting.
    expect(output).toMatch(/ECONNREFUSED|MongoDB connection/);
  }, 120_000);

  it('boots, connects to MongoDB and serves /api/health', async () => {
    const child = spawn(process.execPath, ['--import', 'tsx', entryPoint], {
      cwd: serverRoot,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        LOG_LEVEL: 'silent',
        TELEGRAM_BOT_TOKEN: TEST_BOT_TOKEN,
        SESSION_SECRET: testSessionSecret,
        FRONTEND_URL: 'http://localhost:3000',
        TRUST_PROXY_HOPS: '0',
        PORT: String(port),
        MONGODB_URI: mongo.getUri('boot_test'),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let output = '';
    child.stdout.on('data', (chunk: Buffer) => {
      output += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk: Buffer) => {
      output += chunk.toString('utf8');
    });

    let closed = false;
    child.on('close', () => {
      closed = true;
    });

    try {
      // Poll until the server answers, so the test does not depend on a fixed
      // startup delay.
      const deadline = Date.now() + 45_000;
      let health: Response | null = null;

      while (Date.now() < deadline) {
        if (closed) {
          throw new Error(`Server exited before becoming healthy:\n${output}`);
        }

        try {
          const response = await fetch(`http://127.0.0.1:${port}/api/health`);
          if (response.ok) {
            health = response;
            break;
          }
        } catch {
          // Not listening yet.
        }

        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      expect(health, `Server never became healthy:\n${output}`).not.toBeNull();

      const body = (await health!.json()) as { status?: string; database?: string };

      expect(body.status).toBe('ok');
      // The health payload must describe the connection without leaking it.
      expect(JSON.stringify(body)).not.toContain('mongodb://');
      expect(output).not.toContain(TEST_BOT_TOKEN);
    } finally {
      child.kill('SIGTERM');

      // If the process already exited, the `close` event has fired and a new
      // listener would never resolve - that is what turns a clean assertion
      // failure into a 120s timeout.
      if (!closed) {
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, 10_000);
          child.on('close', () => {
            clearTimeout(timer);
            resolve();
          });
        });
      }
    }
  }, 120_000);

  // `npm start` runs the compiled output, which resolves imports differently
  // from the tsx/dev path above. It only exists after `npm run build`, so this
  // case is skipped rather than failed when the project has not been built.
  it.skipIf(!existsSync(compiledEntryPoint))(
    'loads the compiled dist/server.js that npm start uses',
    async () => {
      const result = await new Promise<{ code: number | null; output: string }>((resolve, reject) => {
        const child = spawn(process.execPath, [compiledEntryPoint], {
          cwd: serverRoot,
          env: {
            PATH: process.env['PATH'],
            NODE_ENV: 'test',
            LOG_LEVEL: 'info',
            MONGODB_URI: 'mongodb://127.0.0.1:1/unreachable',
            TELEGRAM_BOT_TOKEN: TEST_BOT_TOKEN,
            SESSION_SECRET: testSessionSecret,
            FRONTEND_URL: 'http://localhost:3000',
          },
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        let output = '';
        child.stdout.on('data', (c: Buffer) => {
          output += c.toString('utf8');
        });
        child.stderr.on('data', (c: Buffer) => {
          output += c.toString('utf8');
        });

        child.on('error', reject);
        child.on('close', (code) => resolve({ code, output }));
      });

      expect(result.output).not.toContain('does not provide an export named');
      expect(result.output).not.toContain('ERR_MODULE_NOT_FOUND');
      expect(result.output).toMatch(/ECONNREFUSED|MongoDB connection/);
    },
    120_000,
  );
});
