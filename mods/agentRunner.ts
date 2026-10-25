/**
 * agentRunner.ts — SCRUM-19: thin wrapper that invokes a Mark3 slash command
 * as a Claude sub-agent via the Mods runtime $.agent API.
 *
 * Reads the command markdown file, strips frontmatter, substitutes $ARGUMENTS,
 * and calls $.agent.run (or $.agent.spawn) with the resolved prompt.
 *
 * The $.agent runtime global is declared here (not imported) per Mark3 convention.
 */

import fs from 'node:fs/promises';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Mods runtime globals — provided by the Claude Code Mods runtime, not imported.
// ---------------------------------------------------------------------------
declare const $: {
  agent: {
    run: (opts: { prompt: string; model?: string }) => Promise<{ output: string }>;
    register: (opts: { key: string; name: string; model: string; provider: string }) => void;
    deregisterAll?: () => void;
  };
};

export interface AgentRunResult {
  success: boolean;
  output: string;
  loopsUsed: number;
}

/**
 * Eval-gate phrases emitted by EVAL agents when they request another loop.
 * The presence of any of these phrases in the output signals that the agent
 * completed a loop iteration (passed or failed), allowing us to count loops.
 */
const EVAL_GATE_PHRASES = [
  'eval: pass',
  'eval: fail',
  'pdlc loop',
  'sdlc loop',
  'dev_evalagent',
  'prod_evalagent',
  'loop iteration',
  'requesting retry',
];

function detectLoopsUsed(output: string): number {
  const lower = output.toLowerCase();
  let count = 0;
  for (const phrase of EVAL_GATE_PHRASES) {
    // Count occurrences of each phrase
    let idx = 0;
    while ((idx = lower.indexOf(phrase, idx)) !== -1) {
      count++;
      idx += phrase.length;
    }
  }
  // At minimum 1 loop was used if the agent ran
  return Math.max(1, count);
}

function stripFrontmatter(content: string): string {
  // Strip YAML frontmatter (--- ... ---)
  const stripped = content.replace(/^---[\s\S]*?---\s*/m, '');
  return stripped.trim();
}

/**
 * Run a named agent command.
 *
 * @param commandFile  Name of the command file in .claude/commands/ (without .md)
 * @param args         Arguments string substituted for $ARGUMENTS in the prompt
 * @param mark3Root    Path to the Mark3 repo root (defaults to MARK3_ROOT env var or cwd)
 * @param modelId      Optional model override
 */
export async function runAgent(
  commandFile: string,
  args: string,
  mark3Root?: string,
  modelId?: string,
): Promise<AgentRunResult> {
  const root = mark3Root ?? process.env['MARK3_ROOT'] ?? process.cwd();
  const cmdPath = path.join(root, '.claude', 'commands', `${commandFile}.md`);

  let raw: string;
  try {
    raw = await fs.readFile(cmdPath, 'utf8');
  } catch (err) {
    throw new Error(`agentRunner: command file not found: ${cmdPath} — ${String(err)}`);
  }

  const content = stripFrontmatter(raw);
  const prompt = content.replace(/\$ARGUMENTS/g, args);

  let output: string;
  try {
    const result = await $.agent.run({ prompt, ...(modelId ? { model: modelId } : {}) });
    output = result.output;
  } catch (err) {
    return {
      success: false,
      output: `Agent run failed: ${String(err)}`,
      loopsUsed: 1,
    };
  }

  const loopsUsed = detectLoopsUsed(output);

  // Determine success: absence of explicit failure phrases
  const failPhrases = ['eval: fail', 'failed', 'escalate', 'error:'];
  const lowerOut = output.toLowerCase();
  const success = !failPhrases.some((p) => lowerOut.includes(p));

  return { success, output, loopsUsed };
}
