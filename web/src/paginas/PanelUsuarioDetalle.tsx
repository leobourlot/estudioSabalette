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
import {
  CARD,
  ERROR_ALERT,
  INPUT,
  LABEL,
  PAGE,
  PRIMARY_BUTTON_SMALL,
  SECTION_TITLE,
  TEXT_LINK,
} from '../componentes/estilos-aplicacion';

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
 * edición (RF-27, RF-28). El DNI de un integrante se edita; el DNI, el CUIT y el tipo de
 * persona de un cliente se muestran pero no se editan (RF-7).
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
    <main className={PAGE}>
      <p className="text-sm">
        <Link to="/panel/usuarios" className={TEXT_LINK}>
          ← Cuentas
        </Link>
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-800">Detalle de la cuenta</h1>

      {loadError && (
        <p role="alert" className={ERROR_ALERT}>
          {loadError}
        </p>
      )}
      {!account && !loadError && <p className="mt-6 text-slate-500">Cargando…</p>}

      {account && form && (
        <>
          <p className="mt-1 text-lg text-slate-700">{listName(account)}</p>

          <dl aria-label="Datos de la cuenta" className={`divide-y divide-slate-200 ${CARD}`}>
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
            className={`space-y-4 p-6 ${CARD}`}
          >
            <h2 className={SECTION_TITLE}>Editar datos</h2>
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
            {!account.cliente && (
              <CampoTexto id="editar-dni" label="DNI" value={form.dni} onChange={set('dni')} />
            )}
            <CampoTexto
              id="editar-email"
              label={account.cliente ? 'Email (opcional)' : 'Email'}
              type="email"
              value={form.email}
              onChange={set('email')}
            />

            {canChangeRole && (
              <div className="space-y-1">
                <label htmlFor="editar-rol" className={LABEL}>
                  Rol
                </label>
                <select
                  id="editar-rol"
                  value={form.rol}
                  onChange={(event) => set('rol')(event.target.value)}
                  className={INPUT}
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
              <button type="submit" disabled={guardando} className={PRIMARY_BUTTON_SMALL}>
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
