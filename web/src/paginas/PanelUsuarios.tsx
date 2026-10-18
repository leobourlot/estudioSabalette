import { type FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AparecerAlCargar } from '../componentes/AparecerAlCargar';
import { useSession } from '../componentes/ProveedorSesion';
import { useUsersService } from '../componentes/ProveedorServicios';
import { errorMessage } from '../servicios/cliente-http';
import { documentLabel, listName, roleLabel } from '../servicios/presentacion';
import type { Rol } from '../servicios/sesion';
import type { ListUsersQuery, UserPage } from '../servicios/usuarios';
import {
  CARD,
  ERROR_ALERT,
  FIELD_SMALL,
  LABEL,
  PAGE,
  PAGE_TITLE,
  PRIMARY_BUTTON_SMALL,
  SECONDARY_BUTTON_SMALL,
  TABLE,
  TABLE_CARD,
  TABLE_CELL,
  TABLE_HEAD,
  TABLE_HEADER_CELL,
  TABLE_ROW,
  TEXT_LINK,
} from '../componentes/estilos-aplicacion';

const ROLE_FILTERS: [Rol | '', string][] = [
  ['', 'Todos'],
  ['admin', 'Administradores'],
  ['abogado', 'Abogados'],
  ['cliente', 'Clientes'],
];

const STATE_FILTERS: [string, string][] = [
  ['', 'Todas'],
  ['true', 'Activas'],
  ['false', 'Desactivadas'],
];

const selectClass = FIELD_SMALL;

/**
 * Listado de cuentas (RF-26): buscador, filtros por rol y estado, de a 20 por página. Un
 * abogado no ve el filtro de roles: la API le devuelve solo clientes.
 */
export function PanelUsuarios() {
  const users = useUsersService();
  const { usuario } = useSession();
  const [query, setQuery] = useState<ListUsersQuery>({ pagina: 1 });
  const [searchText, setSearchText] = useState('');
  const [result, setResult] = useState<UserPage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    users
      .listUsers(query)
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
  }, [users, query]);

  /** Cambia un filtro y vuelve a la primera página. */
  const filterBy = (changes: Partial<ListUsersQuery>) =>
    setQuery((current) => ({ ...current, ...changes, pagina: 1 }));

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    filterBy({ buscar: searchText.trim() || undefined });
  }

  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.porPagina)) : 1;
  const currentPage = query.pagina ?? 1;

  return (
    <main className={PAGE}>
      <div className="flex items-center justify-between">
        <h1 className={PAGE_TITLE}>Cuentas</h1>
        <Link to="/panel/usuarios/nuevo" className={PRIMARY_BUTTON_SMALL}>
          Nueva cuenta
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-4">
        <form onSubmit={handleSearch} className="flex items-end gap-2">
          <div>
            <label htmlFor="buscar" className={LABEL}>
              Buscar
            </label>
            <input
              id="buscar"
              type="search"
              placeholder="Apellido, nombre, razón social, DNI o CUIT"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              className={`w-72 ${FIELD_SMALL}`}
            />
          </div>
          <button type="submit" className={SECONDARY_BUTTON_SMALL}>
            Buscar
          </button>
        </form>

        {usuario?.rol === 'admin' && (
          <div>
            <label htmlFor="rol" className={LABEL}>
              Rol
            </label>
            <select
              id="rol"
              value={query.rol ?? ''}
              onChange={(event) => filterBy({ rol: (event.target.value as Rol) || undefined })}
              className={selectClass}
            >
              {ROLE_FILTERS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="estado" className={LABEL}>
            Estado
          </label>
          <select
            id="estado"
            value={query.activo === undefined ? '' : String(query.activo)}
            onChange={(event) =>
              filterBy({
                activo: event.target.value === '' ? undefined : event.target.value === 'true',
              })
            }
            className={selectClass}
          >
            {STATE_FILTERS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p role="alert" className={ERROR_ALERT}>
          {error}
        </p>
      )}

      {result && result.items.length === 0 && (
        <p className={`p-5 text-slate-600 ${CARD}`}>No hay cuentas que coincidan.</p>
      )}

      {result && result.items.length > 0 && (
        <>
          <div className={TABLE_CARD}>
            <table className={TABLE}>
              <thead className={TABLE_HEAD}>
                <tr>
                  <th className={TABLE_HEADER_CELL}>Nombre</th>
                  <th className={TABLE_HEADER_CELL}>Rol</th>
                  <th className={TABLE_HEADER_CELL}>Email</th>
                  <th className={TABLE_HEADER_CELL}>DNI / CUIT</th>
                  <th className={TABLE_HEADER_CELL}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((cuenta, index) => (
                  <AparecerAlCargar key={cuenta.id} como="tr" indice={index} className={TABLE_ROW}>
                    <td className={TABLE_CELL}>
                      <Link
                        to={`/panel/usuarios/${cuenta.id}`}
                        className={`font-semibold ${TEXT_LINK}`}
                      >
                        {listName(cuenta)}
                      </Link>
                    </td>
                    <td className={TABLE_CELL}>{roleLabel(cuenta.rol)}</td>
                    <td className={TABLE_CELL}>{cuenta.email ?? '—'}</td>
                    <td className={TABLE_CELL}>{documentLabel(cuenta)}</td>
                    <td className={TABLE_CELL}>{cuenta.activo ? 'Activa' : 'Desactivada'}</td>
                  </AparecerAlCargar>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
            <span>
              Página {currentPage} de {totalPages} · {result.total}{' '}
              {result.total === 1 ? 'cuenta' : 'cuentas'}
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
