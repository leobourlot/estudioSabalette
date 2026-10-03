import { Link } from 'react-router-dom';
import { useSession } from '../componentes/ProveedorSesion';

/** Inicio del panel. Por ahora solo da acceso a la gestión de cuentas; las causas llegan con la spec 002. */
export function PanelInicio() {
  const { usuario } = useSession();

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-2xl font-semibold text-slate-800">Panel</h1>
      {usuario && <p className="mt-2 text-slate-600">Hola, {usuario.nombre}.</p>}
      <p className="mt-6">
        <Link to="/panel/usuarios" className="text-slate-700 underline">
          Gestionar cuentas
        </Link>
      </p>
    </main>
  );
}
