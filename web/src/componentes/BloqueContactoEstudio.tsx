import { STUDIO_CONTACT, whatsappUrl } from '../servicios/datos-estudio';

/**
 * Datos de contacto del estudio al pie de las pantallas del portal, salvo la de cambio de
 * contraseña (spec 004, RF-18): nombre, dirección como texto y WhatsApp como enlace.
 */
export function BloqueContactoEstudio() {
  return (
    <footer
      aria-label="Contacto del estudio"
      className="border-t border-slate-200 bg-white px-4 pt-6 pb-24 text-sm text-slate-600"
    >
      <div className="mx-auto max-w-5xl space-y-1">
        <p className="font-medium text-slate-800">{STUDIO_CONTACT.nombre}</p>
        <p className="break-words">{STUDIO_CONTACT.direccion}</p>
        <p>
          <a
            href={whatsappUrl()}
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
