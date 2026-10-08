import { useId } from 'react';
import { Link } from 'react-router-dom';
import type { CausaPortalResumen } from '../servicios/portal';
import { estadoLabel } from '../servicios/presentacion-causas';
import { formatMovementDate } from '../servicios/presentacion-movimientos';
import { type GrupoDeCausas, groupCausas, orNotAssigned } from '../servicios/presentacion-portal';

function GrupoCausas({ grupo }: { grupo: GrupoDeCausas }) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="space-y-3">
      <h2 id={titleId} className="text-lg font-semibold text-slate-700">
        {grupo.titulo}
      </h2>
      <ul className="space-y-3">
        {grupo.causas.map((causa) => (
          <li key={causa.id}>
            <Link
              to={`/portal/causas/${causa.id}`}
              className="block rounded-lg bg-white p-4 shadow-sm hover:shadow"
            >
              <p className="line-clamp-2 break-words font-medium text-slate-800">
                {causa.caratula}
              </p>
              <p className="mt-1 break-words text-sm text-slate-600">
                Expediente: {orNotAssigned(causa.numeroExpediente)}
              </p>
              <p className="text-sm text-slate-600">{estadoLabel(causa.estado)}</p>
              {causa.fechaUltimoMovimiento && (
                <p className="text-sm text-slate-500">
                  Último movimiento: {formatMovementDate(causa.fechaUltimoMovimiento)}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Una página de causas del cliente, en sus grupos con título (spec 004, RF-9, RF-10). Cada causa
 * es una tarjeta con enlace al detalle; la carátula se corta en dos líneas.
 */
export function ListaCausasPortal({ causas }: { causas: CausaPortalResumen[] }) {
  return (
    <div className="space-y-6">
      {groupCausas(causas).map((grupo) => (
        <GrupoCausas key={`${grupo.grupo}-${grupo.causas[0].id}`} grupo={grupo} />
      ))}
    </div>
  );
}
