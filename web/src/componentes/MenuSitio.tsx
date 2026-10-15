import { type KeyboardEvent, useRef, useState } from 'react';
import { TEXTOS } from '../servicios/contenido-sitio';
import { FOCUS_RING } from './estilos-sitio';

/** "Servicios" y "Abogadas" llevan a su sección del inicio; "Contacto", al bloque de esta página. */
const LINKS = [
  { href: '/#servicios', label: TEXTOS.menu.servicios },
  { href: '/#abogadas', label: TEXTOS.menu.abogadas },
  { href: '#contacto', label: TEXTOS.menu.contacto },
] as const;

const LINK_CLASS = `inline-flex min-h-11 items-center px-2 font-medium text-estudio-oscuro hover:text-estudio-azul ${FOCUS_RING}`;

function Links({ onChoose }: { onChoose?: () => void }) {
  return (
    <ul className="flex flex-col gap-1 md:flex-row md:gap-4">
      {LINKS.map((link) => (
        <li key={link.href}>
          <a href={link.href} className={LINK_CLASS} onClick={onChoose}>
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

/**
 * Menú del sitio público (spec 007, RF-5 y RF-6). Desde 768 px, una fila de enlaces. Debajo, un
 * <details> con "Menú": abre y cierra sin código, así funciona aunque el navegador no ejecute el
 * código de la página (RF-35). Con el código cargado, se cierra al elegir una opción o con Escape,
 * y el foco vuelve a "Menú".
 */
export function MenuSitio() {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);

  function close() {
    if (!detailsRef.current?.open) return;
    detailsRef.current.open = false;
    setOpen(false);
    summaryRef.current?.focus();
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') close();
  }

  return (
    <>
      <nav aria-label="Principal" className="hidden md:block">
        <Links />
      </nav>
      <details
        ref={detailsRef}
        className="relative md:hidden"
        onToggle={(event) => setOpen(event.currentTarget.open)}
        onKeyDown={handleKeyDown}
      >
        <summary
          ref={summaryRef}
          aria-expanded={open}
          className={`flex min-h-11 cursor-pointer list-none items-center rounded border border-estudio-oscuro px-3 font-medium text-estudio-oscuro [&::-webkit-details-marker]:hidden ${FOCUS_RING}`}
        >
          {TEXTOS.menu.menu}
        </summary>
        <nav
          aria-label="Principal"
          className="absolute right-0 top-full z-20 mt-2 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-lg"
        >
          <Links onChoose={close} />
        </nav>
      </details>
    </>
  );
}
