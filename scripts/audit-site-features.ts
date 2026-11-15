import assert from "node:assert/strict";
import { isWorkspacePath, readSiteFeatures, workspaceDecision } from "../src/lib/site-features.ts";
import { getSupabaseEnv } from "../src/lib/supabase/env.ts";

const closed = readSiteFeatures({});
assert.deepEqual(closed, { portfolio: true, workspace: false });
assert.throws(() => readSiteFeatures({ INTERNAL_WORKSPACE_ENABLED: "yes" }));
assert.throws(() => readSiteFeatures({ SITE_MODE: "unknown" }));
assert.throws(() => readSiteFeatures({ SITE_MODE: "legacy" }));

const enabled = readSiteFeatures({ INTERNAL_WORKSPACE_ENABLED: "true" });
const legacy = readSiteFeatures({ SITE_MODE: "legacy", INTERNAL_WORKSPACE_ENABLED: "true" });
assert.deepEqual(enabled, { portfolio: true, workspace: true });
assert.deepEqual(legacy, { portfolio: false, workspace: true });

const privatePaths = ["/projects/new", "/projects/mine", "/projects/existing/edit", "/projects/existing", "/clients", "/requests", "/login", "/invite/token", "/auth/callback", "/auth/signout", "/api/cron/meeting-reminders"];
for (const path of privatePaths) {
  assert.equal(isWorkspacePath(path), true);
  for (const method of ["GET", "HEAD", "POST", "PUT", "DELETE"]) {
    assert.deepEqual(workspaceDecision(closed, path, method), { kind: "closed" });
    assert.deepEqual(workspaceDecision(enabled, path, method), { kind: "allow" });
    assert.deepEqual(workspaceDecision(legacy, path, method), { kind: "allow" });
  }
}
for (const [path, destination] of [["/projects", "/campus/work"], ["/start", "/campus/contact"]]) {
  assert.deepEqual(workspaceDecision(closed, path, "GET"), { kind: "redirect", destination });
  assert.deepEqual(workspaceDecision(closed, path, "HEAD"), { kind: "redirect", destination });
  assert.deepEqual(workspaceDecision(closed, path, "POST"), { kind: "closed" });
}
for (const path of ["/", "/campus/work", "/campus/projects/watcharin", "/campus/wansabye.jpg", "/api/contact", "/api/demo/session", "/studio", "/ai-map", "/coresync", "/resume/th", "/projects-extra", "/author", "/clientside"]) {
  assert.equal(isWorkspacePath(path), false);
  assert.deepEqual(workspaceDecision(closed, path, "GET"), { kind: "allow" });
  assert.deepEqual(workspaceDecision(closed, path, "POST", true), { kind: "closed" });
  assert.deepEqual(workspaceDecision(enabled, path, "POST", true), { kind: "allow" });
}
assert.deepEqual(workspaceDecision(closed, "/api/contact", "POST"), { kind: "allow" });

// Importing env is safe without credentials. Creating a client still validates
// real settings instead of substituting a fake URL or swallowing failures.
const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const previousKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
try {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  assert.throws(getSupabaseEnv, /NEXT_PUBLIC_SUPABASE_URL/);
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.invalid";
  assert.throws(getSupabaseEnv, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test\nheader";
  assert.throws(getSupabaseEnv, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = " test-key \n";
  assert.deepEqual(getSupabaseEnv(), { url: "https://example.invalid", publishableKey: "test-key" });
} finally {
  if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
  if (previousKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = previousKey;
}
console.log("Site feature checks passed: defaults, reopening, closed routes, actions, public routes and configuration validation.");
