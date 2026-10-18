import { AnimatePresence, m, useReducedMotion } from 'motion/react';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LOGO_PATH } from '../servicios/marca';
import { SECTION_HOMES, type Section } from '../servicios/menu-aplicacion';
import { clearClipboard } from '../servicios/portapapeles';
import { fullName } from '../servicios/presentacion';
import { ROUTES } from '../servicios/sesion';
import { switchTransition } from './animaciones';
import { AparecerAlCargar } from './AparecerAlCargar';
import { FOCUS_RING_ON_DARK } from './estilos-aplicacion';
import { IconoHamburguesa } from './IconosMenu';
import { MENU_ID, MenuLateral } from './MenuLateral';
import { NombreEstudio } from './NombreEstudio';
import { useSession } from './ProveedorSesion';

/** Desde este ancho el menú queda fijo al costado (spec 008, RF-9). */
export const DESKTOP_QUERY = '(min-width: 1024px)';

/**
 * Llama a `onDesktop` cuando la ventana pasa a 1024 px o más, para cerrar el menú plegado y que
 * el contenido no quede inerte (spec 008, casos límite). Sin matchMedia no hace nada.
 */
function useAlPasarAEscritorio(onDesktop: () => void) {
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(DESKTOP_QUERY);
    const listener = (event: MediaQueryListEvent) => {
      if (event.matches) onDesktop();
    };
    query.addEventListener('change', listener);
    return () => query.removeEventListener('change', listener);
  }, [onDesktop]);
}

interface DisenoSeccionProps {
  section: Section;
  /** Lo que va debajo de la página, como el contacto del estudio en el portal. */
  footer?: ReactNode;
}

/**
 * Diseño del portal y del panel (spec 008, RF-5 a RF-10; spec 001, RF-16): "Saltar al
 * contenido", el menú lateral y la página, que aparece con un movimiento suave al abrirla.
 * Debajo de 1024 px, una barra arriba con "Menú" abre el menú por encima del contenido; mientras
 * está abierto, el contenido y la barra quedan inertes (el Tab no sale del menú) y la página no
 * se desplaza. Se cierra al elegir una opción, al tocar el fondo, con "Cerrar menú" o con Escape;
 * con estos dos, el foco vuelve a "Menú". Si estuvo abierto no se guarda en el navegador (RF-10).
 */
export function DisenoSeccion({ section, footer }: DisenoSeccionProps) {
  const { usuario, logout } = useSession();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const reduceMotion = useReducedMotion() ?? false;
  const [abierto, setAbierto] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  // Si al cerrarse el foco vuelve a "Menú": se hace después de quitarle `inert` a la barra.
  const returnFocus = useRef(false);

  const close = useCallback((focusMenuButton: boolean) => {
    returnFocus.current = focusMenuButton;
    setAbierto(false);
  }, []);
  const closeQuietly = useCallback(() => close(false), [close]);
  useAlPasarAEscritorio(closeQuietly);

  useEffect(() => {
    if (!abierto) {
      if (returnFocus.current) menuButton.current?.focus();
      returnFocus.current = false;
      return;
    }
    closeButton.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(true);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [abierto, close]);

  async function handleLogout() {
    // Un integrante pudo copiar un escrito completado: se vacía el portapapeles para que no
    // quede en el equipo (spec 006, RF-44). Va antes de esperar el cierre, dentro del clic,
    // porque el navegador solo deja escribir el portapapeles ante una acción del usuario.
    if (usuario && usuario.rol !== 'cliente') void clearClipboard();
    await logout();
    navigate(ROUTES.login, { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-100 lg:flex">
      <a
        href="#contenido"
        className="sr-only z-50 rounded-md bg-estudio-blanco px-4 py-2 font-medium text-estudio-oscuro focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Saltar al contenido
      </a>

      <header
        inert={abierto}
        className="sticky top-0 z-20 flex items-center justify-between gap-3 bg-gradient-to-r from-estudio-oscuro to-estudio-azul px-4 py-2 text-estudio-blanco lg:hidden"
      >
        <Link
          to={SECTION_HOMES[section]}
          className={`flex min-w-0 items-center gap-2 rounded ${FOCUS_RING_ON_DARK}`}
        >
          <img
            src={LOGO_PATH}
            alt=""
            width={96}
            height={96}
            className="h-24 w-24 shrink-0 rounded"
          />
          <NombreEstudio centrado className="font-titulos text-base font-semibold" />
        </Link>
        <button
          ref={menuButton}
          type="button"
          aria-expanded={abierto}
          aria-controls={MENU_ID}
          onClick={() => setAbierto(true)}
          className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium hover:bg-estudio-blanco/10 ${FOCUS_RING_ON_DARK}`}
        >
          <IconoHamburguesa />
          Menú
        </button>
      </header>

      <AnimatePresence>
        {abierto && (
          <m.div
            key="fondo"
            data-testid="fondo-menu"
            aria-hidden="true"
            onClick={closeQuietly}
            className="fixed inset-0 z-30 bg-estudio-oscuro/60 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={switchTransition(reduceMotion)}
          />
        )}
      </AnimatePresence>

      <MenuLateral
        section={section}
        userName={usuario ? fullName(usuario) : null}
        abierto={abierto}
        onChoose={closeQuietly}
        onClose={() => close(true)}
        onLogout={handleLogout}
        closeButtonRef={closeButton}
      />

      <div
        id="contenido"
        tabIndex={-1}
        inert={abierto}
        className="min-w-0 flex-1 focus:outline-none"
      >
        <AparecerAlCargar key={pathname}>
          <Outlet />
        </AparecerAlCargar>
        {footer}
      </div>
    </div>
  );
}
