import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BotonWhatsapp } from '../componentes/BotonWhatsapp';
import { NombreEstudio } from '../componentes/NombreEstudio';
import { useSession } from '../componentes/ProveedorSesion';
import { useTituloDocumento } from '../componentes/useTituloDocumento';
import { errorMessage } from '../servicios/cliente-http';
import { LOGO_PATH } from '../servicios/marca';
import { APP_TITLES } from '../servicios/rutas-sitio';
import { resolveLandingRoute } from '../servicios/sesion';

const EMPTY_FIELDS_MESSAGE = 'Completá el email y la contraseña';

/**
 * Ingreso con email y contraseña (RF-8 a RF-10). Muestra los mensajes de la API tal cual
 * (credenciales incorrectas, demasiados intentos) y, al ingresar, lleva a donde indica
 * resolveLandingRoute: el cambio de contraseña pendiente o el inicio de la sección. Arriba, el
 * logo y el nombre del estudio llevan al sitio público, y el botón de WhatsApp abre la
 * conversación sin mensaje (spec 007, RF-3, RF-26, RF-28 y RF-33).
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
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 p-4 pb-24">
        {/* Enlace común: el sitio público es otro documento (plan 007, "Rutas del sitio público"). */}
        <a
          href="/"
          className="flex items-center gap-3 rounded font-semibold text-estudio-oscuro focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-estudio-azul"
        >
          <img src={LOGO_PATH} alt="" width={48} height={48} className="h-12 w-12 rounded" />
          <NombreEstudio />
        </a>
        <form
          onSubmit={handleSubmit}
          noValidate
          className="w-full max-w-sm space-y-5 rounded-lg bg-white p-8 shadow"
        >
          <h1 className="text-2xl font-semibold text-slate-800">Ingresar</h1>

          {error && (
            <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="space-y-1">
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="contrasena" className="block text-sm font-medium text-slate-700">
              Contraseña
            </label>
            <input
              id="contrasena"
              type="password"
              autoComplete="current-password"
              value={contrasena}
              onChange={(event) => setContrasena(event.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 focus:border-slate-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded bg-slate-800 px-4 py-2 font-medium text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {enviando ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </main>
      <BotonWhatsapp />
    </>
  );
}
