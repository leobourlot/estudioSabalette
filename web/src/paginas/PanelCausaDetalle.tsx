import { useLocation } from 'react-router-dom';
import { type Avisos, AvisosResultado } from '../componentes/AvisosResultado';

/**
 * Detalle de una causa (RF-12). Provisoria: muestra los avisos que deja el alta (RF-7,
 * RF-20); el resto del detalle llega en T36.
 */
export function PanelCausaDetalle() {
  const location = useLocation();
  const avisos = (location.state as { avisos?: Avisos } | null)?.avisos;

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-8">
      <h1 className="text-2xl font-semibold text-slate-800">Causa</h1>
      {avisos && <AvisosResultado {...avisos} />}
    </main>
  );
}
