import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { prepareCatalog } from "../js/data.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const pages = [
  ["", "river-bow-960.webp"],
  ["experiences/", "river-bow-960.webp"],
  ["about-delta/", "river-bow-960.webp"],
  ["about-us/", "boat-on-river-960.webp"],
  ["contact/", "river-bow-960.webp"],
  ["tigre-delta-boat-tours/", "boat-on-river-960.webp"],
];
const templates = [
  ["experience/", "river-bow-960.webp"],
];

function xml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
  })[character]);
}

function parseBase(value) {
  if (!value) throw new Error("Provide the real public site URL, for example: node scripts/configure-seo.mjs https://your-domain");
  const base = new URL(value);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname);
  if ((base.protocol !== "https:" && !(local && base.protocol === "http:")) ||
      base.username || base.password || base.search || base.hash ||
      base.hostname === "example.com" || base.hostname.endsWith(".example")) {
    throw new Error("Use a real HTTPS URL without credentials, query or fragment (HTTP is allowed only for local preview).");
  }
  if (!base.pathname.endsWith("/")) base.pathname += "/";
  return base;
}

function updateMetadata(html, pageUrl, imageUrl, filename) {
  const canonical = /<link rel="canonical" href="[^"]*">/;
  const image = /<meta property="og:image" content="[^"]*">/;
  const type = /<meta property="og:type" content="[^"]*">/;
  if (!canonical.test(html) || !image.test(html) || !type.test(html)) {
    throw new Error(`Missing expected SEO tags in ${filename}.`);
  }
  html = html.replace(canonical, `<link rel="canonical" href="${xml(pageUrl)}">`);
  html = html.replace(image, `<meta property="og:image" content="${xml(imageUrl)}">`);
  const ogUrl = `<meta property="og:url" content="${xml(pageUrl)}">`;
  return /<meta property="og:url" content="[^"]*">/.test(html)
    ? html.replace(/<meta property="og:url" content="[^"]*">/, ogUrl)
    : html.replace(type, `$&\n    ${ogUrl}`);
}

async function main() {
  const base = parseBase(process.argv[2]);
  const readData = async (name) => JSON.parse(await readFile(join(root, "data", `${name}.json`), "utf8"));
  const [tours, operators, categories] = await Promise.all(["tours", "operators", "categories"].map(readData));
  const catalog = prepareCatalog(tours, operators, categories);
  if (catalog.issues.length) throw new Error("Fix the published catalog configuration before generating the sitemap.");

  const updates = await Promise.all([...pages, ...templates].map(async ([path, image]) => {
    const filename = join(root, path, "index.html");
    const html = await readFile(filename, "utf8");
    return [filename, updateMetadata(html, new URL(path, base).href, new URL(`assets/images/${image}`, base).href, filename)];
  }));
  const locations = pages.map(([path]) => new URL(path, base).href);
  for (const tour of catalog.tours) {
    const url = new URL("experience/", base);
    url.searchParams.set("slug", tour.slug);
    locations.push(url.href);
  }
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${locations.map((url) => `  <url><loc>${xml(url)}</loc></url>`).join("\n")}\n</urlset>\n`;
  const robots = `User-agent: *\nAllow: /\nSitemap: ${new URL("sitemap.xml", base).href}\n`;
  for (const [filename, html] of updates) await writeFile(filename, html, "utf8");
  await writeFile(join(root, "sitemap.xml"), sitemap, "utf8");
  await writeFile(join(root, "robots.txt"), robots, "utf8");
  console.log(`Configured ${updates.length} pages and ${locations.length} sitemap URLs for ${base.href}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
