import { DisenoSitio } from '../componentes/DisenoSitio';
import { PRIMARY_BUTTON, TEXT_LINK } from '../componentes/estilos-sitio';
import { useTituloDocumento } from '../componentes/useTituloDocumento';
import { SERVICIOS, TEXTOS } from '../servicios/contenido-sitio';
import { NOT_FOUND_PAGE } from '../servicios/rutas-sitio';

/**
 * Página de una dirección del sitio público que no existe (spec 007, RF-9): el aviso, "Ir al
 * inicio" y los cuatro servicios, con el encabezado, el contacto y el botón de WhatsApp del
 * diseño. Nunca lee ni muestra la dirección pedida (RF-42).
 */
export function SitioNoEncontrada() {
  useTituloDocumento(NOT_FOUND_PAGE.titulo);

  return (
    <DisenoSitio mensaje={NOT_FOUND_PAGE.mensaje}>
      <article className="px-4 py-16">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-semibold text-estudio-oscuro">
            {TEXTOS.noEncontrada.titulo}
          </h1>
          <p className="mt-3 text-lg text-slate-700">{TEXTOS.noEncontrada.texto}</p>
          <a href="/" className={`mt-6 ${PRIMARY_BUTTON}`}>
            {TEXTOS.noEncontrada.irAlInicio}
          </a>
          <nav aria-label={TEXTOS.menu.servicios} className="mt-8">
            <ul className="flex flex-col gap-1">
              {SERVICIOS.map((servicio) => (
                <li key={servicio.clave}>
                  <a href={servicio.ruta} className={TEXT_LINK}>
                    {servicio.nombre}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </article>
    </DisenoSitio>
  );
}
