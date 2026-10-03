import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '../componentes/ProveedorSesion';
import { errorMessage } from '../servicios/cliente-http';
import { resolveLandingRoute } from '../servicios/sesion';

const EMPTY_FIELDS_MESSAGE = 'Completá el email y la contraseña';

/**
 * Ingreso con email y contraseña (RF-8 a RF-10). Muestra los mensajes de la API tal cual
 * (credenciales incorrectas, demasiados intentos) y, al ingresar, lleva a donde indica
 * resolveLandingRoute: el cambio de contraseña pendiente o el inicio de la sección.
 */
export function PaginaIngreso() {
  const { login } = useSession();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState<string | null>(null);
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
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
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
  );
}
