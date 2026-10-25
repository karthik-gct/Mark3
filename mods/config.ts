import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import type { AgentDescriptor } from './types.js';

export const FALLBACK_MODEL = 'claude-sonnet-4-6';
const FALLBACK_PROVIDER = 'anthropic';

const AGENT_DISPLAY_NAMES: Record<string, string> = {
  prod_mgmt: 'ProdMgmtAgent',
  design: 'DesignAgent',
  code: 'CodeAgent',
  quality: 'QualityAgent',
  prod_eval: 'PROD_EVALAGENT',
  dev_eval: 'DEV_EVALAGENT',
};

const KNOWN_AGENT_KEYS = Object.keys(AGENT_DISPLAY_NAMES);

interface ModelsConfigYaml {
  agents?: Record<string, { model_id?: string; provider?: string }>;
}

function makeDescriptors(overrides: Record<string, { model_id?: string; provider?: string }>): AgentDescriptor[] {
  return KNOWN_AGENT_KEYS.map((key) => ({
    key,
    displayName: AGENT_DISPLAY_NAMES[key]!,
    modelId: overrides[key]?.model_id ?? FALLBACK_MODEL,
    provider: overrides[key]?.provider ?? FALLBACK_PROVIDER,
  }));
}

export function loadAgentDescriptors(): AgentDescriptor[] {
  const root = process.env['MARK3_ROOT'] ?? process.cwd();
  const configPath = path.join(root, 'models.config.yaml');

  let raw: string;
  try {
    raw = fs.readFileSync(configPath, 'utf-8');
  } catch {
    console.warn(`[Mark3 Mods] models.config.yaml not found at ${configPath} — using fallback model for all agents.`);
    return makeDescriptors({});
  }

  let parsed: unknown;
  try {
    parsed = yaml.load(raw);
  } catch (err) {
    console.warn(`[Mark3 Mods] Failed to parse models.config.yaml — using fallback model for all agents.`, err);
    return makeDescriptors({});
  }

  const config = parsed as ModelsConfigYaml;
  if (!config?.agents || typeof config.agents !== 'object') {
    console.warn('[Mark3 Mods] No agents key in models.config.yaml — using fallback model for all agents.');
    return makeDescriptors({});
  }

  const agentEntries = config.agents;
  if (Object.keys(agentEntries).length === 0) {
    console.warn('[Mark3 Mods] No agents configured in models.config.yaml.');
  }

  return makeDescriptors(agentEntries);
}
