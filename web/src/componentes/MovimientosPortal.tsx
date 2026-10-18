import { useId } from 'react';
import type { MovimientoCliente, PortalPage } from '../servicios/portal';
import { ERROR_ALERT, SECTION_TITLE } from './estilos-aplicacion';
import { LineaDeTiempo } from './LineaDeTiempo';
import { Paginacion } from './Paginacion';

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
 * RF-20, RF-23, RF-24), en una línea de tiempo (spec 008, RF-18). Una página inválida o
 * posterior a la última no muestra nada (RF-25).
 */
export function MovimientosPortal({ causaId, pagina, page, error }: MovimientosPortalProps) {
  const titleId = useId();
  const base = `/portal/causas/${encodeURIComponent(causaId)}`;

  function content() {
    if (pagina === null) return null;
    if (error) {
      return (
        <p role="alert" className={ERROR_ALERT}>
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
        <LineaDeTiempo
          movimientos={page.items}
          hrefFor={(movimiento) => `${base}/movimientos/${movimiento.id}?pagina=${page.pagina}`}
        />
        <Paginacion
          pagina={page.pagina}
          haySiguiente={page.haySiguiente}
          hrefFor={(n) => `${base}?pagina=${n}`}
        />
      </>
    );
  }

  return (
    <section aria-labelledby={titleId} className="space-y-4">
      <h2 id={titleId} className={SECTION_TITLE}>
        Movimientos
      </h2>
      {content()}
    </section>
  );
}
