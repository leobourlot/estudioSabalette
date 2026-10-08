import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { DatosCausaPortal } from '../componentes/DatosCausaPortal';
import { MovimientosPortal } from '../componentes/MovimientosPortal';
import { PartesPortal } from '../componentes/PartesPortal';
import { usePortalService } from '../componentes/ProveedorServicios';
import { errorMessage } from '../servicios/cliente-http';
import type { CausaPortalDetalle, MovimientoCliente, PortalPage } from '../servicios/portal';
import { parsePageParam } from '../servicios/presentacion-portal';

interface Loaded {
  causaId: string;
  causa: CausaPortalDetalle | null;
  error: string | null;
}

interface LoadedMovements {
  key: string;
  page: PortalPage<MovimientoCliente> | null;
  error: string | null;
}

/**
 * Detalle de una causa del cliente (spec 004, RF-13 a RF-17): carátula completa, datos, partes y
 * responsable, y debajo sus movimientos de la página indicada en la dirección (RF-20 a RF-24).
 * El id va tal como está en la dirección: ante una causa ajena, desactivada, inexistente o mal
 * formada, la API responde el mismo 404 y la página muestra solo ese mensaje (RF-28). Cada
 * resultado se guarda con lo que se pidió: mientras no coincide con la dirección, se está
 * cargando lo nuevo.
 */
export function PortalCausaDetalle() {
  const portal = usePortalService();
  const causaId = useParams().id ?? '';
  const [params] = useSearchParams();
  const pagina = parsePageParam(params.get('pagina'));
  const movementsKey = `${causaId}?${pagina}`;
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [movements, setMovements] = useState<LoadedMovements | null>(null);

  useEffect(() => {
    let active = true;
    portal
      .getCausa(causaId)
      .then((causa) => {
        if (active) setLoaded({ causaId, causa, error: null });
      })
      .catch((caught: unknown) => {
        if (active) setLoaded({ causaId, causa: null, error: errorMessage(caught) });
      });
    return () => {
      active = false;
    };
  }, [portal, causaId]);

  // Con una página inválida en la dirección, los movimientos no se piden (RF-25).
  useEffect(() => {
    if (pagina === null) return;
    let active = true;
    portal
      .listMovimientos(causaId, pagina)
      .then((page) => {
        if (active) setMovements({ key: movementsKey, page, error: null });
      })
      .catch((caught: unknown) => {
        if (active) setMovements({ key: movementsKey, page: null, error: errorMessage(caught) });
      });
    return () => {
      active = false;
    };
  }, [portal, causaId, pagina, movementsKey]);

  const current = loaded?.causaId === causaId ? loaded : null;
  const currentMovements = movements?.key === movementsKey ? movements : null;

  if (!current) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-6">
        <p role="status" className="text-slate-500">
          Cargando…
        </p>
      </main>
    );
  }

  const { causa } = current;
  if (!causa) {
    return (
      <main className="mx-auto max-w-5xl space-y-4 px-4 py-6">
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {current.error}
        </p>
        <Link to="/portal" className="text-sm text-slate-700 underline">
          Volver a mis causas
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <Link to="/portal" className="text-sm text-slate-700 underline">
        Volver a mis causas
      </Link>
      <h1 className="break-words text-2xl font-semibold text-slate-800">{causa.caratula}</h1>
      <DatosCausaPortal causa={causa} />
      <PartesPortal partes={causa.partes} />
      {causa.responsable && (
        <p className="text-sm text-slate-700">
          Responsable de la causa: {causa.responsable.nombre} {causa.responsable.apellido}
        </p>
      )}
      <MovimientosPortal
        causaId={causaId}
        pagina={pagina}
        page={currentMovements?.page ?? null}
        error={currentMovements?.error ?? null}
      />
    </main>
  );
}
