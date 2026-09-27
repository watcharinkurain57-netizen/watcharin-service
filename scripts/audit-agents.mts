/**
 * Offline audit of the AI agent harness wiring (src/lib/agents/).
 *
 *   npm run audit:agents
 *
 * Calls no model and touches no database. It checks the things that break
 * silently: a role that lists a tool which does not exist, a tool a client
 * could see that exposes our costs, a draft the model can make but the user
 * cannot save, a JSON schema that forces the model to fill in a field that has
 * a default, and constants that drifted away from the CHECK constraints in the
 * migrations. The runtime loop itself is exercised by hand against a fake API.
 *
 * .mts, not .ts like the other audits: this one loads src/ through a resolver
 * hook with dynamic import(), so node has to know up front that it is ESM.
 */
import { readFileSync } from "node:fs";
import { register } from "node:module";

// src/ imports use `@/…` and extensionless paths (what Next reads); teach node the same
register("./src-resolver.mjs", import.meta.url);

async function main() {
const { ROLES, rolesFor, isSpecialist } = await import("../src/lib/agents/roles.ts");
const { TOOL_SPECS, exposedTools, toInputSchema, isToolName } = await import("../src/lib/agents/specs.ts");
const { PAYLOAD_SCHEMA, APPLY_NEED, LIMITS, looksLikeMermaid } = await import("../src/lib/agents/proposals.ts");
const { RUN_STATUSES, MAX_TURN_CHARS, splitLines } = await import("../src/lib/agents/protocol.ts");
const { costUsd } = await import("../src/lib/agents/pricing.ts");
const { can } = await import("../src/lib/archive-access.ts");
const { MAX_DIAGRAM_CHARS } = await import("../src/lib/project-diagrams.ts");
const { COMMENT_MAX } = await import("../src/lib/project-comments.ts");

type Capability = Parameters<typeof can>[1];

let failures = 0;
let checks = 0;

function check(condition: boolean, message: string) {
  checks += 1;
  if (!condition) {
    failures += 1;
    console.error(`FAIL  ${message}`);
  } else if (process.env.VERBOSE) {
    console.log(`ok    ${message}`);
  }
}

function section(name: string) {
  if (process.env.VERBOSE) console.log(`\n== ${name} ==`);
}

const toolNames = Object.keys(TOOL_SPECS);

section("roles ↔ tools");
for (const role of ROLES) {
  for (const t of role.tools) check(isToolName(t), `${role.id}: tool "${t}" exists in specs.ts`);
  check(role.maxSteps >= 2, `${role.id}: has at least one tool step plus an answer step`);
  check(role.examples.length > 0, `${role.id}: has example prompts for the empty screen`);
  check(/^[a-z][a-z0-9_-]{0,39}$/.test(role.id), `${role.id}: id fits the agent_runs.role CHECK`);
}
for (const name of toolNames) {
  check(ROLES.some((r) => r.tools.includes(name)), `tool "${name}" is used by at least one role`);
}
check(new Set(ROLES.map((r) => r.id)).size === ROLES.length, "role ids are unique");

section("tool specs");
for (const name of toolNames) {
  const spec = TOOL_SPECS[name as keyof typeof TOOL_SPECS];
  check(/^[a-zA-Z0-9_-]{1,64}$/.test(name), `${name}: valid API tool name`);
  check(spec.label.trim().length > 0 && spec.description.trim().length > 20, `${name}: has a label and a real description`);

  const schema = toInputSchema(spec.input);
  const text = JSON.stringify(schema);
  check(schema.type === "object", `${name}: input schema is an object`);
  check(!("$schema" in schema) && !text.includes('"pattern"'), `${name}: schema is trimmed ($schema/pattern removed)`);

  // a field with a default must not be required, or the model has to guess a value
  const props = (schema.properties ?? {}) as Record<string, { default?: unknown }>;
  const required = (schema.required ?? []) as string[];
  for (const [key, prop] of Object.entries(props)) {
    if ("default" in prop) check(!required.includes(key), `${name}.${key}: has a default so it is optional`);
  }
}

section("capabilities");
const owner = (cap: Capability) => can({ role: "owner" }, cap);
const publicViewer = (cap: Capability) => can({ role: "public" }, cap);
// what a client would get if someone adds project.agents.use to the client list
const clientWithAgents = (cap: Capability) => cap === "project.agents.use" || can({ role: "client" }, cap);

check(rolesFor(publicViewer).length === 0, "public visitors get no agent roles");
check(rolesFor(owner).length === ROLES.length, "project owners get every role");
check(ROLES.filter(isSpecialist).length === ROLES.length - 1, "every role but the coordinator is a specialist");

for (const role of rolesFor(clientWithAgents)) {
  const tools = exposedTools(role, clientWithAgents);
  check(!tools.includes("get_costs_and_margin"), `client via ${role.id}: cannot see our costs and margin`);
  check(!tools.some((t) => t.startsWith("propose_tasks") || t === "propose_diagram"), `client via ${role.id}: cannot draft owner-only changes`);
}
for (const role of ROLES) {
  check(
    exposedTools(role, owner).length === role.tools.length,
    `${role.id}: the owner is offered every tool the role lists`
  );
}

section("drafts");
const draftTool: Record<string, keyof typeof APPLY_NEED> = {
  propose_tasks: "create_tasks",
  propose_diagram: "create_diagram",
  propose_chat_message: "post_comment",
};
for (const name of toolNames.filter((n) => n.startsWith("propose_"))) {
  const kind = draftTool[name];
  check(Boolean(kind), `${name}: maps to a draft kind`);
  if (kind) {
    check(
      TOOL_SPECS[name as keyof typeof TOOL_SPECS].need === APPLY_NEED[kind],
      `${name}: offered only to people who can save the draft (${APPLY_NEED[kind]})`
    );
  }
}
for (const [kind, cap] of Object.entries(APPLY_NEED)) {
  check(owner(cap), `${kind}: owners can save it`);
  check(!publicViewer(cap), `${kind}: public visitors cannot save it`);
}

const TASKS = PAYLOAD_SCHEMA.create_tasks;
check(TASKS.safeParse({ tasks: [{ title: "ต่อ API", due_on: "2026-10-01" }] }).success, "a normal task draft passes");
check(!TASKS.safeParse({ tasks: [] }).success, "an empty task draft is rejected");
check(!TASKS.safeParse({ tasks: [{ title: "   " }] }).success, "a blank task title is rejected");
check(!TASKS.safeParse({ tasks: [{ title: "x", due_on: "2026-02-30" }] }).success, "a date that is not on the calendar is rejected");
check(!TASKS.safeParse({ tasks: [{ title: "x", assignee_id: "not-a-uuid" }] }).success, "a non-uuid assignee is rejected");
check(
  !TASKS.safeParse({ tasks: Array.from({ length: LIMITS.tasksPerDraft + 1 }, () => ({ title: "x" })) }).success,
  `more than ${LIMITS.tasksPerDraft} tasks in one draft is rejected`
);
check(!PAYLOAD_SCHEMA.post_comment.safeParse({ body: "x".repeat(LIMITS.commentBody + 1) }).success, "an oversized chat draft is rejected");
check(looksLikeMermaid("flowchart LR\n  A --> B"), "mermaid: a flowchart is recognised");
check(looksLikeMermaid("%% ผังระบบ\nsequenceDiagram\n  A->>B: hi"), "mermaid: a leading comment is skipped");
check(!looksLikeMermaid("A --> B"), "mermaid: a body without a diagram type is rejected");

section("constants vs database");
const migration = readFileSync(new URL("../supabase/migrations/0024_agent_runs.sql", import.meta.url), "utf8");
const statusList = /status\s+in\s*\(([^)]*)\)/.exec(migration)?.[1] ?? "";
const dbStatuses = [...statusList.matchAll(/'([a-z]+)'/g)].map((m) => m[1]).sort();
check(
  JSON.stringify(dbStatuses) === JSON.stringify([...RUN_STATUSES].sort()),
  `RUN_STATUSES matches the agent_runs.status CHECK (${dbStatuses.join(", ")})`
);
check(LIMITS.diagramSource === MAX_DIAGRAM_CHARS, "diagram draft limit equals MAX_DIAGRAM_CHARS");
check(LIMITS.commentBody === COMMENT_MAX, "chat draft limit equals COMMENT_MAX");
check(MAX_TURN_CHARS <= 20_000, "a single chat turn stays small enough to resend every time");

section("pricing");
// 1,000 in + 400 cache write + 1,000 cache read + 600 out on claude-opus-5 ($5 / $25 per MTok)
const cost = costUsd("claude-opus-5", { input: 1000, cacheWrite: 400, cacheRead: 1000, output: 600 });
check(cost === 0.023, `cost arithmetic (got ${cost}, want 0.023)`);
check(costUsd("claude-made-up-9", { input: 1, output: 1, cacheRead: 0, cacheWrite: 0 }) === null, "an unknown model has no price, not a guess");

section("stream protocol");
const a = splitLines('{"a":1}\n{"b":');
check(a.lines.length === 1 && a.rest === '{"b":', "a line cut mid-chunk waits for the next chunk");
const b = splitLines(`${a.rest}2}\n\n`);
check(b.lines.length === 1 && JSON.parse(b.lines[0]).b === 2 && b.rest === "", "the rest joins up and blank lines are skipped");

console.log(
  failures === 0 ? `agent harness: ${checks} checks pass` : `agent harness: ${failures} of ${checks} checks FAILED`
);
process.exit(failures === 0 ? 0 : 1);
}

main();
