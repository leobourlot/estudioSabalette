import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CampoTexto } from '../componentes/CampoTexto';
import { ListaDeErrores } from '../componentes/ListaDeErrores';
import { useSession } from '../componentes/ProveedorSesion';
import { useUsersService } from '../componentes/ProveedorServicios';
import { ApiError, errorMessage } from '../servicios/cliente-http';
import {
  buildCreateUserData,
  EMPTY_ACCOUNT_FORM,
  type NewAccountForm,
  validateNewAccount,
} from '../servicios/formulario-cuenta';
import type { Rol, TipoPersona } from '../servicios/sesion';

const ROLES: [Rol, string][] = [
  ['cliente', 'Cliente'],
  ['abogado', 'Abogado'],
  ['admin', 'Administrador'],
];

const selectClass =
  'w-full rounded border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none';

/**
 * Alta de una cuenta (RF-21, RF-22). Los campos dependen del rol y del tipo de persona
 * (RF-3). Un abogado solo crea clientes. La contraseña temporal se ve en pantalla porque
 * quien crea la cuenta se la comunica al usuario personalmente.
 */
export function PanelUsuarioNuevo() {
  const users = useUsersService();
  const { usuario } = useSession();
  const navigate = useNavigate();
  const [form, setForm] = useState<NewAccountForm>(EMPTY_ACCOUNT_FORM);
  const [problems, setProblems] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);

  const set = (field: keyof NewAccountForm) => (value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  const isClient = form.rol === 'cliente';
  const isLegalPerson = isClient && form.tipoPersona === 'juridica';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateNewAccount(form);
    setProblems(found);
    if (found.length > 0) return;

    setEnviando(true);
    try {
      const created = await users.createUser(buildCreateUserData(form));
      navigate(`/panel/usuarios/${created.id}`);
    } catch (caught) {
      setProblems(
        caught instanceof ApiError && caught.messages.length > 0
          ? caught.messages
          : [errorMessage(caught)],
      );
      setEnviando(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="text-2xl font-semibold text-slate-800">Nueva cuenta</h1>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="mt-6 space-y-4 rounded-lg bg-white p-6 shadow"
      >
        <ListaDeErrores messages={problems} />

        {usuario?.rol === 'admin' && (
          <div className="space-y-1">
            <label htmlFor="rol" className="block text-sm font-medium text-slate-700">
              Rol
            </label>
            <select
              id="rol"
              value={form.rol}
              onChange={(e) => set('rol')(e.target.value)}
              className={selectClass}
            >
              {ROLES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}

        {isClient && (
          <div className="space-y-1">
            <label htmlFor="tipoPersona" className="block text-sm font-medium text-slate-700">
              Tipo de persona
            </label>
            <select
              id="tipoPersona"
              value={form.tipoPersona}
              onChange={(e) => set('tipoPersona')(e.target.value as TipoPersona)}
              className={selectClass}
            >
              <option value="fisica">Persona física</option>
              <option value="juridica">Persona jurídica</option>
            </select>
          </div>
        )}

        {isLegalPerson && (
          <>
            <CampoTexto
              id="razonSocial"
              label="Razón social"
              value={form.razonSocial}
              onChange={set('razonSocial')}
            />
            <CampoTexto id="cuit" label="CUIT" value={form.cuit} onChange={set('cuit')} />
          </>
        )}

        <CampoTexto
          id="nombre"
          label={isLegalPerson ? 'Nombre del contacto' : 'Nombre'}
          value={form.nombre}
          onChange={set('nombre')}
        />
        <CampoTexto
          id="apellido"
          label={isLegalPerson ? 'Apellido del contacto' : 'Apellido'}
          value={form.apellido}
          onChange={set('apellido')}
        />

        {isClient && !isLegalPerson && (
          <CampoTexto id="dni" label="DNI" value={form.dni} onChange={set('dni')} />
        )}

        <CampoTexto
          id="email"
          label="Email"
          type="email"
          value={form.email}
          onChange={set('email')}
        />

        {isClient && (
          <>
            <CampoTexto
              id="telefono"
              label="Teléfono"
              type="tel"
              value={form.telefono}
              onChange={set('telefono')}
            />
            <CampoTexto
              id="domicilio"
              label="Domicilio"
              value={form.domicilio}
              onChange={set('domicilio')}
            />
          </>
        )}

        <CampoTexto
          id="contrasenaTemporal"
          label="Contraseña temporal"
          value={form.contrasenaTemporal}
          onChange={set('contrasenaTemporal')}
        />
        <p className="text-xs text-slate-500">
          Entre 10 y 64 caracteres, sin tildes, ñ ni emojis. Comunicásela a la persona: al ingresar
          va a tener que cambiarla.
        </p>

        <div className="flex items-center justify-between pt-2">
          <Link to="/panel/usuarios" className="text-sm text-slate-600 underline">
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={enviando}
            className="rounded bg-slate-800 px-4 py-2 font-medium text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {enviando ? 'Creando…' : 'Crear cuenta'}
          </button>
        </div>
      </form>
    </main>
  );
}
