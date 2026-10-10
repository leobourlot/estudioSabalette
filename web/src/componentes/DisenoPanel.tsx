import { DisenoSeccion } from './DisenoSeccion';

/**
 * Diseño del panel del estudio: administradores y abogados (causas, jurisprudencia y cuentas
 * son para ambos).
 */
export function DisenoPanel() {
  return (
    <DisenoSeccion
      title="Panel"
      links={[
        { to: '/panel', label: 'Inicio', end: true },
        { to: '/panel/causas', label: 'Causas' },
        { to: '/panel/jurisprudencia', label: 'Jurisprudencia' },
        { to: '/panel/usuarios', label: 'Cuentas' },
        { to: '/panel/mi-cuenta', label: 'Mi cuenta' },
      ]}
    />
  );
}
