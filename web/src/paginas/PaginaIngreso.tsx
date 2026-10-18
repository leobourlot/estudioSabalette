import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BotonWhatsapp } from '../componentes/BotonWhatsapp';
import { DisenoMarca } from '../componentes/DisenoMarca';
import { ERROR_ALERT, INPUT, LABEL, PRIMARY_BUTTON } from '../componentes/estilos-aplicacion';
import { useSession } from '../componentes/ProveedorSesion';
import { useTituloDocumento } from '../componentes/useTituloDocumento';
import { errorMessage } from '../servicios/cliente-http';
import { APP_TITLES } from '../servicios/rutas-sitio';
import { resolveLandingRoute } from '../servicios/sesion';
import { TEXTOS_INGRESO } from '../servicios/textos-aplicacion';

const EMPTY_FIELDS_MESSAGE = 'Completá el email y la contraseña';

/**
 * Ingreso con email y contraseña (RF-8 a RF-10). Muestra los mensajes de la API tal cual
 * (credenciales incorrectas, demasiados intentos) y, al ingresar, lleva a donde indica
 * resolveLandingRoute: el cambio de contraseña pendiente o el inicio de la sección. Arriba, el
 * logo y el nombre del estudio llevan al sitio público, y el botón de WhatsApp abre la
 * conversación sin mensaje (spec 007, RF-3, RF-26, RF-28 y RF-33). Va en el diseño de dos mitades,
 * con los textos T-1 a T-3, la dirección y el WhatsApp del estudio (spec 008, RF-11 a RF-13).
 */
export function PaginaIngreso() {
  const { login, notice, clearNotice } = useSession();
  const navigate = useNavigate();
  useTituloDocumento(APP_TITLES.ingreso);
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  // Aviso que deja otra pantalla al cerrar la sesión, por ejemplo el de RF-38.
  const [error, setError] = useState<string | null>(notice);

  useEffect(() => {
    if (notice) clearNotice();
  }, [notice, clearNotice]);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (email.trim() === '' || contrasena === '') {
      setError(EMPTY_FIELDS_MESSAGE);
      return;
    }
    setError(null);
    setEnviando(true);
    try {
      const usuario = await login(email, contrasena);
      navigate(resolveLandingRoute(usuario), { replace: true });
    } catch (caught) {
      setError(errorMessage(caught));
      setContrasena('');
      setEnviando(false);
    }
  }

  return (
    <>
      <DisenoMarca
        conContacto
        marca={
          <p className="font-titulos text-2xl font-semibold leading-tight lg:max-w-md lg:text-5xl">
            {TEXTOS_INGRESO.titulo}
          </p>
        }
      >
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <div className="space-y-1">
            <h1 className="font-titulos text-3xl font-semibold text-estudio-oscuro">Ingresar</h1>
            <p className="text-sm text-slate-600">{TEXTOS_INGRESO.indicacion}</p>
          </div>

          {error && (
            <p role="alert" className={ERROR_ALERT}>
              {error}
            </p>
          )}

          <div className="space-y-1">
            <label htmlFor="email" className={LABEL}>
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={INPUT}
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="contrasena" className={LABEL}>
              Contraseña
            </label>
            <input
              id="contrasena"
              type="password"
              autoComplete="current-password"
              value={contrasena}
              onChange={(event) => setContrasena(event.target.value)}
              className={INPUT}
            />
          </div>

          <button
            type="submit"
            disabled={enviando}
            className={`${PRIMARY_BUTTON} w-full disabled:opacity-60`}
          >
            {enviando ? 'Ingresando…' : 'Ingresar'}
          </button>

          <p className="text-sm text-slate-600">{TEXTOS_INGRESO.olvido}</p>
        </form>
      </DisenoMarca>
      <BotonWhatsapp />
    </>
  );
}
