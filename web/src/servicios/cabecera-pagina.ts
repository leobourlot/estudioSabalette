import { STUDIO_CONTACT, type StudioContact } from './datos-estudio';
import { FULL_LOGO_PATH, SHARE_IMAGE_PATH } from './marca';

/**
 * Cabecera de cada página que genera el prerenderizado (spec 007, RF-34 y RF-36 a RF-38): título,
 * descripción, dirección principal, vista previa al compartir, indicación para los buscadores y,
 * en el inicio, los datos del estudio como estudio jurídico. Todo valor va escapado. No importa
 * React (principio 3).
 */

/** Lo que la cabecera necesita de una página (rutas-sitio.ts, PaginaPublica). */
export interface PaginaConCabecera {
  ruta: string;
  titulo: string;
  descripcion: string | null;
  indexable: boolean;
}

/** Escapa un texto para usarlo dentro de HTML o de un atributo entre comillas. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const meta = (attribute: 'name' | 'property', key: string, content: string) =>
  `<meta ${attribute}="${key}" content="${escapeHtml(content)}">`;

/**
 * Datos del estudio para los buscadores, como LegalService de schema.org (RF-37). Solo lleva los
 * datos informados: dirección, horarios, email y redes se suman cuando el estudio los entregue.
 */
export function legalServiceData(
  urlSitio: string,
  contact: StudioContact = STUDIO_CONTACT,
): Record<string, unknown> {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LegalService',
    name: contact.nombre,
    url: `${urlSitio}/`,
    telephone: contact.whatsapps.map((whatsapp) => `+${whatsapp.numero}`),
    logo: urlSitio + FULL_LOGO_PATH,
    image: urlSitio + FULL_LOGO_PATH,
  };
  if (contact.direccion) {
    data.address = { '@type': 'PostalAddress', streetAddress: contact.direccion };
  }
  if (contact.horarios.length > 0) data.openingHours = [...contact.horarios];
  if (contact.emails.length > 0) data.email = contact.emails.map(({ email }) => email);
  if (contact.redes.length > 0) data.sameAs = contact.redes.map((red) => red.url);
  return data;
}

/**
 * Un JSON dentro de <script>: "<" pasa a su escape de JSON, así ningún texto puede cerrar la
 * etiqueta. El escape se arma por partes para que ninguna herramienta lo convierta en "<".
 */
export function jsonForScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\' + 'u003c');
}

/** La cabecera de una página, como HTML para reemplazar la marca <!--cabecera--> de index.html. */
export function buildHead(
  pagina: PaginaConCabecera,
  urlSitio: string,
  contact: StudioContact = STUDIO_CONTACT,
): string {
  const url = urlSitio + pagina.ruta;
  const tags = [`<title>${escapeHtml(pagina.titulo)}</title>`];
  if (pagina.descripcion) tags.push(meta('name', 'description', pagina.descripcion));

  if (pagina.indexable) {
    tags.push(
      `<link rel="canonical" href="${escapeHtml(url)}">`,
      meta('property', 'og:type', 'website'),
      meta('property', 'og:site_name', contact.nombre),
      meta('property', 'og:locale', 'es_AR'),
      meta('property', 'og:title', pagina.titulo),
      ...(pagina.descripcion ? [meta('property', 'og:description', pagina.descripcion)] : []),
      meta('property', 'og:url', url),
      meta('property', 'og:image', urlSitio + SHARE_IMAGE_PATH),
      meta('property', 'og:image:alt', contact.nombre),
      meta('name', 'twitter:card', 'summary_large_image'),
    );
  } else {
    tags.push(meta('name', 'robots', 'noindex'));
  }

  if (pagina.ruta === '/') {
    tags.push(
      `<script type="application/ld+json">${jsonForScript(legalServiceData(urlSitio, contact))}</script>`,
    );
  }
  return tags.join('\n    ');
}
