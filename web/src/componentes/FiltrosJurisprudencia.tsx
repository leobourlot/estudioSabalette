import { type FormEvent, useState } from 'react';
import type { Fuero } from '../servicios/causas';
import {
  MIN_FALLO_DATE,
  type RulingFilters,
  todayInBuenosAires,
  validateRulingFilters,
} from '../servicios/formulario-fallo';
import { JURISDICTION_OPTIONS } from '../servicios/presentacion-causas';
import { ListaDeErrores } from './ListaDeErrores';
import { SelectorPalabrasClave } from './SelectorPalabrasClave';

const fieldClass = 'rounded border border-slate-300 px-2 py-1.5 text-sm';
const labelClass = 'block text-sm text-slate-600';

/**
 * Filtros del listado de jurisprudencia (RF-23 a RF-26): buscador, palabras clave del
 * catálogo, fuero, rango de fechas del fallo y "Mostrar desactivados". Los filtros se aplican
 * al cambiar; el buscador, al enviarlo. Si el texto buscado o las fechas no son válidos,
 * muestra el error de la API sin aplicar el cambio.
 */
export function FiltrosJurisprudencia({
  value,
  onChange,
}: {
  value: RulingFilters;
  onChange: (filters: RulingFilters) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [problems, setProblems] = useState<string[]>([]);
  const today = todayInBuenosAires();

  function apply(next: RulingFilters) {
    setDraft(next);
    const found = validateRulingFilters(next);
    setProblems(found);
    if (found.length === 0) onChange(next);
  }

  const update = (changes: Partial<RulingFilters>) => apply({ ...draft, ...changes });

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
            <label htmlFor="buscarFallos" className={labelClass}>
              Buscar
            </label>
            <input
              id="buscarFallos"
              type="search"
              placeholder="Carátula, tribunal, número, sumario o palabra clave"
              value={draft.buscar}
              onChange={(event) => setDraft({ ...draft, buscar: event.target.value })}
              className={`w-80 ${fieldClass}`}
            />
          </div>
          <button type="submit" className="rounded border border-slate-300 px-3 py-1.5 text-sm">
            Buscar
          </button>
        </form>

        <div>
          <label htmlFor="filtroFuero" className={labelClass}>
            Fuero
          </label>
          <select
            id="filtroFuero"
            value={draft.fuero}
            onChange={(event) => update({ fuero: event.target.value as Fuero | '' })}
            className={fieldClass}
          >
            <option value="">Todos</option>
            {JURISDICTION_OPTIONS.map(([option, label]) => (
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
            min={MIN_FALLO_DATE}
            max={today}
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
            min={MIN_FALLO_DATE}
            max={today}
            value={draft.hasta}
            onChange={(event) => update({ hasta: event.target.value })}
            className={fieldClass}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={draft.incluirDesactivados}
            onChange={(event) => update({ incluirDesactivados: event.target.checked })}
          />
          Mostrar desactivados
        </label>
      </div>

      <div className="max-w-xl">
        <SelectorPalabrasClave
          modo="filtro"
          id="filtroPalabrasClave"
          label="Palabras clave"
          value={draft.palabrasClave}
          onChange={(palabrasClave) => update({ palabrasClave })}
        />
      </div>
    </div>
  );
}
