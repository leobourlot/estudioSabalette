import { DisenoSeccion } from './DisenoSeccion';

/** Diseño del panel del estudio: administradores y abogados (la gestión de cuentas es para ambos). */
export function DisenoPanel() {
  return (
    <DisenoSeccion
      title="Panel"
      links={[
        { to: '/panel', label: 'Inicio', end: true },
        { to: '/panel/usuarios', label: 'Cuentas' },
        { to: '/panel/mi-cuenta', label: 'Mi cuenta' },
      ]}
    />
  );
}
