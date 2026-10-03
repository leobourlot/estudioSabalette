import { type FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AccionesCuenta } from '../componentes/AccionesCuenta';
import { CampoTexto } from '../componentes/CampoTexto';
import { ListaDeErrores } from '../componentes/ListaDeErrores';
import { useSession } from '../componentes/ProveedorSesion';
import { useUsersService } from '../componentes/ProveedorServicios';
import { ApiError, errorMessage } from '../servicios/cliente-http';
import {
  type AccountEditForm,
  buildUpdateData,
  editFormFrom,
  validateAccountEdit,
} from '../servicios/formulario-cuenta';
import {
  accountRows,
  EMPTY_VALUE,
  formatDateTime,
  fullName,
  listName,
} from '../servicios/presentacion';
import type { Rol } from '../servicios/sesion';
import type { UsuarioDetalle } from '../servicios/usuarios';

const NO_CHANGES_MESSAGE = 'No hay cambios para guardar';

/** Un integrante solo cambia de rol entre administrador y abogado (RF-28). */
const STAFF_ROLES: [Rol, string][] = [
  ['admin', 'Administrador'],
  ['abogado', 'Abogado'],
];

function auditRows(account: UsuarioDetalle): [string, string][] {
  const by = (author: UsuarioDetalle['creadoPor']) => (author ? ` por ${fullName(author)}` : '');
  return [
    ['Estado', account.activo ? 'Activa' : 'Desactivada'],
    ['Creada', `${formatDateTime(account.creadoEn)}${by(account.creadoPor)}`],
    [
      'Última modificación',
      account.modificadoEn
        ? `${formatDateTime(account.modificadoEn)}${by(account.modificadoPor)}`
        : EMPTY_VALUE,
    ],
    ['Último ingreso', account.ultimoIngreso ? formatDateTime(account.ultimoIngreso) : 'Nunca'],
  ];
}

/**
 * Detalle de una cuenta (RF-34): datos, auditoría con fechas en hora de Buenos Aires y
 * edición (RF-27, RF-28). DNI, CUIT y tipo de persona se muestran pero no se editan (RF-7).
 */
export function PanelUsuarioDetalle() {
  const users = useUsersService();
  const { usuario, setUsuario } = useSession();
  const id = Number(useParams().id);
  const [account, setAccount] = useState<UsuarioDetalle | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<AccountEditForm | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let active = true;
    users
      .getUser(id)
      .then((loaded) => {
        if (!active) return;
        setAccount(loaded);
        setForm(editFormFrom(loaded));
      })
      .catch((caught: unknown) => {
        if (active) setLoadError(errorMessage(caught));
      });
    return () => {
      active = false;
    };
  }, [users, id]);

  const set = (field: keyof AccountEditForm) => (value: string) =>
    setForm((current) => (current ? { ...current, [field]: value } : current));

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!account || !form) return;
    setSaved(false);

    const found = validateAccountEdit(form, account);
    const changes = buildUpdateData(form, account);
    if (found.length === 0 && Object.keys(changes).length === 0) found.push(NO_CHANGES_MESSAGE);
    setProblems(found);
    if (found.length > 0) return;

    setGuardando(true);
    try {
      const updated = await users.updateUser(account.id, changes);
      setAccount(updated);
      setForm(editFormFrom(updated));
      setSaved(true);
      // Si se editó la propia cuenta, la sesión muestra los datos nuevos.
      if (updated.id === usuario?.id) setUsuario(updated);
    } catch (caught) {
      setProblems(
        caught instanceof ApiError && caught.messages.length > 0
          ? caught.messages
          : [errorMessage(caught)],
      );
    } finally {
      setGuardando(false);
    }
  }

  const isLegalPerson = account?.cliente?.tipoPersona === 'juridica';
  const canChangeRole = usuario?.rol === 'admin' && account !== null && account.rol !== 'cliente';

  return (
    <main className="mx-auto max-w-3xl p-8">
      <p className="text-sm">
        <Link to="/panel/usuarios" className="text-slate-600 underline">
          ← Cuentas
        </Link>
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-800">Detalle de la cuenta</h1>

      {loadError && (
        <p role="alert" className="mt-6 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadError}
        </p>
      )}
      {!account && !loadError && <p className="mt-6 text-slate-500">Cargando…</p>}

      {account && form && (
        <>
          <p className="mt-1 text-lg text-slate-700">{listName(account)}</p>

          <dl
            aria-label="Datos de la cuenta"
            className="mt-6 divide-y divide-slate-200 rounded-lg bg-white shadow"
          >
            {[...accountRows(account), ...auditRows(account)].map(([label, value]) => (
              <div key={label} className="grid grid-cols-3 gap-4 px-4 py-3">
                <dt className="text-sm text-slate-500">{label}</dt>
                <dd className="col-span-2 text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>

          <form
            aria-label="Editar datos"
            onSubmit={handleSubmit}
            noValidate
            className="mt-8 space-y-4 rounded-lg bg-white p-6 shadow"
          >
            <h2 className="text-lg font-semibold text-slate-800">Editar datos</h2>
            <ListaDeErrores messages={problems} />
            {saved && (
              <p role="status" className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">
                Cambios guardados
              </p>
            )}

            {isLegalPerson && (
              <CampoTexto
                id="editar-razonSocial"
                label="Razón social"
                value={form.razonSocial}
                onChange={set('razonSocial')}
              />
            )}
            <CampoTexto
              id="editar-nombre"
              label={isLegalPerson ? 'Nombre del contacto' : 'Nombre'}
              value={form.nombre}
              onChange={set('nombre')}
            />
            <CampoTexto
              id="editar-apellido"
              label={isLegalPerson ? 'Apellido del contacto' : 'Apellido'}
              value={form.apellido}
              onChange={set('apellido')}
            />
            <CampoTexto
              id="editar-email"
              label="Email"
              type="email"
              value={form.email}
              onChange={set('email')}
            />

            {canChangeRole && (
              <div className="space-y-1">
                <label htmlFor="editar-rol" className="block text-sm font-medium text-slate-700">
                  Rol
                </label>
                <select
                  id="editar-rol"
                  value={form.rol}
                  onChange={(event) => set('rol')(event.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2"
                >
                  {STAFF_ROLES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {account.cliente && (
              <>
                <CampoTexto
                  id="editar-telefono"
                  label="Teléfono"
                  type="tel"
                  value={form.telefono}
                  onChange={set('telefono')}
                />
                <CampoTexto
                  id="editar-domicilio"
                  label="Domicilio"
                  value={form.domicilio}
                  onChange={set('domicilio')}
                />
              </>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={guardando}
                className="rounded bg-slate-800 px-4 py-2 font-medium text-white hover:bg-slate-700 disabled:opacity-60"
              >
                {guardando ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </form>

          <AccionesCuenta
            account={account}
            onChanged={(updated) => {
              setAccount(updated);
              setForm(editFormFrom(updated));
              setProblems([]);
              setSaved(false);
            }}
          />
        </>
      )}
    </main>
  );
}
