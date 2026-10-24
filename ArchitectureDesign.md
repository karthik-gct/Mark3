# Architecture & Design Principles

> **Instructions**: Fill this in for each project you onboard to Mark3. All agents read this file before generating EPICs, designs, or code. The more specific you are, the better grounded the agents will be.

---

## Project Identity

```yaml
project_name: ""           # e.g. "FlowBoard"
jira_project_key: ""       # e.g. "FLOW"
github_repo: ""            # e.g. "karthik-gct/flowboard"
primary_language: ""       # e.g. "TypeScript", "Python", "Java"
```

---

## Technology Stack

### Backend
```
Runtime:       # e.g. Node 20 / Python 3.11 / JVM 21
Framework:     # e.g. Express / FastAPI / Spring Boot
Database:      # e.g. PostgreSQL 15 / MongoDB 7 / DynamoDB
Cache:         # e.g. Redis 7
Message Queue: # e.g. Kafka / RabbitMQ / SQS
Auth:          # e.g. JWT + OAuth2 / Clerk / Auth0
```

### Frontend
```
Framework:     # e.g. React 18 / Next.js 14 / Vue 3
State:         # e.g. Zustand / Redux Toolkit / Pinia
Styling:       # e.g. Tailwind CSS / styled-components
Testing:       # e.g. Vitest + Testing Library / Jest + RTL
```

### Infrastructure
```
Cloud:         # e.g. AWS / GCP / Azure
Containers:    # e.g. Docker / Kubernetes
CI/CD:         # e.g. GitHub Actions / CircleCI
Monitoring:    # e.g. Datadog / Grafana + Prometheus
```

---

## Design Principles

> List your non-negotiable design principles. Agents will refuse to generate code that violates these.

1. **[Principle 1]** — e.g. "Prefer composition over inheritance"
2. **[Principle 2]** — e.g. "All database access goes through the repository layer; no direct DB calls in controllers"
3. **[Principle 3]** — e.g. "All external API calls are wrapped in a client class with retry + circuit breaker"
4. **[Principle 4]** — e.g. "No business logic in routes/controllers — delegate to service layer"
5. **[Principle 5]** — e.g. "All mutations are transactional; use saga pattern for cross-service writes"

---

## Code Conventions

```
Naming:         # e.g. camelCase functions, PascalCase classes, SCREAMING_SNAKE constants
File structure: # e.g. feature-first: src/features/{name}/{controller,service,repo,types}.ts
Testing:        # e.g. test file co-located with source: foo.ts → foo.test.ts
Error handling: # e.g. Result<T, E> pattern / throw custom domain errors only
Logging:        # e.g. structured JSON via pino; no console.log in production code
```

---

## Module Boundaries

> Describe the main modules/services and what they are responsible for. CodeAgent uses this to decide where to add new code.

| Module / Service | Responsibility | Owner |
|---|---|---|
| `[module-name]` | [what it does] | [team/person] |
| | | |

---

## Forbidden Patterns

> Code that will cause DEV_EVALAGENT to flag as a warning. List patterns you've been burned by.

- [ ] Direct `process.env` access outside of config module
- [ ] `any` type in TypeScript (except at system boundaries)
- [ ] Synchronous file I/O in async services
- [ ] Magic numbers/strings without named constants
- [ ] Add your own...

---

## Test Strategy

```
Unit tests:        # scope + tool (e.g. "all service methods; Vitest")
Integration tests: # scope + tool (e.g. "repository layer against real DB; Testcontainers")
E2E tests:         # scope + tool (e.g. "critical user journeys; Playwright")
Coverage target:   80%   # must match DEV_COVERAGE_THRESHOLD in Agents.md
```

---

## Context Graph Notes

> Any notes for agents about how this project is represented in the CODE_GRAPH.

```
Code roots (ingested into CODE_GRAPH):
  -           # e.g. "src/api"
  -           # e.g. "src/services"

Product doc roots (ingested into PRODUCT_GRAPH):
  -           # e.g. "docs/product"
  -           # e.g. "docs/rfcs"

Graph bootstrap command:
  cd $ELEMENT35_MCP_ROOT   # set by setup.sh
  # TODO: npm run bootstrap-project -- --config projects/{project_name}.yaml
  # (per-project bootstrap not yet implemented — see context/graph_bootstrap_gap.md)
```
