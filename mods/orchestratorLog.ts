/**
 * orchestratorLog.ts — SCRUM-19: structured JSONL logger for phase transitions.
 *
 * Writes one JSON line per event to ~/.mark3/logs/orchestrator-{sessionId}.log.
 * Creates the directory if it doesn't exist.
 */

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { PipelinePhase } from './pipelineTypes.js';

export interface LogEntry {
  ts: string;           // ISO timestamp
  sessionId: string;
  phase: PipelinePhase;
  event: string;        // e.g. "phase_transition", "approval_gate", "story_complete"
  storyKey?: string;
  detail?: string;
}

// Allow test override for log directory
let _logDir: string | null = null;

export function _setLogDirForTest(dir: string | null): void {
  _logDir = dir;
}

function getLogDir(): string {
  return _logDir ?? path.join(os.homedir(), '.mark3', 'logs');
}

export async function logEvent(entry: LogEntry): Promise<void> {
  const logDir = getLogDir();
  const logPath = path.join(logDir, `orchestrator-${entry.sessionId}.log`);

  await fs.mkdir(logDir, { recursive: true });

  const line = JSON.stringify(entry) + '\n';
  await fs.appendFile(logPath, line, 'utf8');
}
