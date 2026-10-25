import { Aparecer } from '../componentes/Aparecer';
import { STAGGER_S } from '../componentes/animaciones';
import { BalanzaDecorativa } from '../componentes/BalanzaDecorativa';
import { DisenoSitio } from '../componentes/DisenoSitio';
import { PRIMARY_BUTTON } from '../componentes/estilos-sitio';
import { MaquetaPortal } from '../componentes/MaquetaPortal';
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

const SECTION_TITLE =
  'font-titulos text-3xl font-semibold text-estudio-oscuro outline-none sm:text-4xl';

/**
 * La dirección del portal: sin sesión lleva al ingreso, y con la de un integrante, al panel
 * (RF-10). Así el botón no consulta la sesión (RF-47).
 */
const PORTAL_HREF = '/portal';

/**
 * Inicio del sitio público (spec 007, RF-11, RF-12, RF-18 y RF-47): la apertura con el nombre del
 * estudio, el portal de clientes con su maqueta, los servicios, las abogadas y, al final, el
 * contacto del diseño. Las secciones tienen
 * su "#" para el menú, y su título recibe el foco al llegar (useFocoEnAncla).
 */
export function SitioInicio() {
  useTituloDocumento(PAGE.titulo);

  return (
    <DisenoSitio mensaje={PAGE.mensaje}>
      <section
        aria-labelledby="inicio-titulo"
        className="relative overflow-hidden bg-gradient-to-r from-estudio-oscuro to-estudio-azul px-4 py-16 text-estudio-blanco"
      >
        <BalanzaDecorativa className="absolute top-1/2 -right-12 aspect-square h-[96%] -translate-y-1/2 opacity-[0.50] sm:right-4 sm:opacity-[0.50] lg:right-[18%] lg:opacity-[0.50]" />
        <div className="relative mx-auto max-w-5xl">
          <h1 id="inicio-titulo" className="font-titulos text-4xl font-semibold sm:text-5xl">
            <NombreEstudio />
          </h1>
          <p className="mt-4 max-w-2xl text-lg">{APERTURA}</p>
        </div>
      </section>

      <section id="portal" aria-labelledby="portal-titulo" className="bg-white px-4 py-12">
        <div className="mx-auto grid max-w-5xl items-center gap-8 lg:grid-cols-[1fr_2fr]">
          <Aparecer>
            <p className="text-sm font-semibold uppercase tracking-wide text-estudio-azul">
              {TEXTOS.portal.leyenda}
            </p>
            <h2 id="portal-titulo" tabIndex={-1} className={`mt-2 ${SECTION_TITLE}`}>
              {TEXTOS.portal.titulo}
            </h2>
            <a href={PORTAL_HREF} className={`mt-6 ${PRIMARY_BUTTON}`}>
              {TEXTOS.portal.irAlPortal}
            </a>
          </Aparecer>
          <MaquetaPortal />
        </div>
      </section>

      <section
        id="servicios"
        aria-labelledby="servicios-titulo"
        className="px-4 py-12 bg-estudio-oscuro/10"
      >
        <div className="mx-auto max-w-5xl">
          <Aparecer>
            <h2 id="servicios-titulo" tabIndex={-1} className={SECTION_TITLE}>
              {TEXTOS.inicio.nuestrosServicios}
            </h2>
            <p className="mt-3 max-w-3xl text-slate-700">{INTRO_SERVICIOS}</p>
          </Aparecer>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICIOS.map((servicio, index) => (
              <Aparecer key={servicio.clave} className="flex" retraso={index * STAGGER_S}>
                <TarjetaServicio servicio={servicio} />
              </Aparecer>
            ))}
          </div>
        </div>
      </section>

      <section id="abogadas" aria-labelledby="abogadas-titulo" className="bg-white px-4 py-12">
        <div className="mx-auto max-w-5xl">
          <Aparecer>
            <h2 id="abogadas-titulo" tabIndex={-1} className={SECTION_TITLE}>
              {TEXTOS.inicio.equipoAbogadas}
            </h2>
          </Aparecer>
          <div className="mt-8 grid items-start gap-6 sm:grid-cols-2">
            {ABOGADAS.map((abogada, index) => (
              <Aparecer key={abogada.slug} retraso={index * STAGGER_S}>
                <TarjetaAbogada abogada={abogada} />
              </Aparecer>
            ))}
          </div>
        </div>
      </section>
    </DisenoSitio>
  );
}
