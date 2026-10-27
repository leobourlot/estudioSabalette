import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CARD, ERROR_ALERT, PAGE, TEXT_LINK } from '../componentes/estilos-aplicacion';
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
 * 404 y la página muestra solo ese mensaje (RF-29). El movimiento va en una tarjeta, con la misma
 * presentación de la fecha, el tipo y la leyenda que en la línea de tiempo (spec 008, RF-20).
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
      className={`text-sm ${TEXT_LINK}`}
    >
      Volver a la causa
    </Link>
  );

  if (!current) {
    return (
      <main className={PAGE}>
        <p role="status" className="text-slate-600">
          Cargando…
        </p>
      </main>
    );
  }

  const { movimiento } = current;
  if (!movimiento) {
    return (
      <main className={PAGE}>
        <p role="alert" className={ERROR_ALERT}>
          {current.error}
        </p>
        {back}
      </main>
    );
  }

  const legend = movementLegend(movimiento);
  return (
    <main className={PAGE}>
      {back}
      <p className="break-words font-titulos text-lg font-semibold text-estudio-oscuro">
        {movimiento.causa.caratula}
      </p>
      <article className={`space-y-3 p-6 ${CARD}`}>
        <h1 className="flex flex-wrap items-center gap-2 text-lg">
          <span className="font-semibold text-estudio-oscuro">
            {formatMovementDate(movimiento.fecha)}
          </span>
          <span className="text-slate-600">{tipoMovimientoLabel(movimiento.tipo)}</span>
          {legend && (
            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              {legend}
            </span>
          )}
        </h1>
        <TextoLiteral texto={movimiento.texto} className="text-slate-800" />
      </article>
    </main>
  );
}
