import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FilaFallo } from '../componentes/FilaFallo';
import { FiltrosJurisprudencia } from '../componentes/FiltrosJurisprudencia';
import { useJurisprudenciaService } from '../componentes/ProveedorServicios';
import { errorMessage } from '../servicios/cliente-http';
import {
  EMPTY_RULING_FILTERS,
  type RulingFilters,
  toListQuery,
} from '../servicios/formulario-fallo';
import type { FalloPage } from '../servicios/jurisprudencia';
import { emptyListMessage } from '../servicios/presentacion-jurisprudencia';

const pageButtonClass = 'rounded border border-slate-300 px-3 py-1 disabled:opacity-50';

/**
 * Listado de jurisprudencia (RF-21 a RF-28): buscador, filtros, "Mostrar desactivados" y
 * paginado de a 20 con "Anterior" y "Siguiente", sin totales. Los filtros y la página viven en
 * el estado del componente, no en el navegador (principio 5). Cambiar un filtro o el buscador
 * vuelve a la primera página.
 */
export function PanelJurisprudencia() {
  const jurisprudencia = useJurisprudenciaService();
  const [filters, setFilters] = useState<RulingFilters>(EMPTY_RULING_FILTERS);
  const [pagina, setPagina] = useState(1);
  const [result, setResult] = useState<FalloPage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    jurisprudencia
      .listRulings(toListQuery(filters, pagina))
      .then((page) => {
        if (!active) return;
        setResult(page);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (active) setError(errorMessage(caught));
      });
    return () => {
      active = false;
    };
  }, [jurisprudencia, filters, pagina]);

  /** Cambia los filtros y vuelve a la primera página. */
  function filterBy(next: RulingFilters) {
    setFilters(next);
    setPagina(1);
  }

  const empty =
    result && result.items.length === 0
      ? emptyListMessage({ hayFallos: result.hayFallos, pagina })
      : null;

  return (
    <main className="mx-auto max-w-6xl p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Jurisprudencia</h1>
        <Link
          to="/panel/jurisprudencia/nuevo"
          className="rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Nuevo fallo
        </Link>
      </div>

      <div className="mt-6">
        <FiltrosJurisprudencia value={filters} onChange={filterBy} />
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {empty?.mensaje && <p className="mt-6 text-slate-600">{empty.mensaje}</p>}
      {empty?.ofrecerPrimeraPagina && (
        <button
          type="button"
          onClick={() => setPagina(1)}
          className="mt-6 text-sm text-slate-700 underline"
        >
          Volver a la primera página
        </button>
      )}

      {result && result.items.length > 0 && (
        <>
          <ul aria-label="Lista de fallos" className="mt-6 space-y-3">
            {result.items.map((fallo) => (
              <FilaFallo key={fallo.id} fallo={fallo} />
            ))}
          </ul>

          <nav
            aria-label="Paginación"
            className="mt-4 flex items-center justify-between text-sm text-slate-600"
          >
            <span>Página {pagina}</span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pagina <= 1}
                onClick={() => setPagina(pagina - 1)}
                className={pageButtonClass}
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={!result.haySiguiente}
                onClick={() => setPagina(pagina + 1)}
                className={pageButtonClass}
              >
                Siguiente
              </button>
            </div>
          </nav>
        </>
      )}
    </main>
  );
}
