import type { ReactNode } from 'react';
import { TEXTOS } from '../servicios/contenido-sitio';
import type { SeccionSesion } from '../servicios/estado-sesion';
import { BotonWhatsapp } from './BotonWhatsapp';
import { ContactoSitio } from './ContactoSitio';
import { EncabezadoSitio } from './EncabezadoSitio';
import { FOCUS_RING } from './estilos-sitio';
import { useFocoEnAncla } from './useFocoEnAncla';

interface DisenoSitioProps {
  /** Mensaje de WhatsApp de la página, para el botón y el bloque de contacto (spec 007, RF-27). */
  mensaje: string;
  children: ReactNode;
  /** Los tests pasan una consulta de sesión simulada. */
  consultarSesion?: () => Promise<SeccionSesion | null>;
}

/**
 * Diseño de todas las páginas públicas (spec 007, RF-4, RF-23, RF-26 y RF-28): "Saltar al
 * contenido", el encabezado, la página, el bloque de contacto y el botón de WhatsApp. El bloque de
 * contacto termina con un margen mayor que el botón, así al final de la página todo se puede ver
 * y usar.
 */
export function DisenoSitio({ mensaje, children, consultarSesion }: DisenoSitioProps) {
  useFocoEnAncla();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800">
      <a
        href="#contenido"
        className={`sr-only rounded bg-white px-4 py-2 font-medium text-estudio-oscuro shadow focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-30 ${FOCUS_RING}`}
      >
        {TEXTOS.menu.saltarAlContenido}
      </a>
      <EncabezadoSitio consultarSesion={consultarSesion} />
      <main id="contenido" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <ContactoSitio mensaje={mensaje} />
      <BotonWhatsapp mensaje={mensaje} />
    </div>
  );
}
