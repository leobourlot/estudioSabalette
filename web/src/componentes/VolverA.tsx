import { TEXT_LINK } from './estilos-sitio';

interface VolverAProps {
  href: string;
  children: string;
}

/** "Volver a servicios" o "Volver a abogadas": un enlace común a la sección del inicio (RF-7). */
export function VolverA({ href, children }: VolverAProps) {
  return (
    <a href={href} className={`gap-2 ${TEXT_LINK}`}>
      <span aria-hidden="true">←</span>
      {children}
    </a>
  );
}
