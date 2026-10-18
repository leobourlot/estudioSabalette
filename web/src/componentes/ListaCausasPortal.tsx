import { useId } from 'react';
import { Link } from 'react-router-dom';
import type { CausaPortalResumen } from '../servicios/portal';
import { estadoLabel } from '../servicios/presentacion-causas';
import { formatMovementDate } from '../servicios/presentacion-movimientos';
import { type GrupoDeCausas, groupCausas, orNotAssigned } from '../servicios/presentacion-portal';
import { AparecerAlCargar } from './AparecerAlCargar';
import { CARD, SECONDARY_BUTTON, SECTION_TITLE, STATUS_BADGE } from './estilos-aplicacion';

function TarjetaCausa({ causa }: { causa: CausaPortalResumen }) {
  return (
    <article
      className={`space-y-3 p-5 transition-shadow motion-safe:hover:shadow-md motion-reduce:transition-none ${CARD}`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="line-clamp-2 break-words font-titulos text-xl font-semibold text-estudio-oscuro">
          {causa.caratula}
        </h3>
        <span className={`shrink-0 ${STATUS_BADGE}`}>{estadoLabel(causa.estado)}</span>
      </div>
      <p className="break-words text-sm text-slate-600">
        Expte. {orNotAssigned(causa.numeroExpediente)}
      </p>
      {causa.fechaUltimoMovimiento && (
        <div className="rounded-lg bg-slate-100 px-4 py-3">
          <p className="text-xs font-semibold text-slate-700">Último movimiento</p>
          <p className="text-sm text-slate-800">
            {formatMovementDate(causa.fechaUltimoMovimiento)}
          </p>
        </div>
      )}
      <Link to={`/portal/causas/${causa.id}`} className={SECONDARY_BUTTON}>
        Ver detalle <span className="sr-only">de {causa.caratula}</span>
      </Link>
    </article>
  );
}

function GrupoCausas({ grupo }: { grupo: GrupoDeCausas }) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="space-y-4">
      <h2 id={titleId} className={`border-b border-slate-300 pb-2 ${SECTION_TITLE}`}>
        {grupo.titulo}
      </h2>
      <ul className="space-y-4">
        {grupo.causas.map((causa, index) => (
          <AparecerAlCargar key={causa.id} como="li" indice={index}>
            <TarjetaCausa causa={causa} />
          </AparecerAlCargar>
        ))}
      </ul>
    </section>
  );
}

/**
 * Una página de causas del cliente, en sus grupos con título (spec 004, RF-9, RF-10). Cada causa
 * va en su propia tarjeta, con la carátula en dos líneas, el estado, el expediente, el último
 * movimiento si lo tiene y "Ver detalle", que para el lector de pantalla suma la carátula (spec
 * 008, RF-15 y RF-16). Las tarjetas aparecen escalonadas (RF-26).
 */
export function ListaCausasPortal({ causas }: { causas: CausaPortalResumen[] }) {
  return (
    <div className="space-y-8">
      {groupCausas(causas).map((grupo) => (
        <GrupoCausas key={`${grupo.grupo}-${grupo.causas[0].id}`} grupo={grupo} />
      ))}
    </div>
  );
}
