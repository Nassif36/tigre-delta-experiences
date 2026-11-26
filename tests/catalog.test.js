import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { prepareCatalog } from "../js/data.js";
import { buildWhatsAppUrl, normalizeWhatsAppNumber, tourWhatsAppUrl } from "../js/whatsapp.js";

const category = { id: "boat-tours", name: { en: "Boat tours" } };
const operator = { id: "local-guide", name: "Test guide", published: true };
const tour = {
  id: "sample-trip",
  slug: "sample-trip",
  title: { en: "Sample trip" },
  category: "boat-tours",
  operatorId: "local-guide",
  published: true,
};

test("confirmed experiences can be shown without exposing a draft operator", () => {
  const result = prepareCatalog(
    [tour, { ...tour, id: "draft-trip", slug: "draft-trip", published: false }],
    [{ ...operator, name: "Unpublished operator", published: false }],
    [category],
  );
  assert.deepEqual(result.tours.map((item) => item.id), ["sample-trip"]);
  assert.deepEqual(result.operators, []);
  assert.deepEqual(result.issues, []);
  assert.equal(tourWhatsAppUrl(result.tours[0], result.operators[0]), null);
});

test("published experiences require a valid operator, category and unique slug", () => {
  const result = prepareCatalog(
    [tour, { ...tour, id: "duplicate-trip" }, { ...tour, id: "bad-trip", slug: "bad-trip", category: "missing" }, { ...tour, id: "unknown-operator", slug: "unknown-operator", operatorId: "missing" }],
    [operator],
    [category],
  );
  assert.deepEqual(result.tours.map((item) => item.id), ["sample-trip"]);
  assert.equal(result.issues.length, 3);
});

test("WhatsApp links require an international-format number and encode the inquiry", () => {
  assert.equal(normalizeWhatsAppNumber("+54 (9) 11 1234-5678"), "5491112345678");
  assert.equal(normalizeWhatsAppNumber("54+91112345678"), null);
  assert.equal(normalizeWhatsAppNumber("not-a-number"), null);
  assert.equal(buildWhatsAppUrl("", "hello"), null);
  assert.equal(buildWhatsAppUrl("+5491112345678", ""), null);
  const url = new URL(buildWhatsAppUrl("+54 9 11 1234-5678", "Hello! Trip & details?"));
  assert.equal(url.hostname, "wa.me");
  assert.equal(url.pathname, "/5491112345678");
  assert.equal(url.searchParams.get("text"), "Hello! Trip & details?");
});

test("invalid configured contact details are reported instead of generating booking links", () => {
  const invalidOperator = { ...operator, contact: { whatsapp: "bad-number", email: "not-an-email" } };
  const result = prepareCatalog([tour], [invalidOperator], [category]);
  assert.equal(result.tours.length, 1);
  assert.equal(result.issues.length, 2);
  assert.equal(buildWhatsAppUrl(invalidOperator.contact.whatsapp, "Inquiry"), null);
  assert.equal(tourWhatsAppUrl(tour, invalidOperator), null);
});

test("group pricing cannot start above the experience capacity", () => {
  const pricedTour = {
    ...tour,
    capacity: 5,
    price: 95,
    currency: "USD",
    priceUnit: "person",
    groupPrice: { minGuests: 5, price: 75 },
  };
  assert.deepEqual(prepareCatalog([pricedTour], [operator], [category]).issues, []);
  const invalid = prepareCatalog([{ ...pricedTour, capacity: 4 }], [operator], [category]);
  assert.equal(invalid.issues.length, 1);
  assert.match(invalid.issues[0], /Invalid group price/);
});

test("the personalized experience alone uses the custom inquiry flow", async () => {
  const tours = JSON.parse(await readFile(new URL("../data/tours.json", import.meta.url), "utf8"));
  const customTours = tours.filter((item) => item.published && item.customInquiry === true);
  assert.deepEqual(customTours.map((item) => item.id), ["custom-delta-island-experience"]);
});

test("the three current experiences are available under boat tours", async () => {
  const [tours, operators, categories] = await Promise.all(
    ["tours", "operators", "categories"].map(async (name) =>
      JSON.parse(await readFile(new URL(`../data/${name}.json`, import.meta.url), "utf8"))),
  );
  const catalog = prepareCatalog(tours, operators, categories);
  const boatTours = catalog.tours.filter((item) => item.category === "boat-tours");
  for (const id of ["one-hour-delta-boat-tour", "delta-boat-ride-island-lunch", "custom-delta-island-experience"]) {
    assert.ok(boatTours.some((item) => item.id === id), `${id} must appear in boat tours`);
  }
});
