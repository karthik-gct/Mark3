import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// We need to mock the $ global before importing agentRunner
// Define the mock agent.run before the module loads
const mockAgentRun = vi.fn();

// Inject $ global into the module scope
(globalThis as unknown as Record<string, unknown>)['$'] = {
  agent: {
    run: mockAgentRun,
    register: vi.fn(),
  },
};

import { runAgent } from './agentRunner.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mark3-runner-test-'));
  mockAgentRun.mockReset();

  // Create .claude/commands/ directory
  await fs.mkdir(path.join(tmpDir, '.claude', 'commands'), { recursive: true });

  // Set MARK3_ROOT to tmpDir so agentRunner finds commands there
  process.env['MARK3_ROOT'] = tmpDir;
});

afterEach(async () => {
  delete process.env['MARK3_ROOT'];
  await fs.rm(tmpDir, { recursive: true, force: true });
});

async function writeCommand(name: string, content: string): Promise<void> {
  await fs.writeFile(
    path.join(tmpDir, '.claude', 'commands', `${name}.md`),
    content,
    'utf8',
  );
}

describe('runAgent — basic invocation', () => {
  it('reads command file and calls $.agent.run with the prompt', async () => {
    await writeCommand('prod-agent', '# Prod Agent\nRun for: $ARGUMENTS');
    mockAgentRun.mockResolvedValueOnce({ output: 'eval: pass' });

    const result = await runAgent('prod-agent', 'mark3 SCRUM-13');

    expect(mockAgentRun).toHaveBeenCalledTimes(1);
    const callArg = mockAgentRun.mock.calls[0]![0] as { prompt: string };
    expect(callArg.prompt).toContain('mark3 SCRUM-13');
    expect(result.loopsUsed).toBeGreaterThanOrEqual(1);
  });

  it('substitutes $ARGUMENTS in the prompt', async () => {
    await writeCommand('design-agent', 'Design specs at $ARGUMENTS now.');
    mockAgentRun.mockResolvedValueOnce({ output: 'done' });

    await runAgent('design-agent', 'artifacts/specs/SPECS-SCRUM-14.md');

    const callArg = mockAgentRun.mock.calls[0]![0] as { prompt: string };
    expect(callArg.prompt).toContain('artifacts/specs/SPECS-SCRUM-14.md');
    expect(callArg.prompt).not.toContain('$ARGUMENTS');
  });

  it('strips YAML frontmatter from command file', async () => {
    await writeCommand(
      'code-agent',
      '---\ntitle: Code Agent\n---\n\nImplement $ARGUMENTS\n',
    );
    mockAgentRun.mockResolvedValueOnce({ output: 'success' });

    await runAgent('code-agent', 'SCRUM-14 SCRUM-15');

    const callArg = mockAgentRun.mock.calls[0]![0] as { prompt: string };
    expect(callArg.prompt).not.toContain('title: Code Agent');
    expect(callArg.prompt).toContain('SCRUM-14 SCRUM-15');
  });
});

describe('runAgent — success/failure detection', () => {
  it('returns success: true when output has no failure phrases', async () => {
    await writeCommand('quality-agent', 'QA $ARGUMENTS');
    mockAgentRun.mockResolvedValueOnce({ output: 'All tests passed. Eval: pass.' });

    const result = await runAgent('quality-agent', 'SCRUM-14 feature/branch');
    expect(result.success).toBe(true);
  });

  it('returns success: false when output contains "eval: fail"', async () => {
    await writeCommand('quality-agent', 'QA $ARGUMENTS');
    mockAgentRun.mockResolvedValueOnce({ output: 'Coverage below threshold. Eval: Fail' });

    const result = await runAgent('quality-agent', 'SCRUM-14 feature/branch');
    expect(result.success).toBe(false);
  });

  it('returns success: false when output contains "error:"', async () => {
    await writeCommand('code-agent', 'Code $ARGUMENTS');
    mockAgentRun.mockResolvedValueOnce({ output: 'Error: compilation failed' });

    const result = await runAgent('code-agent', 'specs design');
    expect(result.success).toBe(false);
  });
});

describe('runAgent — error handling', () => {
  it('throws when command file does not exist', async () => {
    await expect(runAgent('nonexistent-agent', 'args')).rejects.toThrow(
      'command file not found',
    );
  });

  it('returns success: false and output with error message when $.agent.run throws', async () => {
    await writeCommand('prod-agent', 'Run $ARGUMENTS');
    mockAgentRun.mockRejectedValueOnce(new Error('Runtime error'));

    const result = await runAgent('prod-agent', 'mark3 SCRUM-13');
    expect(result.success).toBe(false);
    expect(result.output).toContain('Agent run failed');
    expect(result.loopsUsed).toBe(1);
  });
});

describe('runAgent — loop detection', () => {
  it('counts eval gate phrases in output for loopsUsed', async () => {
    await writeCommand('prod-agent', 'Run $ARGUMENTS');
    mockAgentRun.mockResolvedValueOnce({
      output: 'PDLC Loop 1 started\nPDLC loop 2 started\nPDLC Loop 3 done',
    });

    const result = await runAgent('prod-agent', 'mark3 SCRUM-13');
    expect(result.loopsUsed).toBeGreaterThanOrEqual(1);
  });
});
