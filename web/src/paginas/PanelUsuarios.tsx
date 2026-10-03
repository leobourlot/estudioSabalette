import { type FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSession } from '../componentes/ProveedorSesion';
import { useUsersService } from '../componentes/ProveedorServicios';
import { errorMessage } from '../servicios/cliente-http';
import { documentLabel, listName, roleLabel } from '../servicios/presentacion';
import type { Rol } from '../servicios/sesion';
import type { ListUsersQuery, UserPage } from '../servicios/usuarios';

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

const selectClass = 'rounded border border-slate-300 px-2 py-1.5 text-sm';

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
    <main className="mx-auto max-w-5xl p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">Cuentas</h1>
        <Link
          to="/panel/usuarios/nuevo"
          className="rounded bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Nueva cuenta
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
              placeholder="Apellido, nombre, razón social, DNI o CUIT"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              className="w-72 rounded border border-slate-300 px-3 py-1.5 text-sm"
            />
          </div>
          <button type="submit" className="rounded border border-slate-300 px-3 py-1.5 text-sm">
            Buscar
          </button>
        </form>

        {usuario?.rol === 'admin' && (
          <div>
            <label htmlFor="rol" className="block text-sm text-slate-600">
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
          <label htmlFor="estado" className="block text-sm text-slate-600">
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
        <p role="alert" className="mt-6 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {result && result.items.length === 0 && (
        <p className="mt-6 text-slate-600">No hay cuentas que coincidan.</p>
      )}

      {result && result.items.length > 0 && (
        <>
          <table className="mt-6 w-full overflow-hidden rounded-lg bg-white text-left text-sm shadow">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-2 font-medium">Nombre</th>
                <th className="px-4 py-2 font-medium">Rol</th>
                <th className="px-4 py-2 font-medium">Email</th>
                <th className="px-4 py-2 font-medium">DNI / CUIT</th>
                <th className="px-4 py-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {result.items.map((cuenta) => (
                <tr key={cuenta.id}>
                  <td className="px-4 py-2">
                    <Link to={`/panel/usuarios/${cuenta.id}`} className="text-slate-800 underline">
                      {listName(cuenta)}
                    </Link>
                  </td>
                  <td className="px-4 py-2">{roleLabel(cuenta.rol)}</td>
                  <td className="px-4 py-2">{cuenta.email ?? '—'}</td>
                  <td className="px-4 py-2">{documentLabel(cuenta)}</td>
                  <td className="px-4 py-2">{cuenta.activo ? 'Activa' : 'Desactivada'}</td>
                </tr>
              ))}
            </tbody>
          </table>

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
