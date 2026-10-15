import { useEffect, useState } from 'react';
import {
  fetchSessionSection,
  type SeccionSesion,
  sessionAccessLink,
} from '../servicios/estado-sesion';
import { PRIMARY_BUTTON } from './estilos-sitio';

interface AccesoIngresoProps {
  /** Los tests pasan una consulta simulada; el sitio usa la de servicios/estado-sesion.ts. */
  consultar?: () => Promise<SeccionSesion | null>;
}

/**
 * Acceso del encabezado del sitio público (spec 007, RF-29 a RF-32): "Ingresar" mientras no hay
 * sesión, mientras se consulta y si no se puede saber; "Ir a mi portal" o "Ir al panel" si se
 * confirma una sesión abierta. Es lo único que cambia en el sitio por tener sesión, y no muestra
 * ningún dato de la cuenta. Es un enlace común: al elegirlo carga la aplicación, que decide.
 * Consulta al montarse y al volver atrás con el navegador desde su caché (pageshow).
 */
export function AccesoIngreso({ consultar = fetchSessionSection }: AccesoIngresoProps) {
  const [seccion, setSeccion] = useState<SeccionSesion | null>(null);

  useEffect(() => {
    let active = true;
    const check = () => {
      consultar()
        .catch(() => null)
        .then((result) => {
          if (active) setSeccion(result);
        });
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) check();
    };

    check();
    window.addEventListener('pageshow', onPageShow);
    return () => {
      active = false;
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [consultar]);

  const link = sessionAccessLink(seccion);
  return (
    <a href={link.href} className={`whitespace-nowrap ${PRIMARY_BUTTON}`}>
      {link.label}
    </a>
  );
}
