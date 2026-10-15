import type { ReactNode } from 'react';
import { TEXTOS } from '../servicios/contenido-sitio';
import {
  mapsUrl,
  type RedSocial,
  STUDIO_CONTACT,
  type StudioContact,
  whatsappUrl,
} from '../servicios/datos-estudio';
import { IconoEmail, IconoReloj, IconoTelefono, IconoUbicacion } from './IconosContacto';
import { IconoRed } from './IconosRedes';

interface ContactoSitioProps {
  /** Mensaje de WhatsApp de la página (spec 007, RF-27). */
  mensaje: string;
  /** Los tests pasan otros datos; el sitio usa siempre los del estudio. */
  contact?: StudioContact;
}

/** Enlace sobre el degradado del logo: blanco, con foco blanco. */
const LINK =
  'inline-flex min-h-11 items-center break-all underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-estudio-blanco';

/** Los enlaces que llevan fuera del sitio se abren aparte, sin control sobre esta página (RF-25). */
const EXTERNAL = { target: '_blank', rel: 'noopener noreferrer' } as const;

interface RenglonProps {
  icono: ReactNode;
  etiqueta: string;
  children: ReactNode;
}

/** Un dato: el ícono en su recuadro, la etiqueta en mayúsculas y el dato debajo. */
function Renglon({ icono, etiqueta, children }: RenglonProps) {
  return (
    <li className="flex gap-4">
      <span
        aria-hidden="true"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded border border-estudio-blanco/40 text-estudio-blanco"
      >
        {icono}
      </span>
      <div className="min-w-0">
        <p
          data-etiqueta
          className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300"
        >
          {etiqueta}
        </p>
        <div className="text-estudio-blanco">{children}</div>
      </div>
    </li>
  );
}

/** Las redes agrupadas por nombre, en el orden en que llegan: un renglón por red. */
function groupByNetwork(redes: readonly RedSocial[]): [string, RedSocial[]][] {
  const groups = new Map<string, RedSocial[]>();
  for (const red of redes) groups.set(red.red, [...(groups.get(red.red) ?? []), red]);
  return [...groups];
}

/**
 * Bloque de contacto al final de todas las páginas públicas, con el formato que eligió el
 * estudio (spec 007, RF-23 a RF-25): título, una línea corta, el texto y un renglón por dato. Cada
 * dato se muestra solo si el estudio lo informó, sin títulos vacíos ni datos de ejemplo (RF-24).
 * Es también la sección Contacto del inicio y el destino de "Contacto" en el menú (RF-5, RF-11).
 */
export function ContactoSitio({ mensaje, contact = STUDIO_CONTACT }: ContactoSitioProps) {
  return (
    <section
      id="contacto"
      aria-labelledby="contacto-titulo"
      className="bg-gradient-to-br from-estudio-oscuro to-estudio-azul px-4 pt-16 pb-28 text-estudio-blanco"
    >
      <div className="mx-auto max-w-3xl">
        <h2
          id="contacto-titulo"
          tabIndex={-1}
          className="font-titulos text-4xl font-semibold outline-none sm:text-5xl"
        >
          {TEXTOS.contacto.titulo}
        </h2>
        <span aria-hidden="true" className="mt-4 block h-px w-14 bg-estudio-blanco/70" />
        <p className="mt-5 max-w-xl text-slate-200">{TEXTOS.contacto.texto}</p>

        <ul className="mt-10 space-y-6">
          {contact.direccion && (
            <Renglon icono={<IconoUbicacion />} etiqueta={TEXTOS.contacto.ubicacion}>
              <p className="break-words">{contact.direccion}</p>
              <a href={mapsUrl(contact.direccion)} className={`${LINK} underline`} {...EXTERNAL}>
                {TEXTOS.contacto.comoLlegar}
              </a>
            </Renglon>
          )}
          <Renglon icono={<IconoTelefono />} etiqueta={TEXTOS.contacto.telefono}>
            <a href={whatsappUrl(mensaje, contact)} className={LINK} {...EXTERNAL}>
              {contact.whatsappVisible}
            </a>
          </Renglon>
          {contact.horarios.length > 0 && (
            <Renglon icono={<IconoReloj />} etiqueta={TEXTOS.contacto.disponibilidad}>
              {contact.horarios.map((horario) => (
                <p key={horario} className="break-words">
                  {horario}
                </p>
              ))}
            </Renglon>
          )}
          {contact.email && (
            <Renglon icono={<IconoEmail />} etiqueta={TEXTOS.contacto.email}>
              <a href={`mailto:${contact.email}`} className={LINK} {...EXTERNAL}>
                {contact.email}
              </a>
            </Renglon>
          )}
          {groupByNetwork(contact.redes).map(([red, cuentas]) => (
            <Renglon key={red} icono={<IconoRed red={red} />} etiqueta={red}>
              {cuentas.map((cuenta) => (
                <a key={cuenta.url} href={cuenta.url} className={`${LINK} mr-4`} {...EXTERNAL}>
                  {cuenta.usuario}
                </a>
              ))}
            </Renglon>
          ))}
        </ul>
      </div>
    </section>
  );
}
