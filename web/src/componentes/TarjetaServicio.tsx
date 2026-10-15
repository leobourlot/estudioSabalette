import { type Servicio, TEXTOS } from '../servicios/contenido-sitio';
import { PRIMARY_BUTTON } from './estilos-sitio';

interface TarjetaServicioProps {
  servicio: Servicio;
}

/**
 * Tarjeta de un servicio en el inicio (spec 007, RF-12): nombre, frase y "Conocer más", que lleva
 * a su página con un enlace común (plan 007, "Rutas del sitio público"). El lector de pantalla
 * oye "Conocer más sobre <servicio>", para que los cuatro enlaces no se lean iguales.
 */
export function TarjetaServicio({ servicio }: TarjetaServicioProps) {
  return (
    <article className="flex flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-titulos text-2xl font-semibold text-estudio-oscuro">{servicio.nombre}</h3>
      <p className="mt-2 flex-1 break-words text-slate-700">{servicio.frase}</p>
      <a href={servicio.ruta} className={`mt-4 self-start ${PRIMARY_BUTTON}`}>
        {TEXTOS.inicio.conocerMas} <span className="sr-only">sobre {servicio.nombre}</span>
      </a>
    </article>
  );
}
