import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

// Self-contained interface — callers provide an adapter; no state.ts import needed.
export interface PersistableStore {
  getState(): Record<string, unknown>;
  subscribe(callback: (state: Record<string, unknown>) => void): () => void;
  hydrate(saved: Record<string, unknown>): void;
}

export interface PersistedState {
  conceptKey: string;
  phase: string;
  storyStates: Record<string, { status: string; loopCount: number }>;
  tokenTotals: Record<string, { input: number; output: number }>;
  lastUpdated: string;
}

export interface ModConfig {
  pollIntervalMs: number;
  theme: 'default' | 'high-contrast';
  tmuxEnabled: boolean;
  debounceMs: number;
}

const DEFAULT_CONFIG: ModConfig = {
  pollIntervalMs: 5000,
  theme: 'default',
  tmuxEnabled: true,
  debounceMs: 200,
};
const CREDENTIAL_PATTERN = /api[_-]?key|token|secret|password/i;

// Allow overriding STATE_DIR for tests
let STATE_DIR = path.join(os.homedir(), '.mark3');

export function _setStateDirForTest(dir: string): void {
  STATE_DIR = dir;
}

function statePaths() {
  return {
    STATE_PATH: path.join(STATE_DIR, 'state.json'),
    STATE_TMP: path.join(STATE_DIR, '.state.tmp'),
    CONFIG_PATH: path.join(STATE_DIR, 'config.json'),
    BAK_PATH: path.join(STATE_DIR, 'state.bak'),
  };
}

function sanitize(state: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(state)) {
    if (!CREDENTIAL_PATTERN.test(k)) out[k] = v;
  }
  return out;
}

export async function initPersistence(
  store: PersistableStore,
  conceptKey: string,
  config?: Partial<ModConfig>,
  stateDirOverride?: string,
): Promise<() => void> {
  if (stateDirOverride) STATE_DIR = stateDirOverride;
  const { STATE_PATH, STATE_TMP, BAK_PATH } = statePaths();

  await fs.mkdir(STATE_DIR, { recursive: true });

  // Check if state.json is a directory (edge case)
  try {
    const stat = await fs.stat(STATE_PATH);
    if (stat.isDirectory()) {
      console.error('[Mark3] state.json is a directory — cannot write state');
      // Skip persistence but do not crash
      return () => {};
    }
  } catch {
    // File doesn't exist — fine, fresh start
  }

  // Attempt to hydrate
  let raw: string | undefined;
  try {
    raw = await fs.readFile(STATE_PATH, 'utf8');
  } catch {
    raw = undefined;
  }

  if (raw !== undefined) {
    let saved: PersistedState;
    try {
      saved = JSON.parse(raw) as PersistedState;
    } catch {
      console.warn('[Mark3] state.json corrupted — resetting. Backup at state.bak');
      try { await fs.rename(STATE_PATH, BAK_PATH); } catch { /* best-effort */ }
      saved = null as unknown as PersistedState;
    }

    if (saved !== null) {
      if (saved.conceptKey !== conceptKey) {
        const archive = `state-${saved.conceptKey}-${Date.now()}.json`;
        try { await fs.rename(STATE_PATH, path.join(STATE_DIR, archive)); } catch { /* best-effort */ }
      } else {
        store.hydrate(saved as unknown as Record<string, unknown>);
      }
    }
  }

  const debounceMs = config?.debounceMs ?? DEFAULT_CONFIG.debounceMs;

  // Debounced subscriber
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let diskFullWarned = false;

  const unsubscribe = store.subscribe(async (state) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const snapshot: PersistedState = {
        conceptKey,
        phase: String(state['phase'] ?? 'idle'),
        storyStates: (state['storyStates'] ?? {}) as PersistedState['storyStates'],
        tokenTotals: (state['tokenTotals'] ?? {}) as PersistedState['tokenTotals'],
        lastUpdated: new Date().toISOString(),
      };
      // Sanitize: drop credential-shaped top-level keys from storyStates/tokenTotals
      const sanitized = sanitize(snapshot as unknown as Record<string, unknown>) as unknown as PersistedState;
      try {
        const { STATE_TMP: tmp, STATE_PATH: dest } = statePaths();
        await fs.writeFile(tmp, JSON.stringify(sanitized, null, 2), 'utf8');
        await fs.rename(tmp, dest);
        diskFullWarned = false;
      } catch (err: unknown) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code === 'ENOSPC' && !diskFullWarned) {
          console.error('[Mark3] Disk full — pipeline state not persisted. Running in-memory only.');
          diskFullWarned = true;
        } else if (code !== 'ENOSPC') {
          console.error('[Mark3] Failed to persist state:', err);
        }
      }
    }, debounceMs);
  });

  // Return teardown function to cancel debounce timer and unsubscribe
  return () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    unsubscribe();
  };
}

export async function loadConfig(): Promise<ModConfig> {
  const { CONFIG_PATH } = statePaths();
  try {
    const raw = await fs.readFile(CONFIG_PATH, 'utf8');
    return { ...DEFAULT_CONFIG, ...(JSON.parse(raw) as Partial<ModConfig>) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export async function saveConfig(prefs: Partial<ModConfig>): Promise<void> {
  const { CONFIG_PATH } = statePaths();
  await fs.mkdir(STATE_DIR, { recursive: true });
  const current = await loadConfig();
  await fs.writeFile(CONFIG_PATH, JSON.stringify({ ...current, ...prefs }, null, 2), 'utf8');
}
