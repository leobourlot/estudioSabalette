import { useId } from 'react';
import type { CausaPortalDetalle } from '../servicios/portal';
import { estadoLabel, fueroLabel, incidentLabel } from '../servicios/presentacion-causas';
import { orNotAssigned } from '../servicios/presentacion-portal';

/**
 * Datos de la causa que ve el cliente (spec 004, RF-13): número de expediente y juzgado (o "Sin
 * asignar"), fuero, estado y, si es incidente, la leyenda del expediente principal.
 */
export function DatosCausaPortal({ causa }: { causa: CausaPortalDetalle }) {
  const titleId = useId();
  const incident = incidentLabel(causa);
  const rows: [string, string][] = [
    ['Expediente', orNotAssigned(causa.numeroExpediente)],
    ['Juzgado', orNotAssigned(causa.juzgado)],
    ['Fuero', fueroLabel(causa.fuero)],
    ['Estado', estadoLabel(causa.estado)],
  ];
  return (
    <section aria-labelledby={titleId} className="rounded-lg bg-white p-4 shadow-sm">
      <h2 id={titleId} className="sr-only">
        Datos de la causa
      </h2>
      <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-slate-500">{label}</dt>
            <dd className="break-words text-slate-800">{value}</dd>
          </div>
        ))}
      </dl>
      {incident && <p className="mt-3 text-sm text-slate-600">{incident}</p>}
    </section>
  );
}
