import { siteRoot, siteUrl } from "./site.js";

const languages = ["en", "es", "pt"];
const storageKey = "tigre-delta-language";
const missingKeys = new Set();
const untranslatedValues = new WeakSet();
let dictionary = {};
let language = "en";
let storageUnavailable = false;

export function getLanguage() {
  return language;
}

export function t(key, values = {}) {
  let text = dictionary[language]?.[key];
  if (typeof text !== "string") {
    if (!missingKeys.has(`${language}:${key}`)) {
      console.warn(`Missing translation: ${language}:${key}`);
      missingKeys.add(`${language}:${key}`);
    }
    text = dictionary.en?.[key] ?? "Translation unavailable";
  }
  return text.replace(/\{(\w+)\}/g, (match, name) => Object.hasOwn(values, name) ? String(values[name]) : match);
}

export function localize(value) {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  if (typeof value[language] === "string" && value[language].trim()) return value[language];
  if (typeof value.en === "string" && value.en.trim()) {
    if (language !== "en" && !untranslatedValues.has(value)) {
      console.warn(`Content is missing a ${language} translation; displaying its English version.`);
      untranslatedValues.add(value);
    }
    return value.en;
  }
  return "";
}

export function localizeLanguages(values) {
  if (!Array.isArray(values)) return "";
  const aliases = { en: "en", english: "en", es: "es", spanish: "es", pt: "pt", portuguese: "pt" };
  return values.map((value) => {
    const code = typeof value === "string" ? aliases[value.trim().toLowerCase()] : "";
    return code ? t(`language.${code}`) : localize(value);
  }).filter(Boolean).join(", ");
}

function setMeta(selector, attribute, value, create) {
  let element = document.querySelector(selector);
  if (!element && create) {
    element = document.createElement("meta");
    element.setAttribute(create[0], create[1]);
    document.head.append(element);
  }
  if (element) element.setAttribute(attribute, value);
}

export function setMetadata({ title, description, canonical, indexable }) {
  if (title) {
    document.title = title;
    setMeta('meta[property="og:title"]', "content", title, ["property", "og:title"]);
  }
  if (description) {
    setMeta('meta[name="description"]', "content", description, ["name", "description"]);
    setMeta('meta[property="og:description"]', "content", description, ["property", "og:description"]);
  }
  const cleanUrl = canonical || `${window.location.origin}${window.location.pathname}`;
  document.querySelector('link[rel="canonical"]')?.setAttribute("href", cleanUrl);
  setMeta('meta[property="og:url"]', "content", cleanUrl, ["property", "og:url"]);
  if (typeof indexable === "boolean") {
    setMeta('meta[name="robots"]', "content", indexable ? "index,follow" : "noindex,follow", ["name", "robots"]);
  }
}

export function setStructuredData(id, data) {
  let script = document.getElementById(`structured-${id}`);
  if (!data) {
    script?.remove();
    return;
  }
  if (!script) {
    script = document.createElement("script");
    script.id = `structured-${id}`;
    script.type = "application/ld+json";
    document.head.append(script);
  }
  script.textContent = JSON.stringify(data);
}

export function updateBreadcrumbStructuredData() {
  const navigation = document.querySelector("nav.breadcrumbs");
  if (!navigation) {
    setStructuredData("breadcrumbs", null);
    return;
  }
  const items = [...navigation.querySelectorAll("a, [aria-current='page']")].map((element, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: element.textContent.trim(),
    item: element.href || document.querySelector('link[rel="canonical"]').href,
  }));
  setStructuredData("breadcrumbs", {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  });
}

function showStorageNotice() {
  let notice = document.querySelector("#language-storage-notice");
  if (!storageUnavailable) {
    notice?.remove();
    return;
  }
  if (!notice) {
    notice = document.createElement("p");
    notice.id = "language-storage-notice";
    notice.className = "site-notice";
    notice.setAttribute("role", "status");
    document.querySelector("#site-header").after(notice);
  }
  notice.textContent = t("common.storageUnavailable");
}

function updateMenuLabel() {
  const toggle = document.querySelector(".menu-toggle");
  if (toggle) toggle.setAttribute("aria-label", t(toggle.dataset.menuOpen === "true" ? "nav.closeMenu" : "nav.openMenu"));
}

function applyTranslations() {
  document.documentElement.lang = language;
  for (const element of document.querySelectorAll("[data-i18n]")) element.textContent = t(element.dataset.i18n);
  for (const element of document.querySelectorAll("[data-i18n-alt]")) element.setAttribute("alt", t(element.dataset.i18nAlt));
  for (const element of document.querySelectorAll("[data-i18n-aria-label]")) element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
  for (const element of document.querySelectorAll("[data-i18n-placeholder]")) element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder));
  const page = document.body.dataset.page;
  setMetadata({ title: t(`meta.${page}.title`), description: t(`meta.${page}.description`) });
  const image = document.querySelector('meta[property="og:image"]');
  if (image) image.content = new URL(image.content, document.baseURI).href;
  document.querySelector("#site-language").value = language;
  updateMenuLabel();
  showStorageNotice();
  updateBreadcrumbStructuredData();
}

export function setLanguage(nextLanguage) {
  if (!languages.includes(nextLanguage)) throw new RangeError(`Unsupported language: ${nextLanguage}`);
  language = nextLanguage;
  try {
    window.localStorage.setItem(storageKey, language);
  } catch (error) {
    storageUnavailable = true;
    console.warn("Could not save the language preference.", error);
  }
  applyTranslations();
  document.dispatchEvent(new CustomEvent("languagechange", { detail: { language } }));
}

export async function initializeTranslations() {
  const response = await fetch(siteUrl("data/translations.json"), { cache: "no-cache" });
  if (!response.ok) throw new Error(`Could not load translations (HTTP ${response.status}).`);
  dictionary = await response.json();
  if (!languages.every((item) => dictionary[item] && typeof dictionary[item] === "object")) {
    throw new TypeError("Translations must include English, Spanish and Portuguese dictionaries.");
  }
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (languages.includes(stored)) language = stored;
    else if (stored) console.warn(`Ignoring unsupported saved language: ${stored}`);
  } catch (error) {
    storageUnavailable = true;
    console.warn("Could not read the language preference.", error);
  }
  document.querySelector("#site-language").addEventListener("change", (event) => setLanguage(event.target.value));
  document.addEventListener("menuchange", updateMenuLabel);
  applyTranslations();
  setStructuredData("website", {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Tigre Delta Experiences",
    url: siteRoot.href,
  });
}
