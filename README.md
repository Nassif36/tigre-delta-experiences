# Tigre Delta Experiences

Sitio estático en HTML, CSS y JavaScript, sin frameworks ni servidor de aplicaciones. Usa versiones optimizadas de las fotos y los dos logos proporcionados; los archivos originales se conservan en la carpeta.

## Arquitectura y diseño

Las páginas HTML aportan contenido semántico; `css/styles.css` reúne el sistema visual adaptable y sus variables; `js/` contiene módulos reutilizables para navegación, traducciones, catálogo, perfiles y consultas. Los contenidos editables están en `data/`.

La identidad combina azul río, verdes naturales, arena y superficies blancas, con tipografía editorial y fotografías propias. El recorrido de la portada es: navegación, imagen principal y llamada a explorar, introducción al Delta, tarjetas editoriales, experiencias destacadas, presentación del proyecto, preguntas frecuentes y cierre.

## Vista local

Desde esta carpeta, ejecuta:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Abre `http://127.0.0.1:4173/`. Es necesario usar un servidor HTTP para cargar los módulos y archivos JSON; abrir `index.html` directamente como archivo no es suficiente.

## Contenido y publicaciones

- `data/operators.json`: datos internos para las reservas. Completa el nombre y contacto del responsable; cada registro necesita un `id` único.
- `data/tours.json`: experiencias. Cada una debe tener un `id` y `slug` únicos, una categoría válida y un `operatorId` que coincida con un registro de contacto. Completa los datos confirmados y sus traducciones; deja los datos desconocidos vacíos o en `null`.
- `data/categories.json`: categorías utilizadas para organizar las experiencias.
- `data/translations.json`: textos de la interfaz y metadatos en inglés, español y portugués.
- `about-us/index.html` y `data/translations.json`: información del negocio en la página About Us.

Las tres experiencias incluidas fueron proporcionadas por el propietario; los datos que faltan figuran como pendientes. Cambia `published` a `true` únicamente cuando una experiencia esté confirmada. Una experiencia puede mostrarse mientras los datos de contacto sigan sin publicar: en ese caso se indica que WhatsApp aún no está disponible y no se muestra un enlace de reserva. No se mostrará si sus datos básicos son inválidos o si el responsable de reserva no existe. Solo aparecen precios numéricos con una moneda ISO de tres letras confirmada. No se generan reseñas ni disponibilidad ficticias.

Para tarifas por persona, usa `price`, `currency` y `priceUnit: "person"`. Una tarifa grupal puede indicarse como `groupPrice: { "minGuests": 5, "price": 75 }`, en la misma moneda y por persona. Para un precio a acordar sin importe numérico, usa `price: null` y `priceNote` traducido.

Si una experiencia tiene `capacity`, el formulario de consulta limita la cantidad de personas a ese máximo.

Para habilitar las consultas, completa `name` y `contact.whatsapp` en el registro de contacto y cambia su `published` a `true`; no se mostrará un perfil público. Introduce el número internacional real, con código de país, como texto; puede llevar `+`, espacios o guiones. Sin un número válido, no se muestra un botón de reserva. Las consultas abren WhatsApp con el nombre de la experiencia; no realizan pagos ni reservas automáticas.

En una experiencia personalizada, `customInquiry: true` adapta el botón y el mensaje de WhatsApp para que el visitante pueda contar qué desea hacer.

En `languages`, usa `en`, `es` y `pt` (también se aceptan `English`, `Spanish` y `Portuguese`). Para otros idiomas o textos como duración y descripción, proporciona un objeto con sus valores `en`, `es` y `pt`.

Las imágenes de una experiencia pueden ser rutas locales como `assets/images/foto.webp` o registros con `src`, `alt` traducido, `width`, `height` y una lista opcional `srcset` de objetos `{ \"src\": \"...\", \"width\": 480 }`. Se admiten imágenes HTTPS externas.

Las fichas utilizan `experience/?slug=...`: esta forma permite añadir contenido desde JSON en un alojamiento estático sin reglas de servidor ni páginas HTML por idioma.

## SEO antes de publicar

El dominio público todavía no fue proporcionado. El `sitemap.xml`, `robots.txt`, las URL canónicas y las etiquetas Open Graph iniciales están configurados para la vista local. **Antes de publicar**, ejecuta con el dominio real y vuelve a hacerlo cuando cambie el catálogo:

```powershell
node scripts\configure-seo.mjs https://tu-dominio-real
```

El comando actualiza las URL canónicas y Open Graph, genera un sitemap con las páginas y fichas publicadas, y configura `robots.txt`. No admite dominios de ejemplo; usa HTTPS para el sitio público. Si el sitio se aloja en una subcarpeta, el `robots.txt` debe estar disponible también en la raíz del dominio.

Las páginas específicas de kayak, experiencias isleñas y paseos privados no se publicaron porque esas actividades no están confirmadas. Pueden añadirse cuando exista una oferta real.

## Comprobaciones

Con Node.js instalado, ejecuta:

```powershell
node --test
```
