import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));

test("every interface key and interpolation is available in all three languages", async () => {
  const dictionaries = JSON.parse(await readFile(join(root, "data", "translations.json"), "utf8"));
  const keys = new Set(["nav.closeMenu", "language.en", "language.es", "language.pt"]);
  const directories = await readdir(root, { withFileTypes: true });
  const htmlFiles = [join(root, "index.html")];
  for (const entry of directories) {
    if (!entry.isDirectory()) continue;
    const path = join(root, entry.name, "index.html");
    try {
      await readFile(path, "utf8");
      htmlFiles.push(path);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  const jsFiles = (await readdir(join(root, "js"))).filter((file) => file.endsWith(".js")).map((file) => join(root, "js", file));
  for (const file of [...htmlFiles, ...jsFiles]) {
    const content = await readFile(file, "utf8");
    for (const match of content.matchAll(/data-i18n(?:-alt|-aria-label|-placeholder)?="([^"]+)"/g)) keys.add(match[1]);
    for (const match of content.matchAll(/\bt\("([^"]+)"/g)) keys.add(match[1]);
    const page = content.match(/data-page="([^"]+)"/)?.[1];
    if (page) {
      keys.add(`meta.${page}.title`);
      keys.add(`meta.${page}.description`);
    }
  }
  for (const key of keys) {
    for (const language of ["en", "es", "pt"]) {
      assert.equal(typeof dictionaries[language]?.[key], "string", `${language} is missing ${key}`);
      const placeholders = (dictionaries[language][key].match(/\{\w+\}/g) || []).sort();
      const englishPlaceholders = (dictionaries.en[key].match(/\{\w+\}/g) || []).sort();
      assert.deepEqual(placeholders, englishPlaceholders, `${language}:${key} has different placeholders`);
    }
  }
});
