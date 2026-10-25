/**
 * pipelineTypes.ts — SCRUM-19: shared types for the phase orchestrator.
 *
 * NOTE: PipelinePhase here intentionally extends the set defined in types.ts
 * (which only has 9 values). The orchestrator internal design adds 'rejected'
 * for the gate-rejected terminal state. The two sets are compatible — 'rejected'
 * is only used inside orchestrator.ts; the shared PipelineState.phase in types.ts
 * uses its own union.
 */

export type PipelinePhase =
  | 'idle'
  | 'epic'
  | 'design'
  | 'code'
  | 'qa'
  | 'done'
  | 'rejected'
  | 'escalated';

export type StoryStatus =
  | 'pending'
  | 'in_progress'
  | 'passed'
  | 'failed'
  | 'escalated';

export interface StoryState {
  key: string;        // e.g. "SCRUM-14"
  title: string;
  phase: PipelinePhase;
  loopsUsed: number;
  status: StoryStatus;
  specsPath: string;
  designPath: string;
  branchName: string;
}

export interface ApprovalRequest {
  id: string;
  prompt: string;
  phase: PipelinePhase;
  createdAt: string;
  resolvedAt?: string;
  response?: 'approved' | 'rejected';
}

export interface OrchestratorState {
  conceptKey: string;
  projectName: string;
  phase: PipelinePhase;
  sessionId: string;    // used for log file naming
  stories: StoryState[];
  isAwaitingApproval: boolean;
  pendingApprovals: ApprovalRequest[];
  startedAt: string;    // ISO timestamp
  updatedAt: string;
}
