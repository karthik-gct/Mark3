import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import os from 'node:os';

// ---------------------------------------------------------------------------
// Mock $.process.run via stubGlobal BEFORE importing the module under test.
// ---------------------------------------------------------------------------

type RunFn = (
  cmd: string,
  args: string[],
  opts?: { env?: Record<string, string>; timeout?: number; cwd?: string }
) => Promise<{ exitCode: number; stdout: string; stderr: string }>;

let mockRun: ReturnType<typeof vi.fn>;

// Default run mock: `which tmux` succeeds, bash script succeeds.
function makeDefaultRun(): RunFn {
  return vi.fn(async (cmd: string, args: string[]) => {
    if (cmd === 'which' && args[0] === 'tmux') {
      return { exitCode: 0, stdout: '/usr/bin/tmux\n', stderr: '' };
    }
    if (cmd === 'bash') {
      return { exitCode: 0, stdout: 'agent-command-center launched.\n', stderr: '' };
    }
    return { exitCode: 1, stdout: '', stderr: 'unexpected command' };
  });
}

beforeEach(() => {
  mockRun = makeDefaultRun();
  vi.stubGlobal('$', {
    process: {
      run: mockRun,
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

// ---------------------------------------------------------------------------
// Import the module under test (dynamic to respect stubGlobal timing).
// ---------------------------------------------------------------------------

async function importCommandCenter() {
  return await import('./commandCenter.js');
}

// ---------------------------------------------------------------------------
// AC-1 / FR-1: $.process.run called with correct script path and env
// ---------------------------------------------------------------------------

describe('commandCenter — AC-1: session created via $.process.run', () => {
  it('calls $.process.run with bash and the correct script path', async () => {
    const { launchCommandCenter } = await importCommandCenter();
    const agentLogPaths = { ProdMgmt: '/tmp/prod.log', Design: '/tmp/design.log' };
    const sessionId = 'abc12345-0000-0000-0000-000000000000';
    const mark3Root = '/repo/Mark3';

    await launchCommandCenter(agentLogPaths, sessionId, mark3Root);

    // First call: which tmux
    expect(mockRun).toHaveBeenCalledWith('which', ['tmux'], { timeout: 2000 });

    // Second call: bash script
    const bashCalls = (mockRun as ReturnType<typeof vi.fn>).mock.calls.filter(
      (c: unknown[]) => c[0] === 'bash',
    );
    expect(bashCalls.length).toBe(1);

    const [cmd, args, opts] = bashCalls[0] as [
      string,
      string[],
      { env: Record<string, string>; timeout: number },
    ];
    expect(cmd).toBe('bash');
    expect(args[0]).toBe(path.join(mark3Root, 'mods', 'scripts', 'launch-command-center.sh'));
    expect(opts.timeout).toBe(5000);
  });

  it('passes AGENT_LOG_PATHS as JSON string env var', async () => {
    const { launchCommandCenter } = await importCommandCenter();
    const agentLogPaths = { ProdMgmt: '/tmp/prod.log', Design: '/tmp/design.log' };
    const sessionId = 'abc12345';
    const mark3Root = '/repo/Mark3';

    await launchCommandCenter(agentLogPaths, sessionId, mark3Root);

    const bashCalls = (mockRun as ReturnType<typeof vi.fn>).mock.calls.filter(
      (c: unknown[]) => c[0] === 'bash',
    );
    const opts = bashCalls[0][2] as { env: Record<string, string> };
    expect(JSON.parse(opts.env.AGENT_LOG_PATHS)).toEqual(agentLogPaths);
  });

  it('passes SESSION_ID env var', async () => {
    const { launchCommandCenter } = await importCommandCenter();
    const sessionId = 'my-session-id';

    await launchCommandCenter({}, sessionId, '/repo/Mark3');

    const bashCalls = (mockRun as ReturnType<typeof vi.fn>).mock.calls.filter(
      (c: unknown[]) => c[0] === 'bash',
    );
    const opts = bashCalls[0][2] as { env: Record<string, string> };
    expect(opts.env.SESSION_ID).toBe(sessionId);
  });
});

// ---------------------------------------------------------------------------
// AC-5 / FR-5: tmux not found → warn + continue (no throw)
// ---------------------------------------------------------------------------

describe('commandCenter — AC-5: tmux not found → warn and continue', () => {
  it('does not throw and emits console.warn when which tmux returns empty', async () => {
    mockRun = vi.fn(async () => ({ exitCode: 1, stdout: '', stderr: '' }));
    vi.stubGlobal('$', { process: { run: mockRun } });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { launchCommandCenter } = await importCommandCenter();

    await expect(launchCommandCenter({}, 'sid', '/repo')).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('tmux not found'),
    );
    expect(mockRun).not.toHaveBeenCalledWith('bash', expect.anything(), expect.anything());
    warnSpy.mockRestore();
  });

  it('does not throw when which tmux throws an exception', async () => {
    mockRun = vi.fn(async (cmd: string) => {
      if (cmd === 'which') throw new Error('ENOENT: which not found');
      return { exitCode: 0, stdout: '', stderr: '' };
    });
    vi.stubGlobal('$', { process: { run: mockRun } });

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { launchCommandCenter } = await importCommandCenter();

    await expect(launchCommandCenter({}, 'sid', '/repo')).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('tmux not found'));
    warnSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// NFR-2: Script failure (non-zero exit) → log error, no throw
// ---------------------------------------------------------------------------

describe('commandCenter — NFR-2: script failure does not crash pipeline', () => {
  it('logs error on non-zero exit code but does not throw', async () => {
    mockRun = vi.fn(async (cmd: string) => {
      if (cmd === 'which') return { exitCode: 0, stdout: '/usr/bin/tmux', stderr: '' };
      return { exitCode: 1, stdout: '', stderr: 'permission denied' };
    });
    vi.stubGlobal('$', { process: { run: mockRun } });

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { launchCommandCenter } = await importCommandCenter();

    await expect(launchCommandCenter({}, 'sid', '/repo')).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('exit'));
    errorSpy.mockRestore();
  });

  it('logs error when $.process.run throws (e.g., timeout)', async () => {
    mockRun = vi.fn(async (cmd: string) => {
      if (cmd === 'which') return { exitCode: 0, stdout: '/usr/bin/tmux', stderr: '' };
      throw new Error('Process timed out after 5000ms');
    });
    vi.stubGlobal('$', { process: { run: mockRun } });

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { launchCommandCenter } = await importCommandCenter();

    await expect(launchCommandCenter({}, 'sid', '/repo')).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Command Center launch failed'),
    );
    errorSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// buildAgentLogPath: log path convention
// ---------------------------------------------------------------------------

describe('commandCenter — buildAgentLogPath', () => {
  it('returns ~/.mark3/logs/{agentName}-{first8chars}.log for UUID sessionId', async () => {
    const { buildAgentLogPath } = await importCommandCenter();
    const homeDir = os.homedir();
    const result = buildAgentLogPath('DesignAgent', 'abcdef12-0000-0000-0000-000000000000', homeDir);
    expect(result).toBe(path.join(homeDir, '.mark3', 'logs', 'DesignAgent-abcdef12.log'));
  });

  it('strips session- prefix before taking first 8 chars', async () => {
    const { buildAgentLogPath } = await importCommandCenter();
    const homeDir = '/home/test';
    const result = buildAgentLogPath('ProdMgmt', 'session-1234abcd-extra', homeDir);
    expect(result).toBe(path.join(homeDir, '.mark3', 'logs', 'ProdMgmt-1234abcd.log'));
  });

  it('uses full sessionId up to 8 chars if no uuid format', async () => {
    const { buildAgentLogPath } = await importCommandCenter();
    const result = buildAgentLogPath('CodeAgent', 'short', '/home/user');
    expect(result).toBe(path.join('/home/user', '.mark3', 'logs', 'CodeAgent-short.log'));
  });
});

// ---------------------------------------------------------------------------
// Successful launch path: logs confirmation
// ---------------------------------------------------------------------------

describe('commandCenter — successful launch logs confirmation', () => {
  it('logs Command Center launched message on success', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { launchCommandCenter } = await importCommandCenter();

    await launchCommandCenter({ CodeAgent: '/tmp/code.log' }, 'sess-id', '/repo/Mark3');

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Command Center launched'),
      expect.any(String),
    );
    logSpy.mockRestore();
  });
});
