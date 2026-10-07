import { type FormEvent, useState } from 'react';
import { type MovementFilters, validateMovementFilters } from '../servicios/formulario-movimiento';
import type { FiltroVisibilidad, TipoMovimiento } from '../servicios/movimientos';
import {
  MOVEMENT_TYPE_OPTIONS,
  VISIBILITY_FILTER_OPTIONS,
} from '../servicios/presentacion-movimientos';
import { ListaDeErrores } from './ListaDeErrores';

const fieldClass = 'rounded border border-slate-300 px-2 py-1.5 text-sm';
const labelClass = 'block text-sm text-slate-600';

/**
 * Filtros del historial de movimientos (RF-25, RF-27): buscador, tipo, visibilidad, rango de
 * fechas y "Ocultar anulados". Los filtros se aplican al cambiar; el buscador, al enviarlo.
 * Si desde > hasta, muestra el error de la API sin aplicar el cambio (RF-26).
 */
export function FiltrosMovimientos({
  value,
  onChange,
}: {
  value: MovementFilters;
  onChange: (filters: MovementFilters) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [problems, setProblems] = useState<string[]>([]);

  function apply(next: MovementFilters) {
    setDraft(next);
    const found = validateMovementFilters(next);
    setProblems(found);
    if (found.length === 0) onChange(next);
  }

  const update = (changes: Partial<MovementFilters>) => apply({ ...draft, ...changes });

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    apply(draft);
  }

  return (
    <div className="space-y-3">
      <ListaDeErrores messages={problems} />
      <div className="flex flex-wrap items-end gap-4">
        <form onSubmit={handleSearch} className="flex items-end gap-2">
          <div>
            <label htmlFor="buscarMovimientos" className={labelClass}>
              Buscar
            </label>
            <input
              id="buscarMovimientos"
              type="search"
              placeholder="Descripción o texto para el cliente"
              value={draft.buscar}
              onChange={(event) => setDraft({ ...draft, buscar: event.target.value })}
              className={`w-72 ${fieldClass}`}
            />
          </div>
          <button type="submit" className="rounded border border-slate-300 px-3 py-1.5 text-sm">
            Buscar
          </button>
        </form>

        <div>
          <label htmlFor="filtroTipo" className={labelClass}>
            Tipo
          </label>
          <select
            id="filtroTipo"
            value={draft.tipo}
            onChange={(event) => update({ tipo: event.target.value as TipoMovimiento | '' })}
            className={fieldClass}
          >
            <option value="">Todos</option>
            {MOVEMENT_TYPE_OPTIONS.map(([option, label]) => (
              <option key={option} value={option}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filtroVisibilidad" className={labelClass}>
            Visibilidad
          </label>
          <select
            id="filtroVisibilidad"
            value={draft.visibilidad}
            onChange={(event) => update({ visibilidad: event.target.value as FiltroVisibilidad })}
            className={fieldClass}
          >
            {VISIBILITY_FILTER_OPTIONS.map(([option, label]) => (
              <option key={option} value={option}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filtroDesde" className={labelClass}>
            Desde
          </label>
          <input
            id="filtroDesde"
            type="date"
            value={draft.desde}
            onChange={(event) => update({ desde: event.target.value })}
            className={fieldClass}
          />
        </div>

        <div>
          <label htmlFor="filtroHasta" className={labelClass}>
            Hasta
          </label>
          <input
            id="filtroHasta"
            type="date"
            value={draft.hasta}
            onChange={(event) => update({ hasta: event.target.value })}
            className={fieldClass}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={draft.ocultarAnulados}
            onChange={(event) => update({ ocultarAnulados: event.target.checked })}
          />
          Ocultar anulados
        </label>
      </div>
    </div>
  );
}
