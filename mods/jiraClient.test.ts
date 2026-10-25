import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getChildIssueKeys,
  transitionIssueToDone,
  loadJiraConfig,
  type JiraConfig,
} from './jiraClient.js';

const mockConfig: JiraConfig = {
  baseUrl: 'https://test.atlassian.net',
  email: 'test@example.com',
  token: 'test-token',
};

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as typeof fetch;

beforeEach(() => {
  mockFetch.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// getChildIssueKeys
// ---------------------------------------------------------------------------

describe('getChildIssueKeys — subtasks path', () => {
  it('returns child keys from subtasks array', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        fields: {
          subtasks: [
            { key: 'SCRUM-14' },
            { key: 'SCRUM-15' },
            { key: 'SCRUM-16' },
          ],
        },
      }),
    });

    const keys = await getChildIssueKeys(mockConfig, 'SCRUM-13');
    expect(keys).toEqual(['SCRUM-14', 'SCRUM-15', 'SCRUM-16']);
  });
});

describe('getChildIssueKeys — JQL fallback', () => {
  it('falls back to JQL search when subtasks is empty', async () => {
    // First call: issue fetch with empty subtasks
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ fields: { subtasks: [] } }),
    });

    // Second call: JQL search
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        issues: [{ key: 'SCRUM-17' }, { key: 'SCRUM-18' }],
      }),
    });

    const keys = await getChildIssueKeys(mockConfig, 'SCRUM-13');
    expect(keys).toEqual(['SCRUM-17', 'SCRUM-18']);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('returns empty array when both subtasks and JQL return nothing', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({ fields: { subtasks: [] } }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({ issues: [] }),
    });

    const keys = await getChildIssueKeys(mockConfig, 'SCRUM-99');
    expect(keys).toEqual([]);
  });
});

describe('getChildIssueKeys — API error', () => {
  it('throws when Jira returns 404', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => 'Issue not found',
    });

    await expect(getChildIssueKeys(mockConfig, 'NONEXISTENT')).rejects.toThrow(
      '404',
    );
  });
});

// ---------------------------------------------------------------------------
// transitionIssueToDone
// ---------------------------------------------------------------------------

describe('transitionIssueToDone — success', () => {
  it('transitions issue to Done using the correct transition id', async () => {
    // GET transitions
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        transitions: [
          { id: '11', name: 'To Do', to: { statusCategory: { key: 'new' } } },
          { id: '21', name: 'In Progress', to: { statusCategory: { key: 'indeterminate' } } },
          { id: '31', name: 'Done', to: { statusCategory: { key: 'done' } } },
        ],
      }),
    });

    // POST transition
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 204,
      text: async () => '',
      json: async () => null,
    });

    await expect(transitionIssueToDone(mockConfig, 'SCRUM-14')).resolves.not.toThrow();

    // Verify POST was called with transition id 31
    const postCall = mockFetch.mock.calls[1]!;
    const body = JSON.parse(postCall[1].body as string) as { transition: { id: string } };
    expect(body.transition.id).toBe('31');
  });

  it('finds Done transition by name (case-insensitive)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        transitions: [
          { id: '99', name: 'done', to: {} },
        ],
      }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true, status: 204,
      text: async () => '',
      json: async () => null,
    });

    await expect(transitionIssueToDone(mockConfig, 'SCRUM-14')).resolves.not.toThrow();
    const postCall = mockFetch.mock.calls[1]!;
    const body = JSON.parse(postCall[1].body as string) as { transition: { id: string } };
    expect(body.transition.id).toBe('99');
  });
});

describe('transitionIssueToDone — no Done transition', () => {
  it('throws when no Done transition is found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        transitions: [
          { id: '11', name: 'To Do', to: { statusCategory: { key: 'new' } } },
          { id: '21', name: 'In Progress', to: { statusCategory: { key: 'indeterminate' } } },
        ],
      }),
    });

    await expect(transitionIssueToDone(mockConfig, 'SCRUM-14')).rejects.toThrow(
      'No "Done" transition found',
    );
  });
});

// ---------------------------------------------------------------------------
// loadJiraConfig
// ---------------------------------------------------------------------------

describe('loadJiraConfig', () => {
  it('loads config from environment variables', () => {
    process.env['ATLASSIAN_BASE_URL'] = 'https://myorg.atlassian.net';
    process.env['ATLASSIAN_EMAIL'] = 'ops@example.com';
    process.env['ATLASSIAN_API_TOKEN'] = 'my-token';

    const cfg = loadJiraConfig();
    expect(cfg.baseUrl).toBe('https://myorg.atlassian.net');
    expect(cfg.email).toBe('ops@example.com');
    expect(cfg.token).toBe('my-token');

    delete process.env['ATLASSIAN_BASE_URL'];
    delete process.env['ATLASSIAN_EMAIL'];
    delete process.env['ATLASSIAN_API_TOKEN'];
  });

  it('throws if any credential is missing', () => {
    delete process.env['ATLASSIAN_BASE_URL'];
    delete process.env['ATLASSIAN_EMAIL'];
    delete process.env['ATLASSIAN_API_TOKEN'];

    expect(() => loadJiraConfig()).toThrow('Missing Jira credentials');
  });
});
