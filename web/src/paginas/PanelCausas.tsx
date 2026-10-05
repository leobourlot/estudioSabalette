import { type FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCausasService } from '../componentes/ProveedorServicios';
import type {
  CausaPage,
  EstadoCausa,
  Fuero,
  IntegranteResumen,
  ListCausasQuery,
} from '../servicios/causas';
import { errorMessage } from '../servicios/cliente-http';
import {
  CASE_STATUS_OPTIONS,
  estadoLabel,
  fueroLabel,
  incidentLabel,
  JURISDICTION_OPTIONS,
  memberName,
} from '../servicios/presentacion-causas';
import { EMPTY_VALUE } from '../servicios/presentacion';

const selectClass = 'rounded border border-slate-300 px-2 py-1.5 text-sm';

const CHECKBOX_FILTERS: [keyof ListCausasQuery, string][] = [
  ['mias', 'Solo mis causas'],
  ['responsableDesactivado', 'Con responsable desactivado'],
  ['incluirDesactivadas', 'Mostrar desactivadas'],
];

/**
 * Listado de causas (RF-36 a RF-39): buscador, filtros por fuero, estado y responsable,
 * casillas "Solo mis causas", "Con responsable desactivado" y "Mostrar desactivadas", y
 * paginado de a 20. Los filtros viven en el estado del componente, no en el navegador
 * (principio 5).
 */
export function PanelCausas() {
  const causas = useCausasService();
  const [query, setQuery] = useState<ListCausasQuery>({ pagina: 1 });
  const [searchText, setSearchText] = useState('');
  const [result, setResult] = useState<CausaPage | null>(null);
  const [members, setMembers] = useState<IntegranteResumen[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    causas
      .listCausas(query)
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
  }, [causas, query]);

  useEffect(() => {
    let active = true;
    causas
      .listMembers()
      .then((list) => {
        if (active) setMembers(list);
      })
      .catch((caught: unknown) => {
        if (active) setError(errorMessage(caught));
      });
    return () => {
      active = false;
    };
  }, [causas]);

  /** Cambia un filtro y vuelve a la primera página. */
  const filterBy = (changes: Partial<ListCausasQuery>) =>
    setQuery((current) => {
      const next = { ...current, ...changes, pagina: 1 };
      for (const key of Object.keys(changes) as (keyof ListCausasQuery)[]) {
        if (next[key] === undefined) delete next[key];
      }
      return next;
    });

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    filterBy({ buscar: searchText.trim() || undefined });
  }

  // Solo los integrantes activos se ofrecen como responsables (RF-38).
  const activeMembers = members.filter((member) => member.activo);
  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.porPagina)) : 1;
  const currentPage = query.pagina ?? 1;

  return (
    <main className="mx-auto max-w-6xl p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Causas</h1>
        <Link
          to="/panel/causas/nueva"
          className="rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Nueva causa
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-4">
        <form onSubmit={handleSearch} className="flex items-end gap-2">
          <div>
            <label htmlFor="buscar" className="block text-sm text-slate-600">
              Buscar
            </label>
            <input
              id="buscar"
              type="search"
              placeholder="Carátula, expediente, parte, DNI o CUIT"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              className="w-80 rounded border border-slate-300 px-3 py-1.5 text-sm"
            />
          </div>
          <button type="submit" className="rounded border border-slate-300 px-3 py-1.5 text-sm">
            Buscar
          </button>
        </form>

        <div>
          <label htmlFor="fuero" className="block text-sm text-slate-600">
            Fuero
          </label>
          <select
            id="fuero"
            value={query.fuero ?? ''}
            onChange={(event) => filterBy({ fuero: (event.target.value as Fuero) || undefined })}
            className={selectClass}
          >
            <option value="">Todos</option>
            {JURISDICTION_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="estado" className="block text-sm text-slate-600">
            Estado
          </label>
          <select
            id="estado"
            value={query.estado ?? ''}
            onChange={(event) =>
              filterBy({ estado: (event.target.value as EstadoCausa) || undefined })
            }
            className={selectClass}
          >
            <option value="">Todos</option>
            {CASE_STATUS_OPTIONS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="responsable" className="block text-sm text-slate-600">
            Responsable
          </label>
          <select
            id="responsable"
            value={query.responsableId === undefined ? '' : String(query.responsableId)}
            onChange={(event) =>
              filterBy({
                responsableId: event.target.value === '' ? undefined : Number(event.target.value),
              })
            }
            className={selectClass}
          >
            <option value="">Todos</option>
            {activeMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {memberName(member)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1 text-sm text-slate-700">
          {CHECKBOX_FILTERS.map(([field, label]) => (
            <label key={field} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={query[field] === true}
                onChange={(event) => filterBy({ [field]: event.target.checked })}
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {result && result.items.length === 0 && (
        <p className="mt-6 text-slate-600">No hay causas que coincidan.</p>
      )}

      {result && result.items.length > 0 && (
        <>
          <table className="mt-6 w-full overflow-hidden rounded-lg bg-white text-left text-sm shadow">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-2 font-medium">Carátula</th>
                <th className="px-4 py-2 font-medium">Expediente</th>
                <th className="px-4 py-2 font-medium">Juzgado</th>
                <th className="px-4 py-2 font-medium">Fuero</th>
                <th className="px-4 py-2 font-medium">Estado</th>
                <th className="px-4 py-2 font-medium">Responsable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {result.items.map((causa) => {
                const incident = incidentLabel(causa);
                return (
                  <tr key={causa.id} className={causa.activa ? undefined : 'bg-slate-50'}>
                    <td className="px-4 py-2">
                      <Link to={`/panel/causas/${causa.id}`} className="text-slate-800 underline">
                        {causa.caratula}
                      </Link>
                      {incident && <p className="text-xs text-slate-500">{incident}</p>}
                      {!causa.activa && (
                        <span className="mt-1 inline-block rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-700">
                          Desactivada
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">{causa.numeroExpediente ?? EMPTY_VALUE}</td>
                    <td className="px-4 py-2">{causa.juzgado ?? EMPTY_VALUE}</td>
                    <td className="px-4 py-2">{fueroLabel(causa.fuero)}</td>
                    <td className="px-4 py-2">{estadoLabel(causa.estado)}</td>
                    <td className="px-4 py-2">{memberName(causa.responsable)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
            <span>
              Página {currentPage} de {totalPages} · {result.total}{' '}
              {result.total === 1 ? 'causa' : 'causas'}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setQuery((current) => ({ ...current, pagina: currentPage - 1 }))}
                className="rounded border border-slate-300 px-3 py-1 disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setQuery((current) => ({ ...current, pagina: currentPage + 1 }))}
                className="rounded border border-slate-300 px-3 py-1 disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
