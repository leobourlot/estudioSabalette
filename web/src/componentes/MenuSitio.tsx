import { type KeyboardEvent, type ReactNode, useRef, useState } from 'react';
import { TEXTOS } from '../servicios/contenido-sitio';
import { FOCUS_RING } from './estilos-sitio';

/** "Servicios" y "Abogadas" llevan a su sección del inicio; "Contacto", al bloque de esta página. */
const LINKS = [
  { href: '/#servicios', label: TEXTOS.menu.servicios },
  { href: '/#abogadas', label: TEXTOS.menu.abogadas },
  { href: '#contacto', label: TEXTOS.menu.contacto },
] as const;

const LINK_CLASS = `inline-flex min-h-11 items-center px-2 font-medium text-estudio-oscuro hover:text-estudio-azul ${FOCUS_RING}`;

interface LinksProps {
  onChoose?: () => void;
  /** Lo que va al final de la lista, como el acceso de ingreso en pantallas chicas. */
  extra?: ReactNode;
}

function Links({ onChoose, extra }: LinksProps) {
  return (
    <ul className="flex flex-col gap-1 md:flex-row md:gap-4">
      {LINKS.map((link) => (
        <li key={link.href}>
          <a href={link.href} className={LINK_CLASS} onClick={onChoose}>
            {link.label}
          </a>
        </li>
      ))}
      {extra}
    </ul>
  );
}

interface MenuSitioProps {
  /**
   * El acceso de ingreso, que va como última opción del menú plegado solo en pantallas de menos de
   * 420 px (RF-4). En las demás, el encabezado lo muestra al lado del menú.
   */
  acceso?: ReactNode;
}

/**
 * Menú del sitio público (spec 007, RF-4 a RF-6). Desde 768 px, una fila de enlaces. Debajo, un
 * <details> con "Menú": abre y cierra sin código, así funciona aunque el navegador no ejecute el
 * código de la página (RF-35). Abierto, se despliega debajo del encabezado a lo ancho de la
 * pantalla: se ubica respecto del encabezado, que es el único elemento posicionado, así nunca
 * queda cortado. Con el código cargado, se cierra al elegir una opción o con Escape, y el foco
 * vuelve a "Menú".
 */
export function MenuSitio({ acceso }: MenuSitioProps) {
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
        className="md:hidden"
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
          className="absolute inset-x-0 top-full z-20 border-b border-slate-200 bg-white px-4 py-3 shadow-lg"
        >
          <Links
            onChoose={close}
            extra={acceso && <li className="mt-2 min-[420px]:hidden">{acceso}</li>}
          />
        </nav>
      </details>
    </>
  );
}
