/**
 * Configuration guard tests.
 *
 * `src/config/env.ts` validates `process.env` as a side effect of being
 * imported, so these cases are verified in child processes: the parent has
 * already imported the module with the test environment and cannot re-import it
 * with different variables.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { TEST_BOT_TOKEN, testSessionSecret } from './setup.js';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

interface BootResult {
  ok: boolean;
  output: string;
}

const PROBE = "import('./src/config/env.ts').then(() => console.log('CONFIG_LOADED'))";

/** Imports the config module in a child process with the given environment. */
function loadConfig(env: NodeJS.ProcessEnv): Promise<BootResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', '-e', PROBE], {
      cwd: serverRoot,
      env: {
        PATH: process.env['PATH'],
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://127.0.0.1:27017/config_test',
        TELEGRAM_BOT_TOKEN: TEST_BOT_TOKEN,
        SESSION_SECRET: testSessionSecret,
        FRONTEND_URL: 'https://app.example.com',
        ...env,
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

    child.on('error', reject);
    child.on('close', (code) => resolve({ ok: code === 0, output }));
  });
}

describe('environment configuration', () => {
  it('loads with real, complete production values', async () => {
    const result = await loadConfig({});

    expect(result.output).toContain('CONFIG_LOADED');
    expect(result.ok).toBe(true);
  }, 60_000);

  it('refuses to boot in production with the placeholder bot token', async () => {
    // The example token is shaped like a real one (`<id>:REPLACE-WITH-...`),
    // so a prefix check would silently pass this straight through to production.
    const result = await loadConfig({
      TELEGRAM_BOT_TOKEN: '1234567890:REPLACE-WITH-YOUR-REAL-BOT-TOKEN-FROM-BotFather',
    });

    expect(result.ok).toBe(false);
    expect(result.output).toContain('TELEGRAM_BOT_TOKEN');
    expect(result.output).not.toContain('CONFIG_LOADED');
  }, 60_000);

  it('refuses to boot in production with the placeholder session secret', async () => {
    const result = await loadConfig({ SESSION_SECRET: 'REPLACE-WITH-A-LONG-RANDOM-STRING' });

    expect(result.ok).toBe(false);
    expect(result.output).toContain('SESSION_SECRET');
    expect(result.output).not.toContain('CONFIG_LOADED');
  }, 60_000);

  it('rejects a missing MONGODB_URI', async () => {
    const result = await loadConfig({ MONGODB_URI: '' });

    expect(result.ok).toBe(false);
    expect(result.output).toContain('MONGODB_URI');
  }, 60_000);

  it('rejects a session secret that is too short', async () => {
    const result = await loadConfig({ SESSION_SECRET: 'too-short' });

    expect(result.ok).toBe(false);
    expect(result.output).toContain('SESSION_SECRET');
  }, 60_000);

  it('rejects a wildcard FRONTEND_URL', async () => {
    const result = await loadConfig({ FRONTEND_URL: '*' });

    expect(result.ok).toBe(false);
    expect(result.output).toContain('FRONTEND_URL');
  }, 60_000);

  it('never prints the bot token or session secret on failure', async () => {
    const result = await loadConfig({
      MONGODB_URI: '',
      TELEGRAM_BOT_TOKEN: '1234567890:AAHsuper-secret-token-value-abcdefghij',
    });

    expect(result.ok).toBe(false);
    // The validation error must name the variables, never their values.
    expect(result.output).not.toContain('AAHsuper-secret-token-value');
    expect(result.output).not.toContain(testSessionSecret);
  }, 60_000);
});
