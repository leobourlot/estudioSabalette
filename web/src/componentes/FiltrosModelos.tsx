import { type FormEvent, useState } from 'react';
import type { Fuero } from '../servicios/causas';
import { type ModelFilters, validateModelFilters } from '../servicios/formulario-modelo';
import type { TipoEscrito } from '../servicios/modelos-escritos';
import { JURISDICTION_OPTIONS } from '../servicios/presentacion-causas';
import { TEMPLATE_TYPE_OPTIONS } from '../servicios/presentacion-modelos';
import { ListaDeErrores } from './ListaDeErrores';

const fieldClass = 'rounded border border-slate-300 px-2 py-1.5 text-sm';
const labelClass = 'block text-sm text-slate-600';

/**
 * Filtros del listado de modelos (RF-20 a RF-22): buscador, tipo de escrito, fuero y, si
 * corresponde, "Mostrar desactivados". Los filtros se aplican al cambiar; el buscador, al
 * enviarlo. Si el texto buscado no es válido, muestra el error de la API sin aplicar el cambio.
 */
export function FiltrosModelos({
  value,
  onChange,
  showDeactivated,
}: {
  value: ModelFilters;
  onChange: (filters: ModelFilters) => void;
  /** La lista de modelos de una causa nunca ofrece los desactivados (RF-29). */
  showDeactivated: boolean;
}) {
  const [draft, setDraft] = useState(value);
  const [problems, setProblems] = useState<string[]>([]);

  function apply(next: ModelFilters) {
    setDraft(next);
    const found = validateModelFilters(next);
    setProblems(found);
    if (found.length === 0) onChange(next);
  }

  const update = (changes: Partial<ModelFilters>) => apply({ ...draft, ...changes });

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
            <label htmlFor="buscarModelos" className={labelClass}>
              Buscar
            </label>
            <input
              id="buscarModelos"
              type="search"
              placeholder="Título, descripción o texto del modelo"
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
          <label htmlFor="filtroTipoEscrito" className={labelClass}>
            Tipo de escrito
          </label>
          <select
            id="filtroTipoEscrito"
            value={draft.tipo}
            onChange={(event) => update({ tipo: event.target.value as TipoEscrito | '' })}
            className={fieldClass}
          >
            <option value="">Todos</option>
            {TEMPLATE_TYPE_OPTIONS.map(([option, label]) => (
              <option key={option} value={option}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filtroFueroModelo" className={labelClass}>
            Fuero
          </label>
          <select
            id="filtroFueroModelo"
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

        {showDeactivated && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={draft.incluirDesactivados}
              onChange={(event) => update({ incluirDesactivados: event.target.checked })}
            />
            Mostrar desactivados
          </label>
        )}
      </div>
    </div>
  );
}
