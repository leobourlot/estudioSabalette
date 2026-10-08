import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ListaCausasPortal } from '../componentes/ListaCausasPortal';
import { Paginacion } from '../componentes/Paginacion';
import { usePortalService } from '../componentes/ProveedorServicios';
import { errorMessage } from '../servicios/cliente-http';
import type { CausaPortalResumen, PortalPage } from '../servicios/portal';
import { parsePageParam } from '../servicios/presentacion-portal';

interface Loaded {
  pagina: number;
  page: PortalPage<CausaPortalResumen> | null;
  error: string | null;
}

/**
 * Inicio del portal: las causas del cliente, en sus dos grupos y de a 20 (spec 004, RF-7 a
 * RF-12, RF-24, RF-25). La página va en la dirección. Una página inválida no pide nada, y una
 * página posterior a la última no muestra nada.
 */
export function PortalInicio() {
  const portal = usePortalService();
  const [params] = useSearchParams();
  const pagina = parsePageParam(params.get('pagina'));
  // El resultado se guarda con su página: mientras no coincide con la de la dirección, se está
  // cargando la nueva.
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (pagina === null) return;
    let active = true;
    portal
      .listCausas(pagina)
      .then((page) => {
        if (active) setLoaded({ pagina, page, error: null });
      })
      .catch((caught: unknown) => {
        if (active) setLoaded({ pagina, page: null, error: errorMessage(caught) });
      });
    return () => {
      active = false;
    };
  }, [portal, pagina]);

  const current = loaded?.pagina === pagina ? loaded : null;

  function content() {
    if (pagina === null) return null;
    if (current?.error) {
      return (
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {current.error}
        </p>
      );
    }
    const page = current?.page;
    if (!page) {
      return (
        <p role="status" className="text-slate-500">
          Cargando…
        </p>
      );
    }
    if (page.items.length === 0) {
      return page.pagina === 1 ? (
        <p className="text-slate-600">No tenés causas para consultar</p>
      ) : null;
    }
    return (
      <>
        <ListaCausasPortal causas={page.items} />
        <Paginacion
          pagina={page.pagina}
          haySiguiente={page.haySiguiente}
          hrefFor={(n) => `/portal?pagina=${n}`}
        />
      </>
    );
  }

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-4 py-6">
      <h1 className="text-2xl font-semibold text-slate-800">Mis causas</h1>
      {content()}
    </main>
  );
}
