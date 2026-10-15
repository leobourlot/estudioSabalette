import { TEXTOS } from '../servicios/contenido-sitio';
import {
  mapsUrl,
  STUDIO_CONTACT,
  type StudioContact,
  whatsappUrl,
} from '../servicios/datos-estudio';
import { IconoRed } from './IconosRedes';
import { NombreEstudio } from './NombreEstudio';

interface ContactoSitioProps {
  /** Mensaje de WhatsApp de la página (spec 007, RF-27). */
  mensaje: string;
  /** Los tests pasan otros datos; el sitio usa siempre los del estudio. */
  contact?: StudioContact;
}

/** Enlace sobre el degradado del logo: blanco, subrayado y con foco blanco. */
const LINK =
  'inline-flex min-h-11 items-center gap-2 break-all font-medium underline underline-offset-4 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-estudio-blanco';

/** Los enlaces que llevan fuera del sitio se abren aparte, sin control sobre esta página (RF-25). */
const EXTERNAL = { target: '_blank', rel: 'noopener noreferrer' } as const;

/**
 * Bloque de contacto al final de todas las páginas públicas (spec 007, RF-23 a RF-25). Cada dato
 * se muestra solo si el estudio lo informó, sin títulos vacíos ni datos de ejemplo (RF-24). Es
 * también la sección Contacto del inicio y el destino de "Contacto" en el menú (RF-5, RF-11).
 */
export function ContactoSitio({ mensaje, contact = STUDIO_CONTACT }: ContactoSitioProps) {
  return (
    <footer
      id="contacto"
      aria-labelledby="contacto-titulo"
      className="bg-gradient-to-r from-estudio-oscuro to-estudio-azul px-4 pt-10 pb-28 text-estudio-blanco"
    >
      <div className="mx-auto max-w-5xl space-y-6">
        <h2 id="contacto-titulo" tabIndex={-1} className="text-2xl font-semibold outline-none">
          {TEXTOS.contacto.contacto}
        </h2>
        <p className="text-lg font-semibold">
          <NombreEstudio contact={contact} />
        </p>
        <dl className="grid gap-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm uppercase tracking-wide text-slate-200">
              {TEXTOS.contacto.whatsapp}
            </dt>
            <dd>
              <a href={whatsappUrl(mensaje, contact)} className={LINK} {...EXTERNAL}>
                {contact.whatsappVisible}
              </a>
            </dd>
          </div>
          {contact.direccion && (
            <div>
              <dt className="text-sm uppercase tracking-wide text-slate-200">
                {TEXTOS.contacto.direccion}
              </dt>
              <dd>
                <span className="block break-words">{contact.direccion}</span>
                <a href={mapsUrl(contact.direccion)} className={LINK} {...EXTERNAL}>
                  {TEXTOS.contacto.comoLlegar}
                </a>
              </dd>
            </div>
          )}
          {contact.horarios.length > 0 && (
            <div>
              <dt className="text-sm uppercase tracking-wide text-slate-200">
                {TEXTOS.contacto.horarios}
              </dt>
              <dd>
                {contact.horarios.map((horario) => (
                  <span key={horario} className="block break-words">
                    {horario}
                  </span>
                ))}
              </dd>
            </div>
          )}
          {contact.email && (
            <div>
              <dt className="text-sm uppercase tracking-wide text-slate-200">
                {TEXTOS.contacto.email}
              </dt>
              <dd>
                <a href={`mailto:${contact.email}`} className={LINK} {...EXTERNAL}>
                  {contact.email}
                </a>
              </dd>
            </div>
          )}
          {contact.redes.length > 0 && (
            <div>
              <dt className="text-sm uppercase tracking-wide text-slate-200">
                {TEXTOS.contacto.redes}
              </dt>
              <dd>
                <ul className="flex flex-wrap gap-x-6">
                  {contact.redes.map((red) => (
                    <li key={red.url}>
                      <a href={red.url} className={LINK} {...EXTERNAL}>
                        <IconoRed red={red.red} />
                        {red.red}
                      </a>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          )}
        </dl>
      </div>
    </footer>
  );
}
