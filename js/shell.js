import { siteUrl } from "./site.js";

export function renderShell() {
  const page = document.body.dataset.page;
  const current = (name) => page === name || (name === "experiences" && page === "experience") ? ' aria-current="page"' : "";
  const header = document.querySelector("#site-header");
  const footer = document.querySelector("#site-footer");

  header.innerHTML = `
    <header class="site-header">
      <div class="container header-inner">
        <a class="brand" href="${siteUrl()}" aria-label="Tigre Delta Experiences, home" data-i18n-aria-label="nav.homeLabel">
          <picture><source type="image/webp" srcset="${siteUrl("assets/images/brand-color.webp")}"><img class="brand-image" src="${siteUrl("logo_color.png")}" width="640" height="233" alt=""></picture>
          <span class="brand-name">Tigre Delta<span>Experiences</span></span>
        </a>
        <nav class="primary-nav" id="primary-navigation" aria-label="Main navigation" data-i18n-aria-label="nav.mainLabel">
          <a href="${siteUrl()}"${current("home")} data-i18n="nav.home">Home</a>
          <a href="${siteUrl("experiences/")}"${current("experiences")} data-i18n="nav.experiences">Experiences</a>
          <a href="${siteUrl("about-delta/")}"${current("about-delta")} data-i18n="nav.delta">The Delta</a>
          <a href="${siteUrl("about-us/")}"${current("about-us")} data-i18n="nav.about">About us</a>
          <a class="nav-contact" href="${siteUrl("contact/")}"${current("contact")} data-i18n="nav.contact">Get in touch ↗</a>
        </nav>
        <div class="header-actions">
          <label class="sr-only" for="site-language" data-i18n="nav.language">Language</label>
          <select class="language-select" id="site-language">
            <option value="en">English</option><option value="es">Español</option><option value="pt">Português</option>
          </select>
          <a class="header-cta" href="${siteUrl("contact/")}" data-i18n="nav.contact">Get in touch ↗</a>
          <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="primary-navigation" aria-label="Open menu" data-i18n-aria-label="nav.openMenu"><span aria-hidden="true"></span></button>
        </div>
      </div>
    </header>`;

  footer.innerHTML = `
    <footer class="site-footer">
      <div class="container footer-grid">
        <div class="footer-brand">
          <picture><source type="image/webp" srcset="${siteUrl("./logo_bw.png")}"><img class="footer-logo" src="${siteUrl("logo_bw.png")}" width="600" height="300" alt=""></picture>
          <h2>Tigre Delta Experiences</h2>
          <p data-i18n="footer.tagline">Explore the Delta. Experience the local life.</p>
        </div>
        <div>
          <p class="footer-heading" data-i18n="footer.explore">Explore</p>
          <div class="footer-links">
            <a href="${siteUrl("experiences/")}" data-i18n="nav.experiences">Experiences</a>
            <a href="${siteUrl("about-delta/")}" data-i18n="nav.delta">The Delta</a>
            <a href="${siteUrl("tigre-delta-boat-tours/")}" data-i18n="footer.boatTours">Tigre Delta boat tours</a>
          </div>
        </div>
        <div>
          <p class="footer-heading" data-i18n="footer.company">More</p>
          <div class="footer-links">
            <a href="${siteUrl("about-us/")}" data-i18n="nav.about">About us</a>
            <a href="${siteUrl("contact/")}" data-i18n="footer.contact">Contact &amp; booking</a>
          </div>
        </div>
      </div>
      <div class="container footer-bottom">
        <span>© ${new Date().getFullYear()} Tigre Delta Experiences</span>
        <span data-i18n="footer.location">Tigre Delta · Buenos Aires Province · Argentina</span>
      </div>
    </footer>`;

  const toggle = header.querySelector(".menu-toggle");
  const navigation = header.querySelector("#primary-navigation");
  const setOpen = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    navigation.dataset.open = String(open);
    toggle.dataset.menuOpen = String(open);
    document.dispatchEvent(new CustomEvent("menuchange"));
  };
  toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
  navigation.addEventListener("click", (event) => {
    if (event.target.closest("a")) setOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
      setOpen(false);
      toggle.focus();
    }
  });
}
