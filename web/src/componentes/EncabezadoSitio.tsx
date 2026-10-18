import type { SeccionSesion } from '../servicios/estado-sesion';
import { LOGO_PATH, LOGO_PATH2, LOGO_PATH3 } from '../servicios/marca';
import { AccesoIngreso, useSeccionSesion } from './AccesoIngreso';
import { FOCUS_RING } from './estilos-sitio';
import { MenuSitio } from './MenuSitio';
import { NombreEstudio } from './NombreEstudio';

interface EncabezadoSitioProps {
  /** Los tests pasan una consulta de sesión simulada. */
  consultarSesion?: () => Promise<SeccionSesion | null>;
}

/**
 * Encabezado de las páginas públicas (spec 007, RF-3, RF-4 y RF-6): el logo y el nombre del
 * estudio, que llevan al inicio, el menú y el acceso de ingreso, en una sola línea. Debajo de
 * 420 px el acceso pasa a ser la última opción del menú plegado, para que el logo, el nombre y
 * "Menú" entren; desde 420 px va al lado del menú. La sesión se consulta una sola vez para los
 * dos lugares. El encabezado es el elemento posicionado del menú desplegado. No queda fijo al
 * desplazar, para no ocupar la pantalla con el celular en horizontal. El logo no se anuncia: el
 * enlace ya se llama como el estudio.
 */
export function EncabezadoSitio({ consultarSesion }: EncabezadoSitioProps) {
  const seccion = useSeccionSesion(consultarSesion);

  return (
    <header className="relative border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <a
          href="/"
          className={`flex min-w-0 items-center gap-3 rounded font-semibold text-estudio-oscuro ${FOCUS_RING}`}
        >
          <img
            src={LOGO_PATH2}
            alt=""
            width={756}
            height={420}
            className="h-12 w-auto shrink-0 rounded-xl min-[420px]:h-24"
          />
          <NombreEstudio centrado />
        </a>
        <div className="flex shrink-0 items-center gap-2">
          <MenuSitio acceso={<AccesoIngreso seccion={seccion} className="w-full" />} />
          <AccesoIngreso seccion={seccion} className="max-[767px]:hidden" />
        </div>
      </div>
    </header>
  );
}
