import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { TEXTOS } from '../servicios/contenido-sitio';
import { STUDIO_CONTACT, type StudioContact, whatsappUrl } from '../servicios/datos-estudio';

interface BotonWhatsappProps {
  /**
   * Mensaje ya escrito de la página pública (spec 007, RF-27). Sin mensaje, la conversación se
   * abre vacía.
   */
  mensaje?: string;
  /** Los tests pasan otros datos; la aplicación usa siempre los del estudio. */
  contact?: StudioContact;
}

const WHATSAPP_PATH =
  'M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6a2.5 2.5 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .1-1.2c0-.1-.2-.2-.4-.3Z';

const FOCUS =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-estudio-azul';

/**
 * Botón de WhatsApp siempre visible abajo a la derecha, en todas las pantallas que ve el
 * cliente (spec 004, RF-19), en las páginas públicas y en la pantalla de ingreso (spec 007,
 * RF-26). Al tocarlo abre, encima de él, un menú con el WhatsApp de cada abogada (RF-22): cada
 * opción abre su conversación, sin mensaje en el portal y en el ingreso, y con el mensaje de la
 * página en las páginas públicas (RF-27). Es un <details>: abre y cierra aunque el navegador no
 * ejecute el código de la página (RF-35). Con el código, se cierra al elegir una opción, con
 * Escape o tocando fuera. Las pantallas que lo muestran dejan un margen inferior para que nunca
 * tape contenido.
 */
export function BotonWhatsapp({ mensaje, contact = STUDIO_CONTACT }: BotonWhatsappProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);

  function close(returnFocus: boolean) {
    if (!detailsRef.current?.open) return;
    detailsRef.current.open = false;
    setOpen(false);
    if (returnFocus) summaryRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') close(true);
  }

  // Tocar fuera del menú lo cierra.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const details = detailsRef.current;
      if (!details || details.contains(event.target as Node)) return;
      details.open = false;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  return (
    <details
      ref={detailsRef}
      className="fixed bottom-4 right-4 z-10"
      onToggle={(event) => setOpen(event.currentTarget.open)}
      onKeyDown={handleKeyDown}
    >
      <summary
        ref={summaryRef}
        aria-label={TEXTOS.botonWhatsapp}
        aria-expanded={open}
        className={`flex h-14 w-14 cursor-pointer list-none items-center justify-center rounded-full bg-green-600 text-white shadow-lg hover:bg-green-700 [&::-webkit-details-marker]:hidden ${FOCUS}`}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7 fill-current">
          <path d={WHATSAPP_PATH} />
        </svg>
      </summary>
      <ul
        aria-label={TEXTOS.botonWhatsapp}
        className="absolute bottom-full right-0 mb-3 w-64 rounded-lg border border-slate-200 bg-white p-2 shadow-lg"
      >
        {contact.whatsapps.map((whatsapp) => (
          <li key={whatsapp.numero}>
            <a
              href={whatsappUrl(whatsapp, mensaje)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => close(false)}
              className={`flex min-h-11 items-center gap-3 rounded px-3 py-2 text-slate-800 hover:bg-slate-100 ${FOCUS}`}
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-6 w-6 shrink-0 fill-green-600"
              >
                <path d={WHATSAPP_PATH} />
              </svg>
              <span className="flex flex-col">
                <span className="font-medium">{whatsapp.nombre}</span>
                <span className="text-sm text-slate-600">{whatsapp.visible}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
