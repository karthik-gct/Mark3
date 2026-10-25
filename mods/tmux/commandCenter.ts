import path from 'node:path';

// Claude Code Mods runtime globals — provided by the runtime, not imported.
declare const $: {
  process: {
    run(
      cmd: string,
      args: string[],
      opts?: {
        env?: Record<string, string>;
        timeout?: number;
        cwd?: string;
      }
    ): Promise<{ exitCode: number; stdout: string; stderr: string }>;
  };
};

/**
 * Launch (or reattach to) a tmux Command Center session named `agent-command-center`.
 * Tiles up to 4 panes per window, each tailing an agent-specific log file.
 *
 * FR-1: Launched via $.process.run with the bundled bash script.
 * FR-5: Gracefully degrades when tmux is not installed.
 * NFR-2: Any launch failure is logged, not thrown — pipeline continues.
 *
 * @param agentLogPaths  Map from agent name → absolute log file path.
 * @param sessionId      Pipeline session UUID (used in window title).
 * @param mark3Root      Absolute path to the Mark3 repo root.
 */
export async function launchCommandCenter(
  agentLogPaths: Record<string, string>,
  sessionId: string,
  mark3Root: string,
): Promise<void> {
  // AC-5 / FR-5: Check tmux availability first.
  let tmuxAvailable = false;
  try {
    const whichResult = await $.process.run('which', ['tmux'], { timeout: 2000 });
    tmuxAvailable = whichResult.exitCode === 0 && whichResult.stdout.trim().length > 0;
  } catch {
    tmuxAvailable = false;
  }

  if (!tmuxAvailable) {
    console.warn(
      '[Mark3 Mods] tmux not found — Command Center unavailable. Install tmux to enable.',
    );
    return;
  }

  // Resolve the bundled launch script path.
  const scriptPath = path.join(mark3Root, 'mods', 'scripts', 'launch-command-center.sh');

  // Serialize agentLogPaths as JSON for the bash script.
  const agentLogPathsJson = JSON.stringify(agentLogPaths);

  // FR-1: Execute the bash script via $.process.run with a 5-second timeout.
  try {
    const result = await $.process.run('bash', [scriptPath], {
      env: {
        AGENT_LOG_PATHS: agentLogPathsJson,
        SESSION_ID: sessionId,
      },
      timeout: 5000,
    });

    if (result.exitCode !== 0) {
      console.error(
        `[Mark3 Mods] Command Center launch script exited with code ${result.exitCode}: ${result.stderr}`,
      );
    } else {
      console.log('[Mark3 Mods] Command Center launched:', result.stdout.trim());
    }
  } catch (err: unknown) {
    // NFR-2: Any error (timeout, permissions, etc.) — log and continue.
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Mark3 Mods] Command Center launch failed: ${message}`);
  }
}

/**
 * Register an agent's log path in the provided agentLogPaths map and return the
 * absolute path to the log file.
 *
 * Log file convention: ~/.mark3/logs/{agentName}-{sessionId}.log
 *
 * @param agentName      Short agent name (e.g. "DesignAgent")
 * @param sessionId      Full pipeline session UUID
 * @param agentLogPaths  Mutable map to update in-place
 * @returns              The absolute log file path
 */
export function buildAgentLogPath(
  agentName: string,
  sessionId: string,
  homeDir: string,
): string {
  const shortId = sessionId.replace(/^session-/, '').slice(0, 8);
  return path.join(homeDir, '.mark3', 'logs', `${agentName}-${shortId}.log`);
}
