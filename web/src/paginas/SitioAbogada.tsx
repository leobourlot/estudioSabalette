import { Aparecer } from '../componentes/Aparecer';
import { DisenoSitio } from '../componentes/DisenoSitio';
import { FotoAbogada } from '../componentes/FotoAbogada';
import { useTituloDocumento } from '../componentes/useTituloDocumento';
import { VolverA } from '../componentes/VolverA';
import { type Abogada, lawyerName, lawyerPath, TEXTOS } from '../servicios/contenido-sitio';
import { publicPageFor } from '../servicios/rutas-sitio';

interface SitioAbogadaProps {
  /** Una abogada con su resumen y su texto completo (hasOwnPage, spec 007, RF-20). */
  abogada: Abogada;
}

/**
 * Página de una abogada (spec 007, RF-7 y RF-19): "Volver a abogadas", su foto, su nombre, su
 * título profesional y su texto completo, un párrafo por renglón del texto de la clienta.
 */
export function SitioAbogada({ abogada }: SitioAbogadaProps) {
  const page = publicPageFor(lawyerPath(abogada))!;
  useTituloDocumento(page.titulo);

  return (
    <DisenoSitio mensaje={page.mensaje}>
      <article className="px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <VolverA href="/#abogadas">{TEXTOS.detalle.volverAAbogadas}</VolverA>
          <div className="mt-6 flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
            <FotoAbogada abogada={abogada} tamano="grande" />
            <div>
              <h1 className="break-words font-titulos text-4xl font-semibold text-estudio-oscuro">
                {lawyerName(abogada)}
              </h1>
              <p className="mt-1 font-medium text-estudio-azul">{abogada.titulo}</p>
            </div>
          </div>
          <Aparecer className="mt-8 space-y-4 text-slate-700">
            {(abogada.texto ?? []).map((parrafo) => (
              <p key={parrafo} className="break-words">
                {parrafo}
              </p>
            ))}
          </Aparecer>
        </div>
      </article>
    </DisenoSitio>
  );
}
