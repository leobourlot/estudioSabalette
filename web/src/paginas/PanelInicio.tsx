import { Link } from 'react-router-dom';
import { AparecerAlCargar } from '../componentes/AparecerAlCargar';
import { CARD, FOCUS_RING, PAGE, PAGE_TITLE } from '../componentes/estilos-aplicacion';
import { IconoMenu } from '../componentes/IconosMenu';
import { useSession } from '../componentes/ProveedorSesion';
import { PANEL_MENU } from '../servicios/menu-aplicacion';

/** Las opciones del menú del panel, salvo "Inicio", que es esta pantalla (spec 008, RF-25). */
const ACCESOS = PANEL_MENU.filter((option) => !option.end);

/**
 * Inicio del panel: el saludo y un acceso por cada opción del menú, en tarjetas con su ícono y
 * su nombre (spec 008, RF-25). Sin contadores ni resúmenes, que quedan fuera de alcance.
 */
export function PanelInicio() {
  const { usuario } = useSession();

  return (
    <main className={PAGE}>
      <div>
        <h1 className={PAGE_TITLE}>Panel</h1>
        {usuario && <p className="mt-1 text-slate-600">Hola, {usuario.nombre}.</p>}
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ACCESOS.map((option, index) => (
          <AparecerAlCargar key={option.to} como="li" indice={index}>
            <Link
              to={option.to}
              className={`flex min-h-20 items-center gap-4 p-5 font-titulos text-xl font-semibold text-estudio-oscuro transition motion-safe:hover:-translate-y-0.5 hover:shadow-md motion-reduce:transition-none ${CARD} ${FOCUS_RING}`}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-estudio-azul/10">
                <IconoMenu nombre={option.icon} className="h-6 w-6" />
              </span>
              {option.label}
            </Link>
          </AparecerAlCargar>
        ))}
      </ul>
    </main>
  );
}
