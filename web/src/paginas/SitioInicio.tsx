import { DisenoSitio } from '../componentes/DisenoSitio';
import { NombreEstudio } from '../componentes/NombreEstudio';
import { TarjetaAbogada } from '../componentes/TarjetaAbogada';
import { TarjetaServicio } from '../componentes/TarjetaServicio';
import { useTituloDocumento } from '../componentes/useTituloDocumento';
import {
  ABOGADAS,
  APERTURA,
  INTRO_SERVICIOS,
  SERVICIOS,
  TEXTOS,
} from '../servicios/contenido-sitio';
import { publicPageFor } from '../servicios/rutas-sitio';

const PAGE = publicPageFor('/')!;

const SECTION_TITLE = 'text-2xl font-semibold text-estudio-oscuro outline-none';

/**
 * Inicio del sitio público (spec 007, RF-11, RF-12 y RF-18): la apertura con el nombre del
 * estudio, los servicios, las abogadas y, al final, el contacto del diseño. Las secciones tienen
 * su "#" para el menú, y su título recibe el foco al llegar (useFocoEnAncla).
 */
export function SitioInicio() {
  useTituloDocumento(PAGE.titulo);

  return (
    <DisenoSitio mensaje={PAGE.mensaje}>
      <section
        aria-labelledby="inicio-titulo"
        className="bg-gradient-to-r from-estudio-oscuro to-estudio-azul px-4 py-16 text-estudio-blanco"
      >
        <div className="mx-auto max-w-5xl">
          <h1 id="inicio-titulo" className="text-3xl font-semibold sm:text-4xl">
            <NombreEstudio />
          </h1>
          <p className="mt-4 max-w-2xl text-lg">{APERTURA}</p>
        </div>
      </section>

      <section id="servicios" aria-labelledby="servicios-titulo" className="px-4 py-12">
        <div className="mx-auto max-w-5xl">
          <h2 id="servicios-titulo" tabIndex={-1} className={SECTION_TITLE}>
            {TEXTOS.inicio.nuestrosServicios}
          </h2>
          <p className="mt-3 max-w-3xl text-slate-700">{INTRO_SERVICIOS}</p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICIOS.map((servicio) => (
              <TarjetaServicio key={servicio.clave} servicio={servicio} />
            ))}
          </div>
        </div>
      </section>

      <section id="abogadas" aria-labelledby="abogadas-titulo" className="bg-white px-4 py-12">
        <div className="mx-auto max-w-5xl">
          <h2 id="abogadas-titulo" tabIndex={-1} className={SECTION_TITLE}>
            {TEXTOS.inicio.abogadas}
          </h2>
          <div className="mt-8 grid items-start gap-6 sm:grid-cols-2">
            {ABOGADAS.map((abogada) => (
              <TarjetaAbogada key={abogada.slug} abogada={abogada} />
            ))}
          </div>
        </div>
      </section>
    </DisenoSitio>
  );
}
