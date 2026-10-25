import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  initPersistence,
  loadConfig,
  saveConfig,
  type PersistedState,
  type PersistableStore,
} from './persistence.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mark3-test-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

const CONCEPT_KEY = 'SCRUM-13';

// Local test store factory — matches PersistableStore interface + adds dispatch() for tests
function createTestStore(): PersistableStore & {
  dispatch(update: Record<string, unknown>): void;
} {
  let state: Record<string, unknown> = { phase: 'idle', storyStates: {}, tokenTotals: {} };
  const subscribers = new Set<(s: Record<string, unknown>) => void>();

  return {
    getState: () => ({ ...state }),
    subscribe(cb) {
      subscribers.add(cb);
      return () => subscribers.delete(cb);
    },
    hydrate(saved) {
      state = { ...state, ...saved };
    },
    dispatch(update) {
      state = { ...state, ...update };
      for (const cb of subscribers) cb({ ...state });
    },
  };
}

// Helper: build a valid PersistedState fixture
function makeState(conceptKey = CONCEPT_KEY): PersistedState {
  return {
    conceptKey,
    phase: 'design',
    storyStates: { 'SCRUM-14': { status: 'done', loopCount: 1 } },
    tokenTotals: { prod_mgmt: { input: 100, output: 50 } },
    lastUpdated: new Date().toISOString(),
  };
}

// AC-1: Given state.json exists with valid JSON for current conceptKey,
// when Mod initializes, the store is hydrated.
describe('AC-1: hydrate store from valid state.json', () => {
  it('hydrates store when state.json exists with matching conceptKey', async () => {
    const statePath = path.join(tmpDir, 'state.json');
    await fs.writeFile(statePath, JSON.stringify(makeState()), 'utf8');

    const store = createTestStore();
    await initPersistence(store, CONCEPT_KEY, undefined, tmpDir);

    const state = store.getState();
    expect(state['phase']).toBe('design');
    expect((state['storyStates'] as Record<string, unknown>)['SCRUM-14']).toBeDefined();
  });
});

// AC-2: Given a state store update, state.json is written atomically within debounce window.
describe('AC-2: atomic write after state update', () => {
  it('writes state.json after store dispatch', async () => {
    const store = createTestStore();
    // debounceMs: 0 → timer fires on next event loop tick, no fake timers needed
    await initPersistence(store, CONCEPT_KEY, { debounceMs: 0 }, tmpDir);

    store.dispatch({ phase: 'code' });
    await new Promise(r => setTimeout(r, 50));

    const statePath = path.join(tmpDir, 'state.json');
    const raw = await fs.readFile(statePath, 'utf8');
    const saved = JSON.parse(raw) as PersistedState;
    expect(saved.phase).toBe('code');
    expect(saved.conceptKey).toBe(CONCEPT_KEY);
  });
});

// AC-3: Different conceptKey → old state archived, fresh start.
describe('AC-3: archive state when conceptKey changes', () => {
  it('archives state.json when conceptKey differs', async () => {
    const statePath = path.join(tmpDir, 'state.json');
    const oldState = makeState('OLD-CONCEPT');
    await fs.writeFile(statePath, JSON.stringify(oldState), 'utf8');

    const store = createTestStore();
    await initPersistence(store, 'NEW-CONCEPT', undefined, tmpDir);

    // state.json should no longer exist at original path (archived)
    const files = await fs.readdir(tmpDir);
    expect(files.some(f => f.startsWith('state-OLD-CONCEPT-'))).toBe(true);
    // Store should be fresh (not hydrated with old state)
    expect(store.getState()['phase']).toBe('idle');
  });
});

// AC-4: Preferences saved to config.json persist across loadConfig() calls.
describe('AC-4: config.json preferences persist', () => {
  it('saves and reloads pollIntervalMs preference', async () => {
    // Point saveConfig/loadConfig to tmpDir
    const { _setStateDirForTest } = await import('./persistence.js');
    _setStateDirForTest(tmpDir);

    await saveConfig({ pollIntervalMs: 10000 });
    const cfg = await loadConfig();
    expect(cfg.pollIntervalMs).toBe(10000);
    expect(cfg.theme).toBe('default'); // default unchanged
  });
});

// AC-5: Corrupted state.json → moved to state.bak, store empty, no crash.
describe('AC-5: corrupted state.json handled gracefully', () => {
  it('moves corrupted state.json to state.bak and starts fresh', async () => {
    const statePath = path.join(tmpDir, 'state.json');
    await fs.writeFile(statePath, '{invalid json{{', 'utf8');

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const store = createTestStore();

    await expect(initPersistence(store, CONCEPT_KEY, undefined, tmpDir)).resolves.toBeDefined();

    const bakPath = path.join(tmpDir, 'state.bak');
    expect(await fs.access(bakPath).then(() => true).catch(() => false)).toBe(true);
    expect(store.getState()['phase']).toBe('idle');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('corrupted'));
    warnSpy.mockRestore();
  });
});

// NFR-3: sanitize() strips credential-shaped keys from state before write.
describe('sanitize: credential keys stripped from persisted state', () => {
  it('does not write api_key or token fields to state.json', async () => {
    const store = createTestStore();
    await initPersistence(store, CONCEPT_KEY, { debounceMs: 0 }, tmpDir);

    // Dispatch state containing a credential-shaped key
    store.dispatch({ phase: 'qa', api_key: 'sk-secret', token: 'abc123' });
    await new Promise(r => setTimeout(r, 50));

    const statePath = path.join(tmpDir, 'state.json');
    const raw = await fs.readFile(statePath, 'utf8');
    expect(raw).not.toContain('sk-secret');
    expect(raw).not.toContain('api_key');
  });
});

// Edge case: state.json is a directory.
describe('edge case: state.json is a directory', () => {
  it('logs error and returns teardown without crashing when state.json is a dir', async () => {
    const statePath = path.join(tmpDir, 'state.json');
    await fs.mkdir(statePath);

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const store = createTestStore();
    await expect(initPersistence(store, CONCEPT_KEY, undefined, tmpDir)).resolves.toBeDefined();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('directory'));
    errorSpy.mockRestore();
  });
});
