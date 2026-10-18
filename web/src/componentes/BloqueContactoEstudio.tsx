import { STUDIO_CONTACT, type StudioContact, whatsappUrl } from '../servicios/datos-estudio';
import { CARD, TEXT_LINK } from './estilos-aplicacion';
import { NombreEstudio } from './NombreEstudio';

interface BloqueContactoEstudioProps {
  /** Los tests pasan otros datos; la aplicación usa siempre los del estudio. */
  contact?: StudioContact;
}

/**
 * Datos de contacto del estudio al pie de las pantallas del portal, salvo la de cambio de
 * contraseña (spec 004, RF-18): nombre, dirección como texto y WhatsApp como enlace. Mientras el
 * estudio no informe la dirección, no se muestra ni deja un renglón vacío (spec 007, RF-24). Va en
 * una tarjeta al final del contenido (spec 008, RF-4), con un margen debajo mayor que el botón de
 * WhatsApp, para que este nunca lo tape (spec 004, RF-19).
 */
export function BloqueContactoEstudio({ contact = STUDIO_CONTACT }: BloqueContactoEstudioProps) {
  return (
    <footer
      aria-label="Contacto del estudio"
      className="px-4 pb-24 text-sm text-slate-700 sm:px-6 lg:px-8"
    >
      <div className={`mx-auto max-w-6xl space-y-1 p-5 ${CARD}`}>
        <p className="font-titulos text-lg font-semibold text-estudio-oscuro">
          <NombreEstudio contact={contact} />
        </p>
        {contact.direccion && <p className="break-words">{contact.direccion}</p>}
        <p>
          <a
            href={whatsappUrl(undefined, contact)}
            target="_blank"
            rel="noopener noreferrer"
            className={TEXT_LINK}
          >
            WhatsApp
          </a>
        </p>
      </div>
    </footer>
  );
}
