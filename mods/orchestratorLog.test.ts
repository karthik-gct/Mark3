import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { logEvent, _setLogDirForTest, type LogEntry } from './orchestratorLog.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mark3-log-test-'));
  _setLogDirForTest(tmpDir);
});

afterEach(async () => {
  _setLogDirForTest(null);
  await fs.rm(tmpDir, { recursive: true, force: true });
});

function makeEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    ts: new Date().toISOString(),
    sessionId: 'test-session-01',
    phase: 'epic',
    event: 'phase_transition',
    ...overrides,
  };
}

describe('logEvent — basic write', () => {
  it('creates log directory if it does not exist', async () => {
    const nested = path.join(tmpDir, 'nested', 'logs');
    _setLogDirForTest(nested);
    const entry = makeEntry({ sessionId: 'sess-1' });
    await logEvent(entry);

    const files = await fs.readdir(nested);
    expect(files).toContain('orchestrator-sess-1.log');
  });

  it('writes a JSON line to orchestrator-{sessionId}.log', async () => {
    const entry = makeEntry({ sessionId: 'sess-abc', event: 'phase_transition', phase: 'design' });
    await logEvent(entry);

    const logPath = path.join(tmpDir, 'orchestrator-sess-abc.log');
    const raw = await fs.readFile(logPath, 'utf8');
    const parsed = JSON.parse(raw.trim()) as LogEntry;

    expect(parsed.event).toBe('phase_transition');
    expect(parsed.phase).toBe('design');
    expect(parsed.sessionId).toBe('sess-abc');
  });

  it('appends multiple entries to the same log file', async () => {
    const session = 'multi-sess';
    await logEvent(makeEntry({ sessionId: session, event: 'event_1' }));
    await logEvent(makeEntry({ sessionId: session, event: 'event_2' }));
    await logEvent(makeEntry({ sessionId: session, event: 'event_3' }));

    const logPath = path.join(tmpDir, `orchestrator-${session}.log`);
    const raw = await fs.readFile(logPath, 'utf8');
    const lines = raw.trim().split('\n').filter(Boolean);

    expect(lines).toHaveLength(3);
    expect(JSON.parse(lines[0]!).event).toBe('event_1');
    expect(JSON.parse(lines[2]!).event).toBe('event_3');
  });

  it('includes optional storyKey and detail in entry', async () => {
    const entry = makeEntry({
      sessionId: 'detail-sess',
      storyKey: 'SCRUM-42',
      detail: 'loop 2/5',
    });
    await logEvent(entry);

    const logPath = path.join(tmpDir, 'orchestrator-detail-sess.log');
    const raw = await fs.readFile(logPath, 'utf8');
    const parsed = JSON.parse(raw.trim()) as LogEntry;

    expect(parsed.storyKey).toBe('SCRUM-42');
    expect(parsed.detail).toBe('loop 2/5');
  });

  it('uses separate log files for different sessionIds', async () => {
    await logEvent(makeEntry({ sessionId: 'sess-A', event: 'A_event' }));
    await logEvent(makeEntry({ sessionId: 'sess-B', event: 'B_event' }));

    const files = await fs.readdir(tmpDir);
    expect(files).toContain('orchestrator-sess-A.log');
    expect(files).toContain('orchestrator-sess-B.log');
  });
});
