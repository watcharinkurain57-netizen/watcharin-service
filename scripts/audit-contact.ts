import assert from "node:assert/strict";
import { createContactHandler, getContactConfig, type ContactEmail } from "../src/lib/contact.ts";
import { contactMailto, contactTopics } from "../src/lib/contact-topics.ts";

const config = getContactConfig({ RESEND_API_KEY: "isolated-test-only", RESEND_FROM: "sender@example.invalid" });
assert.ok(config);
assert.equal(getContactConfig({}), null);
assert.equal(getContactConfig({ RESEND_API_KEY: "isolated-test-only" }), null);
assert.equal(getContactConfig({ RESEND_API_KEY: "isolated-test-only", RESEND_FROM: "not an email" }), null);
assert.equal(getContactConfig({ RESEND_API_KEY: "isolated-test-only", RESEND_FROM: "sender@example.invalid", CONTACT_TO_EMAIL: "bad" }), null);
assert.equal(getContactConfig({ RESEND_API_KEY: "isolated\ntest", RESEND_FROM: "sender@example.invalid" }), null);
assert.equal(getContactConfig({ RESEND_API_KEY: "test", RESEND_FROM: "sender\u0000@example.invalid" }), null);
assert.equal(getContactConfig({ RESEND_API_KEY: " test ", RESEND_FROM: " sender@example.invalid ", CONTACT_TO_EMAIL: " recipient@example.invalid " })?.to, "recipient@example.invalid");

const requestId = "e1e12c11-937d-4c54-9c97-cb0a11d2b945";
const valid = { name: "Example Visitor", email: "visitor@example.invalid", message: "A website inquiry for isolated verification.", topic: "web", requestId };
const calls: { email: ContactEmail; options?: { idempotencyKey: string } }[] = [];
const handler = createContactHandler(config, async (email, options) => {
  calls.push({ email, options });
  return { data: { id: "provider-accepted-test" }, error: null };
});
function request(body: unknown, raw = false) {
  return new Request("http://localhost/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: raw ? String(body) : JSON.stringify(body) });
}
for (const body of [null, [], "text", 1, {}, { ...valid, name: "A" }, { ...valid, name: "A\nB" }, { ...valid, name: "x".repeat(81) }, { ...valid, email: "invalid" }, { ...valid, email: "a\u0000@example.invalid" }, { ...valid, email: "x".repeat(121) + "@example.invalid" }, { ...valid, message: "short" }, { ...valid, message: "x".repeat(4001) }, { ...valid, message: 99 }, { ...valid, topic: "unknown" }, { ...valid, topic: [] }, { ...valid, requestId: "header\ninjection" }]) {
  const response = await handler(request(body));
  assert.equal(response.status, 400);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.ok((await response.json()).error);
}
assert.equal((await handler(request("{", true))).status, 400);
assert.equal(calls.length, 0, "invalid input must never contact the provider");
const honeypot = await handler(request({ ...valid, website: "bot.example.invalid" }));
assert.equal(honeypot.status, 200);
assert.equal(calls.length, 0, "honeypot does not deliver email");
assert.equal((await createContactHandler(null, async () => { throw new Error("must not send"); })(request(valid))).status, 503);

const accepted = await handler(request({ ...valid, name: " Example Visitor ", message: ` ${valid.message} ` }));
assert.equal(accepted.status, 200);
assert.deepEqual(await accepted.json(), { ok: true });
assert.equal(calls[0].email.replyTo, valid.email);
assert.equal(calls[0].email.to, "watcharin@watcharin-service.com");
assert.equal(calls[0].email.from, "Watcharin Service <sender@example.invalid>");
assert.match(calls[0].email.subject, /Digital Garage/);
assert.match(calls[0].email.text, /Topic: Digital Garage/);
assert.equal(calls[0].options?.idempotencyKey, `contact/${requestId}`);
await handler(request(valid));
assert.deepEqual(calls[1].options, calls[0].options, "retry preserves the provider idempotency key");
assert.equal((await handler(request({ name: valid.name, email: valid.email, message: valid.message }))).status, 200, "older callers without a topic/id remain supported");
assert.equal(calls[2].options, undefined);

// Provider acceptance and unavailable/error responses are distinct. These
// adapters are isolated in memory and never call Resend or the network.
const oldError = console.error;
const logs: unknown[][] = [];
console.error = (...args) => { logs.push(args); };
try {
  for (const send of [
    async () => ({ data: null, error: { message: "private-provider-detail" } }),
    async () => ({ data: null, error: null }),
    async () => ({ data: { id: "" }, error: null }),
    async () => { throw new Error("private-provider-detail"); },
  ]) {
    const response = await createContactHandler(config, send)(request(valid));
    assert.equal(response.status, 502);
    const body = await response.json();
    assert.equal(body.ok, undefined);
    assert.doesNotMatch(JSON.stringify(body), /private-provider-detail/);
  }
} finally { console.error = oldError; }
assert.doesNotMatch(JSON.stringify(logs), /private-provider-detail/);

for (const topic of contactTopics) {
  const url = new URL(contactMailto("watcharin@watcharin-service.com", topic.key));
  assert.equal(url.protocol, "mailto:");
  assert.match(url.searchParams.get("subject")!, new RegExp(topic.name));
  assert.match(url.searchParams.get("body")!, /ชื่อโครงการ:/);
  assert.ok(url.searchParams.get("body")!.includes(topic.detail));
  assert.ok(!url.search.includes("+"), "mailto spaces use percent encoding");
}
assert.ok(!contactMailto("watcharin@watcharin-service.com", "<unknown>").includes("unknown"));
console.log("Contact checks passed: configuration, malformed payloads, validation, honeypot, acceptance/failure boundaries, retry keys, legacy callers and four contextual mailto links. No email sent.");
