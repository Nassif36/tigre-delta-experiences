export const siteRoot = new URL("../", import.meta.url);

export function siteUrl(path = "") {
  return new URL(path, siteRoot).href;
}

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

export function isEmailAddress(value) {
  return typeof value === "string" && /^[^\s@?#]+@[^\s@?#]+\.[^\s@?#]+$/.test(value);
}
