import test from "node:test";
import assert from "node:assert/strict";
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const run = promisify(execFile);

test("SEO generation uses the supplied domain and includes only published records", async (context) => {
  const fixture = await mkdtemp(join(tmpdir(), "tigre-seo-test-"));
  context.after(() => rm(fixture, { recursive: true, force: true }));
  await Promise.all([
    cp(join(root, "js"), join(fixture, "js"), { recursive: true }),
    cp(join(root, "scripts"), join(fixture, "scripts"), { recursive: true }),
    cp(join(root, "package.json"), join(fixture, "package.json")),
  ]);
  const pages = ["", "experiences", "about-delta", "about-us", "contact", "tigre-delta-boat-tours", "experience"];
  for (const page of pages) {
    const destination = join(fixture, page, "index.html");
    await mkdir(dirname(destination), { recursive: true });
    await cp(join(root, page, "index.html"), destination);
  }
  await mkdir(join(fixture, "data"));
  const operator = { id: "fixture-guide", name: "Fixture guide", published: true };
  const tour = { id: "fixture-tour", slug: "fixture-tour", title: { en: "Fixture tour" }, category: "boat-tours", operatorId: operator.id, published: true };
  await Promise.all([
    writeFile(join(fixture, "data", "categories.json"), JSON.stringify([{ id: "boat-tours", name: { en: "Boat tours" } }])),
    writeFile(join(fixture, "data", "operators.json"), JSON.stringify([operator, { id: "draft-guide", published: false }])),
    writeFile(join(fixture, "data", "tours.json"), JSON.stringify([tour, { ...tour, id: "draft-tour", slug: "draft-tour", published: false }])),
  ]);
  await run(process.execPath, [join(fixture, "scripts", "configure-seo.mjs"), "https://test.invalid/site/"]);
  const sitemap = await readFile(join(fixture, "sitemap.xml"), "utf8");
  const robots = await readFile(join(fixture, "robots.txt"), "utf8");
  const home = await readFile(join(fixture, "index.html"), "utf8");
  assert.equal((sitemap.match(/<loc>/g) || []).length, 7);
  assert.match(sitemap, /\/tigre-delta-boat-tours\/<\/loc>/);
  assert.doesNotMatch(sitemap, /\/tigre-delta-tours\//);
  assert.match(sitemap, /https:\/\/test\.invalid\/site\/experience\/\?slug=fixture-tour/);
  assert.doesNotMatch(sitemap, /\/operators?\//);
  assert.doesNotMatch(sitemap, /draft-tour|draft-guide/);
  assert.match(robots, /Sitemap: https:\/\/test\.invalid\/site\/sitemap\.xml/);
  assert.match(home, /<link rel="canonical" href="https:\/\/test\.invalid\/site\/">/);
  assert.match(home, /<meta property="og:image" content="https:\/\/test\.invalid\/site\/assets\/images\/river-bow-960\.webp">/);
  await assert.rejects(run(process.execPath, [join(fixture, "scripts", "configure-seo.mjs"), "https://example.com"]));
  assert.equal(await readFile(join(fixture, "sitemap.xml"), "utf8"), sitemap);
});
