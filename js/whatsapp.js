import { escapeHtml } from "./site.js";
import { localize, t } from "./translations.js";

export function normalizeWhatsAppNumber(value) {
  if (typeof value !== "string" || !/^\+?[\d\s().-]+$/.test(value)) return null;
  const digits = value.replace(/[+\s().-]/g, "");
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}

export function buildWhatsAppUrl(number, message) {
  const digits = normalizeWhatsAppNumber(number);
  if (!digits || typeof message !== "string" || !message.trim()) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function tourInquiry(tour, details = {}) {
  const title = localize(tour?.title);
  const message = !tour ? t("whatsapp.generalMessage") : tour.customInquiry === true
    ? t("whatsapp.customMessage", { title })
    : t("whatsapp.tourMessage", { title });
  const lines = [message];
  if (details.date) lines.push(t("whatsapp.date", { value: details.date }));
  if (details.guests) lines.push(t("whatsapp.guests", { value: details.guests }));
  if (details.message) lines.push(t("whatsapp.note", { value: details.message }));
  return lines.join("\n");
}

export function tourWhatsAppUrl(tour, operator, details) {
  const number = operator?.contact?.whatsapp;
  return normalizeWhatsAppNumber(number) ? buildWhatsAppUrl(number, tourInquiry(tour, details)) : null;
}

export function renderContactForm(catalog) {
  const form = document.querySelector("#contact-form");
  if (!form) return;
  const fields = document.querySelector("#contact-fields");
  const status = document.querySelector("#contact-status");
  const select = document.querySelector("#contact-tour");
  const guests = document.querySelector("#contact-guests");
  const guestsHint = document.querySelector("#contact-guests-hint");
  const contact = catalog.operators.find((item) => item.id === "operator-01");
  const available = catalog.tours.filter((tour) => {
    const operator = catalog.operators.find((item) => item.id === tour.operatorId);
    return operator && normalizeWhatsAppNumber(operator.contact?.whatsapp);
  });
  const requested = new URLSearchParams(window.location.search).get("tour");
  let firstRender = true;

  function updateCapacity() {
    const tour = available.find((item) => item.slug === select.value);
    const capacity = Number.isInteger(tour?.capacity) && tour.capacity > 0 ? tour.capacity : null;
    guests.max = String(capacity || 100);
    guestsHint.hidden = capacity === null;
    guestsHint.textContent = capacity === null ? "" : t("contact.form.capacityHint", { count: capacity });
  }

  function render() {
    const previous = firstRender ? requested : select.value;
    firstRender = false;
    select.innerHTML = `<option value="">${escapeHtml(t("contact.form.noExperience"))}</option>` +
      available.map((tour) => `<option value="${escapeHtml(tour.slug)}">${escapeHtml(localize(tour.title))}</option>`).join("");
    if (available.some((tour) => tour.slug === previous)) select.value = previous;
    fields.disabled = !normalizeWhatsAppNumber(contact?.contact?.whatsapp);
    updateCapacity();
    status.textContent = fields.disabled ? t("contact.form.empty") : t("contact.form.ready");
    if (catalog.issues.length) status.textContent += ` ${t("common.configWarning")}`;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    const tour = available.find((item) => item.slug === select.value);
    const operator = tour ? catalog.operators.find((item) => item.id === tour.operatorId) : contact;
    if ((select.value && !tour) || !operator) {
      status.textContent = t("contact.form.invalid");
      status.setAttribute("role", "alert");
      return;
    }
    const url = tourWhatsAppUrl(tour, operator, {
      date: document.querySelector("#contact-date").value,
      guests: guests.value,
      message: document.querySelector("#contact-message").value.trim(),
    });
    if (!url) {
      status.textContent = t("contact.form.invalid");
      status.setAttribute("role", "alert");
      return;
    }
    status.setAttribute("role", "status");
    status.textContent = t("contact.form.opening");
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.click();
  });

  select.addEventListener("change", updateCapacity);
  document.addEventListener("languagechange", render);
  render();
}
