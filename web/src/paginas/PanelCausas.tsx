import { type FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AparecerAlCargar } from '../componentes/AparecerAlCargar';
import {
  CARD,
  ERROR_ALERT,
  FOCUS_RING,
  INPUT,
  LABEL,
  PAGE,
  PAGE_TITLE,
  PRIMARY_BUTTON_SMALL,
  SECONDARY_BUTTON_SMALL,
  STATUS_BADGE,
  TABLE,
  TABLE_CARD,
  TABLE_CELL,
  TABLE_HEAD,
  TABLE_HEADER_CELL,
  TABLE_ROW,
} from '../componentes/estilos-aplicacion';
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

const CHECKBOX_FILTERS: [keyof ListCausasQuery, string][] = [
  ['mias', 'Solo mis causas'],
  ['responsableDesactivado', 'Con responsable desactivado'],
  ['incluirDesactivadas', 'Mostrar desactivadas'],
];

/**
 * Listado de causas (RF-36 a RF-39): buscador, filtros por fuero, estado y responsable,
 * casillas "Solo mis causas", "Con responsable desactivado" y "Mostrar desactivadas", y
 * paginado de a 20. Los filtros viven en el estado del componente, no en el navegador
 * (principio 5). Los filtros y la tabla van en tarjetas, con las filas separadas por una línea
 * visible, que aparecen escalonadas (spec 008, RF-21 y RF-26).
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
    <main className={PAGE}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className={PAGE_TITLE}>Causas</h1>
        <Link to="/panel/causas/nueva" className={PRIMARY_BUTTON_SMALL}>
          <span aria-hidden="true">+</span> Nueva causa
        </Link>
      </div>

      <div className={`grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4 ${CARD}`}>
        <form onSubmit={handleSearch} className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
          <div className="min-w-0 flex-1">
            <label htmlFor="buscar" className={LABEL}>
              Buscar
            </label>
            <input
              id="buscar"
              type="search"
              placeholder="Carátula, expediente, parte, DNI o CUIT"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              className={INPUT}
            />
          </div>
          <button type="submit" className={`${SECONDARY_BUTTON_SMALL} min-h-[42px]`}>
            Buscar
          </button>
        </form>

        <div>
          <label htmlFor="fuero" className={LABEL}>
            Fuero
          </label>
          <select
            id="fuero"
            value={query.fuero ?? ''}
            onChange={(event) => filterBy({ fuero: (event.target.value as Fuero) || undefined })}
            className={INPUT}
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
          <label htmlFor="estado" className={LABEL}>
            Estado
          </label>
          <select
            id="estado"
            value={query.estado ?? ''}
            onChange={(event) =>
              filterBy({ estado: (event.target.value as EstadoCausa) || undefined })
            }
            className={INPUT}
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
          <label htmlFor="responsable" className={LABEL}>
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
            className={INPUT}
          >
            <option value="">Todos</option>
            {activeMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {memberName(member)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col justify-end gap-1 text-sm text-slate-700">
          {CHECKBOX_FILTERS.map(([field, label]) => (
            <label key={field} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={query[field] === true}
                onChange={(event) => filterBy({ [field]: event.target.checked })}
                className="h-4 w-4 accent-estudio-oscuro"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className={ERROR_ALERT}>
          {error}
        </p>
      )}

      {result && result.items.length === 0 && (
        <p className={`p-5 text-slate-600 ${CARD}`}>No hay causas que coincidan.</p>
      )}

      {result && result.items.length > 0 && (
        <>
          <div className={TABLE_CARD}>
            <table className={TABLE}>
              <thead className={TABLE_HEAD}>
                <tr>
                  <th className={TABLE_HEADER_CELL}>Carátula</th>
                  <th className={TABLE_HEADER_CELL}>Expediente</th>
                  <th className={TABLE_HEADER_CELL}>Juzgado</th>
                  <th className={TABLE_HEADER_CELL}>Fuero</th>
                  <th className={TABLE_HEADER_CELL}>Estado</th>
                  <th className={TABLE_HEADER_CELL}>Responsable</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((causa, index) => {
                  const incident = incidentLabel(causa);
                  return (
                    <AparecerAlCargar
                      key={causa.id}
                      como="tr"
                      indice={index}
                      className={`${TABLE_ROW} ${causa.activa ? '' : 'bg-slate-50'}`}
                    >
                      <td className={TABLE_CELL}>
                        <Link
                          to={`/panel/causas/${causa.id}`}
                          className={`rounded font-semibold text-estudio-oscuro underline underline-offset-4 ${FOCUS_RING}`}
                        >
                          {causa.caratula}
                        </Link>
                        {incident && <p className="text-xs text-slate-600">{incident}</p>}
                        {!causa.activa && (
                          <span className="mt-1 inline-block rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-700">
                            Desactivada
                          </span>
                        )}
                      </td>
                      <td className={TABLE_CELL}>{causa.numeroExpediente ?? EMPTY_VALUE}</td>
                      <td className={TABLE_CELL}>{causa.juzgado ?? EMPTY_VALUE}</td>
                      <td className={TABLE_CELL}>{fueroLabel(causa.fuero)}</td>
                      <td className={TABLE_CELL}>
                        <span className={STATUS_BADGE}>{estadoLabel(causa.estado)}</span>
                      </td>
                      <td className={TABLE_CELL}>{memberName(causa.responsable)}</td>
                    </AparecerAlCargar>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
            <span>
              Página {currentPage} de {totalPages} · {result.total}{' '}
              {result.total === 1 ? 'causa' : 'causas'}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setQuery((current) => ({ ...current, pagina: currentPage - 1 }))}
                className={SECONDARY_BUTTON_SMALL}
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setQuery((current) => ({ ...current, pagina: currentPage + 1 }))}
                className={SECONDARY_BUTTON_SMALL}
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
