import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { usePortalService } from '../componentes/ProveedorServicios';
import { TextoLiteral } from '../componentes/TextoLiteral';
import { errorMessage } from '../servicios/cliente-http';
import type { MovimientoClienteDetalle } from '../servicios/portal';
import { formatMovementDate, tipoMovimientoLabel } from '../servicios/presentacion-movimientos';
import { movementLegend, parsePageParam } from '../servicios/presentacion-portal';

interface Loaded {
  key: string;
  movimiento: MovimientoClienteDetalle | null;
  error: string | null;
}

/**
 * Un movimiento abierto por el cliente (spec 004, RF-22): fecha, tipo, leyenda, el texto
 * completo y la carátula de su causa, con "Volver a la causa" a la misma página de movimientos.
 * Ante un movimiento oculto, inexistente, de otra causa o mal formado, la API responde el mismo
 * 404 y la página muestra solo ese mensaje (RF-29).
 */
export function PortalMovimientoDetalle() {
  const portal = usePortalService();
  const { id: causaId = '', movimientoId = '' } = useParams();
  const [params] = useSearchParams();
  const pagina = parsePageParam(params.get('pagina')) ?? 1;
  const key = `${causaId}/${movimientoId}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    let active = true;
    portal
      .getMovimiento(causaId, movimientoId)
      .then((movimiento) => {
        if (active) setLoaded({ key, movimiento, error: null });
      })
      .catch((caught: unknown) => {
        if (active) setLoaded({ key, movimiento: null, error: errorMessage(caught) });
      });
    return () => {
      active = false;
    };
  }, [portal, causaId, movimientoId, key]);

  const current = loaded?.key === key ? loaded : null;
  const back = (
    <Link
      to={`/portal/causas/${encodeURIComponent(causaId)}?pagina=${pagina}`}
      className="text-sm text-slate-700 underline"
    >
      Volver a la causa
    </Link>
  );

  if (!current) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-6">
        <p role="status" className="text-slate-500">
          Cargando…
        </p>
      </main>
    );
  }

  const { movimiento } = current;
  if (!movimiento) {
    return (
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {current.error}
        </p>
        {back}
      </main>
    );
  }

  const legend = movementLegend(movimiento);
  return (
    <main className="mx-auto max-w-5xl space-y-4 px-4 py-6">
      {back}
      <p className="break-words text-sm text-slate-600">{movimiento.causa.caratula}</p>
      <article className="space-y-3 rounded-lg bg-white p-4 shadow-sm">
        <h1 className="flex flex-wrap items-center gap-2 text-lg">
          <span className="font-semibold text-slate-800">
            {formatMovementDate(movimiento.fecha)}
          </span>
          <span className="text-slate-600">{tipoMovimientoLabel(movimiento.tipo)}</span>
          {legend && (
            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              {legend}
            </span>
          )}
        </h1>
        <TextoLiteral
          texto={movimiento.texto}
          className={`text-slate-800 ${movimiento.anulado ? 'line-through' : ''}`}
        />
      </article>
    </main>
  );
}
