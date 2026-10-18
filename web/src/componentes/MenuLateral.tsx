import type { Ref } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LOGO_PATH } from '../servicios/marca';
import {
  isSectionActive,
  MENUS,
  NAV_LABELS,
  SECTION_HOMES,
  SECTION_NAMES,
  type Section,
} from '../servicios/menu-aplicacion';
import { FOCUS_RING_ON_DARK } from './estilos-aplicacion';
import { IconoCerrar, IconoMenu } from './IconosMenu';
import { NombreEstudio } from './NombreEstudio';

export const MENU_ID = 'menu-lateral';

interface MenuLateralProps {
  section: Section;
  /** Nombre y apellido del usuario, o null mientras no se conoce. */
  userName: string | null;
  /** Si el menú plegado está abierto (solo cuenta debajo de 1024 px). */
  abierto: boolean;
  /** Al elegir una opción: en el celular, el menú se cierra. */
  onChoose: () => void;
  /** "Cerrar menú". */
  onClose: () => void;
  onLogout: () => void;
  closeButtonRef?: Ref<HTMLButtonElement>;
}

const OPTION = `flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors motion-reduce:transition-none ${FOCUS_RING_ON_DARK}`;

/** La opción marcada: fondo más claro, barra a la izquierda y negrita (RF-7). */
const ACTIVE_OPTION = `${OPTION} relative bg-estudio-azul font-semibold text-estudio-blanco before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-r before:bg-estudio-blanco`;

const INACTIVE_OPTION = `${OPTION} text-slate-300 hover:bg-estudio-blanco/10 hover:text-estudio-blanco`;

/**
 * Menú lateral del portal y del panel (spec 008, RF-5 a RF-9): arriba, el logo, el nombre del
 * estudio y el de la sección, que llevan al inicio de la sección; las opciones con su ícono, la
 * actual marcada y anunciada como página actual; abajo, el usuario y "Cerrar sesión". Es el mismo
 * elemento en los dos anchos: desde 1024 px queda fijo al costado y, más angosto, entra desde la
 * izquierda con "Menú". Se mueve con una transición de CSS y no con Motion, porque un transform
 * en línea pisaría el lugar fijo de las pantallas anchas (plan 008, "Plegado en el celular").
 * Cerrado, `invisible` lo saca del recorrido con Tab y del lector de pantalla.
 */
export function MenuLateral({
  section,
  userName,
  abierto,
  onChoose,
  onClose,
  onLogout,
  closeButtonRef,
}: MenuLateralProps) {
  const { pathname } = useLocation();
  const plegado = abierto ? 'visible translate-x-0' : 'invisible -translate-x-full';

  return (
    <aside
      id={MENU_ID}
      className={`fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] flex-col overflow-y-auto bg-gradient-to-b from-estudio-oscuro to-estudio-azul text-slate-300 shadow-xl transition-[transform,visibility] duration-300 motion-reduce:transition-none lg:visible lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-64 lg:max-w-none lg:shrink-0 lg:translate-x-0 lg:shadow-none ${plegado}`}
    >
      <div className="flex items-start justify-between gap-2 px-5 pt-6 pb-3">
        <Link
          to={SECTION_HOMES[section]}
          className={`hidden flex-col gap-3 rounded text-estudio-blanco lg:flex ${FOCUS_RING_ON_DARK}`}
        >
          <img
            src={LOGO_PATH}
            alt=""
            width={56}
            height={56}
            className="h-36 w-36 rounded-lg ring-1 ring-estudio-blanco/20"
          />
          <NombreEstudio centrado className="font-titulos text-xl font-semibold" />
        </Link>
        <p className="pt-2 text-xs font-medium uppercase tracking-wider lg:hidden">
          {SECTION_NAMES[section]}
        </p>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className={`-mr-2 -mt-2 inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-estudio-blanco hover:bg-estudio-blanco/10 lg:hidden ${FOCUS_RING_ON_DARK}`}
        >
          <IconoCerrar />
          <span className="sr-only">Cerrar menú</span>
        </button>
      </div>
      <p className="hidden px-5 pb-6 text-xs font-medium uppercase tracking-wider lg:block">
        {SECTION_NAMES[section]}
      </p>

      <nav aria-label={NAV_LABELS[section]} className="px-3">
        <ul className="space-y-1">
          {MENUS[section].map((option) => {
            const active = isSectionActive(option, pathname);
            return (
              <li key={option.to}>
                <Link
                  to={option.to}
                  aria-current={active ? 'page' : undefined}
                  onClick={onChoose}
                  className={active ? ACTIVE_OPTION : INACTIVE_OPTION}
                >
                  <IconoMenu nombre={option.icon} />
                  {option.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="mt-auto space-y-1 border-t border-estudio-blanco/15 px-5 py-4 text-sm">
        {userName && <p className="break-words text-estudio-blanco">{userName}</p>}
        <button
          type="button"
          onClick={onLogout}
          className={`-ml-2 inline-flex min-h-11 items-center rounded-lg px-2 underline underline-offset-4 hover:text-estudio-blanco ${FOCUS_RING_ON_DARK}`}
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
