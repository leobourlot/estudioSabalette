import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DatosCausaPortal } from '../componentes/DatosCausaPortal';
import { PartesPortal } from '../componentes/PartesPortal';
import { usePortalService } from '../componentes/ProveedorServicios';
import { errorMessage } from '../servicios/cliente-http';
import type { CausaPortalDetalle } from '../servicios/portal';

interface Loaded {
  causaId: string;
  causa: CausaPortalDetalle | null;
  error: string | null;
}

/**
 * Detalle de una causa del cliente (spec 004, RF-13 a RF-17): carátula completa, datos, partes y
 * responsable. El id va tal como está en la dirección: ante una causa ajena, desactivada,
 * inexistente o mal formada, la API responde el mismo 404 y la página muestra solo ese mensaje
 * (RF-28).
 */
export function PortalCausaDetalle() {
  const portal = usePortalService();
  const causaId = useParams().id ?? '';
  const [loaded, setLoaded] = useState<Loaded | null>(null);

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

  const current = loaded?.causaId === causaId ? loaded : null;

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
    </main>
  );
}
