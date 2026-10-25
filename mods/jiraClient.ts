/**
 * jiraClient.ts — SCRUM-19: thin Jira REST API v3 wrapper.
 *
 * Only the two operations the orchestrator needs:
 *   1. getChildIssueKeys  — fetch child story keys from a concept Epic
 *   2. transitionIssueToDone — move a story to Done status
 *
 * Uses Node 20 built-in fetch (no external HTTP libraries).
 * Credentials come from process.env / dotenv — never hard-coded.
 */

export interface JiraConfig {
  baseUrl: string;   // ATLASSIAN_BASE_URL from .env  (e.g. https://acme.atlassian.net)
  email: string;     // ATLASSIAN_EMAIL
  token: string;     // ATLASSIAN_API_TOKEN
}

function authHeader(cfg: JiraConfig): string {
  const creds = Buffer.from(`${cfg.email}:${cfg.token}`).toString('base64');
  return `Basic ${creds}`;
}

async function jiraFetch(
  cfg: JiraConfig,
  method: string,
  path: string,
  body?: unknown,
): Promise<unknown> {
  const url = `${cfg.baseUrl.replace(/\/$/, '')}/rest/api/3/${path}`;
  const headers: Record<string, string> = {
    Authorization: authHeader(cfg),
    Accept: 'application/json',
  };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Jira API ${method} ${path} → ${res.status}: ${text}`);
  }

  // Some Jira endpoints return 204 No Content
  if (res.status === 204) return null;

  return res.json() as Promise<unknown>;
}

/**
 * Fetch the child issue keys of a Concept/Epic.
 *
 * Jira Cloud stores child links inside the issue body.
 * We look at `issue.fields.subtasks` first, then fall back to
 * a JQL search for `parent = conceptKey` so this works whether
 * the concept is a plain Epic or a custom hierarchy.
 */
export async function getChildIssueKeys(
  config: JiraConfig,
  conceptKey: string,
): Promise<string[]> {
  // Primary: fetch the issue and inspect subtasks
  const issue = await jiraFetch(config, 'GET', `issue/${encodeURIComponent(conceptKey)}`) as {
    fields?: {
      subtasks?: Array<{ key: string }>;
    };
  };

  const subtasks = issue?.fields?.subtasks ?? [];
  if (subtasks.length > 0) {
    return subtasks.map((s) => s.key);
  }

  // Fallback: JQL search for parent issues
  const jql = encodeURIComponent(`parent = "${conceptKey}" ORDER BY created ASC`);
  const result = await jiraFetch(config, 'GET', `search?jql=${jql}&fields=key&maxResults=100`) as {
    issues?: Array<{ key: string }>;
  };

  return (result?.issues ?? []).map((i) => i.key);
}

/**
 * Transition an issue to Done status.
 *
 * Fetches available transitions at runtime — never hard-codes the ID,
 * since transition IDs vary by project workflow.
 */
export async function transitionIssueToDone(
  config: JiraConfig,
  issueKey: string,
): Promise<void> {
  const data = await jiraFetch(config, 'GET', `issue/${encodeURIComponent(issueKey)}/transitions`) as {
    transitions?: Array<{ id: string; name: string; to?: { statusCategory?: { key?: string } } }>;
  };

  const transitions = data?.transitions ?? [];

  // Find a transition named "Done" or with statusCategory "done"
  const doneTransition = transitions.find(
    (t) =>
      t.name.toLowerCase() === 'done' ||
      t.to?.statusCategory?.key === 'done',
  );

  if (!doneTransition) {
    throw new Error(
      `No "Done" transition found for ${issueKey}. Available: ${transitions.map((t) => t.name).join(', ')}`,
    );
  }

  await jiraFetch(config, 'POST', `issue/${encodeURIComponent(issueKey)}/transitions`, {
    transition: { id: doneTransition.id },
  });
}

/**
 * Load JiraConfig from environment variables.
 * Throws if any required variable is missing.
 */
export function loadJiraConfig(): JiraConfig {
  const baseUrl = process.env['ATLASSIAN_BASE_URL'];
  const email = process.env['ATLASSIAN_EMAIL'];
  const token = process.env['ATLASSIAN_API_TOKEN'];

  if (!baseUrl || !email || !token) {
    throw new Error(
      'Missing Jira credentials. Set ATLASSIAN_BASE_URL, ATLASSIAN_EMAIL, and ATLASSIAN_API_TOKEN.',
    );
  }

  return { baseUrl, email, token };
}
