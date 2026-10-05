import { type KeyboardEvent, useState } from 'react';
import { errorMessage } from '../servicios/cliente-http';
import { listName } from '../servicios/presentacion';
import { partyDocument } from '../servicios/presentacion-causas';
import type { UsuarioDetalle } from '../servicios/usuarios';
import { useUsersService } from './ProveedorServicios';

/** "Gómez, Ana · DNI 30.123.456": nombre y documento, para distinguir homónimos. */
function clientLabel(cliente: UsuarioDetalle): string {
  const document = cliente.cliente ? partyDocument(cliente.cliente) : null;
  return document ? `${listName(cliente)} · ${document}` : listName(cliente);
}

/**
 * Buscador de clientes activos para vincularlos como parte (RF-14, RF-17). Usa la gestión
 * de cuentas de la spec 001, que el abogado ya puede consultar. No es un formulario propio:
 * puede ir dentro del formulario de la parte, y Enter busca sin enviarlo.
 */
export function SelectorCliente({
  onChoose,
}: {
  onChoose: (clienteId: number, label: string) => void;
}) {
  const users = useUsersService();
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState<UsuarioDetalle[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    try {
      const page = await users.listUsers({
        rol: 'cliente',
        activo: true,
        buscar: searchText.trim(),
      });
      setResults(page.items);
      setError(null);
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    void search();
  }

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1">
          <label htmlFor="buscarCliente" className="block text-sm font-medium text-slate-700">
            Buscar cliente
          </label>
          <input
            id="buscarCliente"
            type="search"
            placeholder="Apellido, nombre, razón social, DNI o CUIT"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full rounded border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => void search()}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        >
          Buscar
        </button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {results && results.length === 0 && (
        <p className="text-sm text-slate-600">No hay clientes activos que coincidan.</p>
      )}
      {results && results.length > 0 && (
        <ul className="space-y-1">
          {results.map((cliente) => (
            <li key={cliente.id}>
              <button
                type="button"
                onClick={() => onChoose(cliente.id, clientLabel(cliente))}
                className="text-left text-sm text-slate-800 underline"
              >
                {clientLabel(cliente)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
