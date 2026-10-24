import { m, useReducedMotion } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { switchTransition } from '../componentes/animaciones';
import { BloquesTexto } from '../componentes/BloquesTexto';
import { DisenoSitio } from '../componentes/DisenoSitio';
import { FOCUS_RING } from '../componentes/estilos-sitio';
import { OtrosServicios } from '../componentes/OtrosServicios';
import { useTituloDocumento } from '../componentes/useTituloDocumento';
import { VolverA } from '../componentes/VolverA';
import {
  type ClavePestana,
  PESTANAS_LABORAL,
  SERVICIOS,
  TEXTOS,
} from '../servicios/contenido-sitio';
import { publicPageFor } from '../servicios/rutas-sitio';

const LABORAL = SERVICIOS.find((s) => s.clave === 'derecho-laboral')!;

const TAB =
  'flex min-h-11 items-center justify-center border-b-4 px-4 py-2 text-center transition-colors motion-reduce:transition-none';
const TAB_SELECTED = 'border-estudio-oscuro font-bold text-estudio-oscuro';
const TAB_OTHER = 'border-transparent text-slate-600 hover:text-estudio-oscuro';

interface SitioDerechoLaboralProps {
  pestana: ClavePestana;
}

/**
 * Derecho Laboral con sus pestañas Empresas y Trabajadores (spec 007, RF-15 a RF-17). Cada
 * pestaña es una página con su dirección, su título y su mensaje de WhatsApp: se ve como pestaña y
 * se usa como enlace, y la elegida se anuncia como la página actual. Las pestañas cambian con el
 * router, sin cargar otra vez la página: no se mueve de lugar y el foco queda en la pestaña
 * elegida, porque los enlaces son siempre los mismos elementos (RF-16). Sin el código de la página,
 * cada pestaña es un enlace común a su página prerenderizada. Al elegir una pestaña, su contenido
 * aparece con una transición corta (RF-45); al abrir la página no se anima, así el HTML
 * prerenderizado no lo trae oculto.
 */
export function SitioDerechoLaboral({ pestana }: SitioDerechoLaboralProps) {
  const actual = PESTANAS_LABORAL.find((p) => p.clave === pestana)!;
  const [elegida, setElegida] = useState(false);
  const reduceMotion = useReducedMotion() ?? false;
  const page = publicPageFor(actual.ruta)!;
  useTituloDocumento(page.titulo);

  return (
    <DisenoSitio mensaje={page.mensaje}>
      <article className="px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <VolverA href="/#servicios">{TEXTOS.detalle.volverAServicios}</VolverA>
          <h1 className="mt-4 font-titulos text-4xl font-semibold text-estudio-oscuro">
            {LABORAL.titulo}
          </h1>
          <p className="mt-3 text-lg text-slate-700">{LABORAL.frase}</p>

          <nav aria-label="Destinatarios" className="mt-8 border-b border-slate-200">
            <ul className="flex flex-wrap">
              {PESTANAS_LABORAL.map((p) => (
                <li key={p.clave} className="min-w-[9rem] flex-1">
                  <Link
                    to={p.ruta}
                    aria-current={p.clave === pestana ? 'page' : undefined}
                    onClick={() => setElegida(true)}
                    className={`${TAB} ${p.clave === pestana ? TAB_SELECTED : TAB_OTHER} ${FOCUS_RING}`}
                  >
                    {p.etiqueta}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <m.section
            key={pestana}
            aria-labelledby="pestana-titulo"
            className="mt-6"
            initial={elegida ? { opacity: 0 } : false}
            animate={{ opacity: 1 }}
            transition={switchTransition(reduceMotion)}
          >
            <h2 id="pestana-titulo" className="sr-only">
              {actual.etiqueta}
            </h2>
            {actual.destacados.length > 0 && (
              <ul className="mb-6 grid gap-3 sm:grid-cols-3">
                {actual.destacados.map((destacado) => (
                  <li
                    key={destacado}
                    className="rounded-lg bg-gradient-to-r from-estudio-oscuro to-estudio-azul px-4 py-3 font-semibold text-estudio-blanco text-center"
                  >
                    {destacado}
                  </li>
                ))}
              </ul>
            )}
            <BloquesTexto bloques={actual.bloques} />
          </m.section>
        </div>
      </article>
      <OtrosServicios actual="derecho-laboral" />
    </DisenoSitio>
  );
}
