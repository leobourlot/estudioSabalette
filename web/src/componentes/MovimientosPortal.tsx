import { useId } from 'react';
import type { MovimientoCliente, PortalPage } from '../servicios/portal';
import { Paginacion } from './Paginacion';
import { TarjetaMovimientoPortal } from './TarjetaMovimientoPortal';

interface MovimientosPortalProps {
  causaId: string;
  /** Página pedida; null si la dirección trae una inválida. */
  pagina: number | null;
  /** La página recibida, o null mientras se carga. */
  page: PortalPage<MovimientoCliente> | null;
  error: string | null;
}

/**
 * Movimientos que el cliente puede ver de una causa, en el orden que envía la API (spec 004,
 * RF-20, RF-23, RF-24). Una página inválida o posterior a la última no muestra nada (RF-25).
 */
export function MovimientosPortal({ causaId, pagina, page, error }: MovimientosPortalProps) {
  const titleId = useId();
  const base = `/portal/causas/${encodeURIComponent(causaId)}`;

  function content() {
    if (pagina === null) return null;
    if (error) {
      return (
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      );
    }
    if (!page) {
      return (
        <p role="status" className="text-slate-500">
          Cargando…
        </p>
      );
    }
    if (page.items.length === 0) {
      return page.pagina === 1 ? (
        <p className="text-slate-600">Todavía no hay movimientos para mostrar</p>
      ) : null;
    }
    return (
      <>
        <div className="space-y-3">
          {page.items.map((movimiento) => (
            <TarjetaMovimientoPortal
              key={movimiento.id}
              movimiento={movimiento}
              href={`${base}/movimientos/${movimiento.id}?pagina=${page.pagina}`}
            />
          ))}
        </div>
        <Paginacion
          pagina={page.pagina}
          haySiguiente={page.haySiguiente}
          hrefFor={(n) => `${base}?pagina=${n}`}
        />
      </>
    );
  }

  return (
    <section aria-labelledby={titleId} className="space-y-3">
      <h2 id={titleId} className="text-lg font-semibold text-slate-700">
        Movimientos
      </h2>
      {content()}
    </section>
  );
}
