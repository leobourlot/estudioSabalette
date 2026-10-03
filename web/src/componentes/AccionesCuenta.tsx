import { useState } from 'react';
import { ACTION_TEXTS, type AccountAction, availableActions } from '../servicios/acciones-cuenta';
import { ApiError, errorMessage } from '../servicios/cliente-http';
import type { UsersService, UsuarioDetalle } from '../servicios/usuarios';
import { findPasswordRuleViolation } from '../servicios/validaciones';
import { CampoTexto } from './CampoTexto';
import { ListaDeErrores } from './ListaDeErrores';
import { useSession } from './ProveedorSesion';
import { useUsersService } from './ProveedorServicios';

function runAction(
  users: UsersService,
  action: AccountAction,
  id: number,
  temporaryPassword: string,
): Promise<void> {
  switch (action) {
    case 'deactivate':
      return users.deactivateUser(id);
    case 'reactivate':
      return users.reactivateUser(id, temporaryPassword);
    case 'resetPassword':
      return users.resetPassword(id, temporaryPassword);
    case 'releaseEmail':
      return users.releaseEmail(id);
    case 'transferPrincipal':
      return users.transferPrincipal(id);
  }
}

interface AccionesCuentaProps {
  account: UsuarioDetalle;
  /** Recibe la cuenta recargada después de una acción. */
  onChanged: (account: UsuarioDetalle) => void;
}

/**
 * Acciones sobre una cuenta, visibles según el rol del actor y su condición de principal.
 * Cada una se confirma en el lugar; reactivar y restablecer piden la contraseña temporal.
 */
export function AccionesCuenta({ account, onChanged }: AccionesCuentaProps) {
  const users = useUsersService();
  const { usuario, setUsuario } = useSession();
  const [selected, setSelected] = useState<AccountAction | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [problems, setProblems] = useState<string[]>([]);
  const [done, setDone] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  if (!usuario) return null;
  const actions = availableActions(usuario, account);
  if (actions.length === 0 && !done) return null;

  function select(action: AccountAction | null) {
    setSelected(action);
    setTemporaryPassword('');
    setProblems([]);
    setDone(null);
  }

  async function confirm() {
    if (!selected || !usuario) return;
    const text = ACTION_TEXTS[selected];
    if (text.needsTemporaryPassword) {
      const problem =
        temporaryPassword === ''
          ? 'La contraseña temporal es obligatoria'
          : findPasswordRuleViolation(temporaryPassword);
      if (problem) {
        setProblems([problem]);
        return;
      }
    }

    setRunning(true);
    try {
      await runAction(users, selected, account.id, temporaryPassword);
      if (selected === 'transferPrincipal') setUsuario({ ...usuario, esPrincipal: false });
      onChanged(await users.getUser(account.id));
      setDone(text.done(account));
      setSelected(null);
      setTemporaryPassword('');
      setProblems([]);
    } catch (caught) {
      setProblems(
        caught instanceof ApiError && caught.messages.length > 0
          ? caught.messages
          : [errorMessage(caught)],
      );
    } finally {
      setRunning(false);
    }
  }

  return (
    <section aria-label="Acciones" className="mt-8 rounded-lg bg-white p-6 shadow">
      <h2 className="text-lg font-semibold text-slate-800">Acciones</h2>

      {done && (
        <p role="status" className="mt-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700">
          {done}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {actions.map((action) => (
          <button
            key={action}
            type="button"
            onClick={() => select(action)}
            disabled={running}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            {ACTION_TEXTS[action].label}
          </button>
        ))}
      </div>

      {selected && (
        <div className="mt-4 space-y-3 rounded border border-slate-200 p-4">
          <p className="font-medium text-slate-800">{ACTION_TEXTS[selected].label}</p>
          <p className="text-sm text-slate-600">{ACTION_TEXTS[selected].description}</p>
          <ListaDeErrores messages={problems} />
          {ACTION_TEXTS[selected].needsTemporaryPassword && (
            <CampoTexto
              id="accion-contrasena"
              label="Contraseña temporal"
              value={temporaryPassword}
              onChange={setTemporaryPassword}
            />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={confirm}
              disabled={running}
              className="rounded bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
            >
              Confirmar
            </button>
            <button
              type="button"
              onClick={() => select(null)}
              disabled={running}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
