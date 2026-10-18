import { copyrightNotice, TEXTOS } from '../servicios/contenido-sitio';
import {
  mapsUrl,
  networksToShow,
  type RedSocial,
  STUDIO_CONTACT,
  type StudioContact,
  whatsappUrl,
} from '../servicios/datos-estudio';
import { LOGO_PATH } from '../servicios/marca';
import { IconoEmail, IconoUbicacionColor } from './IconosContacto';
import { IconoRedColor } from './IconosRedes';
import { NombreEstudio } from './NombreEstudio';

interface PieSitioProps {
  /** Mensaje de WhatsApp de la página (spec 007, RF-27). */
  mensaje: string;
  /** Los tests pasan otros datos; el sitio usa siempre los del estudio. */
  contact?: StudioContact;
  /** Año de la leyenda de derechos: el de la publicación del sitio. */
  anio?: number;
}

const BOURDER_WEB_LOGO = '/marca/bourder-web.svg';

/** Enlace sobre el azul oscuro: claro, con foco blanco y al menos 44 px de alto. */
const LINK =
  'inline-flex min-h-11 items-center gap-2 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-estudio-blanco';

/** Lugar del ícono del email y de la dirección: el ancho de los de las redes, para alinear el texto. */
const ICON_BOX = 'flex w-7 shrink-0 justify-center';

/** Los enlaces que llevan fuera del sitio se abren aparte, sin control sobre esta página (RF-25). */
const EXTERNAL = { target: '_blank', rel: 'noopener noreferrer' } as const;

/** Las redes con más de una cuenta: cada enlace suma la cuenta al nombre de la red (RF-44). */
function repeatedNetworks(redes: readonly RedSocial[]): Set<string> {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const { red } of redes) (seen.has(red) ? repeated : seen).add(red);
  return repeated;
}

const MENU = [
  { href: '/#servicios', label: TEXTOS.menu.servicios },
  { href: '/#abogadas', label: TEXTOS.menu.abogadas },
  { href: '#contacto', label: TEXTOS.menu.contacto },
] as const;

/**
 * Pie de todas las páginas públicas, después del bloque de contacto (spec 007, RF-44): el logo y
 * el nombre, los accesos del menú, el WhatsApp y el email, el WhatsApp y cada cuenta de las redes
 * con su ícono a color (el mismo del contacto) y el nombre de la red, la leyenda de derechos y "Diseñado por Bourder Web". Lo que
 * el estudio no informó no se muestra (RF-24), salvo las redes de muestra en desarrollo. Termina
 * con un margen mayor que el botón de WhatsApp, así al final de la página todo se puede ver y usar
 * (RF-28).
 */
export function PieSitio({
  mensaje,
  contact = STUDIO_CONTACT,
  anio = __ANIO_PUBLICACION__,
}: PieSitioProps) {
  const redes = networksToShow(contact);
  const repeated = repeatedNetworks(redes);

  return (
    <footer className="bg-estudio-oscuro px-4 pt-12 pb-10 text-sm text-slate-200">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <a href="/" className={`${LINK} gap-3 text-estudio-blanco`}>
            <img src={LOGO_PATH} alt="" width={48} height={48} className="h-36 w-36 rounded-xl" />
            <NombreEstudio
              centrado
              className="font-titulos text-xl font-semibold"
              contact={contact}
            />
          </a>

          <nav aria-label="Pie de página">
            <ul className="flex flex-col">
              {MENU.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className={LINK}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* <div className="flex flex-col">
            <a href={whatsappUrl(mensaje, contact)} className={LINK} {...EXTERNAL}>
              {contact.whatsappVisible}
            </a>
            {contact.email && (
              <a href={`mailto:${contact.email}`} className={`${LINK} break-all`} {...EXTERNAL}>
                {contact.email}
              </a>
            )}
          </div> */}

          <div className="flex flex-col">
            <ul aria-label="Redes" className="flex flex-col">
              <li>
                <a href={whatsappUrl(mensaje, contact)} className={LINK} {...EXTERNAL}>
                  <IconoRedColor red="WhatsApp" />
                  {contact.whatsappVisible}
                </a>
              </li>
              {redes.map((red) => (
                <li key={`${red.url} ${red.usuario}`}>
                  <a href={red.url} className={LINK} {...EXTERNAL}>
                    <IconoRedColor red={red.red} />
                    {repeated.has(red.red) ? `${red.red} ${red.usuario}` : red.red}
                  </a>
                </li>
              ))}
            </ul>

            {(contact.email || contact.direccion) && (
              <ul aria-label="Email y dirección" className="flex flex-col">
                {contact.email && (
                  <li>
                    <a
                      href={`mailto:${contact.email}`}
                      className={`${LINK} break-all`}
                      {...EXTERNAL}
                    >
                      <span className={ICON_BOX}>
                        <IconoEmail />
                      </span>
                      {contact.email}
                    </a>
                  </li>
                )}
                {contact.direccion && (
                  <li>
                    <a
                      href={mapsUrl(contact.direccion)}
                      className={`${LINK} break-words`}
                      {...EXTERNAL}
                    >
                      <span className={ICON_BOX}>
                        <IconoUbicacionColor />
                      </span>
                      {contact.direccion}
                    </a>
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-estudio-blanco/15 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p>{copyrightNotice(anio)}</p>
          <p className="flex flex-wrap items-center gap-x-2">
            {TEXTOS.pie.disenadoPor}{' '}
            <a href={TEXTOS.pie.bourderWebUrl} className={LINK} {...EXTERNAL}>
              <img src={BOURDER_WEB_LOGO} alt="" width={40} height={30} className="h-7 w-auto" />
              {TEXTOS.pie.bourderWeb}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
