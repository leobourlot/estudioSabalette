import { type ClaveServicio, SERVICIOS, TEXTOS } from '../servicios/contenido-sitio';
import { Aparecer } from './Aparecer';
import { TEXT_LINK } from './estilos-sitio';

interface OtrosServiciosProps {
  /** El servicio de la página, que no se repite en la lista. */
  actual: ClaveServicio;
}

/** "Otros servicios": accesos a los otros tres servicios, con su nombre (spec 007, RF-7). */
export function OtrosServicios({ actual }: OtrosServiciosProps) {
  return (
    <nav aria-labelledby="otros-servicios" className="border-t border-slate-200 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <h2
          id="otros-servicios"
          className="font-titulos text-2xl font-semibold text-estudio-oscuro"
        >
          {TEXTOS.detalle.otrosServicios}
        </h2>
        <Aparecer>
          <ul className="mt-4 flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-x-6">
            {SERVICIOS.filter((servicio) => servicio.clave !== actual).map((servicio) => (
              <li key={servicio.clave}>
                <a href={servicio.ruta} className={TEXT_LINK}>
                  {servicio.nombre}
                </a>
              </li>
            ))}
          </ul>
        </Aparecer>
      </div>
    </nav>
  );
}
