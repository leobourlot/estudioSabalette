import { useEffect, useState } from 'react';
import { errorMessage } from '../servicios/cliente-http';
import { type ModelFilters, toListQuery } from '../servicios/formulario-modelo';
import type { ModeloPage, ModeloResumen } from '../servicios/modelos-escritos';
import { emptyModelListMessage } from '../servicios/presentacion-modelos';
import { INITIAL_MODEL_LIST_STATE, type ModelListState } from '../servicios/sesion-escrito';
import { FilaModelo, type ModelRowLink } from './FilaModelo';
import { FiltrosModelos } from './FiltrosModelos';
import { useModelosService } from './ProveedorServicios';

const pageButtonClass = 'rounded border border-slate-300 px-3 py-1 disabled:opacity-50';

interface ListaModelosProps {
  /** Si ofrece "Mostrar desactivados": en la sección sí, en una causa nunca (RF-29). */
  showDeactivated: boolean;
  /**
   * A dónde lleva cada fila. Recibe los filtros y la página del momento, para que el destino
   * pueda volver a la lista tal como estaba (RF-32).
   */
  rowLink: (modelo: ModeloResumen, state: ModelListState) => ModelRowLink;
  /** Filtros y página con los que abre; por defecto, la primera página sin filtros. */
  initialState?: ModelListState;
}

/**
 * Lista de modelos de escritos (RF-18 a RF-24): buscador, filtros y paginado de a 20 con
 * "Anterior" y "Siguiente", sin totales. La usan la sección de modelos y la lista de modelos de
 * una causa (RF-29). Los filtros y la página viven en el estado del componente, no en el
 * navegador (principio 5). Cambiar un filtro o el buscador vuelve a la primera página.
 */
export function ListaModelos({
  showDeactivated,
  rowLink,
  initialState = INITIAL_MODEL_LIST_STATE,
}: ListaModelosProps) {
  const modelos = useModelosService();
  const [filters, setFilters] = useState<ModelFilters>(initialState.filtros);
  const [pagina, setPagina] = useState(initialState.pagina);
  const [result, setResult] = useState<ModeloPage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    modelos
      .listModels(toListQuery(filters, pagina))
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
  }, [modelos, filters, pagina]);

  /** Cambia los filtros y vuelve a la primera página. */
  function filterBy(next: ModelFilters) {
    setFilters(next);
    setPagina(1);
  }

  const empty =
    result && result.items.length === 0
      ? emptyModelListMessage({ hayModelos: result.hayModelos, pagina })
      : null;

  return (
    <div>
      <FiltrosModelos value={filters} onChange={filterBy} showDeactivated={showDeactivated} />

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
          <ul aria-label="Lista de modelos" className="mt-6 space-y-3">
            {result.items.map((modelo) => (
              <FilaModelo
                key={modelo.id}
                modelo={modelo}
                link={rowLink(modelo, { filtros: filters, pagina })}
              />
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
    </div>
  );
}
