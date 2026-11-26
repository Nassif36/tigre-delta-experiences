import { escapeHtml, siteUrl } from "./site.js";
import { getLanguage, localize, localizeLanguages, setMetadata, setStructuredData, t, updateBreadcrumbStructuredData } from "./translations.js";
import { renderImage } from "./media.js";
import { tourWhatsAppUrl } from "./whatsapp.js";
import { isValidGroupPrice } from "./data.js";

const h = escapeHtml;

function experienceUrl(tour) {
  const url = new URL(siteUrl("experience/"));
  url.searchParams.set("slug", tour.slug);
  return url.href;
}

function formatPrice(tour, amount) {
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0 ||
      typeof tour.currency !== "string" || !/^[A-Z]{3}$/.test(tour.currency)) {
    console.warn(`Invalid price or currency for experience ${tour.id}.`);
    return "";
  }
  try {
    return new Intl.NumberFormat(getLanguage(), { style: "currency", currency: tour.currency, currencyDisplay: "code" }).format(amount);
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    console.warn(`Invalid currency for experience ${tour.id}.`, error);
    return "";
  }
}

function priceLabels(tour) {
  if (tour.price === null || tour.price === undefined || tour.price === "") {
    const note = localize(tour.priceNote);
    return note ? [note] : [];
  }
  const price = formatPrice(tour, tour.price);
  if (!price) return [];
  const labels = [tour.priceUnit === "person" ? t("tour.perPerson", { price }) : price];
  if (tour.groupPrice != null) {
    const { minGuests, price: groupAmount } = tour.groupPrice;
    if (!isValidGroupPrice(tour)) {
      console.warn(`Invalid group price for experience ${tour.id}.`);
      return labels;
    }
    const groupPrice = formatPrice(tour, groupAmount);
    if (groupPrice) labels.push(t("tour.groupPrice", { count: minGuests, price: groupPrice }));
  }
  return labels;
}

function capacityLabel(tour) {
  return Number.isInteger(tour.capacity) && tour.capacity > 0
    ? t("tour.guestCount", { count: tour.capacity })
    : t("common.toBeConfirmed");
}

function valueOrPending(value) {
  return localize(value) || t("common.toBeConfirmed");
}

function categoryName(catalog, id) {
  return localize(catalog.categories.find((category) => category.id === id)?.name) || t("common.experience");
}

export function tourCard(tour, catalog) {
  const title = localize(tour.title);
  const description = localize(tour.shortDescription);
  const prices = priceLabels(tour);
  const images = Array.isArray(tour.images) ? tour.images : [];
  return `<article class="tour-card">
    <a class="tour-card-image" href="${h(experienceUrl(tour))}" aria-label="${h(t("tour.viewNamed", { title }))}">${renderImage(images[0], t("tour.photoAlt", { title }))}</a>
    <div class="tour-card-body">
      <p class="card-kicker">${h(categoryName(catalog, tour.category))}</p>
      <h3><a href="${h(experienceUrl(tour))}">${h(title)}</a></h3>
      ${description ? `<p class="tour-card-description">${h(description)}</p>` : ""}
      <div class="tour-card-meta"><span>${h(t("tour.duration"))}: ${h(valueOrPending(tour.duration))}</span><span>${h(t("tour.departure"))}: ${h(valueOrPending(tour.departureLocation))}</span><span>${h(t("tour.capacity"))}: ${h(capacityLabel(tour))}</span><span>${h(t("tour.languages"))}: ${h(localizeLanguages(tour.languages) || t("common.toBeConfirmed"))}</span></div>
      ${prices.length ? `<p class="tour-card-price">${prices.map((price, index) => `<span>${index === 0 ? `${h(t("tour.price"))}: ` : ""}${h(price)}</span>`).join("")}</p>` : ""}
      <a class="text-link" href="${h(experienceUrl(tour))}"><span>${h(t("tour.viewDetails"))}</span><span aria-hidden="true">→</span></a>
    </div>
  </article>`;
}

function warning(catalog) {
  return catalog.issues.length ? `<p class="info-band catalog-warning" role="status">${h(t("common.configWarning"))}</p>` : "";
}

function emptyState(title, body, linkText, link, heading = "h3") {
  return `<div class="empty-state"><${heading}>${h(title)}</${heading}><p>${h(body)}</p><a class="text-link" href="${h(link)}"><span>${h(linkText)}</span><span aria-hidden="true">→</span></a></div>`;
}

function tourGrid(tours, catalog) {
  return `<div class="tour-grid">${tours.map((tour) => tourCard(tour, catalog)).join("")}</div>`;
}

export function initializeTourViews(catalog) {
  const featured = document.querySelector("#featured-tours");
  const guide = document.querySelector("#guide-tours");
  const results = document.querySelector("#catalog-results");
  const detail = document.querySelector("#experience-detail");

  function render() {
    if (featured) {
      const featuredTours = catalog.tours.filter((tour) => tour.featured === true);
      const tours = (featuredTours.length ? featuredTours : catalog.tours).slice(0, 3);
      featured.innerHTML = warning(catalog) + (tours.length
        ? tourGrid(tours, catalog)
        : emptyState(t("catalog.featuredEmptyTitle"), t("catalog.featuredEmptyBody"), t("catalog.exploreCatalog"), siteUrl("experiences/")));
    }
    if (guide) {
      const tours = catalog.tours.filter((tour) => !guide.dataset.category || tour.category === guide.dataset.category);
      guide.innerHTML = warning(catalog) + (tours.length
        ? tourGrid(tours, catalog)
        : emptyState(t("catalog.emptyTitle"), t("catalog.emptyBody"), t("catalog.learnDelta"), siteUrl("about-delta/")));
    }
    if (results) {
      results.innerHTML = warning(catalog) + (catalog.tours.length
        ? tourGrid(catalog.tours, catalog)
        : emptyState(t("catalog.emptyTitle"), t("catalog.emptyBody"), t("catalog.learnDelta"), siteUrl("about-delta/")));
    }
    if (detail) renderExperience(detail, catalog);
  }

  document.addEventListener("languagechange", render);
  render();
}

function renderList(items, ordered = false) {
  if (!Array.isArray(items) || !items.length) return `<p>${h(t("common.toBeConfirmed"))}</p>`;
  const values = items.map((item) => {
    if (item && typeof item === "object" && (item.title || item.description)) {
      const title = localize(item.title);
      const description = localize(item.description);
      return title || description ? `<li>${title ? `<strong>${h(title)}</strong>` : ""}${title && description ? " — " : ""}${h(description)}</li>` : "";
    }
    const text = localize(item);
    return text ? `<li>${h(text)}</li>` : "";
  }).filter(Boolean);
  if (!values.length) {
    console.warn("An experience contains an empty list.");
    return `<p>${h(t("common.toBeConfirmed"))}</p>`;
  }
  const tag = ordered ? "ol" : "ul";
  return `<${tag}>${values.join("")}</${tag}>`;
}

function detailSection(title, content) {
  return `<section><h2>${h(title)}</h2>${content}</section>`;
}

function renderExperience(element, catalog) {
  const slug = new URLSearchParams(window.location.search).get("slug");
  const tour = catalog.tours.find((item) => item.slug === slug);
  if (!tour) {
    setMetadata({ indexable: false });
    setStructuredData("tour", null);
    element.innerHTML = `<section class="content-section"><div class="container">${warning(catalog)}${emptyState(t("tour.notFoundTitle"), t("tour.notFoundBody"), t("tour.backToCatalog"), siteUrl("experiences/"), "h1")}</div></section>`;
    return;
  }
  const operator = catalog.operators.find((item) => item.id === tour.operatorId);
  const title = localize(tour.title);
  const description = localize(tour.shortDescription) || localize(tour.description) || t("tour.defaultDescription", { title });
  const prices = priceLabels(tour);
  const booking = tourWhatsAppUrl(tour, operator);
  const bookingLabel = tour.customInquiry === true ? t("tour.customBook") : t("tour.book");
  const images = Array.isArray(tour.images) ? tour.images : [];
  const facts = [
    [t("tour.location"), valueOrPending(tour.location)],
    [t("tour.duration"), valueOrPending(tour.duration)],
    [t("tour.departure"), valueOrPending(tour.departureLocation)],
    [t("tour.languages"), localizeLanguages(tour.languages) || t("common.toBeConfirmed")],
    [t("tour.capacity"), capacityLabel(tour)],
    [t("tour.price"), prices.join("\n") || t("common.toBeConfirmed")],
  ];
  const faqs = Array.isArray(tour.faq) ? tour.faq.filter((item) => localize(item?.question) && localize(item?.answer)) : [];
  const faqMarkup = faqs.length
    ? `<div class="faq-list">${faqs.map((item) => `<details><summary><span>${h(localize(item.question))}</span><span class="faq-icon" aria-hidden="true">+</span></summary><p>${h(localize(item.answer))}</p></details>`).join("")}</div>`
    : `<p>${h(t("common.toBeConfirmed"))}</p>`;

  setMetadata({ title: `${title} | Tigre Delta Experiences`, description, canonical: experienceUrl(tour), indexable: true });
  setStructuredData("tour", {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: title,
    description,
  });
  element.innerHTML = `
    <section class="page-hero"><div class="container">
      <nav class="breadcrumbs" aria-label="${h(t("common.breadcrumb"))}"><a href="${h(siteUrl())}">${h(t("nav.home"))}</a><span aria-hidden="true">/</span><a href="${h(siteUrl("experiences/"))}">${h(t("nav.experiences"))}</a><span aria-hidden="true">/</span><span aria-current="page">${h(title)}</span></nav>
      <p class="eyebrow"><span class="eyebrow-line"></span><span>${h(categoryName(catalog, tour.category))}</span></p>
      <h1 class="page-title">${h(title)}</h1><p class="page-lede">${h(description)}</p>
    </div></section>
    <section class="content-section"><div class="container detail-layout">
      <div class="detail-main prose">
        <div class="detail-gallery">${images.length ? images.map((image, index) => renderImage(image, t("tour.photoAlt", { title }), index === 0)).join("") : '<div class="image-placeholder" aria-hidden="true">Tigre Delta</div>'}</div>
        ${detailSection(t("tour.overview"), `<p>${h(valueOrPending(tour.description))}</p>`)}
        ${detailSection(t("tour.highlights"), renderList(tour.highlights))}
        ${detailSection(t("tour.itinerary"), renderList(tour.itinerary, true))}
        ${detailSection(t("tour.included"), renderList(tour.included))}
        ${detailSection(t("tour.excluded"), renderList(tour.excluded))}
        ${detailSection(t("tour.meeting"), `<p>${h(valueOrPending(tour.meetingPoint))}</p>`)}
        ${detailSection(t("tour.cancellation"), `<p>${h(valueOrPending(tour.cancellationPolicy))}</p>`)}
        ${detailSection(t("tour.faq"), faqMarkup)}
      </div>
      <aside class="booking-panel" aria-label="${h(t("tour.booking"))}">
        <h2>${h(t("tour.booking"))}</h2>
        <dl class="detail-facts">${facts.map(([label, value]) => `<div><dt>${h(label)}</dt><dd>${h(value)}</dd></div>`).join("")}</dl>
        ${booking ? `<a class="button button-dark" href="${h(booking)}" target="_blank" rel="noopener noreferrer"><span>${h(bookingLabel)}</span><span aria-hidden="true">↗</span></a><p class="form-note">${h(t("tour.bookingNote"))}</p>` : `<p class="form-note">${h(t("tour.contactPending"))}</p>`}
      </aside>
    </div></section>`;
  updateBreadcrumbStructuredData();
}
