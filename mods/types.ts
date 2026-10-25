export type PipelinePhase =
  | 'idle'
  | 'concept'
  | 'epic'
  | 'story'
  | 'design'
  | 'code'
  | 'qa'
  | 'done'
  | 'escalated';

export interface ToolCallEvent {
  agent: string;
  tool: string;
  timestamp: number;
  phase: PipelinePhase;
  args?: Record<string, unknown>;
}

export interface StoryProgress {
  key: string;
  phase: PipelinePhase;
  passed: boolean | null;
}

export interface PipelineState {
  conceptKey: string | null;
  phase: PipelinePhase;
  storyProgress: Record<string, StoryProgress>;
  tokenTotals: Record<string, { input: number; output: number }>;
  isAwaitingApproval: boolean;
  pendingApprovals: Array<{ id: string; prompt: string; createdAt: number }>;
  lastToolCall: ToolCallEvent | null;
  sessionId: string;
}

export interface AgentDescriptor {
  key: string;
  displayName: string;
  modelId: string;
  provider: string;
}

export type StateSubscriber = (state: Readonly<PipelineState>) => void;
