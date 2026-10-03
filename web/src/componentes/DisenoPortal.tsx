import { DisenoSeccion } from './DisenoSeccion';

/** Diseño del portal de clientes. */
export function DisenoPortal() {
  return (
    <DisenoSeccion
      title="Portal de clientes"
      links={[
        { to: '/portal', label: 'Mis causas', end: true },
        { to: '/portal/mi-cuenta', label: 'Mi cuenta' },
      ]}
    />
  );
}
