import { isEmailAddress, siteUrl } from "./site.js";
import { normalizeWhatsAppNumber } from "./whatsapp.js";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidGroupPrice(tour) {
  const group = tour.groupPrice;
  return Boolean(group && typeof group === "object" && !Array.isArray(group) &&
    tour.priceUnit === "person" && typeof tour.price === "number" &&
    Number.isFinite(tour.price) && tour.price >= 0 &&
    typeof tour.currency === "string" && /^[A-Z]{3}$/.test(tour.currency) &&
    Number.isInteger(group.minGuests) && group.minGuests > 0 &&
    typeof group.price === "number" && Number.isFinite(group.price) && group.price >= 0 &&
    (!Number.isInteger(tour.capacity) || tour.capacity <= 0 || group.minGuests <= tour.capacity));
}

async function fetchJson(path) {
  const response = await fetch(siteUrl(path), { cache: "no-cache" });
  if (!response.ok) throw new Error(`Could not load ${path} (HTTP ${response.status}).`);
  const value = await response.json();
  if (!Array.isArray(value)) throw new TypeError(`${path} must contain a JSON array.`);
  return value;
}

export function prepareCatalog(tours, operators, categories) {
  const issues = [];
  const categoryIds = new Set();
  const validCategories = categories.filter((category) => {
    const englishName = typeof category?.name === "string" ? category.name : category?.name?.en;
    if (!category || !slugPattern.test(category.id || "") || categoryIds.has(category.id) ||
        typeof englishName !== "string" || !englishName.trim()) {
      issues.push("A category has an invalid or duplicate ID or is missing an English name.");
      return false;
    }
    categoryIds.add(category.id);
    return true;
  });

  const validOperators = [];
  const operatorIds = new Set();
  const draftOperatorIds = new Set(
    operators.filter((operator) => operator?.published === false && slugPattern.test(operator.id || ""))
      .map((operator) => operator.id),
  );
  for (const operator of operators) {
    if (!operator || operator.published !== true) continue;
    if (!slugPattern.test(operator.id || "") || typeof operator.name !== "string" || !operator.name.trim() || operatorIds.has(operator.id)) {
      issues.push("A published operator has an invalid or duplicate ID or is missing a name.");
      continue;
    }
    operatorIds.add(operator.id);
    validOperators.push(operator);
    if (operator.contact?.whatsapp && !normalizeWhatsAppNumber(operator.contact.whatsapp)) {
      issues.push(`Operator ${operator.id} has an invalid WhatsApp number.`);
    }
    if (operator.contact?.email && !isEmailAddress(operator.contact.email)) {
      issues.push(`Operator ${operator.id} has an invalid email address.`);
    }
  }

  const validTours = [];
  const tourIds = new Set();
  const tourSlugs = new Set();
  for (const tour of tours) {
    if (!tour || tour.published !== true) continue;
    const englishTitle = typeof tour.title === "string" ? tour.title : tour.title?.en;
    if (!slugPattern.test(tour.id || "") || !slugPattern.test(tour.slug || "") ||
        typeof englishTitle !== "string" || !englishTitle.trim() ||
        tourIds.has(tour.id) || tourSlugs.has(tour.slug) ||
        (!operatorIds.has(tour.operatorId) && !draftOperatorIds.has(tour.operatorId)) ||
        !validCategories.some((category) => category.id === tour.category)) {
      issues.push(`A published experience has invalid or duplicate details, an unknown category, or an invalid operator: ${tour.id || "(no ID)"}.`);
      continue;
    }
    tourIds.add(tour.id);
    tourSlugs.add(tour.slug);
    validTours.push(tour);
    if (tour.groupPrice != null && !isValidGroupPrice(tour)) {
      issues.push(`Invalid group price for experience ${tour.id}.`);
    }
  }

  if (issues.length) console.error("Catalog configuration:", ...issues);
  return { tours: validTours, operators: validOperators, categories: validCategories, issues };
}

export async function loadCatalog() {
  const [tours, operators, categories] = await Promise.all([
    fetchJson("data/tours.json"),
    fetchJson("data/operators.json"),
    fetchJson("data/categories.json"),
  ]);
  return prepareCatalog(tours, operators, categories);
}
