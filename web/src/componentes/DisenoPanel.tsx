import { APP_TITLES } from '../servicios/rutas-sitio';
import { DisenoSeccion } from './DisenoSeccion';
import { useTituloDocumento } from './useTituloDocumento';

/**
 * Diseño del panel del estudio: administradores y abogados (causas, jurisprudencia, modelos de
 * escritos y cuentas son para ambos).
 */
export function DisenoPanel() {
  useTituloDocumento(APP_TITLES.panel);
  return (
    <DisenoSeccion
      title="Panel"
      links={[
        { to: '/panel', label: 'Inicio', end: true },
        { to: '/panel/causas', label: 'Causas' },
        { to: '/panel/jurisprudencia', label: 'Jurisprudencia' },
        { to: '/panel/modelos', label: 'Modelos' },
        { to: '/panel/usuarios', label: 'Cuentas' },
        { to: '/panel/mi-cuenta', label: 'Mi cuenta' },
      ]}
    />
  );
}
