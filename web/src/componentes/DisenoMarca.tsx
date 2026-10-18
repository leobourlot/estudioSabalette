import type { ReactNode } from 'react';
import { STUDIO_CONTACT, type StudioContact, whatsappUrl } from '../servicios/datos-estudio';
import { LOGO_PATH } from '../servicios/marca';
import { AparecerAlCargar } from './AparecerAlCargar';
import { CARD, FOCUS_RING_ON_DARK } from './estilos-aplicacion';
import { IconoRedColor } from './IconosRedes';
import { NombreEstudio } from './NombreEstudio';

const BRAND_BACKGROUND = 'bg-gradient-to-r from-estudio-oscuro to-estudio-azul text-estudio-blanco';

interface DisenoMarcaProps {
  /** Lo que va en el medio del panel de la marca, como el título del ingreso. */
  marca?: ReactNode;
  /** Si muestra la dirección y el WhatsApp del estudio (solo el ingreso). */
  conContacto?: boolean;
  /** Los tests pasan otros datos; la aplicación usa siempre los del estudio. */
  contact?: StudioContact;
  children: ReactNode;
}

/**
 * La dirección, como texto, y el WhatsApp, como enlace sin mensaje, separados por " · " (spec
 * 008, RF-11; spec 007, RF-27). La dirección solo si el estudio la informó (spec 007, RF-24).
 * Antes del número, el ícono de WhatsApp en verde, con el contorno blanco que lo distingue sobre
 * el degradado (spec 007, RF-23); no se anuncia, porque el número va escrito al lado.
 */
function ContactoIngreso({ contact }: { contact: StudioContact }) {
  return (
    <p className="break-words text-sm text-slate-200">
      {contact.direccion && (
        <>
          {contact.direccion}
          {' · '}
        </>
      )}
      <a
        href={whatsappUrl(undefined, contact)}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1.5 rounded align-middle underline underline-offset-4 hover:text-estudio-blanco ${FOCUS_RING_ON_DARK}`}
      >
        <IconoRedColor red="WhatsApp" />
        {contact.whatsappVisible}
      </a>
    </p>
  );
}

/**
 * Diseño de dos mitades del ingreso y del cambio de contraseña (spec 008, RF-11, RF-12 y RF-14).
 * A la izquierda, el panel de la marca sobre el degradado del estudio: el logo y el nombre, que
 * llevan al sitio público con un enlace común, porque es otro documento (spec 007, RF-33), lo que
 * pase cada pantalla y, abajo, el contacto; se ve desde el primer momento, sin animación. A la
 * derecha, la tarjeta, que aparece con un movimiento suave. Debajo de 1024 px va todo en una
 * columna: la marca arriba, la tarjeta y el contacto al final. El contacto es un solo elemento,
 * que la grilla ubica en cada ancho, y deja abajo lugar para el botón de WhatsApp (spec 007,
 * RF-28).
 */
export function DisenoMarca({
  marca,
  conContacto = false,
  contact = STUDIO_CONTACT,
  children,
}: DisenoMarcaProps) {
  return (
    <div className="grid min-h-screen grid-rows-[auto_1fr_auto] bg-slate-100 lg:grid-cols-2 lg:grid-rows-[1fr_auto]">
      <div
        className={`flex flex-col gap-5 px-6 py-6 lg:col-start-1 lg:row-start-1 lg:px-12 lg:pt-10 ${BRAND_BACKGROUND}`}
      >
        <a href="/" className={`flex items-center gap-3 self-start rounded ${FOCUS_RING_ON_DARK}`}>
          <img
            src={LOGO_PATH}
            alt=""
            width={96}
            height={96}
            className="h-24 w-24 rounded-lg ring-1 ring-estudio-blanco/20 lg:h-36 lg:w-36"
          />
          <NombreEstudio centrado className="font-titulos text-xl font-semibold lg:text-2xl" />
        </a>
        {marca && <div className="lg:flex lg:flex-1 lg:items-center">{marca}</div>}
      </div>

      <main className="flex flex-col items-center justify-center px-4 py-8 pb-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:pb-8">
        <AparecerAlCargar className={`w-full max-w-sm p-8 ${CARD}`}>{children}</AparecerAlCargar>
      </main>

      {conContacto && (
        <div
          className={`px-6 pt-5 pb-24 lg:col-start-1 lg:row-start-2 lg:px-12 lg:pb-10 ${BRAND_BACKGROUND}`}
        >
          <ContactoIngreso contact={contact} />
        </div>
      )}
    </div>
  );
}
