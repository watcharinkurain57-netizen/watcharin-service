import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

// Exercise a running production build with default portfolio/workspace-off
// configuration. Requests never contain a valid contact form or send email.
const origin = process.argv[2] || "http://127.0.0.1:8767";
const content = JSON.parse(await readFile(new URL("../src/lib/campus/content.json", import.meta.url), "utf8"));
const zoneKeys = ["systems", "brands", "media", "web"];
const records = [];
async function request(path, options = {}) {
  const response = await fetch(new URL(path, origin), { redirect: "manual", ...options });
  records.push({ path, method: options.method || "GET", status: response.status, location: response.headers.get("location") });
  return response;
}

const pages = ["/", "/campus/work", "/campus/about", "/campus/contact", "/campus/resume/th", "/campus/resume/en",
  ...zoneKeys.flatMap(key => [`/campus/work/${key}`, `/campus/zones/${key}`]),
  ...content.projects.map(project => `/campus/projects/${project.key}`), "/studio", "/coresync", "/ai-map"];
await Promise.all(pages.map(async path => {
  const response = await request(path);
  assert.equal(response.status, 200, path);
  const html = await response.text();
  if (path === "/" || path.startsWith("/campus/")) {
    assert.ok(html.includes("watcharin-portfolio-mockup"), `${path}: campus shell`);
    const canonical = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1];
    const canonicalPath = path.startsWith("/campus/work/") ? "/campus/work" : path;
    assert.ok(canonical, `${path}: canonical present`);
    assert.equal(new URL(canonical).href, new URL(canonicalPath, "https://watcharin-service.com").href, `${path}: canonical`);
    if (path.includes("/resume/")) assert.ok(html.includes('content="noindex, follow"'), path);
    else assert.ok(html.includes('content="index, follow"'), path);
  }
  if (path === "/") {
    assert.ok(html.includes("A world of things I build."));
    assert.ok(!html.includes('href="/login"') && !html.includes('href="/start"'), "no workspace CTA on homepage");
  }
}));

for (const [path, destination] of [["/campus", "/"], ["/projects", "/campus/work"], ["/start", "/campus/contact"]]) {
  const response = await request(path);
  assert.equal(response.status, 307, path);
  assert.equal(new URL(response.headers.get("location"), origin).pathname, destination);
}
const closedPaths = ["/projects/new", "/projects/mine", "/projects/existing", "/projects/existing/edit", "/login", "/clients", "/requests", "/invite/token", "/auth/callback"];
await Promise.all(closedPaths.map(async path => {
  const response = await request(path);
  assert.equal(response.status, 404, path);
  assert.equal(response.headers.get("cache-control"), "no-store", path);
}));
// File-like slugs skip the proxy matcher. The page/data entry guards must still
// reject them without constructing a client or fetching private project data.
for (const path of ["/projects/private.svg", "/invite/token.svg", "/campus/projects/unknown"]) {
  assert.equal((await request(path)).status, 404, path);
}
for (const path of ["/auth/signout", "/api/cron/meeting-reminders", "/projects", "/start"]) {
  assert.equal((await request(path, { method: "POST" })).status, 404, path);
}
assert.equal((await request("/", { method: "POST", headers: { "next-action": "closed-workspace-check" } })).status, 404, "server action cannot bypass closure via public homepage");

const contact = await request("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
assert.equal(contact.status, 400, "contact validates malformed JSON before delivery");
for (const body of ["null", "[]", JSON.stringify({ name: "x", email: "invalid", message: "short" })]) {
  const invalidContact = await request("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body });
  assert.equal(invalidContact.status, 400, "invalid contact input never reaches delivery");
  assert.equal(invalidContact.headers.get("cache-control"), "no-store");
}
const sitemap = await (await request("/sitemap.xml")).text();
assert.ok(sitemap.includes("https://watcharin-service.com/campus/work"));
assert.ok(!sitemap.includes("https://watcharin-service.com/projects"));
assert.ok(!sitemap.includes("/campus/resume/") && !sitemap.includes("/campus/work/systems"));
const robots = await (await request("/robots.txt")).text();
assert.ok(robots.includes("Disallow: /projects") && robots.includes("Disallow: /login"));
const shareImage = await request("/opengraph-image");
assert.equal(shareImage.status, 200);
const png = Buffer.from(await shareImage.arrayBuffer());
assert.equal(png.subarray(1, 4).toString(), "PNG");
assert.equal(png.readUInt32BE(16), 1200);
assert.equal(png.readUInt32BE(20), 630);
if (process.env.PORTFOLIO_PROOF_DIR) {
  await writeFile(`${process.env.PORTFOLIO_PROOF_DIR}/share-image.png`, png);
  await writeFile(`${process.env.PORTFOLIO_PROOF_DIR}/http-verification.json`, JSON.stringify({ origin, records, passed: true }, null, 2));
}
console.log(`Portfolio HTTP checks passed: ${records.length} requests, canonical/robots/sitemap, redirects, server gates, contact validation and 1200×630 share image.`);
