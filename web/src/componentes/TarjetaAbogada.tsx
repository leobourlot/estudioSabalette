import { type Abogada, hasOwnPage, lawyerPath, TEXTOS } from '../servicios/contenido-sitio';
import { TEXT_LINK } from './estilos-sitio';
import { FotoAbogada } from './FotoAbogada';

interface TarjetaAbogadaProps {
  abogada: Abogada;
}

/**
 * Tarjeta de una abogada en el inicio (spec 007, RF-18 y RF-20): foto, nombre y "Abogada" y, si
 * ya tiene sus textos, el resumen y "Más información", que lleva a su página. El contenido va
 * arriba, para que las tarjetas se vean ordenadas aunque tengan distinta cantidad de texto.
 */
export function TarjetaAbogada({ abogada }: TarjetaAbogadaProps) {
  return (
    <article className="flex flex-col items-center rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
      <FotoAbogada abogada={abogada} tamano="mediana" diferida />
      <h3 className="mt-4 font-titulos text-2xl font-semibold text-estudio-oscuro">
        {abogada.nombre}
      </h3>
      <p className="text-sm font-medium uppercase tracking-wide text-estudio-azul">
        {TEXTOS.inicio.abogada}
      </p>
      {hasOwnPage(abogada) && (
        <>
          <p className="mt-3 break-words text-slate-700">{abogada.resumen}</p>
          <a href={lawyerPath(abogada)} className={`mt-3 ${TEXT_LINK}`}>
            {TEXTOS.inicio.masInformacion} <span className="sr-only">sobre {abogada.nombre}</span>
          </a>
        </>
      )}
    </article>
  );
}
