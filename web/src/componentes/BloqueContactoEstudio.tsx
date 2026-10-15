import { STUDIO_CONTACT, type StudioContact, whatsappUrl } from '../servicios/datos-estudio';
import { NombreEstudio } from './NombreEstudio';

interface BloqueContactoEstudioProps {
  /** Los tests pasan otros datos; la aplicación usa siempre los del estudio. */
  contact?: StudioContact;
}

/**
 * Datos de contacto del estudio al pie de las pantallas del portal, salvo la de cambio de
 * contraseña (spec 004, RF-18): nombre, dirección como texto y WhatsApp como enlace. Mientras el
 * estudio no informe la dirección, no se muestra ni deja un renglón vacío (spec 007, RF-24).
 */
export function BloqueContactoEstudio({ contact = STUDIO_CONTACT }: BloqueContactoEstudioProps) {
  return (
    <footer
      aria-label="Contacto del estudio"
      className="border-t border-slate-200 bg-white px-4 pt-6 pb-24 text-sm text-slate-600"
    >
      <div className="mx-auto max-w-5xl space-y-1">
        <p className="font-medium text-slate-800">
          <NombreEstudio contact={contact} />
        </p>
        {contact.direccion && <p className="break-words">{contact.direccion}</p>}
        <p>
          <a
            href={whatsappUrl(undefined, contact)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-800 underline"
          >
            WhatsApp
          </a>
        </p>
      </div>
    </footer>
  );
}
