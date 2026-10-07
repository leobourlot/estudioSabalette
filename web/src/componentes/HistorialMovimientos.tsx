import { useEffect, useState } from 'react';
import { ApiError, errorMessage } from '../servicios/cliente-http';
import {
  buildCreateMovementData,
  EMPTY_MOVEMENT_FILTERS,
  EMPTY_MOVEMENT_FORM,
  type MovementFilters,
  toListQuery,
} from '../servicios/formulario-movimiento';
import type { MovimientoPage } from '../servicios/movimientos';
import { FilaMovimiento } from './FilaMovimiento';
import { FiltrosMovimientos } from './FiltrosMovimientos';
import { FormularioMovimiento } from './FormularioMovimiento';
import { useMovimientosService } from './ProveedorServicios';

/**
 * Historial de movimientos de una causa (RF-23 a RF-27), con el alta (RF-8). Los filtros y la
 * página viven en el estado del componente, no en el navegador (principio 5). En una causa
 * desactivada solo se consulta: no se ofrece "Nuevo movimiento" (RF-28); el control real lo
 * hace la API.
 */
export function HistorialMovimientos({
  causaId,
  causaActiva,
}: {
  causaId: number;
  causaActiva: boolean;
}) {
  const movimientos = useMovimientosService();
  const [filters, setFilters] = useState<MovementFilters>(EMPTY_MOVEMENT_FILTERS);
  const [pagina, setPagina] = useState(1);
  const [reloads, setReloads] = useState(0);
  const [result, setResult] = useState<MovimientoPage | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_MOVEMENT_FORM);
  const [apiProblems, setApiProblems] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let active = true;
    movimientos
      .listMovements(causaId, toListQuery(filters, pagina))
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
  }, [movimientos, causaId, filters, pagina, reloads]);

  /** Cambia los filtros y vuelve a la primera página. */
  function filterBy(next: MovementFilters) {
    setFilters(next);
    setPagina(1);
  }

  function startCreating() {
    setForm(EMPTY_MOVEMENT_FORM);
    setApiProblems([]);
    setCreating(true);
  }

  async function create() {
    setEnviando(true);
    try {
      await movimientos.createMovement(causaId, buildCreateMovementData(form));
      setCreating(false);
      setPagina(1);
      setReloads((count) => count + 1);
    } catch (caught) {
      setApiProblems(caught instanceof ApiError ? caught.messages : [errorMessage(caught)]);
    } finally {
      setEnviando(false);
    }
  }

  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.porPagina)) : 1;
  const filtered = JSON.stringify(filters) !== JSON.stringify(EMPTY_MOVEMENT_FILTERS);

  return (
    <section aria-label="Movimientos" className="space-y-4 rounded-lg bg-white p-6 shadow">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Movimientos</h2>
        {causaActiva && !creating && (
          <button
            type="button"
            onClick={startCreating}
            className="rounded bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
          >
            Nuevo movimiento
          </button>
        )}
      </div>

      {creating && (
        <div className="rounded border border-slate-200 p-4">
          <h3 className="mb-3 font-medium text-slate-800">Nuevo movimiento</h3>
          <FormularioMovimiento
            value={form}
            onChange={setForm}
            submitLabel="Guardar movimiento"
            onSubmit={create}
            onCancel={() => setCreating(false)}
            apiProblems={apiProblems}
            enviando={enviando}
          />
        </div>
      )}

      <FiltrosMovimientos value={filters} onChange={filterBy} />

      {error && (
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {result && result.items.length === 0 && (
        <p className="text-slate-600">
          {filtered ? 'No hay movimientos que coincidan.' : 'Todavía no hay movimientos.'}
        </p>
      )}

      {result && result.items.length > 0 && (
        <>
          <ul aria-label="Lista de movimientos" className="space-y-3">
            {result.items.map((movimiento) => (
              <FilaMovimiento key={movimiento.id} movimiento={movimiento} causaId={causaId} />
            ))}
          </ul>

          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>
              Página {pagina} de {totalPages} · {result.total}{' '}
              {result.total === 1 ? 'movimiento' : 'movimientos'}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pagina <= 1}
                onClick={() => setPagina(pagina - 1)}
                className="rounded border border-slate-300 px-3 py-1 disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={pagina >= totalPages}
                onClick={() => setPagina(pagina + 1)}
                className="rounded border border-slate-300 px-3 py-1 disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
