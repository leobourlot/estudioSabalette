import { APP_TITLES } from '../servicios/rutas-sitio';
import { DisenoSeccion } from './DisenoSeccion';
import { useTituloDocumento } from './useTituloDocumento';

/**
 * Diseño del panel del estudio: administradores y abogados (causas, jurisprudencia, modelos de
 * escritos y cuentas son para ambos), con el menú lateral del panel (spec 008, RF-5 y RF-6).
 */
export function DisenoPanel() {
  useTituloDocumento(APP_TITLES.panel);
  return <DisenoSeccion section="panel" />;
}
