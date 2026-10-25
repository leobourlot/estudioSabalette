import { type Servicio, TEXTOS } from '../servicios/contenido-sitio';
import { PRIMARY_BUTTON } from './estilos-sitio';
import { IconoServicio } from './IconosServicios';

interface TarjetaServicioProps {
  servicio: Servicio;
}

/**
 * Tarjeta de un servicio en el inicio (spec 007, RF-12): el ícono del tema, nombre, frase y
 * "Conocer más", que lleva a su página con un enlace común (plan 007, "Rutas del sitio público").
 * El lector de pantalla oye "Conocer más sobre <servicio>", para que los cuatro enlaces no se
 * lean iguales; el ícono no se anuncia.
 */
export function TarjetaServicio({ servicio }: TarjetaServicioProps) {
  return (
    <article className="group flex w-full flex-col rounded-2xl border border-slate-300 bg-estudio-azul/5 p-5 shadow-sm transition hover:shadow-md focus-within:shadow-md motion-safe:hover:-translate-y-1 motion-safe:focus-within:-translate-y-1 motion-reduce:transition-none">
      <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-estudio-azul/15 text-estudio-azul">
        <IconoServicio clave={servicio.clave} />
      </span>
      <h3 className="font-titulos text-2xl font-semibold text-estudio-oscuro">{servicio.nombre}</h3>
      <p className="mt-2 flex-1 break-words text-slate-700">{servicio.frase}</p>
      <a href={servicio.ruta} className={`mt-4 self-start ${PRIMARY_BUTTON}`}>
        {TEXTOS.inicio.conocerMas} <span className="sr-only">sobre {servicio.nombre}</span>
      </a>
    </article>
  );
}
