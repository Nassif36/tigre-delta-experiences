import { escapeHtml, siteRoot } from "./site.js";
import { localize } from "./translations.js";

function mediaUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value, siteRoot);
    if (url.protocol === "https:" || (url.protocol === "http:" && url.origin === siteRoot.origin)) return url.href;
    console.warn(`Unsupported image URL: ${value}`);
  } catch (error) {
    console.warn(`Invalid image URL: ${value}`, error);
  }
  return null;
}

export function renderImage(image, fallbackAlt, eager = false) {
  const record = typeof image === "string" ? { src: image } : image;
  const source = mediaUrl(record?.src);
  if (!source) return '<div class="image-placeholder" aria-hidden="true">Tigre Delta</div>';
  const alt = localize(record.alt) || fallbackAlt;
  const variants = Array.isArray(record.srcset) ? record.srcset.map((variant) => {
    const src = mediaUrl(variant?.src);
    return src && Number.isInteger(variant.width) && variant.width > 0 ? `${src} ${variant.width}w` : null;
  }).filter(Boolean) : [];
  const srcset = variants.length ? ` srcset="${escapeHtml(variants.join(", "))}" sizes="(max-width: 700px) 90vw, 45vw"` : "";
  const width = Number.isInteger(record.width) && record.width > 0 ? ` width="${record.width}"` : "";
  const height = Number.isInteger(record.height) && record.height > 0 ? ` height="${record.height}"` : "";
  return `<img src="${escapeHtml(source)}"${srcset}${width}${height} alt="${escapeHtml(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
}
