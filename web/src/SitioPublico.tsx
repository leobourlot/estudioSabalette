import { domAnimation, LazyMotion } from 'motion/react';
import { RutasSitio } from './RutasSitio';

/**
 * El árbol del sitio público (spec 007). No monta ProveedorSesion ni ProveedorServicios: no
 * consulta los datos de la cuenta, no extiende la sesión ni tiene control de inactividad (RF-31,
 * RF-32 y RF-41). Lo único que sabe de la sesión lo consulta el encabezado. LazyMotion carga solo
 * las funciones de animación que usa el sitio (RF-45). Lo usan el arranque en el navegador
 * (entrada-sitio.tsx) y el prerenderizado (entrada-servidor.tsx), cada uno con su router.
 */
export function SitioPublico() {
  return (
    <LazyMotion features={domAnimation} strict>
      <RutasSitio />
    </LazyMotion>
  );
}
