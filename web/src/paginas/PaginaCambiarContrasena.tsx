import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BotonWhatsapp } from '../componentes/BotonWhatsapp';
import { DisenoMarca } from '../componentes/DisenoMarca';
import {
  ERROR_ALERT,
  INPUT,
  LABEL,
  PRIMARY_BUTTON,
  TEXT_LINK,
} from '../componentes/estilos-aplicacion';
import { useSession } from '../componentes/ProveedorSesion';
import { useTituloDocumento } from '../componentes/useTituloDocumento';
import { ApiError, errorMessage } from '../servicios/cliente-http';
import { APP_TITLES } from '../servicios/rutas-sitio';
import { resolveLandingRoute, ROUTES } from '../servicios/sesion';
import { findPasswordRuleViolation } from '../servicios/validaciones';

const EMPTY_FIELDS_MESSAGE = 'Completá todos los campos';
const MISMATCH_MESSAGE = 'Las contraseñas nuevas no coinciden';

interface PasswordFieldProps {
  id: string;
  label: string;
  autoComplete: 'current-password' | 'new-password';
  value: string;
  onChange: (value: string) => void;
}

function PasswordField({ id, label, autoComplete, value, onChange }: PasswordFieldProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      <input
        id={id}
        type="password"
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={INPUT}
      />
    </div>
  );
}

/**
 * Cambio de la contraseña propia (RF-36 a RF-39). Es obligatorio con el cambio pendiente
 * (RF-11) y voluntario desde Mi cuenta. Las reglas se avisan antes de enviar con los mismos
 * mensajes que la API; si la API cierra la sesión por errores repetidos (RF-38), lleva a
 * /ingresar con el aviso. Va en el diseño de dos mitades, con el logo y el nombre del estudio y
 * sin el menú, porque puede ser obligatoria antes de entrar (spec 008, RF-14).
 */
export function PaginaCambiarContrasena() {
  const { usuario, changePassword, logout, endSession } = useSession();
  useTituloDocumento(APP_TITLES.cambioContrasena);
  const navigate = useNavigate();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetida, setRepetida] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const pendiente = usuario?.debeCambiarContrasena ?? false;
  // Los clientes ven el botón de WhatsApp en todas sus pantallas, también acá; el bloque de
  // contacto, no (spec 004, RF-18, RF-19).
  const esCliente = usuario?.rol === 'cliente';

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problem =
      actual === '' || nueva === '' || repetida === ''
        ? EMPTY_FIELDS_MESSAGE
        : (findPasswordRuleViolation(nueva, actual) ??
          (nueva !== repetida ? MISMATCH_MESSAGE : null));
    if (problem) {
      setError(problem);
      return;
    }

    setError(null);
    setEnviando(true);
    try {
      await changePassword(actual, nueva);
      if (usuario) navigate(resolveLandingRoute({ ...usuario, debeCambiarContrasena: false }));
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        // La API cerró la sesión (RF-38): RutaProtegida lleva al ingreso, con el aviso.
        endSession(errorMessage(caught));
        return;
      }
      setError(errorMessage(caught));
      setActual('');
      setEnviando(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate(ROUTES.login, { replace: true });
  }

  return (
    <>
      <DisenoMarca>
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <h1 className="font-titulos text-3xl font-semibold text-estudio-oscuro">
            Cambiar contraseña
          </h1>

          {pendiente && (
            <p className="text-sm text-slate-600">
              Antes de continuar, elegí una contraseña nueva. Tiene que tener entre 10 y 64
              caracteres, sin tildes, ñ ni emojis.
            </p>
          )}

          {error && (
            <p role="alert" className={ERROR_ALERT}>
              {error}
            </p>
          )}

          <PasswordField
            id="actual"
            label="Contraseña actual"
            autoComplete="current-password"
            value={actual}
            onChange={setActual}
          />
          <PasswordField
            id="nueva"
            label="Contraseña nueva"
            autoComplete="new-password"
            value={nueva}
            onChange={setNueva}
          />
          <PasswordField
            id="repetida"
            label="Repetí la contraseña nueva"
            autoComplete="new-password"
            value={repetida}
            onChange={setRepetida}
          />

          <button
            type="submit"
            disabled={enviando}
            className={`${PRIMARY_BUTTON} w-full disabled:opacity-60`}
          >
            {enviando ? 'Guardando…' : 'Cambiar contraseña'}
          </button>

          <div className="flex justify-between text-sm">
            {!pendiente && usuario ? (
              <Link to={resolveLandingRoute(usuario)} className={TEXT_LINK}>
                Volver
              </Link>
            ) : (
              <span />
            )}
            <button type="button" onClick={handleLogout} className={TEXT_LINK}>
              Cerrar sesión
            </button>
          </div>
        </form>
      </DisenoMarca>
      {esCliente && <BotonWhatsapp />}
    </>
  );
}
