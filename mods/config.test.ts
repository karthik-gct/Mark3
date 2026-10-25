import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { loadAgentDescriptors, FALLBACK_MODEL } from './config.js';

const KNOWN_KEYS = ['prod_mgmt', 'design', 'code', 'quality', 'prod_eval', 'dev_eval'];

function writeTempConfig(dir: string, content: string): void {
  fs.writeFileSync(path.join(dir, 'models.config.yaml'), content, 'utf-8');
}

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mark3-config-test-'));
  process.env['MARK3_ROOT'] = tmpDir;
});

afterEach(() => {
  delete process.env['MARK3_ROOT'];
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('config — AC-4: loadAgentDescriptors', () => {
  it('returns 6 descriptors with correct keys', () => {
    writeTempConfig(tmpDir, `
agents:
  prod_mgmt:
    model_id: claude-opus-4-8
    provider: anthropic
  design:
    model_id: claude-sonnet-4-6
    provider: anthropic
  code:
    model_id: claude-sonnet-4-6
    provider: anthropic
  quality:
    model_id: claude-haiku-4-5-20251001
    provider: anthropic
  prod_eval:
    model_id: claude-sonnet-4-6
    provider: anthropic
  dev_eval:
    model_id: claude-sonnet-4-6
    provider: anthropic
`);
    const descriptors = loadAgentDescriptors();
    expect(descriptors).toHaveLength(6);
    const keys = descriptors.map((d) => d.key);
    for (const k of KNOWN_KEYS) {
      expect(keys).toContain(k);
    }
  });

  it('applies configured model_id and provider from YAML', () => {
    writeTempConfig(tmpDir, `
agents:
  prod_mgmt:
    model_id: claude-opus-4-8
    provider: anthropic
`);
    const descriptors = loadAgentDescriptors();
    const pm = descriptors.find((d) => d.key === 'prod_mgmt')!;
    expect(pm.modelId).toBe('claude-opus-4-8');
    expect(pm.provider).toBe('anthropic');
  });

  it('falls back to FALLBACK_MODEL when file is missing', () => {
    const descriptors = loadAgentDescriptors();
    expect(descriptors).toHaveLength(6);
    for (const d of descriptors) {
      expect(d.modelId).toBe(FALLBACK_MODEL);
    }
  });

  it('falls back to FALLBACK_MODEL when YAML is invalid', () => {
    writeTempConfig(tmpDir, 'this: is: not: valid: yaml: :::');
    const descriptors = loadAgentDescriptors();
    expect(descriptors).toHaveLength(6);
    for (const d of descriptors) {
      expect(d.modelId).toBe(FALLBACK_MODEL);
    }
  });

  it('falls back for keys not present in YAML agents map', () => {
    writeTempConfig(tmpDir, `
agents:
  code:
    model_id: claude-haiku-4-5-20251001
    provider: anthropic
`);
    const descriptors = loadAgentDescriptors();
    const design = descriptors.find((d) => d.key === 'design')!;
    expect(design.modelId).toBe(FALLBACK_MODEL);
  });

  it('falls back when agents key is missing', () => {
    writeTempConfig(tmpDir, `routing_backend: direct\n`);
    const descriptors = loadAgentDescriptors();
    for (const d of descriptors) {
      expect(d.modelId).toBe(FALLBACK_MODEL);
    }
  });
});
