import { renderShell } from "./shell.js";
import { initializeTranslations, t } from "./translations.js";
import { loadCatalog } from "./data.js";
import { initializeTourViews } from "./tours.js";
import { renderContactForm } from "./whatsapp.js";

renderShell();

function showError(message, translationKey = "") {
  const notice = document.createElement("p");
  notice.className = "site-notice";
  notice.setAttribute("role", "alert");
  document.querySelector("#site-header").after(notice);
  const render = () => {
    const text = translationKey ? t(translationKey) : message;
    notice.textContent = text;
    for (const element of document.querySelectorAll("#featured-tours, #catalog-results, #guide-tours, #experience-detail")) {
      element.textContent = text;
    }
    const contactStatus = document.querySelector("#contact-status");
    if (contactStatus) contactStatus.textContent = text;
  };
  if (translationKey) document.addEventListener("languagechange", render);
  render();
}

async function start() {
  try {
    await initializeTranslations();
  } catch (error) {
    console.error("Could not initialize translations.", error);
    document.querySelector("#site-language").disabled = true;
    showError("The site content could not be loaded. Please reload the page or try again later.");
    return;
  }
  const needsCatalog = document.querySelector("#featured-tours, #catalog-results, #guide-tours, #experience-detail, #contact-form");
  if (!needsCatalog) return;
  try {
    const catalog = await loadCatalog();
    initializeTourViews(catalog);
    renderContactForm(catalog);
  } catch (error) {
    console.error("Could not load experience data.", error);
    showError("", "common.loadError");
  }
}

start();
