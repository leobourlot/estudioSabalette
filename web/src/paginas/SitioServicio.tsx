import { Aparecer } from '../componentes/Aparecer';
import { BloquesTexto } from '../componentes/BloquesTexto';
import { DisenoSitio } from '../componentes/DisenoSitio';
import { OtrosServicios } from '../componentes/OtrosServicios';
import { useTituloDocumento } from '../componentes/useTituloDocumento';
import { VolverA } from '../componentes/VolverA';
import { SERVICIOS, TEXTOS } from '../servicios/contenido-sitio';
import { publicPageFor } from '../servicios/rutas-sitio';

export type ClaveServicioConPagina = 'accidentes' | 'danos' | 'sucesiones';

interface SitioServicioProps {
  clave: ClaveServicioConPagina;
}

/**
 * Página de un servicio sin pestañas (spec 007, RF-7, RF-13 y RF-14): "Volver a servicios", el
 * título de la página, el texto completo de la clienta y "Otros servicios". Derecho Laboral tiene
 * su propia página, con pestañas (SitioDerechoLaboral).
 */
export function SitioServicio({ clave }: SitioServicioProps) {
  const servicio = SERVICIOS.find((s) => s.clave === clave)!;
  const page = publicPageFor(servicio.ruta)!;
  useTituloDocumento(page.titulo);

  return (
    <DisenoSitio mensaje={page.mensaje}>
      <article className="px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <VolverA href="/#servicios">{TEXTOS.detalle.volverAServicios}</VolverA>
          <h1 className="mt-4 break-words font-titulos text-4xl font-semibold text-estudio-oscuro">
            {servicio.titulo}
          </h1>
          <Aparecer className="mt-6">
            <BloquesTexto bloques={servicio.bloques} />
          </Aparecer>
        </div>
      </article>
      <OtrosServicios actual={clave} />
    </DisenoSitio>
  );
}
