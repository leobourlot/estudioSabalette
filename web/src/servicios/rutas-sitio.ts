import {
  ABOGADAS,
  APERTURA,
  hasOwnPage,
  lawyerPath,
  MENSAJES_WHATSAPP,
  PESTANAS_LABORAL,
  SERVICIOS,
  type ClaveServicio,
} from './contenido-sitio';
import { STUDIO_CONTACT } from './datos-estudio';
import { pageTitle } from './presentacion-sitio';

/**
 * Direcciones del sitio público (spec 007, RF-8 a RF-10 y RF-34): qué páginas hay, su título y su
 * descripción (T-16), su mensaje de WhatsApp (T-15), y cómo se normaliza una dirección. No
 * importa React (principio 3).
 */

export interface PaginaPublica {
  /** Dirección principal, en minúsculas, sin tildes y sin barra final (RF-8). */
  ruta: string;
  /** Archivo que genera el prerenderizado (plan 007, "Cómo se publica el sitio"). */
  archivo: string;
  titulo: string;
  /** null en la página inexistente, que no tiene descripción. */
  descripcion: string | null;
  /** Mensaje de WhatsApp de la página (RF-27). */
  mensaje: string;
  /** Si los buscadores la pueden listar (RF-37, RF-38). */
  indexable: boolean;
}

const fileFor = (ruta: string) => (ruta === '/' ? 'index.html' : `${ruta.slice(1)}.html`);

const page = (
  ruta: string,
  titulo: string,
  descripcion: string,
  mensaje: string,
): PaginaPublica => ({
  ruta,
  archivo: fileFor(ruta),
  titulo,
  descripcion,
  mensaje,
  indexable: true,
});

const serviceByKey = (clave: ClaveServicio) => SERVICIOS.find((s) => s.clave === clave)!;

const servicePage = (clave: 'accidentes' | 'danos' | 'sucesiones') => {
  const servicio = serviceByKey(clave);
  return page(servicio.ruta, pageTitle(servicio.titulo), servicio.frase, MENSAJES_WHATSAPP[clave]);
};

/** Las páginas públicas que existen, con su título y descripción de T-16. */
export const PUBLIC_PAGES: readonly PaginaPublica[] = [
  page('/', STUDIO_CONTACT.nombre, APERTURA, MENSAJES_WHATSAPP.general),
  page(
    PESTANAS_LABORAL[0].ruta,
    pageTitle('Derecho Laboral para empresas'),
    'Asesoramos a empresas y empleadores en la gestión cotidiana de las relaciones laborales.',
    MENSAJES_WHATSAPP.empresas,
  ),
  page(
    PESTANAS_LABORAL[1].ruta,
    pageTitle('Derecho Laboral para trabajadores'),
    'Asesoramos y representamos a trabajadores frente a conflictos individuales derivados de la relación laboral.',
    MENSAJES_WHATSAPP.trabajadores,
  ),
  servicePage('accidentes'),
  servicePage('danos'),
  servicePage('sucesiones'),
  ...ABOGADAS.filter(hasOwnPage).map((abogada) =>
    page(
      lawyerPath(abogada),
      pageTitle(abogada.nombre),
      abogada.resumen!,
      MENSAJES_WHATSAPP.general,
    ),
  ),
];

/** La página de dirección inexistente (RF-9, RF-38). */
export const NOT_FOUND_PAGE: PaginaPublica = {
  ruta: '/404',
  archivo: '404.html',
  titulo: pageTitle('Página no encontrada'),
  descripcion: null,
  mensaje: MENSAJES_WHATSAPP.general,
  indexable: false,
};

/** Títulos de las pantallas fuera del sitio público (T-16, RF-34). */
export const APP_TITLES = {
  ingreso: pageTitle('Ingresar'),
  cambioContrasena: pageTitle('Cambiar contraseña'),
  portal: pageTitle('Portal de clientes'),
  panel: pageTitle('Panel'),
} as const;

/** La página pública de una dirección principal, o undefined si no existe. */
export function publicPageFor(ruta: string): PaginaPublica | undefined {
  return PUBLIC_PAGES.find((pagina) => pagina.ruta === ruta);
}

/** Direcciones que llevan a otra (RF-8). En producción las resuelve también el .htaccess. */
export const REDIRECTS: Readonly<Record<string, string>> = {
  '/servicios': '/#servicios',
  '/abogadas': '/#abogadas',
  '/servicios/derecho-laboral': PESTANAS_LABORAL[0].ruta,
};

/** Si la dirección es de la aplicación: el ingreso, el cambio de contraseña, el panel o el portal. */
export function isAppPath(ruta: string): boolean {
  return (
    ruta === '/ingresar' || ruta === '/cambiar-contrasena' || /^\/(panel|portal)(\/|$)/.test(ruta)
  );
}

/**
 * La dirección principal de una dirección pedida: en minúsculas, sin barra final y siguiendo las
 * redirecciones (RF-8). null si no es del sitio ni de la aplicación: no existe.
 */
export function normalizePublicPath(ruta: string): string | null {
  const normal = ruta.toLowerCase().replace(/\/+$/, '') || '/';
  if (normal in REDIRECTS) return REDIRECTS[normal];
  if (publicPageFor(normal) || isAppPath(normal)) return normal;
  return null;
}

export type Entrada =
  { tipo: 'redirigir'; destino: string } | { tipo: 'aplicacion' } | { tipo: 'sitio' };

/**
 * Qué hace el navegador al abrir una dirección (plan 007, "Entrada"): llevarla a su dirección
 * principal, cargar la aplicación (ingreso, panel y portal) o mostrar el sitio público, que
 * incluye la página de dirección inexistente. Solo usa la ruta y el "#": nunca lo que viene
 * después del "?" (RF-42).
 */
export function decideEntry(pathname: string, hash = ''): Entrada {
  const normal = normalizePublicPath(pathname);
  if (normal !== null && normal !== pathname) {
    return { tipo: 'redirigir', destino: normal.includes('#') ? normal : normal + hash };
  }
  return isAppPath(pathname) ? { tipo: 'aplicacion' } : { tipo: 'sitio' };
}
