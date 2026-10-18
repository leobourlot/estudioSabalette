import { useId } from 'react';
import type { PartePortal } from '../servicios/portal';
import { rolProcesalLabel } from '../servicios/presentacion-causas';
import { SECTION_TITLE, STATUS_BADGE } from './estilos-aplicacion';

/**
 * Partes vigentes de la causa, en el orden que envía la API, con su rol procesal y "Vos" en la
 * del cliente que consulta (spec 004, RF-14). Sin documentos ni otros datos (RF-15).
 */
export function PartesPortal({ partes }: { partes: PartePortal[] }) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="space-y-3">
      <h2 id={titleId} className={SECTION_TITLE}>
        Partes
      </h2>
      <ul className="divide-y divide-slate-200">
        {partes.map((parte, index) => (
          <li key={index} className="flex flex-wrap items-center gap-2 py-2 text-sm">
            <span className="break-words text-slate-800">{parte.nombre}</span>
            <span className="text-slate-500">{rolProcesalLabel(parte.rol)}</span>
            {parte.esVos && <span className={STATUS_BADGE}>Vos</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}
