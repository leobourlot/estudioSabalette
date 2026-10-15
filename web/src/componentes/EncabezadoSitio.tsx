import type { SeccionSesion } from '../servicios/estado-sesion';
import { LOGO_PATH } from '../servicios/marca';
import { AccesoIngreso } from './AccesoIngreso';
import { FOCUS_RING } from './estilos-sitio';
import { MenuSitio } from './MenuSitio';
import { NombreEstudio } from './NombreEstudio';

interface EncabezadoSitioProps {
  /** Los tests pasan una consulta de sesión simulada. */
  consultarSesion?: () => Promise<SeccionSesion | null>;
}

/**
 * Encabezado de las páginas públicas (spec 007, RF-3 y RF-4): el logo y el nombre del estudio,
 * que llevan al inicio, el menú y el acceso de ingreso. No queda fijo al desplazar, para no
 * ocupar la pantalla con el celular en horizontal. El logo no se anuncia: el enlace ya se llama
 * como el estudio.
 */
export function EncabezadoSitio({ consultarSesion }: EncabezadoSitioProps) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <a
          href="/"
          className={`flex items-center gap-3 rounded font-semibold text-estudio-oscuro ${FOCUS_RING}`}
        >
          <img src={LOGO_PATH} alt="" width={48} height={48} className="h-12 w-12 rounded" />
          <NombreEstudio />
        </a>
        <div className="flex items-center gap-2">
          <MenuSitio />
          <AccesoIngreso consultar={consultarSesion} />
        </div>
      </div>
    </header>
  );
}
