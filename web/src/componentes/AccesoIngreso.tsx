import { useEffect, useState } from 'react';
import {
  fetchSessionSection,
  type SeccionSesion,
  sessionAccessLink,
} from '../servicios/estado-sesion';
import { PRIMARY_BUTTON } from './estilos-sitio';

/**
 * La sección a la que lleva la sesión abierta, o null (spec 007, RF-29 a RF-31). Arranca en null
 * (también en el HTML prerenderizado), consulta al montarse y vuelve a consultar al volver atrás
 * con el navegador desde su caché (pageshow). El encabezado la consulta una sola vez y la pasa a
 * los dos lugares donde puede estar el acceso.
 */
export function useSeccionSesion(
  consultar: () => Promise<SeccionSesion | null> = fetchSessionSection,
): SeccionSesion | null {
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

  return seccion;
}

interface AccesoIngresoProps {
  seccion: SeccionSesion | null;
  /** Clases del lugar donde va: el encabezado o el menú plegado (RF-4). */
  className?: string;
}

/**
 * Acceso de ingreso del sitio público (spec 007, RF-29 a RF-32): "Ingresar" sin sesión o mientras
 * no se sabe, "Ir a mi portal" o "Ir al panel" con una sesión abierta. Es lo único que cambia en
 * el sitio por tener sesión, y no muestra ningún dato de la cuenta. Es un enlace común: al
 * elegirlo carga la aplicación, que decide.
 */
export function AccesoIngreso({ seccion, className = '' }: AccesoIngresoProps) {
  const link = sessionAccessLink(seccion);
  return (
    <a href={link.href} className={`whitespace-nowrap ${PRIMARY_BUTTON} ${className}`}>
      {link.label}
    </a>
  );
}
