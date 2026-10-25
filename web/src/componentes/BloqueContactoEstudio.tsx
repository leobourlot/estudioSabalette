import {
  mapsUrl,
  networksToShow,
  STUDIO_CONTACT,
  type StudioContact,
  whatsappUrl,
} from '../servicios/datos-estudio';
import { CARD, FOCUS_RING } from './estilos-aplicacion';
import { IconoUbicacionColor } from './IconosContacto';
import { IconoRedColor } from './IconosRedes';
import { NombreEstudio } from './NombreEstudio';

interface BloqueContactoEstudioProps {
  /** Los tests pasan otros datos; la aplicación usa siempre los del estudio. */
  contact?: StudioContact;
}

/** Los enlaces se abren aparte, sin control sobre el portal (spec 007, RF-25). */
const EXTERNAL = { target: '_blank', rel: 'noopener noreferrer' } as const;

/**
 * Cada dato: su ícono a color, que no se anuncia, y el texto del enlace al lado. A pedido del
 * estudio va sin subrayado, salvo al pasar el puntero: todos los renglones son enlaces y cada uno
 * lleva su ícono, así que se distinguen igual.
 */
const LINK = `inline-flex items-center gap-2 rounded font-medium text-estudio-azul underline-offset-4 transition-colors hover:text-estudio-oscuro hover:underline motion-reduce:transition-none ${FOCUS_RING}`;

/**
 * Datos de contacto del estudio al pie de las pantallas del portal, salvo la de cambio de
 * contraseña (spec 004, RF-18): el nombre; la dirección, que abre Google Maps, con el pin de
 * Maps; el WhatsApp de cada abogada, con el ícono de WhatsApp, y cada red informada, con su
 * ícono y su cuenta. Son los mismos íconos a color del sitio público (spec 007, RF-23). Mientras
 * el estudio no informe la dirección o sus redes, no se muestran ni dejan un renglón vacío (spec
 * 007, RF-24). Va en una tarjeta al final del contenido (spec 008, RF-4), con un margen debajo
 * mayor que el botón de WhatsApp, para que este nunca lo tape (spec 004, RF-19).
 */
export function BloqueContactoEstudio({ contact = STUDIO_CONTACT }: BloqueContactoEstudioProps) {
  return (
    <footer
      aria-label="Contacto del estudio"
      className="px-4 pb-24 text-sm text-slate-700 sm:px-6 lg:px-8"
    >
      <div className={`mx-auto max-w-6xl space-y-2 p-5 ${CARD}`}>
        <p className="font-titulos text-lg font-semibold text-estudio-oscuro">
          <NombreEstudio contact={contact} />
        </p>
        {contact.direccion && (
          <p className="break-words">
            <a href={mapsUrl(contact.direccion)} className={LINK} {...EXTERNAL}>
              <IconoUbicacionColor />
              {contact.direccion}
            </a>
          </p>
        )}
        {contact.whatsapps.map((whatsapp) => (
          <p key={whatsapp.numero}>
            <a href={whatsappUrl(whatsapp)} className={LINK} {...EXTERNAL}>
              <IconoRedColor red="WhatsApp" />
              WhatsApp {whatsapp.nombre}: {whatsapp.visible}
            </a>
          </p>
        ))}
        {networksToShow(contact).map((red) => (
          <p key={`${red.url} ${red.usuario}`}>
            <a href={red.url} className={LINK} {...EXTERNAL}>
              <IconoRedColor red={red.red} />
              {red.red}: {red.usuario}
            </a>
          </p>
        ))}
      </div>
    </footer>
  );
}
